# Getting CertPay live

Everything below is free except two optional items, both flagged. Follow it top to bottom
and you will have a live site, an installable app, and a Play Store listing.

---

## 1. Put the site online — 10 minutes, $0

The whole project is static files. No build step, no server, no database.

### Cloudflare Pages (recommended)

```bash
cd certpay
git init && git add -A && git commit -m "CertPay v1"
gh repo create certpay --public --source=. --push     # or push to GitHub manually
```

Then at https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git:

| Setting | Value |
|---|---|
| Build command | *(leave empty)* |
| Build output directory | `/` |
| Framework preset | None |

You get `certpay.pages.dev` immediately, with HTTPS. That is enough to launch.

### Netlify alternative

Drag the folder onto https://app.netlify.com/drop. `netlify.toml` is already configured.

### A custom domain — optional, ~$10/yr

`certpay.net` or similar from Cloudflare Registrar (sold at cost). Not required to start,
but you need a real domain before submitting to Google Play, and it helps SEO. If you skip
it, replace every `certpay.net` in the HTML with your `.pages.dev` address.

**After deploying, update these:**
- `sitemap.xml` — the six URLs
- `robots.txt` — the sitemap line
- `<link rel="canonical">` in each page
- `store/twa/twa-manifest.json` — the host

---

## 2. Verify it works — 5 minutes

```bash
node test.js     # 60 engine tests
node e2e.js      # 64 browser tests (needs: npx playwright install chromium)
```

Then on the live URL, by hand:
1. Open `/app/`, load the example rates, add a worker, enter hours.
2. Check the Review tab flags what it should.
3. Print to PDF and confirm both pages look right.
4. On a phone, Safari or Chrome → Add to Home Screen → confirm it opens full-screen.
5. Turn on aeroplane mode and confirm it still loads.

---

## 3. Take payments — 20 minutes, $0 upfront

Stripe takes 2.9% + 30¢ on actual revenue and nothing otherwise.

1. Create a Stripe account.
2. Products → add **CertPay Pro**, recurring, **$29/month**. Add a **$290/year** price too.
3. Payment Links → create a link for the monthly price.
4. Under "After payment" → redirect to `https://certpay.net/app/?upgraded=1`.
5. Paste the link into `app/app.js`:

```js
const Pay = {
  CHECKOUT_URL: 'https://buy.stripe.com/your_link_here',
```

That is the whole integration. The app sets a `localStorage` flag on return and unlocks.

> **Yes, that is bypassable.** Someone could set the flag by hand. Ship it anyway — anyone
> willing to edit `localStorage` to dodge $29 was never going to pay you. Licence-key
> validation is a problem worth solving at 50 paying customers, not at zero. There is
> already a `Pay.enterKey()` stub for when you want to issue keys manually.

---

## 4. Google Play — ~2 hours, $25 once

Full walkthrough in `store/twa/build-instructions.md`. Summary:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://certpay.net/app/manifest.webmanifest
bubblewrap build
bubblewrap fingerprint list      # paste SHA-256 into /.well-known/assetlinks.json, redeploy
```

Upload the `.aab`, use the listing copy in `store/listing.md`, declare **no data collected**
(true), point the privacy policy at `/privacy/`.

**Do not skip the asset links step** — without it the app shows a browser address bar.

## 5. Apple App Store

Read `store/ios-reality-check.md` first. Short version: Apple rejects PWA wrappers under
Guideline 4.2.2, there is no TWA equivalent, and the Safari "Add to Home Screen" install
already gives iPhone users a real full-screen offline app for $0. Revisit after you have
revenue, and only with a genuine native feature such as timesheet scanning.

---

## 6. Get traffic — the part that decides whether this works

The app is maybe 20% of the outcome. Three guides are already written and indexed-ready at
`/guides/`. What to do with them:

**Search.** These are high-intent, low-competition queries from people with a Friday
deadline. The three published pages target:
- "how to fill out WH-347"
- "certified payroll overtime fringe benefits"
- "California A-1-131 certified payroll"

Next ten to write, in priority order:
1. New York certified payroll requirements
2. New Jersey certified payroll
3. Illinois certified payroll and the Prevailing Wage Act
4. "Do I need certified payroll for a $5,000 job?"
5. Certified payroll for subcontractors specifically
6. What triggers a Davis-Bacon audit
7. Apprentice rates and DAS 140/142 in California
8. "QuickBooks certified payroll" (high volume, and the answer is "it can't")
9. Prevailing wage vs union wage
10. Certified payroll penalties by state

Submit `sitemap.xml` to Google Search Console the day you deploy.

**Reddit.** r/Contractor, r/GovernmentContracting, r/Construction, r/Bookkeeping all have
recurring "drowning in WH-347s" threads. Answer the actual question thoroughly, link once at
the end. Never lead with the link.

**Bookkeepers are the highest-leverage target.** One bookkeeper serving construction clients
brings five to ten contractors at once, and they are the natural Firm-tier buyer. Find them
in r/Bookkeeping, QuickBooks ProAdvisor directories, and regional Facebook groups.

**Facebook Groups.** Regional contractor groups are unusually active and almost entirely
unserved by software marketing.

---

## What to expect

| When | What happens |
|---|---|
| Weeks 1–4 | Zero revenue. Content isn't indexed. This is normal and it is where most people quit. |
| Months 2–3 | First paying customers, usually from Reddit rather than search. |
| Months 4–6 | SEO compounds. $500–$2,000 MRR is a reasonable target with consistent publishing. |

This is a $2,000–$10,000/month business if it works, not a $1M one. That is the right shape
for zero capital, and a few thousand a month from static files is a genuinely good outcome.

---

## Build order after launch

1. **More state forms.** New York, New Jersey, Illinois. Contractors there must file the
   state form *in addition* to WH-347, the data model is identical, and each one is a fresh
   set of keywords. Highest ROI by a wide margin.
2. **CSV import** from QuickBooks and Gusto timesheets — kills the "I'd have to retype
   everything" objection.
3. **Filing calendar with reminders** — drives the weekly habit that prevents churn.
4. **Wage determination lookup** from SAM.gov so rates aren't hand-typed.
