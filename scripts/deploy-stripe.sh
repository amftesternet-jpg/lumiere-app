#!/bin/bash
PROJECT_ID="zgsdfaazwuphuigvmupw"
supabase functions deploy create-checkout --project-ref $PROJECT_ID
supabase functions deploy stripe-webhook --project-ref $PROJECT_ID
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" STRIPE_PRICE_PRO="$STRIPE_PRICE_PRO" STRIPE_PRICE_ELITE="$STRIPE_PRICE_ELITE" STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" --project-ref $PROJECT_ID
