# ⚡ ReplyForge — AI Cold Email Generator
## $0 to $90K Revenue Experiment

> Build time: ~1 hour | Budget: $0 | Target: $90K ARR in 12 months

---

## Quick Start (Deploy in 30 minutes)

### Prerequisites
- Node.js 18+ installed
- GitHub account
- Stripe account (free)
- Supabase account (free)
- Vercel account (free)
- Render.com account (free)

---

## Step 1: Database (Supabase — 5 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. SQL Editor → paste `backend/schema.sql` → Run
3. Settings → API → Copy:
   - `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY`

---

## Step 2: Payments (Stripe — 10 min)

1. [stripe.com](https://stripe.com) → Create account
2. Products → Add Product:
   - **ReplyForge Pro** — $29/month recurring → Copy Price ID
   - **ReplyForge Team** — $79/month recurring → Copy Price ID
3. Developers → API Keys → Copy publishable + secret keys
4. Webhooks → Add endpoint after backend is deployed (Step 3)

---

## Step 3: Deploy Backend (Render.com — 10 min)

```bash
# Push backend/ folder to GitHub repo first, then:
# render.com → New → Web Service → Connect repo
# Build: npm install
# Start: node server.js
# Add environment variables from .env.example
```

After deploying, add webhook in Stripe:
- URL: `https://your-app.onrender.com/api/webhook`
- Events: `customer.subscription.updated`, `invoice.payment_failed`, `invoice.payment_succeeded`

---

## Step 4: Deploy Frontend (Vercel — 5 min)

```bash
# Edit app/index.html:
# Line ~320: Replace pk_test_YOUR_STRIPE_PUBLIC_KEY with your Stripe public key
# Line ~321: Replace /api with your Render.com URL

cd app/
npx vercel --prod
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in all values.

| Variable | Where to get it |
|----------|----------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys |
| `STRIPE_PUBLIC_KEY` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks |
| `STRIPE_PRO_PRICE_ID` | Stripe → Products → Pro plan |
| `STRIPE_TEAM_PRICE_ID` | Stripe → Products → Team plan |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API (service_role) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `RESEND_API_KEY` | resend.com → API Keys |
| `FRONTEND_URL` | Your Vercel deployment URL |

---

## Revenue Math

| Plan | Price | Users for $90K ARR |
|------|-------|--------------------|
| Pro | $29/mo | 259 users |
| Team | $79/mo | 95 teams |
| **Realistic mix** | **$34 avg** | **220 users** |

**Path:** Free tier → ProductHunt launch → Reddit posts → 2,750 free signups → 8% convert = 220 paying users

---

## File Structure

```
replyforge/
├── app/
│   └── index.html          # Complete SPA frontend + Stripe modal
├── backend/
│   ├── server.js           # Express API + Stripe + Supabase
│   ├── schema.sql          # Database schema
│   ├── package.json        # Dependencies
│   └── .env.example        # Environment variables template
├── SKILLS.md               # Reusable AI product methodology
├── README.md               # This file
└── ReplyForge_$90K_Blueprint.docx  # Full strategy document
```

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Vercel hosting | $0 |
| Render.com backend | $0 |
| Supabase database | $0 |
| Stripe | 2.9% + $0.30 per transaction only |
| Resend email | $0 (3K/mo free) |
| Claude Haiku API | ~$0.0003/generation |
| **Total fixed cost** | **$0** |
| **Gross margin at scale** | **~99%** |

---

## Free Traffic Channels

1. **ProductHunt** — 1 launch → 500–2,000 visitors
2. **Reddit** (r/entrepreneur, r/SaaS, r/sales) — 100–500/post
3. **Twitter/X threads** — data-driven teardowns
4. **LinkedIn articles** — target SDRs and founders
5. **Indie Hackers** — build in public
6. **Referral program** — give 1 month, get 1 month free

---

*Part of the AI $90K Revenue Experiment — proving AI can architect, build, and monetize a SaaS product from $0.*
