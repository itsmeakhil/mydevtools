#!/usr/bin/env bash
# Wrap the built .app into an unsigned .dmg via hdiutil.
#
# Tauri's own dmg bundler (bundle_dmg.sh) drives Finder through AppleScript to
# style the window and flakes in headless / permission-restricted sessions.
# hdiutil is deterministic and needs no Finder — good enough for an unsigned
# local build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/src-tauri/target/release/bundle/macos/MyDevTools.app"
OUT_DIR="$ROOT/src-tauri/target/release/bundle/dmg"
DMG="$OUT_DIR/MyDevTools.dmg"
STAGE="$(mktemp -d)"

if [ ! -d "$APP" ]; then
  echo "make-dmg: $APP not found — run 'tauri build' first." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "MyDevTools" -srcfolder "$STAGE" -ov -format UDZO "$DMG"
rm -rf "$STAGE"
echo "make-dmg: created $DMG"
