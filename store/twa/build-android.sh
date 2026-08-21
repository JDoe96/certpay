#!/usr/bin/env bash
# =============================================================================
# CertPay — build the Android app bundle (.aab) for Google Play + Galaxy Store
#
#   ./build-android.sh yourdomain.com
#
# Produces, in ./android-build/:
#   app-release-bundle.aab   -> upload to Google Play AND Samsung Galaxy Store
#   app-release-signed.apk   -> sideload onto a phone to test
#   android.keystore         -> YOUR SIGNING KEY. Back it up. Losing it means
#                               you can never update the app again.
#
# This exact recipe was verified end to end: it produced a signed AAB
# targeting API 36. The quirks it works around are real and undocumented.
# =============================================================================
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: ./build-android.sh yourdomain.com"
  echo "Your site must already be live on HTTPS at that domain."
  exit 1
fi

PKG="${PKG:-app.certpay.twa}"
OUT="$(cd "$(dirname "$0")/../.." && pwd)/android-build"
JDK="$HOME/.bubblewrap/jdk/jdk-17.0.11+9"
SDK="$HOME/android-sdk"

echo "==> Building CertPay for $DOMAIN (package $PKG)"

# ---------------------------------------------------------------- toolchain
if [ ! -d "$JDK" ]; then
  echo "==> Installing JDK 17"
  mkdir -p "$HOME/.bubblewrap/jdk" && cd "$HOME/.bubblewrap/jdk"
  curl -sSL -o jdk.tar.gz \
    "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.11%2B9/OpenJDK17U-jdk_x64_linux_hotspot_17.0.11_9.tar.gz"
  tar xzf jdk.tar.gz && rm jdk.tar.gz
fi

if [ ! -d "$SDK/platforms" ]; then
  echo "==> Installing Android SDK"
  mkdir -p "$SDK/cmdline-tools" && cd "$SDK/cmdline-tools"
  curl -sSL -o t.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q t.zip && mv cmdline-tools latest && rm t.zip
  export JAVA_HOME="$JDK"; export PATH="$JDK/bin:$PATH"
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses >/dev/null 2>&1 || true
  "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" \
    "platform-tools" "platforms;android-35" "build-tools;35.0.0" >/dev/null
fi

# QUIRK 1: Bubblewrap validates the SDK by looking for a legacy `tools/` or
# `bin/` folder at the SDK root. Modern cmdline-tools don't create one, so it
# reports "The provided androidSdk isn't correct." Symlinks satisfy the check.
mkdir -p "$SDK/tools"
ln -sfn "$SDK/cmdline-tools/latest/bin" "$SDK/tools/bin"
ln -sfn "$SDK/cmdline-tools/latest/lib" "$SDK/tools/lib"

mkdir -p "$HOME/.bubblewrap"
cat > "$HOME/.bubblewrap/config.json" <<EOF
{"jdkPath":"$JDK","androidSdkPath":"$SDK"}
EOF

export JAVA_HOME="$JDK"
export ANDROID_HOME="$SDK"
export PATH="$JDK/bin:$PATH"
# QUIRK 2: Bubblewrap's interactive prompts can spin and exhaust memory on
# small machines. Cap the heap and avoid piping `yes` into it.
export NODE_OPTIONS=--max-old-space-size=768

# ------------------------------------------------------------------ keystore
mkdir -p "$OUT" && cd "$OUT"
KS_PASS="${KS_PASS:-certpay$(date +%s)}"

if [ ! -f android.keystore ]; then
  echo "==> Creating signing keystore"
  keytool -genkeypair -v -keystore android.keystore -alias android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -dname "CN=CertPay, OU=Dev, O=CertPay, L=Brunswick, ST=GA, C=US" >/dev/null 2>&1
  echo "$KS_PASS" > keystore-password.txt
  chmod 600 keystore-password.txt android.keystore
  echo "    Password saved to $OUT/keystore-password.txt"
  echo "    *** BACK UP android.keystore AND THIS PASSWORD. ***"
else
  KS_PASS="$(cat keystore-password.txt)"
  echo "==> Reusing existing keystore"
fi

export BUBBLEWRAP_KEYSTORE_PASSWORD="$KS_PASS"
export BUBBLEWRAP_KEY_PASSWORD="$KS_PASS"

# QUIRK 3: `bubblewrap init` asks ~12 interactive questions. Writing a complete
# twa-manifest.json up front and calling `update` skips all of them.
python3 - "$DOMAIN" "$PKG" <<'PY'
import json, sys
domain, pkg = sys.argv[1], sys.argv[2]
base = f"https://{domain}"
m = {
  "packageId": pkg, "host": domain,
  "name": "CertPay — Certified Payroll", "launcherName": "CertPay",
  "display": "standalone", "orientation": "default",
  "themeColor": "#12467b", "themeColorDark": "#0e3963",
  "navigationColor": "#12467b", "navigationColorDark": "#0e3963",
  "navigationDividerColor": "#12467b", "navigationDividerColorDark": "#0e3963",
  "backgroundColor": "#f5f7f9",
  "enableNotifications": False,
  "startUrl": "/app/index.html",
  "iconUrl": f"{base}/icons/icon-512.png",
  "maskableIconUrl": f"{base}/icons/maskable-512.png",
  "webManifestUrl": f"{base}/app/manifest.webmanifest",
  "fullScopeUrl": f"{base}/app/",
  "splashScreenFadeOutDuration": 300,
  "signingKey": {"path": "./android.keystore", "alias": "android"},
  "appVersionName": "1.0.0", "appVersionCode": 1,
  # QUIRK 4: every shortcut MUST have chosenIconUrl or the build dies with
  # "ShortcutInfo ... must have either chosenIconUrl or chosenMonochromeIconUrl"
  "shortcuts": [
    {"name": "New payroll week", "shortName": "New week",
     "url": "/app/index.html?tab=hours", "chosenIconUrl": f"{base}/icons/icon-192.png"},
    {"name": "Review & file", "shortName": "Review",
     "url": "/app/index.html?tab=review", "chosenIconUrl": f"{base}/icons/icon-192.png"}
  ],
  "generatorApp": "bubblewrap-cli", "fallbackType": "customtabs",
  "features": {}, "alphaDependencies": {"enabled": False},
  "enableSiteSettingsShortcut": True, "isChromeOSOnly": False, "isMetaQuest": False,
  "minSdkVersion": 21, "fingerprints": []
}
json.dump(m, open("twa-manifest.json", "w"), indent=2)
print(f"    manifest staged for {domain}")
PY

echo "==> Generating Android project"
npx --yes @bubblewrap/cli update --skipVersionUpgrade 2>&1 | tail -3

echo "==> Building (a few minutes on first run)"
npx --yes @bubblewrap/cli build --skipPwaValidation --skipVersionUpgrade 2>&1 \
  | grep -viE "unzipping|% \[|^Download " | tail -8

# ------------------------------------------------------------- fingerprint
FP=$("$JDK/bin/keytool" -list -v -keystore android.keystore -storepass "$KS_PASS" 2>/dev/null \
     | grep "SHA256:" | head -1 | sed 's/.*SHA256: //' | tr -d ' ')

cat > assetlinks.json <<EOF
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "$PKG",
    "sha256_cert_fingerprints": ["$FP"]
  }
}]
EOF

echo ""
echo "============================================================"
echo " BUILD COMPLETE — $OUT"
echo "============================================================"
ls -la app-release-bundle.aab app-release-signed.apk 2>/dev/null || true
echo ""
echo " NEXT, IN THIS ORDER:"
echo ""
echo " 1. Copy assetlinks.json into your site at:"
echo "      /.well-known/assetlinks.json"
echo "    and redeploy. Verify:"
echo "      curl https://$DOMAIN/.well-known/assetlinks.json"
echo ""
echo "    Skip this and the app opens with a browser address bar."
echo ""
echo " 2. Upload app-release-bundle.aab to Google Play."
echo "    After your FIRST upload, Play re-signs with its own key:"
echo "    Play Console > Setup > App integrity > copy the App signing"
echo "    key SHA-256, and add it to assetlinks.json as a SECOND entry."
echo "    Missing this is the most common TWA failure."
echo ""
echo " 3. Upload the SAME .aab to Samsung Galaxy Store (free, no fee)."
echo ""
echo " Your signing fingerprint:"
echo "   $FP"
echo ""
echo " BACK UP android.keystore + keystore-password.txt somewhere safe."
echo " Lose them and you can never update this app again."
echo "============================================================"
