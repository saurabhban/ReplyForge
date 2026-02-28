# ReplyForge — Step-by-Step Deployment Guide
## From Zero to Live in 30 Minutes ($0 Cost) — India Edition (Razorpay)

---

## Your Credentials Checklist (fill this in as you go)

```
SUPABASE_URL              = https://xxxxx.supabase.co
SUPABASE_ANON_KEY         = eyJ...
SUPABASE_SERVICE_KEY      = eyJ...

RAZORPAY_KEY_ID           = rzp_test_xxxxx
RAZORPAY_KEY_SECRET       = xxxxx
RAZORPAY_WEBHOOK_SECRET   = your_custom_secret
RAZORPAY_PRO_PLAN_ID      = plan_xxxxx
RAZORPAY_TEAM_PLAN_ID     = plan_xxxxx

ANTHROPIC_API_KEY         = sk-ant-xxxxx
RESEND_API_KEY            = re_xxxxx

RENDER_BACKEND_URL        = https://replyforge-backend-xxxx.onrender.com
VERCEL_FRONTEND_URL       = https://replyforge-xxxx.vercel.app
```

---

## STEP 1 — Supabase Database (5 min)

1. Go to supabase.com → "Start your project"
2. Click "New Project" → name it `replyforge`
3. Set a strong password → choose your nearest region → "Create new project"
4. Wait ~2 minutes for setup to complete
5. Go to Settings → API → copy:
   - Project URL → SUPABASE_URL
   - anon/public key → SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_KEY
6. Click "SQL Editor" (left sidebar) → "New Query"
7. Paste the entire contents of backend/schema.sql → click "Run"
8. You should see: CREATE TABLE users / emails / templates ✓

---

## STEP 2 — Razorpay Payments (7 min)

⚠️ WHY RAZORPAY? Stripe requires an invite for India accounts.
Razorpay is India's #1 payment gateway — instant signup, supports
UPI, cards, netbanking, wallets, and recurring subscriptions.

### 2.1 — Create Your Account
1. Go to razorpay.com → click "Sign Up"
2. Enter your name, email, mobile number, and business name
3. Verify email OTP + mobile OTP
4. You can start testing IMMEDIATELY — KYC only needed for live payouts

### 2.2 — Get Your API Keys
1. Log in to dashboard.razorpay.com
2. Go to Settings → API Keys
3. Click "Generate Test Key"
4. A popup shows your keys — copy BOTH immediately:
   - Key ID (starts with rzp_test_...) → RAZORPAY_KEY_ID (used in frontend too)
   - Key Secret → RAZORPAY_KEY_SECRET (backend only, never expose this)
   ⚠️ The Key Secret is shown ONLY ONCE. Save it now!

### 2.3 — Create Subscription Plans

PRO PLAN:
1. Go to Subscriptions → Plans → "+ Create Plan"
2. Fill in:
   - Plan Name: ReplyForge Pro
   - Billing Amount: 2499  (₹2,499/month ≈ $29 USD)
   - Billing Period: Monthly
   - Currency: INR
3. Click "Create Plan"
4. Copy the Plan ID (format: plan_XXXXXXXXXX) → RAZORPAY_PRO_PLAN_ID

TEAM PLAN:
1. Go to Subscriptions → Plans → "+ Create Plan"
2. Fill in:
   - Plan Name: ReplyForge Team
   - Billing Amount: 6599  (₹6,599/month ≈ $79 USD)
   - Billing Period: Monthly
   - Currency: INR
3. Click "Create Plan"
4. Copy the Plan ID → RAZORPAY_TEAM_PLAN_ID

### 2.4 — Set Up Webhook (do this AFTER Step 3 when backend is live)
1. Go to Settings → Webhooks → "+ Add New Webhook"
2. Webhook URL: https://YOUR-RENDER-URL.onrender.com/api/razorpay-webhook
3. Secret: Type any random string → save as RAZORPAY_WEBHOOK_SECRET
4. Check these Active Events:
   ✅ subscription.activated
   ✅ subscription.charged
   ✅ subscription.cancelled
   ✅ payment.failed
5. Click Save

---

## STEP 3 — Deploy Backend to Render (8 min)

1. Push the backend/ folder to a new GitHub repo:

   cd backend/
   git init
   git add .
   git commit -m "ReplyForge backend"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/replyforge-backend.git
   git push -u origin main

2. Go to render.com → sign in with GitHub → "New +" → "Web Service"
3. Select your replyforge-backend repo → click Import
4. Settings:
   - Name: replyforge-backend
   - Environment: Node
   - Build Command: npm install
   - Start Command: node server.js
5. Add ALL Environment Variables from your checklist above
6. Click "Create Web Service" → wait 3–5 minutes
7. Copy your Render URL → RENDER_BACKEND_URL
8. NOW go back to Razorpay Step 2.4 and add the webhook with this URL

---

## STEP 4 — Update Frontend with Your Keys (2 min)

Open app/index.html and find this near the top of the <script> section:

   const RAZORPAY_KEY = 'rzp_test_YOUR_RAZORPAY_KEY_HERE';
   const API_BASE = 'http://localhost:3000/api';

Replace with your actual values:

   const RAZORPAY_KEY = 'rzp_test_YOUR_ACTUAL_KEY_ID';
   const API_BASE = 'https://replyforge-backend-xxxx.onrender.com/api';

Save the file.

---

## STEP 5 — Deploy Frontend to Vercel (5 min)

Option A — Command Line:
   cd app/
   npx vercel --prod

Option B — Drag and Drop:
   1. Go to vercel.com/new
   2. Drag and drop your app/ folder
   3. Click Deploy

Copy your Vercel URL → add it to Render's FRONTEND_URL environment variable.

---

## STEP 6 — Set Up Email via Resend (3 min)

1. Go to resend.com → sign up
2. API Keys → Create API Key → name it "replyforge"
3. Copy the key → add to Render as RESEND_API_KEY
4. Render auto-redeploys

---

## STEP 7 — Test Everything

RAZORPAY TEST CARD:
   Card Number : 4111 1111 1111 1111
   Expiry      : Any future date (e.g. 12/30)
   CVV         : Any 3 digits (e.g. 123)
   OTP         : 1234

OR use Test UPI ID: success@razorpay

TEST CHECKLIST:
   □ Visit Vercel URL — dark theme page loads
   □ Generate a test email — output appears
   □ Click "Upgrade to Pro" — Razorpay modal opens
   □ Complete test payment — success message appears
   □ Check Supabase users table — new row created
   □ Check inbox — welcome email received

---

## Going Live (When Ready)

1. Complete KYC on Razorpay dashboard (PAN + bank account details)
2. Settings → API Keys → Generate Live Key
3. Replace rzp_test_ keys with rzp_live_ keys in:
   - Render env var: RAZORPAY_KEY_ID
   - app/index.html: const RAZORPAY_KEY
4. Update Razorpay webhook to live mode
5. Done — you're accepting real money! 🎉

---

## Troubleshooting

PROBLEM                          FIX
Page loads but generation fails  Check API_BASE points to your Render URL
CORS error in browser            Add Vercel URL to CORS in server.js
Razorpay modal doesn't open      Confirm RAZORPAY_KEY starts with rzp_test_
Payment works but no DB update   Check webhook URL in Razorpay matches Render URL
No welcome email                 Confirm RESEND_API_KEY is in Render env vars
Render is slow (30s first load)  Free tier sleeps — upgrade to $7/mo to fix
Subscription not created         Check RAZORPAY_PRO_PLAN_ID matches dashboard exactly

---

Total cost: ₹0/month until you start earning 🚀
