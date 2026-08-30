# Stripe Tax — which product category to pick

## The answer

**Software as a Service (SaaS) — Business Use**

Tax code: `txcd_10103001`

Type that into the category search box during activation. If you're setting it on the
product itself later: Stripe → Product catalogue → CertPay Pro → Edit → Tax code.

---

## Why not the one it's defaulting to

The note you're reading — *"A digital service provided mainly through the internet with
minimal human involvement…"* — is the description of **General — Electronically Supplied
Services** (`txcd_10000000`).

Stripe's own documentation says, in plain language:

> **Don't use General — Electronically Supplied Services (`txcd_10000000`) for US sales.**
> This generic code doesn't capture the distinctions that determine taxability in many
> states, and might result in incorrect tax calculations.

The note even hints at it: *"taxes will be similar to those for a generic digital item like
downloaded music."* Downloaded music is a **digital good** — a thing the customer keeps.
Several states tax downloaded digital goods but exempt SaaS entirely. Leaving this default
in place would have Stripe collecting tax in states where you owe none, on the wrong basis.

---

## Why SaaS — Business Use is right for CertPay

Stripe's SaaS codes split four ways. Here's how CertPay lands on each axis:

| Question | CertPay | Consequence |
|---|---|---|
| Hosted/cloud, or downloaded? | **Hosted** — runs in the browser, nothing installed | SaaS, not Downloadable Software |
| Customised per buyer? | **No** — same product for everyone | Prewritten, which the SaaS codes assume |
| Personal or business use? | **Business** — contractors and bookkeepers, never consumers | Business Use |

That gives `txcd_10103001`.

**The business-use half genuinely matters.** Several states treat the two differently:

- **Ohio** taxes SaaS *only* for business use
- **Iowa** taxes SaaS for personal use, *not* business use
- **Connecticut** taxes SaaS to businesses at a *reduced* rate

Nobody buys certified payroll software for personal use. It's a Davis-Bacon compliance
tool. "Business use" is unambiguous here, and picking "personal" would produce wrong
answers in those states.

---

## One honest wrinkle: the Android app

There's a code called **SaaS — electronic download — business use** (`txcd_10103101`), for
SaaS that "includes an electronic transfer to the customer, such as an app download."

CertPay does ship an Android app and installs as a PWA, so it's fair to ask.

**Stick with `txcd_10103001` anyway**, because:

1. The Play Store app is a **Trusted Web Activity** — a thin wrapper that loads your
   website. No software is transferred; it's a browser pointed at your domain.
2. **The subscription is sold on the web**, not through an app store. What the customer buys
   is hosted access.
3. The offline capability is browser caching, not a licensed copy they own.

If you ever sold a genuine downloadable desktop version, revisit this. Today you don't.

---

## What this actually means for you right now

Here's the part that matters more than the code: **at zero revenue you have no obligation to
collect sales tax anywhere.**

Sales tax obligations start when you have *nexus* in a state — either physical presence or
crossing an economic threshold. Typical thresholds are **$100,000 in sales or 200
transactions** into that state, per year.

At $49/month, one state's threshold is roughly **170 subscribers in that single state**.
You are nowhere near this, and won't be for a long time.

### Georgia specifically — your home state

You're in Brunswick, so Georgia is where you have physical presence from day one. Good news:

> **Georgia does not tax SaaS.** The DOR's position is that remotely-accessed software
> isn't tangible personal property — there's no transfer of possession, so no taxable sale.

Georgia *does* tax downloaded digital goods and prewritten software delivered
electronically. Which is precisely why the default "generic digital item like downloaded
music" category is the wrong one to leave in place — it points at the taxable bucket rather
than the exempt one.

### So what should you switch on?

1. **Set the product code correctly** — `txcd_10103001`. Do this now; it costs nothing and
   means every future calculation starts from the right basis.
2. **Turn on Stripe Tax's threshold monitoring.** This is the genuinely useful feature at
   your stage. It watches your sales by state and tells you *when* you approach a
   registration threshold, so you find out before you have a problem.
3. **Don't worry about collection yet.** With no nexus, Stripe will calculate $0 and that's
   correct.

> **Note:** Stripe Tax charges a fee per transaction where it calculates tax. Check the
> current rate on Stripe's pricing page before enabling it broadly — at your volume it's
> trivial, but know the number.

---

## The limitation worth understanding

Stripe Tax **calculates and collects. It does not register you with states, and it does not
file or remit returns.**

That's a real gap people miss. If you ever do cross a threshold, you must:

1. Register with that state's revenue department
2. Add the registration in Stripe so it starts collecting
3. **File returns and send them the money** — Stripe won't

At that point, get an accountant. It'll cost a few hundred dollars and save you from a
category of problem you don't want.

---

## Summary

| | |
|---|---|
| Category to select | **Software as a Service (SaaS) — Business Use** |
| Tax code | `txcd_10103001` |
| Avoid | General — Electronically Supplied Services (`txcd_10000000`) |
| Your home state | Georgia — **does not tax SaaS** |
| Nexus threshold | ~$100k or 200 transactions per state |
| Obligation today | **None.** Set the code, enable monitoring, carry on. |

None of this is tax advice — I'm a tool, not your accountant. But the product code question
has a clear right answer, and Stripe documents it plainly. When real revenue arrives, hand
this page to a CPA and let them confirm.
