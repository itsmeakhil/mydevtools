#!/usr/bin/env bash
# Notarize + staple the release DMG (and the .app inside it).
#
# Runs AFTER `tauri build` has signed the .app with Developer ID + hardened
# runtime, and AFTER make-dmg.sh has wrapped it. `tauri build` also notarizes
# the .app when the notarization env vars below are present; this script signs
# and notarizes the DMG itself and staples the ticket so Gatekeeper passes
# offline on a freshly downloaded copy.
#
# Required env:
#   APPLE_SIGNING_IDENTITY   "Developer ID Application: NAME (TEAMID)"
# Notarization — provide EITHER the Apple ID trio OR the API-key trio:
#   APPLE_ID / APPLE_PASSWORD (app-specific pw) / APPLE_TEAM_ID
#   APPLE_API_KEY (key id) / APPLE_API_ISSUER / APPLE_API_KEY_PATH (.p8)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/src-tauri/target/release/bundle/macos/MyDevTools.app"
DMG="$ROOT/src-tauri/target/release/bundle/dmg/MyDevTools.dmg"

: "${APPLE_SIGNING_IDENTITY:?set APPLE_SIGNING_IDENTITY to your Developer ID Application identity}"
[ -f "$DMG" ] || { echo "sign-dmg: $DMG not found — run 'tauri build --bundles app && make-dmg.sh' first." >&2; exit 1; }

# Build the notarytool credential args from whichever set is provided.
if [ -n "${APPLE_API_KEY:-}" ]; then
  NOTARY_ARGS=(--key "${APPLE_API_KEY_PATH:?}" --key-id "$APPLE_API_KEY" --issuer "${APPLE_API_ISSUER:?}")
elif [ -n "${APPLE_ID:-}" ]; then
  NOTARY_ARGS=(--apple-id "$APPLE_ID" --password "${APPLE_PASSWORD:?}" --team-id "${APPLE_TEAM_ID:?}")
else
  echo "sign-dmg: provide either APPLE_API_KEY(+PATH,+ISSUER) or APPLE_ID(+PASSWORD,+TEAM_ID)." >&2
  exit 1
fi

echo "sign-dmg: signing the DMG…"
codesign --force --sign "$APPLE_SIGNING_IDENTITY" --timestamp "$DMG"

echo "sign-dmg: submitting to Apple notary service (this can take a few minutes)…"
xcrun notarytool submit "$DMG" "${NOTARY_ARGS[@]}" --wait

echo "sign-dmg: stapling tickets…"
# Staple the app first (harmless if tauri already did), then the DMG.
xcrun stapler staple "$APP" 2>/dev/null || true
xcrun stapler staple "$DMG"

echo "sign-dmg: verifying…"
codesign --verify --deep --strict --verbose=2 "$APP"
spctl --assess --type open --context context:primary-signature -v "$DMG"
echo "sign-dmg: done → $DMG"
