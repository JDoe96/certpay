# Start here — getting CertPay online and into the stores

Written for Windows, and assuming you have never used Git. Nothing here requires the
command line except two copy-paste commands at the very end, and even those are optional.

**You will not install Java, Android Studio, or WSL.** GitHub builds the Android app for
you in the cloud, free. That is the part that would have eaten your weekend.

### The path

```
1. Put the code on GitHub          ~20 min
2. Point Cloudflare Pages at it    ~10 min   → your site is LIVE
3. Set your domain in the files    ~5 min
4. Let GitHub build the app        ~15 min   → you get the .aab
5. Publish assetlinks.json         ~5 min
6. Upload to Play + Galaxy         ~1 hour
```

---

## Before you start

Download the project from this workspace as a ZIP and unzip it somewhere you'll find it —
`Documents\certpay` is fine. You should see `index.html`, an `app` folder, a `guides`
folder, and so on.

Two free accounts, if you don't have them:
- **GitHub** — https://github.com/signup
- **GitHub Desktop** — https://desktop.github.com (the visual app; no command line)

---

## Step 1 — Put the code on GitHub

1. Install and open **GitHub Desktop**, sign in with your GitHub account.
2. **File → Add local repository**, choose your `certpay` folder.
3. It will say *"This directory does not appear to be a Git repository."*
   Click **create a repository** in that message.
4. Name: `certpay`. Leave everything else alone. Click **Create repository**.
5. You'll see a long list of files on the left. In the bottom-left box type
   `CertPay v1`, then click **Commit to main**.
6. Top of the window: **Publish repository**.
   - **Untick "Keep this code private"** — public repos get unlimited free Actions minutes,
     which is what builds your app. There are no secrets in this code.
   - Click **Publish repository**.

Your code is now on GitHub. From now on, any change you make follows the same rhythm:
edit the file → GitHub Desktop → type a short message → **Commit to main** → **Push origin**.

---

## Step 2 — Point Cloudflare Pages at the repo

You said Cloudflare currently just has the domain. Now we connect the site.

> ### Read this before you click anything
> Cloudflare merged the **Workers** and **Pages** dashboards, and the two flows sit right
> next to each other. You want **Pages**. If at any point you see a field called
> **"Deploy command"** containing `npx wrangler deploy`, you are in the **Workers** flow and
> the deploy will fail. Pages has no such field. See `FIX-CLOUDFLARE.md`.

1. Cloudflare dashboard → **Workers & Pages** → **Create application**.
2. **Click the `Pages` tab** at the top of that screen — this is the step people miss —
   then **Connect to Git**.

   Shortcut if the tabs are hard to find, paste into your browser:
   `https://dash.cloudflare.com/?to=/:account/pages/new/provider/github`
3. Authorise GitHub, pick your `certpay` repository, **Begin setup**.
4. Build settings — this trips people up, so read carefully:

   | Field | What to enter |
   |---|---|
   | Project name | `certpay` |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | **leave completely empty** |
   | Build output directory | `/` |

   There is no build step. It is plain HTML. If you put anything in "build command" the
   deploy will fail. There should be **no "Deploy command" field on this screen** — if there
   is, go back and click the **Pages** tab.

   If you get **"Connection blocked"**, it is almost always your browser blocking
   Cloudflare's GitHub popup. Allow popups for `dash.cloudflare.com`, disable ad blockers /
   VPN, or try an incognito window. Full troubleshooting in `FIX-CLOUDFLARE.md`.
4. **Save and Deploy**. Takes about a minute.
5. You'll get a `something.pages.dev` URL. Open it — the CertPay site should load.
6. Now attach your domain: in the Pages project → **Custom domains** → **Set up a custom
   domain** → type your domain → follow the prompts.

Since Northwest is your registrar, you may need to point the domain's nameservers at
Cloudflare first — Cloudflare shows you the two nameservers to enter in Northwest's control
panel. DNS can take a few minutes to a few hours.

**Check it works** before moving on. In your browser:

- `https://YOURDOMAIN.com` → the landing page
- `https://YOURDOMAIN.com/app/` → the app
- `https://YOURDOMAIN.com/app/manifest.webmanifest` → a page of JSON text

That third one matters — the Android build fails without it.

---

## Step 3 — Put your domain in the files

The files still say `certpay.net`. That affects your sitemap, canonical URLs, and the app
build.

**The easy way** — GitHub Desktop has a built-in terminal:

1. GitHub Desktop → **Repository → Open in Command Prompt** (or Git Bash).
2. Paste this, with your real domain:

   ```
   bash set-domain.sh yourdomain.com
   ```

3. Back in GitHub Desktop you'll see ~13 changed files. Commit
   (`Set live domain`) and **Push origin**.

**If that command errors**, do it by hand — it's a find-and-replace. Open the folder in a
text editor and replace `certpay.net` with your domain in these files:

```
index.html            robots.txt              sitemap.xml
privacy/index.html    guides/index.html
guides/how-to-fill-out-wh-347/index.html
guides/certified-payroll-overtime-fringe-benefits/index.html
guides/california-a-1-131-certified-payroll/index.html
```

Cloudflare redeploys automatically about a minute after you push.

---

## Step 4 — Let GitHub build the Android app

This is the part you were dreading. It's five clicks.

1. Your repo on GitHub → **Actions** tab.
2. If it asks, click **I understand my workflows, go ahead and enable them**.
3. Left sidebar → **Build Android app**.
4. Right side → **Run workflow**. Fill in:

   | Field | Value |
   |---|---|
   | domain | `yourdomain.com` (no `https://`) |
   | create_keystore | **leave ticked** (first time only) |
   | version_code | `1` |
   | version_name | `1.0.0` |

5. Click the green **Run workflow**. Wait ~10 minutes. Refresh; you want a green tick.

If it fails immediately with *"Could not load ... manifest.webmanifest"*, your site isn't
live yet. Finish step 2 and try again.

### Collect your files

Click into the finished run. At the bottom, under **Artifacts**, two downloads:

**`SIGNING-KEY-BACK-THIS-UP`** — open this first.

> This is the only key that can ever publish updates to your app. Lose it and you cannot
> update CertPay on Google Play — ever. You'd have to create a brand-new listing under a
> new name and abandon your installs and reviews.
>
> Save `android.keystore` and `keystore-password.txt` to a password manager, or an
> encrypted backup, or at minimum two separate places. Do it now, not later.

Then tell GitHub to remember it, so future builds reuse the same key:

1. Repo → **Settings → Secrets and variables → Actions** → **New repository secret**
2. Add these two:

   | Name | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | the entire contents of `keystore-base64.txt` (one long line) |
   | `ANDROID_KEYSTORE_PASSWORD` | the contents of `keystore-password.txt` |

3. From now on, **untick create_keystore** whenever you run the build.

**`certpay-android`** — your actual app:
- `app-release-bundle.aab` ← upload this to both stores
- `app-release-signed.apk` ← for testing on your own phone
- `assetlinks.json` ← needed in step 5

---

## Step 5 — Publish assetlinks.json (do not skip)

Android verifies that your app and your website belong to the same person. Without this,
CertPay opens **with a browser address bar across the top** — it looks broken, and stores
notice.

1. Open the `assetlinks.json` you just downloaded.
2. In your `certpay` folder, open `.well-known\assetlinks.json` and replace its entire
   contents with what you downloaded.
   - `.well-known` starts with a dot, so Windows may hide it. In File Explorer:
     **View → Show → Hidden items**.
3. GitHub Desktop → commit (`Add Android asset links`) → **Push origin**.
4. Wait a minute, then visit:
   `https://YOURDOMAIN.com/.well-known/assetlinks.json`

   You should see your fingerprint. If you get a 404, the file is in the wrong place.

### Test it on your phone

Email `app-release-signed.apk` to yourself, open it on an Android phone, allow installing
from unknown sources.

- **No address bar** → asset links are correct
- **Address bar visible** → the JSON isn't live yet, or the fingerprint doesn't match

---

## Step 6 — Upload to the stores

### Google Play — $25 once

1. https://play.google.com/console — pay the $25, enable 2-Step Verification.
2. **Start identity verification immediately.** It gates everything and can take days.
3. Create the app. All the listing text is written for you in `store/listing.md` —
   copy/paste the name, short description, and full description.
   - Icon: `icons/icon-512.png`
   - Feature graphic: `icons/play-feature-1024x500.png`
   - Screenshots: the five files in `store/screens/`
4. **Data safety**: answer **"No data collected"** and **"No data shared."** That is
   genuinely true — everything stays in the browser. Privacy policy URL:
   `https://YOURDOMAIN.com/privacy/`
5. Upload `app-release-bundle.aab`.

**Then two things you must not miss:**

**(a) The second fingerprint.** Google re-signs your app with their own key. Go to
**Setup → App integrity → App signing**, copy the *App signing key certificate SHA-256*,
and add it to `assetlinks.json` as a **second** entry:

```json
"sha256_cert_fingerprints": [
  "YOUR_FINGERPRINT_FROM_THE_BUILD",
  "THE_ONE_GOOGLE_SHOWS_YOU"
]
```

Push that. This is the most common reason a working app suddenly shows an address bar.

**(b) The 12-tester rule.** Personal Play accounts opened after November 2023 must run a
**closed test with 12 testers for 14 straight days** before going live. Start it the day
you upload — the fortnight runs in the background while you write content and post on
Reddit. You need 12 real Google accounts to opt in and stay opted in, so start asking now.

Realistic timeline to production: **3–5 weeks**, nearly all of it that waiting period.

### Samsung Galaxy Store — free

1. https://seller.samsungapps.com — register, apply for seller status.
2. Upload **the same** `app-release-bundle.aab`.
3. Reuse the same listing text and screenshots.

No fee ever. Smaller audience than Play, but it's an hour's work once the file exists.

### Apple

Not with this build, and I wouldn't spend the $99 yet. Apple rejects wrapped websites, and
the rejection often lands on a later update after you have users. iPhone owners can install
CertPay right now via Safari → Share → **Add to Home Screen**, which gives them a real
full-screen offline app. See `store/ios-reality-check.md`.

---

## Updating later

Here's the nice part: **changing the website changes the app.** Content lives on the web, so
fix a typo, push it, and every user has it in minutes — web, Android, installed app, all of
them. No new release.

You only re-run the GitHub build when you change the icon, the app name, or the manifest.
When you do: bump **version_code** by 1, untick **create_keystore**, run.

---

## If something goes wrong

| Symptom | Cause |
|---|---|
| Build fails on "Check the site is live" | Site not deployed yet, or domain typo. Load `https://yourdomain.com/app/` in a browser. |
| Cloudflare deploy fails | You put something in "Build command". Empty it. |
| Build says "No saved signing key found" | You unticked `create_keystore` before adding the secrets. Either tick it or add the secrets. |
| App shows a browser address bar | `assetlinks.json` isn't live, or you skipped Google's second fingerprint. |
| `.well-known` folder invisible | File Explorer → View → Show → Hidden items. |
| Actions tab shows nothing | Click "I understand my workflows, go ahead and enable them". |

---

## What this costs

| | |
|---|---|
| Domain | already paid |
| Cloudflare Pages | free |
| GitHub (public repo) | free |
| GitHub Actions builds | free |
| Google Play | **$25 once** |
| Galaxy Store | free |

**$25 more, total.**
