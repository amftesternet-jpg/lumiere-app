// ═══════════════════════════════════════════════════
// Supabase Edge Function: create-checkout
// Deploy: supabase functions deploy create-checkout
// ═══════════════════════════════════════════════════
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() })

const PRICE_IDS = {
  pro:   Deno.env.get('STRIPE_PRICE_PRO')!,   // €29
  elite: Deno.env.get('STRIPE_PRICE_ELITE')!,  // €79
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { event_slug, tier, success_url, cancel_url } = await req.json()
    if (!event_slug || !tier || !PRICE_IDS[tier]) {
      return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400, headers: corsHeaders })
    }

    // Verify the user owns this event
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: event } = await supabase.from('events').select('slug').eq('slug', event_slug).eq('owner_id', user.id).single()
    if (!event) return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404, headers: corsHeaders })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      mode: 'payment',
      success_url: success_url || `https://lumiere-app.com/dashboard?upgraded=${event_slug}`,
      cancel_url: cancel_url || `https://lumiere-app.com/dashboard`,
      metadata: { event_slug, tier, user_id: user.id },
      automatic_tax: { enabled: true },  // EU VAT
      customer_email: user.email,
    })

    return new Response(JSON.stringify({ url: session.url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
