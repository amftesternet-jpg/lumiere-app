// ═══════════════════════════════════════════════════
// Supabase Edge Function: send-invite
// Deploy: supabase functions deploy send-invite
// Requires: RESEND_API_KEY env var
// ═══════════════════════════════════════════════════
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, event_name, event_date, event_location, guest_link, qr_data_url } = await req.json()
    if (!to || !guest_link) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#F5F0E8;font-family:'Helvetica Neue',Arial,sans-serif;}
  .wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:#1C1C1A;padding:32px;text-align:center;}
  .logo{font-size:28px;color:#C9A96E;font-style:italic;font-family:Georgia,serif;letter-spacing:-0.5px;}
  .body{padding:32px;}
  .event-name{font-size:22px;font-weight:600;color:#1A1814;margin-bottom:8px;font-family:Georgia,serif;}
  .event-meta{font-size:14px;color:#6B6560;margin-bottom:24px;}
  .qr-section{text-align:center;margin:24px 0;}
  .qr-section img{border-radius:12px;border:1px solid #E8DCC8;}
  .cta{display:block;background:#C9A96E;color:#fff;text-decoration:none;padding:14px 24px;border-radius:50px;text-align:center;font-weight:500;font-size:15px;margin:24px 0;}
  .instructions{background:#FAF7F2;border-radius:12px;padding:20px;margin-top:16px;}
  .instructions h3{font-size:14px;font-weight:600;color:#1A1814;margin-bottom:12px;}
  .step{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;font-size:13px;color:#6B6560;}
  .step-num{background:#C9A96E;color:#fff;width:20px;height:20px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;}
  .footer{text-align:center;font-size:12px;color:#6B6560;padding:20px;border-top:1px solid #E8DCC8;}
</style></head><body>
<div class="wrap">
  <div class="header"><div class="logo">Lumière</div></div>
  <div class="body">
    <p style="font-size:15px;color:#6B6560;margin-bottom:16px">You're invited to join</p>
    <div class="event-name">${event_name}</div>
    <div class="event-meta">${[event_date, event_location].filter(Boolean).join(' · ')}</div>
    ${qr_data_url ? `<div class="qr-section">
      <p style="font-size:13px;color:#6B6560;margin-bottom:12px">Scan this QR code with your phone camera</p>
      <img src="${qr_data_url}" width="180" height="180" alt="QR code for ${event_name}">
    </div>` : ''}
    <p style="font-size:14px;color:#6B6560;text-align:center;margin-bottom:8px">Or tap the button below</p>
    <a href="${guest_link}" class="cta">📸 Open Photo Gallery</a>
    <div class="instructions">
      <h3>How to add your photos</h3>
      <div class="step"><span class="step-num">1</span><span>Open the link or scan the QR code</span></div>
      <div class="step"><span class="step-num">2</span><span>Enter your name</span></div>
      <div class="step"><span class="step-num">3</span><span>Tap to upload a photo — it appears instantly!</span></div>
    </div>
  </div>
  <div class="footer">
    <p>No app download needed. Photos shared securely via Lumière.</p>
    <p style="margin-top:8px"><a href="https://lumiere-app.com" style="color:#C9A96E">lumiere-app.com</a></p>
  </div>
</div>
</body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Lumière <hello@lumiere-app.com>',
        to: Array.isArray(to) ? to : [to],
        subject: `You're invited: ${event_name}`,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Resend error')

    return new Response(JSON.stringify({ sent: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
