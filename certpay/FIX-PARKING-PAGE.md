# Fix: still seeing "Good Things Are Coming"

That screen is **Northwest Registered Agent's parking page** — the placeholder a registrar
shows before a domain points at real hosting. It is not your site, and it is not a Cloudflare
error.

## The important part: your site is actually live

I tested `certpay.net` from outside your network and got the real CertPay landing page.
Proof:

```
$ curl -sI https://certpay.net/
HTTP/2 200
server: cloudflare
x-frame-options: SAMEORIGIN                    ← from YOUR _headers file
permissions-policy: geolocation=(), ...        ← from YOUR _headers file

$ curl -s https://certpay.net/ | grep title
<title>CertPay — Free WH-347 Certified Payroll Generator for Contractors</title>
```

Cloudflare is serving your files, with your custom headers. The deploy worked.

So if you are seeing a parking page, it is one of two things.

---

## Cause 1 — you are visiting `www.certpay.net` (most likely)

Here is the real gap I found:

| Address | Status |
|---|---|
| `certpay.net` | works — your site |
| `http://certpay.net` | works — redirects to HTTPS |
| **`www.certpay.net`** | **does not resolve at all** |

`www.` is a completely separate DNS record. Adding `certpay.net` to Cloudflare Pages does
**not** automatically add `www.certpay.net`. If your browser autocompletes to `www.` — and
many do, especially if you typed it that way once — you land nowhere, and depending on the
registrar you get their parking page.

### Test it right now

Type this exactly, no `www`:

```
https://certpay.net
```

If that shows CertPay, this was the whole problem.

### Fix: add the www record

1. Cloudflare dashboard → your **Pages project** → **Custom domains**
2. **Set up a custom domain**
3. Enter `www.certpay.net`
4. Cloudflare adds the record and issues the certificate — a few minutes

Now both addresses work, and `www` redirects to the bare domain automatically.

---

## Cause 2 — your browser cached the parking page

Before you connected Cloudflare, `certpay.net` served Northwest's placeholder. Browsers
cache that aggressively, and DNS results are cached by your browser, your operating system,
your router, and your ISP. Everyone else on the internet can see the new site while you
still see the old one.

### Fix, in order of effort

**1. Hard refresh** — `Ctrl + Shift + R` on the page.

**2. Incognito window** — `Ctrl + Shift + N`, go to `https://certpay.net`. This is the
fastest way to know for sure. If it works in incognito, it is 100% a cache problem and
nothing is wrong with your site.

**3. Flush the Windows DNS cache** — open Command Prompt and run:

```
ipconfig /flushdns
```

**4. Try your phone on mobile data** — turn Wi-Fi off so it uses the cell network. Different
DNS path entirely. If it loads there, your home network is the only thing still holding the
old record.

**5. Restart your router** — clears its DNS cache. Worth doing if the above all show the old
page.

**6. Wait.** DNS records carry a "time to live" and some ISPs ignore it and cache for up to
48 hours. Annoying, but it resolves itself.

---

## Cause 3 — nameservers not fully switched (less likely, but check)

For Cloudflare to control the domain, Northwest must be pointing at Cloudflare's
nameservers.

1. Cloudflare dashboard → select `certpay.net` → **Overview**
2. Look at the status near the top:
   - **"Active"** → nameservers are correct, nothing to do
   - **"Pending nameserver update"** → not finished

If pending, Cloudflare shows you two nameservers like:

```
xxx.ns.cloudflare.com
yyy.ns.cloudflare.com
```

Log in to **Northwest Registered Agent**, find the DNS or nameserver settings for
`certpay.net`, and replace whatever is there with those two. Save. It usually takes minutes
but can take a few hours.

Given that I can reach your real site from outside, this is probably already done — but it
is worth a look if the cache fixes do not help.

---

## Quick decision tree

```
Does https://certpay.net (no www) work in an INCOGNITO window?
│
├─ YES → your site is fine. It was browser cache.
│         Add the www record so www.certpay.net works too.
│
└─ NO  → check Cloudflare → certpay.net → Overview
          ├─ says "Active"  → run ipconfig /flushdns, try phone on mobile data
          └─ says "Pending" → update nameservers at Northwest
```

---

## While you are in Custom domains

Add **both** so nobody can miss you:

- `certpay.net` (should already be there)
- `www.certpay.net` (add this)

Then check all four of these load:

```
https://certpay.net
https://www.certpay.net
https://certpay.net/app/
https://certpay.net/app/manifest.webmanifest
```

That last one matters — it is what the GitHub Android build checks before it will run.
