# Store listing copy

Paste-ready. Character limits are Google Play's.

---

## App name (30 max)

```
CertPay: Certified Payroll
```

## Short description (80 max)

```
WH-347 & California A-1-131 certified payroll. Catches underpayment before you file.
```
(79 characters)

## Full description (4000 max)

```
CertPay generates the certified payroll reports contractors have to file every week on
government-funded construction jobs — and checks the maths before you sign.

Form WH-347 for federal Davis-Bacon projects. Form A-1-131 for California public works.
Both pages, print-ready, in minutes.


WHY CONTRACTORS USE IT

Certified payroll is due weekly, for every project, for as long as your crew is on site.
The Department of Labor estimates it takes about 55 minutes per report by hand. The
software that automates it starts at $300–$1,200 a month, and QuickBooks Payroll and Gusto
don't produce the form at all.

CertPay is free for up to fifteen workers, and a flat $49 a month after that — no per-worker
or per-report charges.


IT CHECKS THE MATHS, NOT JUST THE FORMAT

Most tools print whatever you type. CertPay compares every worker against your wage
determination and tells you the exact shortfall in dollars:

"Short $9.05/hr on 40 hours — $362.00 owed."

It also catches full Social Security numbers where the DOL wants only the last four,
missing classifications, underpaid overtime, deductions that look excessive, and net wages
that don't tie to the cheque.


OVERTIME THE WAY DAVIS-BACON ACTUALLY WORKS

The overtime premium applies to the base rate only. Fringe benefits are owed on every hour
at the straight rate and are never multiplied. Getting that backwards is the classic
back-wage finding — CertPay gets it right automatically, whether you pay fringe in cash or
into a bona fide plan.


REAL CALIFORNIA SUPPORT

Not a relabelled federal form. Switch a project to California and the whole engine changes:

• Daily overtime over 8 hours at 1.5x
• Double time over 12 hours
• The seventh-consecutive-day rule
• SDI withheld automatically
• Employee addresses and cheque numbers
• The full 13-column deduction grid the A-1-131 requires

A four-day, ten-hour week produces zero overtime under the federal rule and eight hours
under California's. Federal-only software reports that payroll as clean. CertPay doesn't.


WEEK TWO TAKES FIVE MINUTES

"Start next week from this one" carries your crew, classifications and rates forward and
zeroes the hours. After the first setup, entering hours is the whole job.


YOUR PAYROLL DATA NEVER LEAVES YOUR DEVICE

No account. No sign-up. No server. Names, wages and partial SSNs are stored on your own
device and nowhere else. Works with no signal in a job trailer. Back up to a file whenever
you like.


FEATURES

• Form WH-347 (federal Davis-Bacon), both pages
• Form A-1-131 (California public works), both pages
• Statement of Compliance with the correct 4(a)/4(b) fringe election
• Automatic straight time, overtime and double time
• FICA and California SDI calculated for you
• Compliance check before every filing
• Multiple projects and payroll weeks
• CSV export
• Print or save as PDF
• Works completely offline


PRICING

Free — up to 15 workers, one project, watermarked printout
Pro, $49/month — unlimited workers and projects, no watermark, CSV export
Firm, $149/month — unlimited client companies, for bookkeepers filing on behalf of contractors


CertPay is a form-preparation and validation tool. It is not legal, tax or payroll advice,
and it is not affiliated with or endorsed by the U.S. Department of Labor or the California
Department of Industrial Relations. You remain responsible for the accuracy of what you
sign and submit.
```

---

## Category & tags

- **Category:** Business
- **Tags:** construction, payroll, compliance, contractors, prevailing wage
- **Content rating:** Everyone
- **Ads:** No
- **In-app purchases:** Yes ($49–$149) — if billing runs through your own Stripe checkout
  on the web rather than Play Billing, declare it accurately and be aware Google requires
  Play Billing for digital goods sold *inside* the app. The safe pattern for a TWA is to
  keep upgrade purchases on the website and not surface a purchase button in the Android
  app.

## Data safety declaration

Answer **"No data collected"** and **"No data shared"**. This is accurate — all state lives
in `localStorage` on the device. Tick "Data is encrypted in transit" (HTTPS) and note that
users can delete their data by clearing the app.

## Screenshots to capture (1080×1920, minimum 2, up to 8)

1. Hours grid with overtime highlighted
2. Compliance check showing a caught underpayment with the dollar figure
3. The finished WH-347
4. California A-1-131 with daily overtime
5. Pricing / free tier

Generate them with `node shots.js` from the repo root.
