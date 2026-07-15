#!/usr/bin/env bash
# One-shot signed + notarized universal macOS DMG for distribution.
#
# Does the full release flow that `tauri build`'s own dmg step can't do reliably
# (its bundle_dmg.sh drives Finder via AppleScript and flakes headless):
#   1. tauri build (universal) — compiles & signs the .app (hardened runtime)
#   2. notarizes & staples the .app itself (so it works offline)
#   3. wraps the stapled .app into a DMG via hdiutil (deterministic, no Finder),
#      then signs, notarizes & staples the DMG
#   4. verifies with Gatekeeper and emits a .sha256 checksum
#
# Signing uses your login keychain, so RUN THIS IN AN INTERACTIVE TERMINAL
# (codesign needs to reach your private key; a detached/non-interactive shell
# hits errSecInternalComponent or hangs on a keychain prompt).
#
# Notarization uses a stored keychain profile so no password is needed inline.
# Create it once:
#   xcrun notarytool store-credentials "mydevtools-notary" \
#       --apple-id "you@email.com" --team-id "STTF2NVQK8" --password "app-specific-pw"
#
# Env:
#   APPLE_SIGNING_IDENTITY  (optional) override; defaults to the value below
#   NOTARY_PROFILE          (optional) keychain profile name; defaults to mydevtools-notary
# Firebase/back-end vars are read from apps/web/.env.local by build-tauri.mjs.
#
# Usage:  bash scripts/release-dmg.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -p "require('$ROOT/src-tauri/tauri.conf.json').version")"
BUNDLE="$ROOT/src-tauri/target/universal-apple-darwin/release/bundle"
APP="$BUNDLE/macos/MyDevTools.app"
DMG="$BUNDLE/dmg/MyDevTools_${VERSION}_universal.dmg"

: "${APPLE_SIGNING_IDENTITY:=Developer ID Application: Nishanth P V (STTF2NVQK8)}"
: "${NOTARY_PROFILE:=mydevtools-notary}"
export APPLE_SIGNING_IDENTITY

echo "▸ [1/5] Building & signing the app (universal)…"
# Build only the .app; the DMG we assemble ourselves below. Tauri signs the app
# with APPLE_SIGNING_IDENTITY (hardened runtime). No APPLE_ID/PASSWORD in env, so
# Tauri does NOT notarize here — we do that explicitly in step 2.
( cd "$ROOT" && pnpm tauri build --target universal-apple-darwin --bundles app )

echo "▸ [2/5] Notarizing & stapling the app…"
# notarytool needs an archive, not a bare .app — zip it, submit, then staple the
# ticket back onto the .app so it launches offline without a Gatekeeper round-trip.
APP_ZIP="$(mktemp -d)/MyDevTools.zip"
ditto -c -k --keepParent "$APP" "$APP_ZIP"
xcrun notarytool submit "$APP_ZIP" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$APP"
rm -f "$APP_ZIP"

echo "▸ [3/5] Wrapping the notarized app into a DMG (hdiutil)…"
mkdir -p "$BUNDLE/dmg"
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "MyDevTools" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
codesign --force --sign "$APPLE_SIGNING_IDENTITY" "$DMG"

echo "▸ [4/5] Notarizing & stapling the DMG…"
xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$DMG"

echo "▸ [5/5] Verifying + checksum…"
spctl -a -vvv -t open --context context:primary-signature "$DMG"
shasum -a 256 "$DMG" | tee "$DMG.sha256"

echo ""
echo "✅ Done: $DMG"
