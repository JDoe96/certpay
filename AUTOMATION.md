# Automating the parts that don't need you

You're right that I'm a bottleneck. I write code, then hand you instructions, then you carry
them out. Here's what I've automated, what you can automate next, and — more usefully —
what genuinely cannot be, so you don't waste time trying.

---

## Already automated (running now)

### 1. Tests on every push — `.github/workflows/checks.yml`

Every time you push, GitHub runs 60 engine tests, 10 licence tests, and 64 browser tests.
If something breaks, you get an email. You start nothing.

### 2. Weekly live-site monitoring

Every Monday morning, GitHub checks your production site and emails you only if something
is wrong:

- All 19 pages and assets return 200
- The licence endpoint responds (and **warns you if Stripe isn't configured** — i.e. if
  customers silently cannot pay you)
- TLS certificate has more than 14 days left
- No stale placeholder text (`certpay.app`, `YOURDOMAIN`) leaked to production

That last one would have caught the wrong-domain problem before you did.

### 3. Android builds in the cloud — `.github/workflows/build-android.yml`

Five clicks, no Android SDK on your machine.

### 4. The entire payment loop, once configured

Customer pays → Stripe verifies → app unlocks → money moves to your bank. Renewals, failed
cards, dunning emails, receipts, cancellations: all Stripe. You touch none of it.

---

## Worth adding next

### Cloudflare Web Analytics — 5 minutes, free, no cookie banner

Cloudflare dashboard → **Analytics → Web Analytics** → add `certpay.net`. Paste the snippet
before `</body>` in `index.html`. Privacy-friendly, so no consent banner needed, which
matters because you're advertising that you don't track people.

Tells you which guide is pulling traffic — the single most useful number you don't have.

### Google Search Console — 10 minutes, free

https://search.google.com/search-console → add `certpay.net` → submit
`https://certpay.net/sitemap.xml`.

Without this you're guessing about SEO. With it you see the actual search terms people used
to find you, which tells you which guide to write next. **Do this one first.**

### Stripe email receipts — 2 minutes

Stripe → Settings → Customer emails → enable **Successful payments** and **Failed payments**.
Customers get receipts and dunning emails automatically. Zero code.

---

## What AI can genuinely do for you

Be concrete about this, because "add AI" is usually a way to avoid deciding something.

**Good uses, in order of value:**

1. **Drafting the next guides.** You have three. The list of ten more is in `DEPLOY.md`.
   Each takes me an hour and is the actual growth engine. This is the highest-value thing
   to keep using me for.
2. **Answering support email.** When a contractor asks "does this handle apprentice rates?",
   paste it to me and I'll draft a reply grounded in the regulation.
3. **Reviewing competitor pricing quarterly.** That $49-plus-per-report competitor didn't
   exist when I first researched this. Claims like "cheapest dedicated tool costs X" have a
   shelf life and are printed on your homepage.
4. **Writing state form logic.** New York, New Jersey, Illinois. Same data model, new
   keyword sets, highest ROI feature work.

**Bad uses:**

- **AI inside the app.** You said you don't want this, and you're right. CertPay's whole
  pitch is deterministic correctness — "$9.05/hr short, $434.40 owed" is checkable
  arithmetic. A language model guessing at prevailing wage rates would destroy the one
  thing that makes this product trustworthy. Keep the maths as code with tests.
- **Auto-posting to Reddit.** Fastest way to get banned and torch the channel.
- **AI-generated bulk content.** Ten thin AI articles rank worse than three good ones and
  risk a spam penalty.

---

## What cannot be automated, and why

Being straight with you, because knowing the boundary saves you time:

| Task | Why it needs you |
|---|---|
| Stripe identity verification | Legally must be a real human with an SSN and a bank account. No API. |
| Google Play developer account | $25 payment + government ID check, tied to a person. |
| The 12-tester requirement | Google requires 12 real accounts opting in for 14 days. |
| Cloudflare/registrar account actions | Auth-gated, deliberately. |
| Anything needing your bank, ID, or a card | By design — this is fraud prevention working. |
| Deciding price, positioning, what to build | I can research and recommend. The call is yours; you carry the risk. |
| Replying as a person on Reddit | I can draft. Posting as you, at scale, is how you get banned. |

The pattern: **anything requiring proof of who you are, or your money, or your judgement.**
Everything mechanical between those points is now automated.

### The realistic division of labour

```
Me:  research, code, tests, drafts, monitoring config, diagnosis
You: accounts, identity, money, judgement calls, being a human in public
```

That's roughly 80/20 in your favour by time — but your 20% is unavoidable, and mostly
front-loaded in setup.

---

## Your recurring workload, once set up

Weekly:
- Check the GitHub Actions email if one arrives (usually none)
- Answer support email

Monthly:
- Glance at Stripe: revenue, failed payments
- Glance at Search Console: which guides are ranking

Quarterly:
- Ask me to re-check competitor pricing and refresh claims
- Ask me to draft the next two guides

That's it. Under an hour a week once the setup is behind you.

---

## The honest bottleneck

The real constraint was never the code — it's that **this business needs a human doing
distribution**. Writing guides, answering contractors on Reddit, emailing bookkeepers.

I can draft all of it. I cannot be a person in a contractor forum on your behalf, and you
wouldn't want me to — that's the part that actually builds trust with this audience, and
faking it is both detectable and the fastest way to lose the channel.
