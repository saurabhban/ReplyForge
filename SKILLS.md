# SKILLS.md — AI Revenue Product Builder
## Reusable Methodology: $0 → $90K SaaS in 12 Months

> This SKILLS.md documents the repeatable framework used to design, build, and monetize
> an AI-powered SaaS product from zero budget. Apply to any niche.

---

## SKILL 1: Niche Validation (The 5-Filter Test)

Before writing a single line of code, run every idea through this filter. All 5 must pass.

| Filter | Question | Pass Condition |
|--------|----------|----------------|
| **Payment proof** | Do people already pay for something similar? | $30+/mo competitors exist |
| **Pain quantifiability** | Can the customer measure the ROI? | Yes, in $ or time |
| **Buying cycle** | How fast can they decide? | Same-day purchase possible |
| **Digital delivery** | Zero fulfillment cost? | Yes — API or instant download |
| **AI leverage** | Does AI add 10× value vs manual? | Yes — speed or personalization |

**Winning niches (proven):** Cold email, resume writing, ad copy, legal docs, real estate listings,
job descriptions, sales scripts, investor outreach, SEO meta descriptions.

**Avoid:** Generic "write anything" tools (too competitive), niches needing compliance (medical, legal advice),
anything requiring human review before delivery.

---

## SKILL 2: 1-Hour MVP Architecture

### The Golden Rule
> Build ONE feature that creates ONE measurable outcome. Not a platform. Not a suite.

### Minimum Viable Stack (all free tier)

```
Frontend:  HTML/CSS/JS  →  Vercel (free)
Backend:   Node.js       →  Render.com (free) OR skip (use Cloudflare Workers)
Database:  Supabase      →  Free: 500MB, 50K rows, Auth included
AI:        Claude Haiku  →  $0.25/M input tokens (~$0.0003 per generation)
Payments:  Stripe        →  0 monthly fee, 2.9% + $0.30 per transaction
Email:     Resend        →  Free: 3,000 emails/month
```

### 1-Hour Build Checklist

- [ ] Single HTML file with input form + output area
- [ ] AI API call (direct or via backend proxy)
- [ ] Local storage for free tier credit tracking
- [ ] Stripe payment modal (embedded, not redirect)
- [ ] Welcome email on signup
- [ ] Copy-to-clipboard on output
- [ ] Mobile responsive

### What NOT to build in v1
- User dashboards
- Analytics
- Team features
- Integrations
- Onboarding flows
- Settings pages

---

## SKILL 3: AI Prompt Engineering for Product Features

### The Product Prompt Formula

```
[Role] + [Context/Parameters] + [Rules] + [Output Format]
```

**Example (Cold Email):**
```
You are an elite B2B cold email copywriter with 15%+ reply rate track record.

Write a cold outreach email with:
- Prospect Company: {company}
- Their Role: {role}
- Your Product: {product}  
- Pain Point: {pain}
- Tone: {tone}
- CTA: {cta}

RULES:
1. Subject: under 8 words, curiosity or ROI hook
2. Opening: specific to their company, no generic flattery
3. Body: max 150 words, lead with pain not features
4. One clear CTA
5. PS line that builds credibility

Format: Subject: [line]\n---\n[body]\nPS: [ps]
```

### Model Selection by Use Case

| Use Case | Model | Cost/1K Generations |
|----------|-------|---------------------|
| Short generations (<500 tokens) | Claude Haiku | ~$0.30 |
| Complex reasoning | Claude Sonnet | ~$3.00 |
| Free alternative | OpenRouter free models | $0.00 |
| Local fallback | Ollama + Llama 3 | $0.00 |

### Fallback Strategy
Always implement a template-based fallback when the AI API fails or user has no credits.
This keeps the product functional and prevents bounce.

---

## SKILL 4: Stripe Integration Pattern

### Zero-Friction Checkout (No Redirect)

```javascript
// 1. Load Stripe.js
const stripe = Stripe('pk_live_...');
const elements = stripe.elements({ appearance: { theme: 'night' } });
const card = elements.create('card');
card.mount('#card-element');

// 2. On form submit
const { paymentMethod } = await stripe.createPaymentMethod({ type: 'card', card });

// 3. Send to backend
await fetch('/api/subscribe', { 
  method: 'POST',
  body: JSON.stringify({ paymentMethodId: paymentMethod.id, plan, email })
});

// 4. Backend creates customer + subscription with trial
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_period_days: 7
});
```

### Webhook Events to Handle

```
customer.subscription.updated   → update user status
customer.subscription.deleted   → mark as canceled
invoice.payment_failed           → mark as past_due, send dunning email
invoice.payment_succeeded        → mark as active
```

### Pricing Psychology Rules
1. Always show 3 tiers — middle is the real target (decoy effect)
2. Trial with card beats trial without card (2–3× conversion)
3. Annual plans improve cash flow — always offer
4. "Cancel anytime" removes fear — always include
5. 7-day trial beats 14-day (urgency + lower churn window)

---

## SKILL 5: Free Distribution Channels (Ranked by ROI)

### Tier 1: Highest ROI (Do First)

**Reddit AMA / Show HN posts**
- r/SaaS, r/entrepreneur, r/sales, r/startups
- Format: "I built [tool] in [time]. Here's what I learned. [link]"
- Rules: Be genuinely helpful, not promotional. Answer every comment.
- Expected: 50–500 free signups per post

**ProductHunt Launch**
- Coordinate 20+ upvotes in first 2 hours (message your network 48hr before)
- "Product of the Day" gets: 2,000–10,000 visitors in 24 hours
- Convert at 2–5% = 40–500 signups

**Twitter/X Threads**
- Data-driven teardowns perform best: "I analyzed 500 cold emails. Here's what they got wrong."
- Include free tool at the end of the thread
- Pin the tweet
- Expected: 100–1,000 visits per viral thread

### Tier 2: Medium ROI (Do Week 2+)

**LinkedIn Articles**
- Long-form educational content targeting SDRs and founders
- "How I increased my cold email reply rate from 1% to 8%"
- Always include tool link in bio

**Build in Public (Twitter/X + Indie Hackers)**
- Post MRR monthly (even $0 is interesting at the start)
- Transparency builds trust and followers = future customers

**Cold Email Other Founders**
- Use your own tool to cold email people who would benefit
- Meta and highly effective

### Tier 3: Long-term Compounding

**SEO Blog Posts (AI-generated)**
- Target: "cold email templates [industry]", "cold email subject lines"
- AI writes 10× cheaper than hiring a writer
- Takes 3–6 months to rank but compounds indefinitely

**Referral Program**
- "Give 1 month free, get 1 month free"
- Zero cost. Activation rate: 5–15% of active users refer someone
- Best time to prompt: immediately after a successful generation

---

## SKILL 6: SaaS Metrics to Track from Day 1

```
MRR           = Total monthly recurring revenue
ARR           = MRR × 12
Churn Rate    = Canceled users this month / Active users start of month
Net MRR Growth = New MRR + Expansion MRR - Churned MRR
CAC           = $0 (organic only)
LTV           = (Avg Revenue/User/Mo) / Churn Rate
LTV:CAC ratio = ∞ when CAC = $0 (infinite ROI)
```

### Healthy SaaS Benchmarks (Early Stage)
- Monthly churn: < 8% (aim for < 5%)
- Free-to-paid conversion: > 3% (aim for > 8%)
- Trial-to-paid: > 40% (aim for > 60%)
- Net Revenue Retention: > 100% (expansion > churn)

---

## SKILL 7: Revenue Path Templates

### Path A: Volume + Low Price ($9–29/mo)
- Need: 300–1,000 paying users
- Win with: free tier, viral distribution, simple product
- Risk: high churn volume, support load

### Path B: Quality + Mid Price ($49–99/mo)
- Need: 75–150 paying users  
- Win with: clear ROI, specific niche, strong onboarding
- Risk: longer sales cycle, more support

### Path C: Enterprise ($200–500/mo)
- Need: 15–40 accounts
- Win with: team features, compliance, dedicated support
- Risk: long sales cycle, needs outbound effort

### Path D: Hybrid (Recommended)
- Free tier for acquisition
- Mid-tier ($29) for individuals
- Team tier ($79) for companies
- Captures all segments, maximizes LTV

---

## SKILL 8: Technical Cost Optimization

### API Cost Per Feature (Monthly)

```
Cold email generation (1,000 emails/mo):
  Claude Haiku: $0.0003/email × 1,000 = $0.30/month/user
  
  At $29/mo Pro plan: gross margin = 98.9%
```

### Free Tier Limits Reference

| Service | Free Limit | When to Upgrade |
|---------|-----------|-----------------|
| Vercel | 100GB bandwidth | 100K+ monthly visitors |
| Render | 750 hours/mo (sleeps after 15min) | First paying customer |
| Supabase | 500MB, 50K rows | 500+ users |
| Resend | 3,000 emails/mo | 3,000+ users |
| Stripe | No monthly fee | Never (pay per transaction) |

### Render.com Free Tier Warning
Free tier services "sleep" after 15 minutes of inactivity, causing 30-second cold starts.
Fix: Add a free uptime monitor (UptimeRobot) to ping every 14 minutes.

---

## SKILL 9: Launch Day Checklist

### 48 Hours Before
- [ ] Test payment flow end-to-end with Stripe test keys
- [ ] Send test emails through Resend
- [ ] Verify all env variables in production
- [ ] Check mobile responsiveness
- [ ] Write 3 social posts (Reddit, Twitter, LinkedIn)
- [ ] DM 20 friends to upvote ProductHunt post

### Launch Day
- [ ] Switch Stripe to live keys
- [ ] Post to ProductHunt 12:01 AM PST
- [ ] Post Reddit thread 9 AM EST
- [ ] Post Twitter thread noon EST
- [ ] Monitor and respond to every comment

### Week 1 Post-Launch
- [ ] Email every free signup: "How was your first email? Any feedback?"
- [ ] Interview first 5 paying customers on Zoom
- [ ] Fix top 3 friction points from feedback
- [ ] Post Week 1 metrics on Indie Hackers

---

## SKILL 10: The $90K Formula

```
$90,000 ARR
= 250 users × $29/mo × 12 months (all Pro)
OR 
= 95 teams × $79/mo × 12 months (all Team)  
OR (realistic)
= 220 users × $34 avg/mo × 12 months

To get 220 paying users:
  Free signups needed: 220 / 0.08 = 2,750 free users
  To get 2,750 free users in 12 months: ~230/month
  One good ProductHunt launch = 500–2,000 free signups
  Two Reddit posts/month = 100–300 signups/month
  
This is achievable.
```

---

## Meta-Skill: The Execution Mindset

1. **Ship ugly first.** A live product beats a perfect prototype.
2. **Talk to users week 1.** Product intuition < customer reality.
3. **One distribution channel at a time.** Depth beats breadth.
4. **Revenue > vanity metrics.** Track MRR from day 1.
5. **Iterate weekly.** Monthly is too slow for a solo founder.

---

*Generated as part of the AI $90K Revenue Experiment — ReplyForge*
*Stack: Claude AI + Vercel + Render + Supabase + Stripe + Resend*
*Total cost to build: $0*
