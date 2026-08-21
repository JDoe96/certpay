# CertPay

Certified payroll for construction contractors. Generates **DOL Form WH-347** (federal
Davis-Bacon) and **California Form A-1-131** (public works), and validates the payroll
against the wage determination before you file.

No build step, no framework, no server, no database, no accounts. Static files and
`localStorage`.

```
node test.js     # 60 engine tests
node e2e.js      # 64 browser tests (needs: npx playwright install chromium)
python3 -m http.server 3000
```

---

## Why this niche

I checked the obvious "zero-budget app" ideas first. CSV-to-QBO converters, IFTA
calculators, invoice generators — all dead. Each already has a dozen free, no-signup,
SEO-optimised competitors owning page one. You cannot charge for something with five free
equivalents.

Certified payroll is different:

| Fact | Consequence |
|---|---|
| Filed **weekly, per project**, by every contractor and sub on a covered job | Recurring, habit-forming, low churn |
| DOL estimates **~55 min per report** by hand | Real pain, measurable in hours |
| Automation tools start at **$300–$1,200/month** | Enormous price umbrella |
| QuickBooks Payroll and Gusto **don't produce it at all** | No incumbent owns the small end |
| Penalties ~**$13,500 per violation**; California **$100/worker/day** | Fear-driven purchase |
| Due within 7 days of the pay date | Deadline urgency closes sales |

A ten-person electrical sub with one school-district job cannot justify $500/month and
cannot get the feature from software they already pay for. They do it in Excel every
Friday. That is the customer.

---

## What's built

### Calculation engine (`app/engine.js`)
Pure logic, no DOM, runs in the browser and under Node. 60 unit tests.

- **Federal Davis-Bacon overtime** — premium is **1.5× the base rate only**; fringe is paid
  on every hour at the straight rate and is never multiplied. Getting this backwards is the
  classic back-wage finding.
- **California overtime** — daily over 8 at 1.5×, over 12 at 2×, seventh consecutive day at
  1.5× then 2× beyond eight hours, plus the weekly 40-hour rule. A 4×10 week generates zero
  federal overtime and eight hours of California overtime; federal-only software calls that
  payroll clean.
- **Cash vs bona fide plan fringe** handled separately — changes both the printed rate and
  the 4(a)/4(b) election on the certification.
- **Split-week workers** — overtime allocated to the project in proportion to project hours.
- **Per-day allocation** so the printed grid reads naturally (10/10/10/10 + 8 OT, not
  smeared decimals) while still summing exactly to the weekly totals.
- Auto FICA (7.65%) and California SDI (1.1%), both overridable.

### Compliance validator
The actual differentiator. It does not just print a form, it blocks bad filings:

- Total package below the determination, **with the exact dollar shortfall and back wages
  owed** — "Short $9.05/hr on 48 hours ≈ $434.40 owed"
- Full SSN where the DOL requires last-four only
- Missing classifications, underpaid overtime or double time, negative net wages
- Deductions over 35% of gross, fringe method conflicting with the certification
- California: missing CSLB licence, DIR registration, DIR Project ID, cheque number,
  employee address

### Forms
Faithful reproductions, print to PDF:
- **WH-347** — landscape payroll grid with S/O row pairs and correct DOL column numbering
  (1)–(9), plus the Statement of Compliance with real Copeland Act text and 4(a)/4(b) boxes.
- **A-1-131** — the California layout: employee addresses, cheque numbers, gross split
  this-project/all-projects, and the full 13-category deduction grid.

### App
Six-step flow, multi-project, offline-first PWA. "Start next week from this one" carries
crew, classifications and rates forward and zeroes the hours — the retention feature that
turns week two into a five-minute job.

**Data never leaves the device.** No account, no server, no breach surface. Verified: the
app loads, persists and calculates with the network disabled.

### Site
- Landing page with pricing
- Three long-form SEO guides (the traffic engine)
- Privacy policy (required by Google Play)
- `robots.txt`, `sitemap.xml`, JSON-LD structured data

---

## Layout

```
index.html                     landing page
site.css                       marketing styles
privacy/                       privacy policy
guides/
  how-to-fill-out-wh-347/
  certified-payroll-overtime-fringe-benefits/   (with a live calculator)
  california-a-1-131-certified-payroll/
app/
  index.html  app.js  app.css  engine.js
  manifest.webmanifest  sw.js
icons/                         app icons + Play feature graphic
store/
  listing.md                   paste-ready store copy
  ios-reality-check.md         why Apple rejects this, and what to do instead
  twa/                         Google Play packaging
  screens/                     1080×1920 store screenshots
test.js  e2e.js  shots.js      tests and screenshot generator
DEPLOY.md                      step-by-step launch guide
```

---

## Testing

| Suite | Count | Covers |
|---|---|---|
| `test.js` | 60 | Overtime maths (federal + CA), fringe handling, per-day allocation, deductions, validator |
| `e2e.js` | 64 | Full UI in Chromium: workflow, persistence, plan limits, both forms, PWA, mobile layout, console errors |

Both green. `e2e.js` fails the build on any console error.

---

## Business model

| Plan | Price | Unlock |
|---|---|---|
| Free | $0 | 5 workers, 1 project, watermarked |
| Pro | **$29/mo** or $290/yr | Unlimited workers and projects, no watermark, CSV export |
| Firm | **$79/mo** | Multiple companies — for bookkeepers filing for clients |

$29 is deliberate. Below $9 reads as unserious for a compliance product, and you need
headroom for the Firm tier, which is where the real money is: one bookkeeper serving eight
construction clients is worth more than eight individual contractors.

Payment is a Stripe Payment Link plus a `localStorage` flag — see `DEPLOY.md` step 3. It is
bypassable on purpose. Anyone who would edit `localStorage` to dodge $29 was never a
customer, and licence validation is a problem for 50 paying users, not zero.

---

## Publishing

- **Web** — Cloudflare Pages or Netlify, free, ~10 minutes.
- **Installable PWA** — already works. Add to Home Screen on iOS and Android.
- **Google Play** — Trusted Web Activity via Bubblewrap, **$25 once**. Full walkthrough in
  `store/twa/build-instructions.md`.
- **Apple App Store** — not viable as a wrapper. Guideline 4.2.2 rejects repackaged
  websites and there is no TWA equivalent. `store/ios-reality-check.md` explains the options
  honestly; the short version is that Safari's Add to Home Screen already gives iPhone users
  a real full-screen offline app for $0, and the App Store is not where contractors search
  for certified payroll software.

---

## Honest expectations

Weeks 1–4: no revenue, content not yet indexed. This is where most people quit.
Months 2–3: first customers, usually from Reddit rather than search.
Months 4–6: SEO compounds; $500–$2,000 MRR is reasonable with consistent publishing.

This is a **$2k–$10k/month business** if it works, not a $1M one. That is the correct shape
for zero capital. The app is roughly 20% of the outcome — the guides and the distribution
work are the rest.

---

## Legal positioning

CertPay is a form-preparation and validation tool, not legal, tax or payroll advice, and is
not affiliated with or endorsed by the U.S. Department of Labor or the California Department
of Industrial Relations. The contractor is responsible for the accuracy of what they sign.
This is stated in the footer, the privacy policy, and on the printed output.

The forms are public-domain government documents, which is why generating them is
permissible. Do not imply endorsement.
