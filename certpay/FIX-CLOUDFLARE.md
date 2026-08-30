# Fix: "Connection blocked" on Cloudflare deploy

## What went wrong

You are in the **Workers** setup flow, not **Pages**. That one detail explains everything.

The giveaway is the field you described:

> **Deploy command:** `npx wrangler deploy`

**Cloudflare Pages has no "Deploy command" field.** It only has *Build command* and *Build
output directory*. If you are looking at a Deploy command box, Cloudflare thinks you are
publishing a **Worker** — a JavaScript program that runs on their servers.

CertPay is not a program that runs on a server. It is plain HTML, CSS, JavaScript and
images — files that get *served* to a browser. `npx wrangler deploy` tries to compile and
upload a Worker, finds no Worker to deploy, and the whole thing falls over.

Cloudflare merged the Workers and Pages dashboards, so the two flows now sit right next to
each other and are very easy to confuse. This is a common mistake, not something you did
wrong.

---

## The fix: start over in the Pages flow

Takes about three minutes.

### 1. Delete the broken project

Cloudflare dashboard → **Workers & Pages** → click the project you just created →
**Settings** → scroll to the bottom → **Delete project**.

Nothing was published, so there is nothing to lose.

### 2. Create it again — as Pages this time

1. **Workers & Pages** → **Create application**
2. **Look for a row of tabs at the top: `Workers` | `Pages`.**
   **Click the `Pages` tab.** This is the step that was missed.
3. Click **Connect to Git**
4. Authorise GitHub if asked, then pick your `certpay` repository
5. Click **Begin setup**

### 3. The settings screen — what you should see

If you are in the right place, the form looks like this:

| Field | What to put |
|---|---|
| Project name | `certpay` |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | **completely empty** |
| Build output directory | `/` |

**There must be no "Deploy command" field on this screen.** If you can see one, you are
still in Workers — go back and click the **Pages** tab.

Leave the "Builds for non-production branches" checkbox alone; it is harmless either way.

### 4. Save and Deploy

About a minute. You will get a URL like `certpay-a1b.pages.dev`. Open it — the CertPay
landing page should load.

---

## Direct link, if the tabs are hard to find

Cloudflare keeps moving this. Paste this straight into your browser:

```
https://dash.cloudflare.com/?to=/:account/pages/new/provider/github
```

That drops you into the Pages + GitHub flow with no tab-hunting.

---

## If "Connection blocked" persists

That specific wording usually means the browser is blocking Cloudflare's GitHub
authorisation popup, not that your account is banned. In order of likelihood:

1. **Allow popups.** The GitHub authorisation opens in a new window. Click the blocked-popup
   icon in your address bar and allow it for `dash.cloudflare.com`.
2. **Turn off extensions temporarily.** Ad blockers, privacy extensions and VPNs frequently
   break this specific handshake. uBlock, Privacy Badger and Brave Shields are common
   culprits.
3. **Try a different browser.** An incognito window with no extensions is the fastest test.
4. **Reinstall the Cloudflare GitHub app.** If the connection loops back on itself:
   - GitHub → your avatar → **Settings** → **Applications** → **Installed GitHub Apps**
   - Find **Cloudflare Pages** → **Configure** → scroll down → **Uninstall**
   - Go back to Cloudflare and connect again from scratch

Number 1 or 2 fixes it the vast majority of the time.

---

## How to know it worked

Once deployed, open your `.pages.dev` URL and check all three:

- `https://YOURPROJECT.pages.dev` → landing page with the CertPay hero
- `https://YOURPROJECT.pages.dev/app/` → the working app
- `https://YOURPROJECT.pages.dev/app/manifest.webmanifest` → a page of JSON text

That third one is the one the Android build checks. If it 404s, the output directory is
wrong — set it to `/`.

Then attach your domain: project → **Custom domains** → **Set up a custom domain**.

---

## Quick reference: Workers vs Pages

|  | Pages ← **you want this** | Workers |
|---|---|---|
| For | Websites — HTML, CSS, images | Server-side JavaScript programs |
| Build command | optional, empty for CertPay | — |
| Build output directory | `/` | — |
| **Deploy command** | **does not exist** | `npx wrangler deploy` |
| Needs `wrangler.toml` | no | yes |

CertPay is 100% static. Every page is a real `.html` file, the app runs entirely in the
visitor's browser, and payroll data never touches a server. There is nothing for a Worker
to do.
