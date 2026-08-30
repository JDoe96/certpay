# Packaging CertPay for Google Play (Trusted Web Activity)

Google Play accepts a PWA wrapped in a **Trusted Web Activity**. Total cost: a one-time
**$25** developer registration. Nothing else here costs money.

Apple does **not** accept this approach — see `../ios-reality-check.md` before you spend
time on it.

---

## Prerequisites

1. The site must be live on HTTPS at a real domain (Cloudflare Pages / Netlify — free).
2. A Google Play developer account — https://play.google.com/console — **$25 once**.
3. Node 18+ locally.

---

## Step 1 — Generate the Android project

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://certpay.net/app/manifest.webmanifest
```

Answer the prompts:

| Prompt | Answer |
|---|---|
| Domain | `certpay.net` |
| URL path | `/app/` |
| Application name | `CertPay — Certified Payroll` |
| Short name | `CertPay` |
| Application ID | `app.certpay.twa` |
| Display mode | `standalone` |
| Orientation | `default` |
| Status bar colour | `#12467b` |
| Include support for Play Billing | `No` |
| Signing key | Create new (let Bubblewrap generate it) |

Bubblewrap writes `twa-manifest.json` and an Android project into the current directory.
A reference `twa-manifest.json` sits next to this file — copy values across if you prefer.

## Step 2 — Build

```bash
bubblewrap build
```

Produces `app-release-bundle.aab` (upload this to Play) and `app-release-signed.apk`
(for sideloading and testing).

## Step 3 — Wire up Digital Asset Links

This is the step people skip, and skipping it means the app opens with a browser address
bar visible — which looks broken and can fail review.

```bash
bubblewrap fingerprint list
```

Copy the **SHA-256** fingerprint and paste it into `/.well-known/assetlinks.json` in the
site repo, replacing `REPLACE_WITH_YOUR_SIGNING_KEY_SHA256_FINGERPRINT`. Redeploy the site.

Verify it is live and correct:

```bash
curl https://certpay.net/.well-known/assetlinks.json
```

Then confirm with Google's tester:
https://developers.google.com/digital-asset-links/tools/generator

> **Note:** if you opt into Play App Signing (recommended), Google re-signs your app with
> *their* key. After your first upload, go to Play Console → Setup → App integrity and copy
> the **App signing key certificate SHA-256** from there. Put **both** fingerprints in
> `assetlinks.json` as an array. Missing this is the single most common TWA failure.

## Step 4 — Play Console listing

Create the app, then fill in:

- **App name:** CertPay — Certified Payroll
- **Short description / Full description:** in `../listing.md`
- **App icon:** `icons/icon-512.png`
- **Feature graphic:** `icons/play-feature-1024x500.png` (1024×500, required)
- **Screenshots:** minimum 2 phone screenshots — generate with
  `node ../../shots.js` or take them from the running app at 1080×1920
- **Category:** Business
- **Content rating:** complete the questionnaire — CertPay is "Everyone", no ads,
  no user-generated content
- **Data safety:** declare **no data collected and no data shared**. This is true: everything
  is in `localStorage`. Say so plainly; it is a competitive advantage in this category.
- **Privacy policy URL:** `https://certpay.net/privacy/` — required even when you collect
  nothing

Upload the `.aab`, roll out to **internal testing** first, install on a real device, confirm
there is no address bar, then promote to production.

## Step 5 — Updates

Because the content is served from the web, day-to-day changes need **no Play release at
all** — you deploy the site and users get it. Only rebuild and re-upload the `.aab` when
you change the manifest, the icon, or the target SDK level (Google raises the required
`targetSdkVersion` roughly annually and will email you about it).

---

## Timeline

| Stage | Typical |
|---|---|
| Bubblewrap init + build | 30 minutes |
| Asset links verified | 15 minutes (plus DNS/CDN propagation) |
| Store listing written | 1 hour (copy is already written for you) |
| Google review | 1–7 days for a new developer account |
