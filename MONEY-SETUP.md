# Getting paid — money in your bank account

End to end: customer clicks Upgrade → pays → app unlocks automatically → money lands in
your bank. About 90 minutes of setup, then it runs without you.

---

## What happens now vs. what you're building

**Now:** the Upgrade button pops an alert saying checkout isn't wired up. Nobody can pay you.

**After this guide:**

```
Customer clicks Upgrade
   → Stripe Checkout (hosted by Stripe, you build nothing)
   → they pay $49
   → Stripe sends them back to your app with their licence key
   → app calls /api/verify, Stripe confirms the subscription is live, Pro unlocks
   → money sits in your Stripe balance
   → Stripe pays out to your bank automatically, every 2 days
```

You are not involved in any step after the first setup. Renewals, failed cards, dunning
emails, receipts, and cancellations are all Stripe's job.

---

## Before you start

Have ready:

- **Bank account details** — routing + account number. A business account is better than
  personal, but personal works to start.
- **SSN or EIN.** Stripe is legally required to verify identity. Sole proprietor: SSN is
  fine. If you have an LLC, use the EIN.
- **Your legal name and address**, matching the bank account.
- A phone that receives SMS.

> **Name matching matters.** The name on your Stripe account must match the bank account.
> Mismatches are the most common cause of held payouts.

---

## Step 1 — Create the Stripe account (20 min)

1. https://dashboard.stripe.com/register
2. Business type: **Individual/Sole proprietor** unless you formed an LLC.
3. Industry: **Software / SaaS**.
4. Business website: `https://certpay.net`
5. Product description — be specific, vague answers trigger review:
   > *Web-based software that generates and validates U.S. Department of Labor certified
   > payroll forms (WH-347) and state equivalents for construction contractors. Sold as a
   > monthly subscription.*
6. Add your bank account under **Payouts**.
7. Complete identity verification.

Stripe charges **2.9% + 30¢** per transaction. On a $49 subscription you net **$47.28**.
No monthly fee, no setup fee.

---

## Step 2 — Create the products (15 min)

Dashboard → **Product catalogue** → **Add product**.

**Product 1 — CertPay Pro**
- Name: `CertPay Pro`
- Price: `49.00 USD`, **Recurring**, **Monthly**
- **Tax code: `Software as a Service (SaaS) — Business Use`** (`txcd_10103001`)
- Save, then **Add another price** on the same product: `490.00 USD`, Recurring, **Yearly**

**Product 2 — CertPay Firm**
- Name: `CertPay Firm`
- Price: `149.00 USD`, Recurring, Monthly
- Same tax code: `txcd_10103001`

> **On the tax category:** do not leave it as *General — Electronically Supplied Services*.
> Stripe's own docs warn against that code for US sales — it taxes you like a downloaded
> digital good rather than hosted software, which is wrong in several states. Full reasoning
> in `TAX-SETUP.md`.

---

## Step 3 — Create the Payment Link (10 min)

This is the bit that connects Stripe back to your app.

1. Dashboard → **Payment links** → **New**
2. Product: **CertPay Pro**, monthly price
3. Open **Options** and set:

| Setting | Value |
|---|---|
| After payment | **Redirect customers to your website** |
| Redirect URL | `https://certpay.net/app/?key={CHECKOUT_SESSION_ID}` |
| Allow promotion codes | On (useful for launch discounts) |
| Collect customer address | Off — you don't need it |

4. Create, then copy the link. It looks like `https://buy.stripe.com/aBc123XyZ`.

> **About the redirect:** `{CHECKOUT_SESSION_ID}` is a Stripe placeholder it fills in
> automatically. See the note at the bottom about using the subscription id instead — the
> simplest reliable setup is Step 3b.

### Step 3b — the reliable version (recommended)

Session IDs expire. For a licence key that keeps working, have customers use their
**subscription ID**, which is on every Stripe receipt and starts with `sub_`.

Set the redirect URL to just:

```
https://certpay.net/app/?upgraded=1
```

Then in Stripe → **Settings → Customer emails**, turn on **Successful payments** so every
customer automatically gets a receipt containing their subscription ID. The app's
"Enter licence key" box accepts it.

This is one extra copy-paste for the customer and zero moving parts for you. Start here;
polish later if it becomes a complaint.

---

## Step 4 — Put the link in the app (2 min)

Open `app/app.js`, find near the top of the `Pay` object:

```js
CHECKOUT_URL: '',
```

Paste your link:

```js
CHECKOUT_URL: 'https://buy.stripe.com/aBc123XyZ',
```

Commit and push. Cloudflare redeploys in about a minute.

---

## Step 5 — Switch on licence verification (10 min)

The file `functions/api/verify.js` is already written. It runs on Cloudflare's free tier
and asks Stripe whether a subscription is genuinely active. It needs your Stripe key.

1. Stripe → **Developers → API keys** → reveal the **Secret key** (`sk_live_...`)
2. Cloudflare → your Pages project → **Settings → Environment variables**
3. **Add variable**:
   - Name: `STRIPE_SECRET_KEY`
   - Value: your `sk_live_...` key
   - **Click "Encrypt"** — this is important
   - Environment: **Production**
4. Save, then **Deployments → Retry deployment** so the variable takes effect.

Test it:

```bash
curl -X POST https://certpay.net/api/verify \
  -H "Content-Type: application/json" \
  -d '{"key":"sub_fake"}'
```

Expect `{"ok":false,"reason":"not_found"}`. If you get `not_configured`, the variable
didn't save or you didn't redeploy.

> **Never put the secret key in your code.** It lives only in Cloudflare's encrypted
> environment variables. Anyone with that key can issue refunds from your account. If it
> ever leaks, roll it in Stripe immediately.

---

## Step 6 — Test with a real card, then refund yourself

Test mode doesn't prove the live path works. Spend $49 to be certain.

1. Open `https://certpay.net/app/` in an incognito window
2. Add 16 workers to trigger the upgrade prompt
3. Click **Upgrade**, pay with your own card
4. Confirm you land back in the app
5. Copy the `sub_...` from your emailed receipt, paste into **Enter licence key**
6. Confirm the watermark disappears and the crew limit lifts
7. Stripe → Payments → your payment → **Refund**

Also verify the failure path: in a fresh incognito window, paste a made-up key. It should
refuse.

---

## Step 7 — When the money actually arrives

| | Timing |
|---|---|
| **First payout** | **7–14 days** after your first payment — Stripe holds new accounts to check for fraud. This cannot be waived. |
| Every payout after | Rolling **2 business days** |
| Weekends/holidays | Push to the next business day |

So your first customer's $49 lands roughly two weeks later. After that it's continuous.

Set the schedule under **Settings → Payouts**. Daily rolling is the default and is fine.

---

## What you owe

Stripe does **not** withhold taxes. Set aside roughly **25–30%** of net revenue for income
and self-employment tax. Stripe issues a **1099-K** in January.

Sales tax on SaaS varies by state and only matters above thresholds you're nowhere near.
Revisit around $10k/year, or ask an accountant then — not now.

---

## Honest note on the licence model

The check is genuine — it asks Stripe whether a subscription is real and live. But like all
client-side licensing, a determined person could edit their browser storage.

That's fine, and here's why: a contractor whose business depends on filing correct federal
compliance forms is not going to hack a browser to dodge $49/month, and if they did, they'd
be exactly the customer you don't want. The check exists to stop casual sharing, not a
determined attacker.

The real protection is that Pro features (state forms, unlimited projects, no watermark)
are worth more than the effort of stealing them.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Upgrade button shows "not wired up" | `CHECKOUT_URL` still empty in `app/app.js` |
| `/api/verify` returns `not_configured` | `STRIPE_SECRET_KEY` missing, or you didn't redeploy |
| Key rejected with `malformed` | They pasted something that isn't a `sub_...` id |
| Key rejected with `not_found` | Live key vs test key mismatch — check which mode you're in |
| Payout not arriving | First payout is 7–14 days; then check for a verification request in Stripe |
| Pro lost after a week offline | By design — it re-verifies weekly when online. Grace period is `Pay.GRACE_DAYS`. |
