# Getting these changes onto your site

You already have `Documents\certpay` on GitHub and connected to Cloudflare. This is just an
update to those files.

**Total time: about 10 minutes.**

---

## Step 1 — Download the workspace again

Download the ZIP from this workspace, same as last time, and extract it somewhere
temporary — `Downloads\certpay-new` is fine.

Ignore `.android` and `.sudo_as_admin_successful` again if they appear. Junk.

---

## Step 2 — Copy the new files over the old ones

1. Open the extracted `certpay` folder
2. Select **everything inside it** (`Ctrl + A`)
3. Copy (`Ctrl + C`)
4. Open `Documents\certpay`
5. Paste (`Ctrl + V`)
6. Windows asks about duplicates → **"Replace the files in the destination"**

That's it. Nothing is lost — your `.git` folder is untouched, and Windows only replaces
files that exist in both places.

> **If you turned on hidden files earlier**, you'll also see `.github` and `.well-known` in
> the copy. Let those overwrite too — `.github` contains a new workflow you want.

---

## Step 3 — Push it

1. Open **GitHub Desktop**
2. It shows about 20 changed files on the left
3. Bottom-left summary box, type:

   ```
   Raise pricing, add Stripe licence verification, fix email
   ```

4. Click **Commit to main**
5. Click **Push origin** at the top

Cloudflare redeploys automatically, about a minute later.

---

## Step 4 — Check it worked

Open `https://certpay.net` in an **incognito window** (`Ctrl + Shift + N` — avoids cache).

- Pricing shows **$49** and **$149**
- Footer shows **info@certpay.net**
- `https://certpay.net/api/verify` — visiting in a browser should return
  `{"ok":false,"reason":"post_only"}`. **That response means the licence endpoint deployed
  correctly.**

If you get a 404 on that last one, the `functions` folder didn't copy. Check
`Documents\certpay\functions\api\verify.js` exists, then push again.

---

## What just changed

**New files:**

| File | What it does |
|---|---|
| `functions/api/verify.js` | Checks with Stripe whether a subscription is really active. Runs free on Cloudflare. |
| `functions/api/verify.test.mjs` | 10 tests for it |
| `.github/workflows/checks.yml` | Runs tests on every push + monitors your live site weekly |
| `MONEY-SETUP.md` | **Read this next** — how to get paid |
| `AUTOMATION.md` | What's automated, what can't be |
| `FIX-CLOUDFLARE.md`, `FIX-PARKING-PAGE.md`, `CLEANUP-WINDOWS.md` | Troubleshooting from earlier |

**Changed:** pricing to $49/$149, `hello@` → `info@` everywhere, real licence checking
instead of the old bypassable flag, corrected SSN wording in the guide.

---

## Then: turn on payments

The site update alone doesn't let anyone pay you yet. Open **`MONEY-SETUP.md`** and work
through it — Stripe account, products, payment link, then one environment variable in
Cloudflare.

Two things from it worth knowing before you start:

- **Your first payout takes 7–14 days.** Stripe holds new accounts for fraud review. Every
  payout after that is about 2 business days.
- **Set aside 25–30% for tax.** Stripe withholds nothing.

---

## A note on the GitHub Actions tab

After this push, go to your repo's **Actions** tab once. You may need to click
*"I understand my workflows, go ahead and enable them."*

From then on, every push runs 70 tests automatically, and every Monday morning GitHub
checks your live site and emails you **only if something is broken** — including a warning
if Stripe isn't configured, which would mean customers silently can't pay you.
