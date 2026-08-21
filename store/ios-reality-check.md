# iOS: what is actually possible, and what it costs

Read this before spending a weekend on an App Store submission.

## The blocker

Apple's **App Store Review Guideline 4.2 (Minimum Functionality)** says an app must
"include features, content, and UI that elevate it beyond a repackaged website", and
**4.2.2** specifically calls out "web clippings". A PWA in a `WKWebView` is exactly what
that rule was written to reject.

You can technically build the wrapper. It will be rejected, or worse, approved once and
then rejected on your next bug-fix update — which is the failure mode that actually hurts,
because by then you have users.

Google Play has Trusted Web Activity as a sanctioned path. **Apple has no equivalent.**

## What that means in practice

| Route | Works? | Cost | Effort |
|---|---|---|---|
| Install from Safari (Add to Home Screen) | **Yes, today** | $0 | Already built |
| Google Play via TWA | **Yes** | $25 once | ~2 hours |
| App Store as a WebView wrapper | **No — rejected under 4.2.2** | $99/yr wasted | — |
| App Store with a genuine native layer | Yes | $99/yr | Weeks |
| App Store via Capacitor + real native features | Realistic | $99/yr | ~1–2 weeks |

## The recommendation: don't ship iOS first

Your buyer is a contractor or bookkeeper filling in a payroll on a **laptop in an office or
a truck**. The web app is the product; the phone is a convenience. Chasing an App Store
listing before you have paying customers is the single most common way to burn a month and
learn nothing.

**On iOS, ship the Safari install instead.** It genuinely works:

1. Open `certpay.net/app/` in Safari
2. Share → **Add to Home Screen**
3. It launches full-screen with the icon, no address bar, and works offline

That is a real, installable iOS app for $0, available today. The only thing you lose is
App Store search — and App Store search is not where contractors look for certified payroll
software. Google is. That is what the three guides are for.

## If you later decide you want the App Store

The bar is a genuine native capability, not cosmetics. A splash screen and a tab bar will
not pass. Things that actually satisfy 4.2 for a product like this:

- **Document scanning** with `VisionKit` — photograph a paper timesheet, OCR the hours
  straight into the week. This is a real feature contractors would use, and it is the one
  I would build.
- **Files.app integration** so generated PDFs save into iCloud Drive and can be shared
  through the native share sheet.
- **Local notifications** — "payroll #12 is due Friday", scheduled on-device.
- **Face ID / Touch ID** to unlock the app, which is defensible for payroll data.
- **Sign in with Apple**, if you ever add accounts.

Route: wrap the existing app with **Capacitor** (`npm i @capacitor/core @capacitor/ios`),
which keeps this codebase as the UI, then add the native plugins above. Budget one to two
weeks and a Mac with Xcode. Apple charges **$99/year** whether or not you ship.

Do it after you have revenue, and let paying customers tell you whether they want it.
