# What you downloaded, and what to do with it

You extracted the workspace ZIP into `Downloads\` and got three things. Here is what each
one is.

| What you see | What it is | Do this |
|---|---|---|
| `.sudo_as_admin_successful` | An empty marker file Linux leaves behind | **Delete** |
| `.android` | Cache left over from when I test-built the Android app in the sandbox | **Delete** |
| `certpay` | **Your entire project — 47 files** | **Keep this** |

Only `certpay` matters. The other two are debris from my side and have nothing to do with
your app.

---

## Step 1 — Move the project somewhere sensible

`Downloads` is a bad home for a project you'll work on for months — it's easy to wipe by
accident. Move it:

```
Downloads\certpay   →   Documents\certpay
```

Just drag it in File Explorer.

---

## Step 2 — Delete the leftover Git folder

Inside `Documents\certpay` there's a hidden `.git` folder. It came through the ZIP
incomplete — its config file is stripped out of workspace snapshots for security. It works,
but it's in a half-configured state and that can confuse GitHub Desktop.

**Delete it and let GitHub Desktop make a clean one.** You lose nothing; all your actual
files are untouched.

1. Open `Documents\certpay` in File Explorer
2. Turn on hidden files: **View → Show → Hidden items**
3. Delete the folder named `.git`

Leave `.github` and `.well-known` alone — those are real parts of the project. Only `.git`
goes.

> **Why bother?** `.git` is Git's private bookkeeping. A fresh one takes GitHub Desktop two
> seconds to create, and starting clean avoids a class of confusing errors later.

---

## Step 3 — Sanity-check the folder

Open `Documents\certpay`. With hidden items showing, you should see:

```
.github\           the cloud build workflow
.well-known\       Android verification file
android-build-sample\
app\               the actual application
guides\            three SEO articles
icons\
privacy\
store\             store listing copy and screenshots
index.html         landing page
START-HERE.md      ← your instructions
README.md
PUBLISHING.md
set-domain.sh
sitemap.xml
robots.txt
site.css
package.json
test.js
e2e.js
shots.js
_headers
netlify.toml
DEPLOY.md
```

If `.github` is missing, the ZIP didn't extract fully — re-download and extract again. That
folder is what builds your Android app.

### Quick confidence check

Double-click `index.html`. Your landing page opens in a browser. Then open
`app\index.html` — the app itself loads and works. Neither needs a server; that's the whole
point of the design.

(Links between pages won't work when opening files directly — they're built for a real
domain. That's expected and fixes itself once Cloudflare is serving it.)

---

## Step 4 — Now go to START-HERE.md

Open `START-HERE.md` in Notepad, or better, preview it on GitHub after step 1 of that guide.

It picks up exactly here: install GitHub Desktop, publish the repo, connect Cloudflare
Pages, then let GitHub build your Android app in the cloud.

---

## One habit worth forming now

Once the project is on GitHub, that becomes your real backup — not the folder on your PC.
Every time you change something:

1. Open **GitHub Desktop**
2. Type a short note about what you changed
3. **Commit to main** → **Push origin**

That's it. Cloudflare redeploys your site automatically about a minute later, and you have
a full history you can roll back if you break something.
