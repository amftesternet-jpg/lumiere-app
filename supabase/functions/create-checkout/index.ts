import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { event_slug, tier } = await req.json();

    if (!event_slug || !tier) {
      return new Response(JSON.stringify({ error: "Missing event_slug or tier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PRICES: Record<string, string> = {
      pro:   Deno.env.get("STRIPE_PRICE_PRO")!,
      elite: Deno.env.get("STRIPE_PRICE_ELITE")!,
    };

    if (!PRICES[tier]) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    let userEmail = undefined;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const payload = JSON.parse(atob(token.split(".")[1]));
        userEmail = payload.email;
      } catch {}
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: PRICES[tier], quantity: 1 }],
      mode: "payment",
      success_url: `https://amftesternet-jpg.github.io/lumiere-app/?upgraded=${event_slug}&tier=${tier}`,
      cancel_url: `https://amftesternet-jpg.github.io/lumiere-app/`,
      customer_email: userEmail,
      metadata: { event_slug, tier },
      automatic_tax: { enabled: false },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
