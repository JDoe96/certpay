# Publishing CertPay to Google Play and the Galaxy Store

**Read this first: there is no "download the app" step.**

There is no finished `.aab` sitting in the workspace waiting to be uploaded, and there
cannot be. A Trusted Web Activity is **cryptographically bound to a domain**. When someone
installs it, Android fetches `https://YOURDOMAIN/.well-known/assetlinks.json` and checks
that it lists the exact SHA-256 fingerprint of the key the app was signed with. If that
check fails, the app still runs but opens with a **browser address bar across the top** —
which looks broken and can fail store review.

So the order is fixed:

```
   deploy the site  →  build the app  →  publish assetlinks  →  upload
```

I have already built and verified a real signed bundle to prove the toolchain works
(`android-build-sample/`, targetSdk 36, valid signature). It is bound to a placeholder
domain, so it is a proof, not a deliverable. Yours takes one command once your site is up.

---

## Step 1 — Get the site on a real HTTPS domain

Full detail in `DEPLOY.md`. The short version:

```bash
cd certpay
git init && git add -A && git commit -m "CertPay v1"
```

Push to GitHub, then connect the repo at **Cloudflare Pages** (build command: empty,
output directory: `/`). You get HTTPS immediately.

**You need a custom domain for the store builds.** A `.pages.dev` subdomain technically
works, but you cannot serve `/.well-known/` reliably on some free subdomains, and a real
domain is worth having anyway. Cloudflare Registrar sells at cost, roughly **$10/year**.

Once live, replace `certpay.net` throughout the project with your domain:

```bash
cd certpay
grep -rl "certpay\.app" --include="*.html" --include="*.xml" --include="*.txt" --include="*.json" . \
  | xargs sed -i 's/certpay\.app/YOURDOMAIN.com/g'
```

Redeploy. Confirm these all load:

```bash
curl -I https://YOURDOMAIN.com/app/
curl    https://YOURDOMAIN.com/app/manifest.webmanifest
```

---

## Step 2 — Build the Android bundle

One command:

```bash
./store/twa/build-android.sh YOURDOMAIN.com
```

It installs JDK 17 and the Android SDK if missing, creates your signing key, generates the
Android project, and builds. First run takes about ten minutes; later runs, about one.

Output lands in `android-build/`:

| File | What it's for |
|---|---|
| `app-release-bundle.aab` | **Upload this** — to Google Play *and* Galaxy Store |
| `app-release-signed.apk` | Sideload to a phone to test before publishing |
| `android.keystore` | **Your signing key** |
| `keystore-password.txt` | Its password |
| `assetlinks.json` | Publish this on your site (step 3) |

> ### Back up the keystore. Seriously.
> `android.keystore` and its password are the only way to prove you are the publisher of
> this app. Lose them and you can never ship an update — you would have to publish a new
> listing under a new package name and abandon your installs and reviews. Copy both to a
> password manager or an encrypted backup **today**, not later.

The script works around four undocumented Bubblewrap quirks I hit while verifying it: the
SDK layout check, an out-of-memory failure on small machines, the twelve interactive
prompts, and a hard requirement that every manifest shortcut carries an icon. You do not
need to know about any of them — they are handled — but they are commented in the script if
a future version changes behaviour.

---

## Step 3 — Publish the asset links (do not skip)

```bash
cp android-build/assetlinks.json .well-known/assetlinks.json
git add -A && git commit -m "Add Android asset links" && git push
```

Verify it is live:

```bash
curl https://YOURDOMAIN.com/.well-known/assetlinks.json
```

It must return JSON with your fingerprint, served as `application/json`, over HTTPS, with
no redirect. Check it with Google's tool:
https://developers.google.com/digital-asset-links/tools/generator

### The second fingerprint (the step everyone misses)

If you use **Play App Signing** — recommended, and the default for new apps — Google
re-signs your bundle with *their* key. Your upload fingerprint is then no longer the one
that matters on the device.

After your first upload to Play:

1. Play Console → **Setup → App integrity → App signing**
2. Copy the **App signing key certificate** SHA-256
3. Add it to `assetlinks.json` as a **second entry** in the array
4. Redeploy

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.certpay.twa",
    "sha256_cert_fingerprints": [
      "YOUR_UPLOAD_KEY_FINGERPRINT",
      "GOOGLE_PLAY_APP_SIGNING_FINGERPRINT"
    ]
  }
}]
```

Both fingerprints. This is the single most common reason a TWA ships with an address bar.

---

## Step 4 — Google Play

**Cost: $25, one time, ever.** No annual renewal, unlimited apps.

1. **Create the account** — https://play.google.com/console. Needs 2-Step Verification on
   your Google account. Pay the $25.
2. **Identity verification** — personal accounts upload a government ID. Start this early;
   it gates everything and can take days.
3. **Create the app**, then fill the listing from `store/listing.md` (title, short and full
   description are written and within character limits).
   - Icon: `icons/icon-512.png`
   - Feature graphic: `icons/play-feature-1024x500.png`
   - Screenshots: `store/screens/` (five, already 1080×1920)
4. **App content declarations:**
   - Privacy policy: `https://YOURDOMAIN.com/privacy/`
   - **Data safety: "No data collected", "No data shared."** This is true — everything is
     in `localStorage`. Tick "encrypted in transit". In a payroll app this is a selling
     point, so make sure the listing says it too.
   - Content rating: Everyone. Ads: No.
   - App access: no login required — say so, or reviewers will ask.
5. **Upload** `app-release-bundle.aab`.

### The 12-tester rule — plan around this

If your developer account is **personal** and was created after 13 November 2023, Google
requires a **closed test with at least 12 testers running for 14 continuous days** before
you can apply for production access.

This is the thing that surprises people. Two consequences:

- **Start the closed test the day you finish the build.** The 14 days run in the background
  while you write content and post on Reddit.
- Twelve real Google accounts must *opt in and stay opted in*. Friends, family, a few
  contractors from a Facebook group. Ask early.

An **organization** account (needs a D-U-N-S number, free but takes days to obtain) is
exempt from the 12-tester requirement. If you already have an LLC, that route is faster
overall.

Realistic timeline for a personal account: **3–5 weeks** from today to production, most of
it the mandatory test window. Review itself is usually 1–7 days.

---

## Step 5 — Samsung Galaxy Store

**Cost: nothing.** No signup fee, no annual fee. Revenue share applies only to purchases
made through Samsung Checkout, which you are not using.

1. Register at **https://seller.samsungapps.com** and apply for **Commercial Seller**
   status — this needs business details and can take a few days. "Individual Seller" is
   fine if you have no company yet.
2. Create the app and upload the **same `app-release-bundle.aab`**. Galaxy Store accepts
   AAB and generates a universal APK from it.
   - When uploading an AAB, **Galaxy Store manages the signing key**. You can upload your
     own or let Samsung sign.
   - Requirements: **targetSdkVersion 34+** and at least one 64-bit binary. Your build is
     targetSdk 36, so both are satisfied.
3. Reuse the listing copy and screenshots. Same privacy policy URL.
4. Submit. Review is typically a few days.

**Worth setting expectations:** Galaxy Store gets a small fraction of Play's traffic. It is
free and takes an hour once the AAB exists, so it is worth doing — but treat it as a bonus
channel, not a growth strategy.

### One Galaxy Store rule to note

Their distribution guide bars apps that are "web clippings, website links, or videos that
degrade the user experience". CertPay is a full offline application with real functionality,
so it is not what that rule targets — but make sure your listing describes the *features*
(overtime calculation, compliance validation, form generation), not "a website in an app".
The copy in `store/listing.md` already does this.

---

## Step 6 — Test before you publish

Sideload the APK onto a real Android phone:

```bash
adb install android-build/app-release-signed.apk
```

Or email the `.apk` to yourself and tap it (allow "install unknown apps").

Check:
- [ ] Opens **without a browser address bar** ← if you see one, asset links are wrong
- [ ] Icon and name look right on the home screen
- [ ] You can complete a payroll and print
- [ ] Aeroplane mode → still opens and calculates
- [ ] Long-press the icon → both shortcuts appear

---

## What each store costs

| | Google Play | Galaxy Store | Apple App Store |
|---|---|---|---|
| Fee | **$25 once** | **Free** | $99/year |
| Accepts this build | Yes | Yes (same AAB) | **No** |
| Pre-launch test | 12 testers / 14 days (personal accounts) | None | — |
| Review | 1–7 days | Days | — |
| Reach | Very large | Small but free | Large |

**Apple is not on the table with this build** and I would not spend the $99 yet.
Guideline 4.2.2 rejects repackaged websites, and there is no TWA equivalent on iOS — the
rejection often arrives on a later update, after you have users. iPhone users can install
CertPay today through Safari → Share → **Add to Home Screen**, which gives them a real
full-screen offline app for free. `store/ios-reality-check.md` covers what a genuine native
build would require if you ever want it.

---

## Updating later

Because the content is served from the web, **routine changes need no store release at
all**. Fix a bug, redeploy the site, and every user has it immediately — on the web, on
Android, and on installed home-screen apps.

You only rebuild and re-upload the `.aab` when you change:
- the app icon or name
- the web manifest
- the target SDK (Google raises the minimum roughly annually and will email you)

When you do, bump `appVersionCode` in `android-build/twa-manifest.json` and rerun the build
script with the same keystore.
