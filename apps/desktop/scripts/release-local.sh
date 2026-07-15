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
TARBALL_NAME="MyDevTools_${VERSION}_universal.app.tar.gz"
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

# ── 1. build + Apple-sign the universal app (no dmg — we make it via hdiutil) ─
echo "▸ [1/6] Building & signing the app…"
( cd "$ROOT" && pnpm tauri build --bundles app --target universal-apple-darwin )

# ── 2. notarize + staple the .app (so both the tarball and dmg carry a ticket)─
echo "▸ [2/6] Notarizing & stapling the app…"
APP_ZIP="$(mktemp -d)/app.zip"
ditto -c -k --keepParent "$APP" "$APP_ZIP"
xcrun notarytool submit "$APP_ZIP" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$APP"
rm -f "$APP_ZIP"

# ── 3. updater payload: tar the stapled app, then sign it with the updater key ─
echo "▸ [3/6] Building & signing the updater payload…"
rm -f "$OUT/$TARBALL_NAME" "$OUT/$TARBALL_NAME.sig"
# COPYFILE_DISABLE strips macOS AppleDouble (._*) entries the updater can't use.
COPYFILE_DISABLE=1 tar -czf "$OUT/$TARBALL_NAME" -C "$(dirname "$APP")" "$(basename "$APP")"
npx tauri signer sign -f "$KEYFILE" -p "$PW" "$OUT/$TARBALL_NAME"   # -> $TARBALL_NAME.sig

# ── 4. DMG for fresh downloads: hdiutil (deterministic), sign, notarize, staple ─
echo "▸ [4/6] Building, signing & notarizing the DMG…"
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

# ── 5. latest.json: manifest the updater reads (signature + public URL) ───────
echo "▸ [5/6] Writing latest.json…"
LATEST="$OUT/latest.json"
SIG_CONTENT="$(cat "$OUT/$TARBALL_NAME.sig")" \
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

# ── 6. publish everything to the PUBLIC repo ─────────────────────────────────
echo "▸ [6/6] Publishing to $PUBLIC_REPO…"
gh release create "$TAG" --repo "$PUBLIC_REPO" \
  --title "MyDevTools $TAG" --notes "MyDevTools desktop $TAG"
gh release upload "$TAG" --repo "$PUBLIC_REPO" --clobber \
  "$DMG" "$OUT/$TARBALL_NAME" "$OUT/$TARBALL_NAME.sig" "$LATEST"

echo ""
echo "✅ Published v$VERSION. Installed apps will offer the update on next launch."
echo "   Verify: curl -sI -L https://github.com/$PUBLIC_REPO/releases/latest/download/latest.json | head -1"
