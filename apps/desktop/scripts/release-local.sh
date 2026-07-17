#!/usr/bin/env bash
# Build a release LOCALLY and publish it so installed apps auto-update — the
# same end result as the CI workflow, without spending Actions minutes.
#
# Produces + publishes the four artifacts the updater needs:
#   1. <app>.app.tar.gz        (updater payload)
#   2. <app>.app.tar.gz.sig    (signed with YOUR updater key -> installs trust it)
#   3. latest.json             (manifest: version + signature + public URL)
#   4. <app>.dmg               (Apple-signed + notarized, for fresh downloads)
# ...and uploads all four to the PUBLIC releases repo's release for this version.
#
# RUN IN AN INTERACTIVE TERMINAL — codesign needs your login keychain.
#
# Prerequisites (one-time):
#   - Developer ID cert in your keychain
#   - notarytool keychain profile:
#       xcrun notarytool store-credentials "mydevtools-notary" \
#         --apple-id you@email.com --team-id STTF2NVQK8 --password <app-specific-pw>
#   - updater key at ~/.tauri/mydevtools-updater.key (+ .password)
#   - gh authenticated with write access to the public releases repo
#
# Before each run: BUMP the version in tauri.conf.json (updater only offers a
# HIGHER version, and the release tag must be new).
#
# Usage:  bash scripts/release-local.sh
set -euo pipefail

# ── config ───────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${PUBLIC_REPO:=mydevtools-tech/mydevtools-releases}"
: "${APPLE_SIGNING_IDENTITY:=Developer ID Application: Nishanth P V (STTF2NVQK8)}"
: "${NOTARY_PROFILE:=mydevtools-notary}"
KEYFILE="$HOME/.tauri/mydevtools-updater.key"
PWFILE="$HOME/.tauri/mydevtools-updater.password"
export APPLE_SIGNING_IDENTITY

VERSION="$(node -p "require('$ROOT/src-tauri/tauri.conf.json').version")"
TAG="v$VERSION"
BUNDLE="$ROOT/src-tauri/target/universal-apple-darwin/release/bundle"
APP="$BUNDLE/macos/MyDevTools.app"
DMG="$BUNDLE/dmg/MyDevTools_${VERSION}_universal.dmg"
OUT="$BUNDLE/macos"

for f in "$KEYFILE" "$PWFILE"; do
  [ -f "$f" ] || { echo "release-local: missing $f" >&2; exit 1; }
done
PW="$(cat "$PWFILE")"

echo "▸ Releasing v$VERSION to $PUBLIC_REPO"

# Guard: refuse to reuse an existing published version (would confuse the updater).
if gh release view "$TAG" --repo "$PUBLIC_REPO" >/dev/null 2>&1; then
  echo "release-local: $TAG already exists in $PUBLIC_REPO. Bump the version first." >&2
  exit 1
fi

# ── 1. build: Apple-sign the app AND sign the updater payload ─────────────────
# createUpdaterArtifacts:true makes tauri build emit + sign the .app.tar.gz, so
# TAURI_SIGNING_PRIVATE_KEY must be set here. Letting Tauri produce the tarball
# guarantees it's in the exact format its updater expects.
echo "▸ [1/5] Building & signing the app + updater payload…"
( cd "$ROOT" && \
  TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEYFILE")" \
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$PW" \
  pnpm tauri build --bundles app --target universal-apple-darwin )

# Locate the updater artifacts Tauri just produced (name varies by version).
TARGZ="$(ls "$OUT"/*.app.tar.gz 2>/dev/null | head -1)"
SIG="${TARGZ}.sig"
TARBALL_NAME="$(basename "$TARGZ")"
[ -f "$TARGZ" ] && [ -f "$SIG" ] || { echo "release-local: updater artifacts not found in $OUT" >&2; exit 1; }

# ── 2. notarize + staple the .app (for the DMG download path) ─────────────────
echo "▸ [2/5] Notarizing & stapling the app…"
APP_ZIP="$(mktemp -d)/app.zip"
ditto -c -k --keepParent "$APP" "$APP_ZIP"
xcrun notarytool submit "$APP_ZIP" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$APP"
rm -f "$APP_ZIP"

# ── 3. DMG for fresh downloads: hdiutil (deterministic), sign, notarize, staple ─
echo "▸ [3/5] Building, signing & notarizing the DMG…"
mkdir -p "$BUNDLE/dmg"
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "MyDevTools" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
codesign --force --sign "$APPLE_SIGNING_IDENTITY" "$DMG"
xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$DMG"

# ── 4. latest.json: manifest the updater reads (signature + public URL) ───────
echo "▸ [4/5] Writing latest.json…"
LATEST="$OUT/latest.json"
SIG_CONTENT="$(cat "$SIG")" \
TARGZ_URL="https://github.com/$PUBLIC_REPO/releases/download/$TAG/$TARBALL_NAME" \
VERSION="$VERSION" \
PUBDATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
LATEST_OUT="$LATEST" \
node -e '
  const fs = require("fs");
  const sig = process.env.SIG_CONTENT.trim();
  const url = process.env.TARGZ_URL;
  const entry = { signature: sig, url };
  const manifest = {
    version: process.env.VERSION,
    pub_date: process.env.PUBDATE,
    platforms: {
      "darwin-aarch64": entry,
      "darwin-x86_64": entry,
      "darwin-universal": entry,
    },
  };
  fs.writeFileSync(process.env.LATEST_OUT, JSON.stringify(manifest, null, 2));
'

# ── 5. publish everything to the PUBLIC repo ─────────────────────────────────
echo "▸ [5/5] Publishing to ${PUBLIC_REPO} ..."
gh release create "$TAG" --repo "$PUBLIC_REPO" \
  --title "MyDevTools $TAG" --notes "MyDevTools desktop $TAG"
# MyDevTools.dmg (version-less copy) keeps the website's download button URL
# stable: .../releases/latest/download/MyDevTools.dmg always serves the newest.
cp "$DMG" "$OUT/MyDevTools.dmg"
gh release upload "$TAG" --repo "$PUBLIC_REPO" --clobber \
  "$DMG" "$OUT/MyDevTools.dmg" "$TARGZ" "$SIG" "$LATEST"

echo ""
echo "✅ Published v$VERSION. Installed apps will offer the update on next launch."
echo "   Verify: curl -sI -L https://github.com/$PUBLIC_REPO/releases/latest/download/latest.json | head -1"
