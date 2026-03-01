// ReplyForge Backend — server.js
// Stack: Node.js + Express + Razorpay + Supabase
// Deploy: Render.com free tier

const express    = require('express');
const cors       = require('cors');
const Razorpay   = require('razorpay');
const crypto     = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ─── CORS ─────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Raw body needed for webhook signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── CLIENTS ──────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── PLAN CONFIG ──────────────────────────────────────────
// Create these plans once in Razorpay Dashboard → Subscriptions → Plans
const PLANS = {
  pro: {
    planId:    process.env.RAZORPAY_PRO_PLAN_ID,   // plan_XXXXXXXXXX
    amount:    249900,  // ₹2,499 in paise
    currency:  'INR',
    trialDays: 7
  },
  team: {
    planId:    process.env.RAZORPAY_TEAM_PLAN_ID,  // plan_XXXXXXXXXX
    amount:    649900,  // ₹6,499 in paise
    currency:  'INR',
    trialDays: 7
  }
};

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', gateway: 'Razorpay' });
});

// ─── CREATE SUBSCRIPTION ──────────────────────────────────
app.post('/api/subscribe', async (req, res) => {
  const { plan, name, email, phone } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }
  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required' });
  }

  try {
    // 1. Create or fetch Razorpay customer
    let customerId;
    try {
      const customers = await razorpay.customers.all({ email });
      if (customers.items && customers.items.length > 0) {
        customerId = customers.items[0].id;
      }
    } catch {}

    if (!customerId) {
      const customer = await razorpay.customers.create({
        name,
        email,
        contact: phone,
        fail_existing: 0
      });
      customerId = customer.id;
    }

    // 2. Create Razorpay subscription with trial
    const subscription = await razorpay.subscriptions.create({
      plan_id:         PLANS[plan].planId,
      customer_notify: 1,
      quantity:        1,
      total_count:     120, // 10 years max (they cancel when they want)
      addons:          [],
      notes: {
        customer_name:  name,
        customer_email: email,
        plan_type:      plan
      }
    });

    // 3. Save to Supabase
    await supabase.from('users').upsert({
      email,
      name,
      phone,
      razorpay_customer_id:     customerId,
      razorpay_subscription_id: subscription.id,
      plan,
      status:       'created',
      credits_used: 0,
      created_at:   new Date().toISOString()
    }, { onConflict: 'email' });

    res.json({
      success:        true,
      subscriptionId: subscription.id,
      customerId
    });

  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: err.error?.description || err.message || 'Subscription creation failed' });
  }
});

// ─── VERIFY PAYMENT ──────────────────────────────────────
// Called after Razorpay checkout succeeds on the frontend
app.post('/api/verify-payment', async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
    email,
    plan
  } = req.body;

  try {
    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Update user status in Supabase
    await supabase.from('users')
      .update({
        status:     'active',
        plan,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    // Send welcome email
    await sendWelcomeEmail(email, plan);

    res.json({ success: true });

  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERATE EMAIL (for paid users via backend proxy) ───
app.post('/api/generate', async (req, res) => {
  const { prompt, tier, apiKey } = req.body;

  // For free tier — no auth needed, just rate limit by IP
  // For paid users — validate their API key
  if (tier !== 'free') {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (!user || user.status === 'canceled') {
      return res.status(403).json({ error: 'No active subscription' });
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages:   [{ role: 'user', content: prompt }]
      })
    });

    const data  = await response.json();
    const email = data.content?.[0]?.text ?? '';

    if (!email) throw new Error('No content returned from AI');

    res.json({ email });

  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Generation failed' });
  }
});

// ─── RAZORPAY WEBHOOK ────────────────────────────────────
// Set this URL in Razorpay Dashboard → Settings → Webhooks
// URL: https://YOUR-RENDER-URL.onrender.com/api/webhook
app.post('/api/webhook', async (req, res) => {
  const webhookSecret    = process.env.RAZORPAY_WEBHOOK_SECRET;
  const receivedSignature = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body)
    .digest('hex');

  if (expectedSignature !== receivedSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const event = JSON.parse(req.body);
  console.log('Razorpay webhook:', event.event);

  try {
    switch (event.event) {

      case 'subscription.activated': {
        const sub = event.payload.subscription.entity;
        await supabase.from('users')
          .update({ status: 'active' })
          .eq('razorpay_subscription_id', sub.id);
        break;
      }

      case 'subscription.charged': {
        // Payment collected successfully
        const sub = event.payload.subscription.entity;
        await supabase.from('users')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('razorpay_subscription_id', sub.id);
        break;
      }

      case 'subscription.cancelled': {
        const sub = event.payload.subscription.entity;
        await supabase.from('users')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('razorpay_subscription_id', sub.id);
        break;
      }

      case 'subscription.halted': {
        // Payment failed — subscription halted
        const sub = event.payload.subscription.entity;
        await supabase.from('users')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('razorpay_subscription_id', sub.id);
        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        console.log('Payment failed for:', payment.email);
        // Optionally send dunning email here
        break;
      }
    }

    res.json({ received: true });

  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── WELCOME EMAIL via Resend ────────────────────────────
async function sendWelcomeEmail(email, plan) {
  if (!process.env.RESEND_API_KEY) return;

  const planNames  = { pro: 'Pro', team: 'Team' };
  const planPrice  = { pro: '₹2,400/mo', team: '₹6,500/mo' };
  const frontendUrl = process.env.FRONTEND_URL || 'https://reply-forge-delta.vercel.app';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from:    'Saurabh at ReplyForge <hello@replyforge.in>',
      to:      email,
      subject: `You're now on ReplyForge ${planNames[plan]} — here's everything you unlocked ⚡`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1a1a1a;background:#ffffff;padding:32px;border-radius:12px;">

          <h1 style="color:#6c63ff;font-size:24px;margin-bottom:4px;">Welcome to ReplyForge ${planNames[plan]} 🎉</h1>
          <p style="color:#666;margin-top:0;font-size:15px;">Your subscription is active at <strong>${planPrice[plan]}</strong>. Here's why this is one of the smartest investments you've made for your sales pipeline.</p>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

          <h2 style="font-size:18px;margin-bottom:12px;">🚀 What you can now do that free users can't:</h2>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="background:#f5f3ff;">
              <td style="padding:10px 14px;border-radius:8px 0 0 8px;font-weight:700;color:#6c63ff;">✅ Unlimited emails</td>
              <td style="padding:10px 14px;color:#444;">Generate as many cold emails as you need — no daily cap, no waiting until tomorrow.</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:700;color:#6c63ff;">✅ Multi-step sequences</td>
              <td style="padding:10px 14px;color:#444;">Build 3–5 touch follow-up sequences. Most replies come on follow-up #3 — now you won't miss them.</td>
            </tr>
            <tr style="background:#f5f3ff;">
              <td style="padding:10px 14px;font-weight:700;color:#6c63ff;">✅ Advanced tone control</td>
              <td style="padding:10px 14px;color:#444;">Challenger, Friendly, Direct, Professional — match every prospect's personality exactly.</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-weight:700;color:#6c63ff;">✅ Export to CSV</td>
              <td style="padding:10px 14px;color:#444;">Push emails directly into your CRM or outreach tool with one click.</td>
            </tr>
            <tr style="background:#f5f3ff;">
              <td style="padding:10px 14px;border-radius:0 0 0 8px;font-weight:700;color:#6c63ff;">✅ Priority support</td>
              <td style="padding:10px 14px;color:#444;">Direct email support with responses within 4 hours on business days.</td>
            </tr>
          </table>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

          <h2 style="font-size:18px;margin-bottom:8px;">💡 Why cold email still works in 2025:</h2>
          <p style="font-size:14px;color:#444;line-height:1.7;">
            The average SDR spends <strong>4+ hours per day</strong> writing cold emails manually — most of which never get a reply because they're generic. ReplyForge cuts that to <strong>under 5 minutes</strong>, with emails that reference the prospect's company, role, and pain points specifically. Our users typically see <strong>3–5× higher reply rates</strong> compared to templates.
          </p>
          <p style="font-size:14px;color:#444;line-height:1.7;">
            At ${planPrice[plan]}, if ReplyForge helps you close even <strong>one extra deal per month</strong>, the ROI is 10–100×. Most of our users book their first meeting within the first week.
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${frontendUrl}" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#8b5cf6);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">
              Start Generating Emails Now →
            </a>
          </div>

          <p style="font-size:13px;color:#999;text-align:center;margin-top:24px;">
            Questions? Reply to this email — I read every message personally.<br/>
            Payments secured by Razorpay 🇮🇳 · Cancel anytime
          </p>
        </div>
      `
    })
  });
}

// ─── START ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ ReplyForge API running on port ${PORT}`);
  console.log(`   Gateway: Razorpay 🇮🇳`);
});
