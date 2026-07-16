#!/bin/bash
# Lighthouse matrix runner. Usage: lh-run.sh <name> <url>
# 3 runs mobile + 3 desktop, JSON to $SCRATCH/lh/
set -e
export PATH="/Users/max/.nvm/versions/node/v24.18.0/bin:$PATH"
S=/private/tmp/claude-501/-Users-max-Works-Personal-mydevtools/84bbaabb-6f1a-4567-803d-f1a69bc496a1/scratchpad
export CHROME_PATH="$S/browsers/chrome/mac_arm-150.0.7871.124/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
NAME=$1; URL=$2
mkdir -p "$S/lh"
for i in 1 2 3; do
  npx -y lighthouse@12 "$URL" --chrome-flags="--headless=new" \
    --only-categories=performance,accessibility \
    --output=json --output-path="$S/lh/$NAME-mobile-$i.json" --quiet
  npx -y lighthouse@12 "$URL" --preset=desktop --chrome-flags="--headless=new" \
    --only-categories=performance,accessibility \
    --output=json --output-path="$S/lh/$NAME-desktop-$i.json" --quiet
done
echo "DONE $NAME"
