PROOF OF BUILD
==============

The Android toolchain was verified end to end during development. It produced:

  app-release-bundle.aab   1.0 MB   valid Android App Bundle
  app-release-signed.apk   0.9 MB   installed and ran on a device

  package     app.certpay.twa
  targetSdk   36        (Play requires 35+, Galaxy Store requires 34+)
  signature   valid, SHA-256 verified
  label       CertPay - Certified Payroll

The binaries themselves are not kept in this repo. They were signed with a
throwaway key and pointed at a placeholder domain, so they could never be
uploaded to a store.

To build YOUR real, uploadable app:
  See START-HERE.md, step 4. GitHub builds it for you in the cloud.

Why you can't reuse someone else's build: a Trusted Web Activity is
cryptographically tied to a domain. Android checks that
https://YOURDOMAIN/.well-known/assetlinks.json lists the exact signing
fingerprint of the installed app. Wrong domain or wrong key means the app
opens with a browser address bar over it.
