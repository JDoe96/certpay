#!/usr/bin/env bash
# Replace the placeholder domain with your real one, everywhere at once.
#
#   bash set-domain.sh mycertpay.com
#
# Safe to run more than once.
set -euo pipefail

NEW="${1:-}"
if [ -z "$NEW" ]; then
  echo "Usage: bash set-domain.sh yourdomain.com"
  echo "       (no https://, no trailing slash)"
  exit 1
fi

# Tolerate someone pasting a full URL
NEW="${NEW#http://}"; NEW="${NEW#https://}"; NEW="${NEW%%/*}"

cd "$(dirname "$0")"

OLD_LIST=$(grep -rhoE '(certpay\.app|[a-z0-9-]+\.pages\.dev)' \
  --include="*.html" --include="*.xml" --include="*.txt" --include="*.json" \
  --include="*.webmanifest" --include="*.md" . 2>/dev/null \
  | grep -v node_modules | sort -u || true)

if [ -z "$OLD_LIST" ]; then
  echo "Nothing to replace — already set to $NEW?"
  exit 0
fi

echo "Setting domain to: $NEW"
echo "Replacing:"
echo "$OLD_LIST" | sed 's/^/  /'
echo ""

for OLD in $OLD_LIST; do
  [ "$OLD" = "$NEW" ] && continue
  grep -rl "$OLD" \
    --include="*.html" --include="*.xml" --include="*.txt" --include="*.json" \
    --include="*.webmanifest" --include="*.md" . 2>/dev/null \
    | grep -v node_modules \
    | while read -r f; do
        sed -i.bak "s|$OLD|$NEW|g" "$f" && rm -f "$f.bak"
        echo "  updated $f"
      done
done

echo ""
echo "Done. Verify with:"
echo "  grep -rn \"$NEW\" sitemap.xml robots.txt | head"
