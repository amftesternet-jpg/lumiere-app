# Lumière — Event Photo Sharing App

European multi-language event photo sharing app for weddings, birthdays, and celebrations.

**Live demo:** https://amftesternet-jpg.github.io/lumiere-app

## Tech stack
- Frontend: Vanilla HTML/CSS/JS, deployed on GitHub Pages
- Backend: Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions)
- Payments: Stripe (one-time per event)
- Email: Resend
- Video: Mux (Phase 4)

## Setup
See [SETUP.md](./SETUP.md) for complete production setup guide.

## Structure
```
├── index.html                         # Full frontend app
├── supabase/
│   ├── schema.sql                     # Database schema + RLS policies
│   ├── supabase-integration.js        # Drop-in Supabase replacement for localStorage
│   └── functions/
│       ├── create-checkout/index.ts   # Stripe checkout edge function
│       ├── stripe-webhook/index.ts    # Stripe webhook handler
│       └── send-invite/index.ts       # Resend email edge function
└── SETUP.md                           # Production setup guide
```

## Languages
- English, Français, Deutsch, Español

## Roadmap
- [x] Phase 1: UI complete, GitHub Pages deployed
- [ ] Phase 2: Supabase integration (real auth, DB, storage, realtime)
- [ ] Phase 3: Stripe payments + Resend email
- [ ] Phase 4: Video support (Mux) + custom domain
