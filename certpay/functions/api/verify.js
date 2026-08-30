/**
 * CertPay licence verification — Cloudflare Pages Function
 *
 * Runs at https://certpay.net/api/verify
 * Free on Cloudflare's plan (100k requests/day). No server to manage.
 *
 * The app calls this with a licence key. We ask Stripe whether the matching
 * subscription is actually live, and answer yes or no. The customer's payroll
 * data never comes near this endpoint — only the key.
 *
 * Required environment variable (set in Cloudflare Pages → Settings → Env vars):
 *   STRIPE_SECRET_KEY   sk_live_...   marked "Encrypt"
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store'
};

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost({ request, env }) {
  const reply = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });

  if (!env.STRIPE_SECRET_KEY) {
    return reply({ ok: false, reason: 'not_configured' }, 503);
  }

  let key = '';
  try {
    const body = await request.json();
    key = String(body.key || '').trim();
  } catch (e) {
    return reply({ ok: false, reason: 'bad_request' }, 400);
  }

  // Licence keys are the Stripe subscription id, which always starts "sub_".
  if (!/^sub_[A-Za-z0-9]{6,}$/.test(key)) {
    return reply({ ok: false, reason: 'malformed' });
  }

  const res = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
  );

  if (!res.ok) return reply({ ok: false, reason: 'not_found' });

  const sub = await res.json();
  const live = sub.status === 'active' || sub.status === 'trialing';

  return reply({
    ok: live,
    reason: live ? 'active' : sub.status,
    // Let the client cache the unlock for a week, then re-check.
    until: live ? Date.now() + 7 * 24 * 60 * 60 * 1000 : 0,
    plan: sub.items?.data?.[0]?.price?.nickname || 'Pro'
  });
}

// Anything other than POST
export async function onRequestGet() {
  return new Response(
    JSON.stringify({ ok: false, reason: 'post_only' }),
    { status: 405, headers: JSON_HEADERS }
  );
}
