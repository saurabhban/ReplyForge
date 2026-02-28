// ReplyForge Backend — server.js
// Stack: Node.js + Express + Stripe + Supabase (all free tier)
// Deploy to: Render.com free tier OR Railway.app free tier

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ─── CLIENTS ────────────────────────────────────────────────
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── STRIPE PRODUCTS (create these once in Stripe dashboard) ─
const PLANS = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID,    // $29/mo
    trialDays: 7
  },
  team: {
    priceId: process.env.STRIPE_TEAM_PRICE_ID,   // $79/mo
    trialDays: 7
  }
};

// ─── HEALTH ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── SUBSCRIBE ───────────────────────────────────────────────
app.post('/api/subscribe', async (req, res) => {
  const { paymentMethodId, plan, email, name } = req.body;

  if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  try {
    // 1. Create or fetch Stripe customer
    let customer;
    const existing = await stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      customer = existing.data[0];
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } else {
      customer = await stripe.customers.create({
        email,
        name,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    }

    // 2. Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PLANS[plan].priceId }],
      trial_period_days: PLANS[plan].trialDays,
      payment_settings: { payment_method_types: ['card'], save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    });

    // 3. Save to Supabase
    await supabase.from('users').upsert({
      email,
      name,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      plan,
      trial_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
      status: 'trialing',
      credits_used: 0,
      created_at: new Date().toISOString()
    }, { onConflict: 'email' });

    // 4. Send welcome email (via Resend)
    await sendWelcomeEmail(email, name, plan);

    res.json({ success: true, subscriptionId: subscription.id });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERATE EMAIL (server-side for paid users) ─────────────
app.post('/api/generate', async (req, res) => {
  const { apiKey, prompt } = req.body;

  // Validate user has active subscription
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('api_key', apiKey)
    .single();

  if (!user || user.status === 'canceled') {
    return res.status(403).json({ error: 'No active subscription' });
  }

  // Free tier: check daily limit
  if (user.plan === 'free') {
    const today = new Date().toDateString();
    if (user.last_reset !== today) {
      await supabase.from('users').update({ credits_used: 0, last_reset: today }).eq('api_key', apiKey);
    }
    if (user.credits_used >= 5) {
      return res.status(429).json({ error: 'Daily limit reached. Upgrade for unlimited.' });
    }
  }

  // Proxy to Claude API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Cheapest model for cost efficiency
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const emailText = data.content?.[0]?.text ?? '';

    // Increment usage
    await supabase.from('users')
      .update({ credits_used: user.credits_used + 1 })
      .eq('api_key', apiKey);

    res.json({ email: emailText });
  } catch (err) {
    res.status(500).json({ error: 'Generation failed' });
  }
});

// ─── STRIPE WEBHOOKS ─────────────────────────────────────────
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('users')
        .update({ status: sub.status })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await supabase.from('users')
        .update({ status: 'past_due' })
        .eq('stripe_customer_id', invoice.customer);
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      await supabase.from('users')
        .update({ status: 'active' })
        .eq('stripe_customer_id', invoice.customer);
      break;
    }
  }

  res.json({ received: true });
});

// ─── SEND WELCOME EMAIL via Resend ───────────────────────────
async function sendWelcomeEmail(email, name, plan) {
  if (!process.env.RESEND_API_KEY) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'ReplyForge <hello@replyforge.io>',
      to: email,
      subject: `Your 7-day ${plan} trial just started ⚡`,
      html: `
        <h2>Welcome to ReplyForge, ${name}! 🎉</h2>
        <p>Your 7-day free trial of the <strong>${plan}</strong> plan has started.</p>
        <p>You now have unlimited access to:</p>
        <ul>
          <li>✅ Unlimited AI cold email generation</li>
          <li>✅ 5-touch follow-up sequences</li>
          <li>✅ A/B subject line testing</li>
        </ul>
        <p>No charge until your trial ends. Cancel anytime.</p>
        <a href="${process.env.FRONTEND_URL}" style="background:#6c63ff;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px">
          Start Generating Emails →
        </a>
      `
    })
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`ReplyForge API running on port ${PORT}`));
