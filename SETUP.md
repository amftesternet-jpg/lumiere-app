# Lumière — Production Setup Guide

## What you need (all free tiers available)
- Supabase account (supabase.com) — database, auth, storage, realtime, edge functions
- Stripe account (stripe.com) — payments
- Resend account (resend.com) — email (with your domain)
- A domain name (e.g. lumiere.photos) — ~€10/year

---

## Step 1: Supabase (30 minutes)

### 1a. Create project
1. Go to supabase.com → New project
2. Name: "lumiere-app"  
3. Region: **EU West (Frankfurt)** — important for GDPR
4. Set a strong database password
5. Wait ~2 minutes for project to be ready

### 1b. Copy your credentials
- Project Settings → API
- Copy: **Project URL** and **anon public key**
- Also copy: **service_role key** (keep secret, for edge functions)

### 1c. Run the database schema
- SQL Editor → New query
- Paste the contents of `schema.sql`
- Click Run

### 1d. Create Storage bucket
- Storage → New bucket
- Name: **event-photos**
- Public: **YES**
- Max upload size: 20MB

### 1e. Update lumiere-app.html
Replace in the JS section:
```
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'
```

Add before your `<script>` tag:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Then replace the `const DB = { ... }` block and all auth/upload functions
with the contents of `supabase-integration.js`.

---

## Step 2: Stripe (20 minutes)

### 2a. Create products
1. dashboard.stripe.com → Products → Add product
2. Create "Lumière Pro" → One time → €29 → Save → copy price ID
3. Create "Lumière Elite" → One time → €79 → Save → copy price ID

### 2b. Deploy edge functions
Install Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase init
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

Set secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PRICE_PRO=price_...
supabase secrets set STRIPE_PRICE_ELITE=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2c. Register webhook in Stripe
- Stripe Dashboard → Webhooks → Add endpoint
- URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`
- Copy signing secret → set as STRIPE_WEBHOOK_SECRET

---

## Step 3: Resend Email (15 minutes)

### 3a. Create account + verify domain
1. resend.com → Domains → Add domain
2. Add the DNS TXT records to your domain registrar
3. Wait for verification (5-15 minutes)
4. Get API key

### 3b. Deploy email function
```bash
supabase functions deploy send-invite
supabase secrets set RESEND_API_KEY=re_...
```

### 3c. Update from address
In `send-invite.ts`, change:
```
from: 'Lumière <hello@YOUR-DOMAIN.com>'
```

---

## Step 4: Custom domain (10 minutes)

### GitHub Pages custom domain
1. In repo Settings → Pages → Custom domain → enter your domain
2. In Cloudflare (or your DNS) → add CNAME: www → amftesternet-jpg.github.io
3. Enable "Enforce HTTPS"

---

## Environment variables summary

| Variable | Where to find |
|---|---|
| SUPABASE_URL | Supabase → Settings → API |
| SUPABASE_ANON_KEY | Supabase → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | Supabase → Settings → API (secret!) |
| STRIPE_SECRET_KEY | Stripe → Developers → API keys |
| STRIPE_PRICE_PRO | Stripe → Products → Pro → price ID |
| STRIPE_PRICE_ELITE | Stripe → Products → Elite → price ID |
| STRIPE_WEBHOOK_SECRET | Stripe → Webhooks → signing secret |
| RESEND_API_KEY | Resend → API Keys |

---

## Testing checklist
- [ ] Sign up with email → receive confirmation email
- [ ] Create event → appears in dashboard
- [ ] Open guest link on a different phone → event loads
- [ ] Upload photo from guest phone → appears instantly on host
- [ ] Click "Get Pro" → Stripe checkout opens (use test mode first)
- [ ] Complete test payment → event.tier updates to "pro"
- [ ] Send email invite → email arrives with QR code
