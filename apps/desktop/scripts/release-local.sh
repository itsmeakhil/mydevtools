#!/usr/bin/env bash
# Build a release LOCALLY and publish it so installed apps auto-update — the
# same end result as the CI workflow, without spending Actions minutes.
#
# Publishes ONE release containing BOTH macOS and Linux, so users see every
# platform under a single tag. Linux packages are built in Docker (they cannot
# be cross-compiled from macOS); set SKIP_LINUX=1 to publish macOS only.
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
REPO_ROOT="$(cd "$ROOT/../.." && pwd)"
: "${PUBLIC_REPO:=mydevtools-tech/mydevtools}"
: "${APPLE_SIGNING_IDENTITY:=Developer ID Application: Nishanth P V (STTF2NVQK8)}"
: "${NOTARY_PROFILE:=mydevtools-notary}"
# Linux packaging (Docker). SKIP_LINUX=1 publishes a macOS-only release.
: "${SKIP_LINUX:=0}"
: "${LINUX_PLATFORMS:=linux/amd64 linux/arm64}"
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

# Reclaim disk: old DMGs from prior builds are already published — drop them so
# the target dir doesn't fill up (hdiutil fails with "No space left on device").
rm -f "$BUNDLE"/dmg/MyDevTools_*_universal.dmg "$BUNDLE"/dmg/MyDevTools.dmg 2>/dev/null || true
# Single staging workdir, cleaned on ANY exit (so a mid-run failure doesn't leak
# ~90MB of copied .app each time).
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Sign a file with a Developer ID + secure timestamp, retrying transient
# timestamp.apple.com failures ("A timestamp was expected but was not found").
codesign_retry() {
  local target="$1" i
  for i in 1 2 3 4 5; do
    if codesign --force --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$target" 2>"$WORK/cs_err"; then return 0; fi
    echo "  codesign attempt $i failed: $(cat "$WORK/cs_err") — retrying in 10s…" >&2
    sleep 10
  done
  echo "release-local: codesign failed after 5 attempts" >&2; return 1
}

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
APP_ZIP="$WORK/app.zip"
ditto -c -k --keepParent "$APP" "$APP_ZIP"
xcrun notarytool submit "$APP_ZIP" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$APP"
rm -f "$APP_ZIP"

# ── 3. DMG for fresh downloads: hdiutil (deterministic), sign, notarize, staple ─
echo "▸ [3/5] Building, signing & notarizing the DMG…"
mkdir -p "$BUNDLE/dmg"
STAGE="$WORK/stage"
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "MyDevTools" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"
codesign_retry "$DMG"
xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait
xcrun stapler staple "$DMG"

# ── 3b. Linux packages, built in Docker ──────────────────────────────────────
# Linux links against webkit2gtk/GTK so it can't be cross-compiled from macOS.
# The frontend is already built above, so the container only does the Rust half
# (beforeBuildCommand is disabled) and reuses apps/desktop-ui/out.
LINUX_ARTIFACTS=()
if [ "$SKIP_LINUX" = "1" ]; then
  echo "▸ [3b/5] Skipping Linux (SKIP_LINUX=1)"
elif ! docker info >/dev/null 2>&1; then
  echo "▸ [3b/5] Docker is not running — skipping Linux packages." >&2
  echo "         Start Docker Desktop and re-run, or set SKIP_LINUX=1 to silence this." >&2
else
  for PLATFORM in $LINUX_PLATFORMS; do
    ARCH="${PLATFORM#linux/}"
    IMAGE="mydevtools-linux:$ARCH"
    echo "▸ [3b/5] Linux $ARCH — preparing image"
    docker build --quiet --platform "$PLATFORM" \
      -f "$ROOT/Dockerfile.linux" -t "$IMAGE" "$ROOT" >/dev/null

    echo "▸ [3b/5] Linux $ARCH — building packages"
    # LTO off: the fat-LTO link peaks well above what a Docker VM usually has
    # and gets OOM-killed (signal: 9). Slightly larger binary, reliable build.
    docker run --rm --platform "$PLATFORM" \
      -v "$REPO_ROOT":/work \
      -v "mydevtools-cargo-reg-$ARCH":/root/.cargo/registry \
      -v "mydevtools-cargo-target-$ARCH":/build \
      -e CARGO_TARGET_DIR=/build/target \
      -e APPIMAGE_EXTRACT_AND_RUN=1 \
      -e CARGO_PROFILE_RELEASE_LTO=false \
      "$IMAGE" bash -c '
        set -e
        cd /work/apps/desktop
        tauri build --bundles deb,appimage \
          --config "{\"build\":{\"beforeBuildCommand\":\"\"},\"bundle\":{\"createUpdaterArtifacts\":false}}"
        mkdir -p /work/dist-linux
        find "$CARGO_TARGET_DIR/release/bundle" \( -name "*.deb" -o -name "*.AppImage" \) \
          -exec cp -f {} /work/dist-linux/ \;
      '
  done
  # Stable, arch-suffixed copies so the website can link to a URL that never
  # changes: .../releases/latest/download/MyDevTools-amd64.deb
  for f in "$REPO_ROOT"/dist-linux/*.deb "$REPO_ROOT"/dist-linux/*.AppImage; do
    [ -e "$f" ] || continue
    LINUX_ARTIFACTS+=("$f")
    case "$f" in
      *_amd64.deb)      cp -f "$f" "$REPO_ROOT/dist-linux/MyDevTools-amd64.deb";      LINUX_ARTIFACTS+=("$REPO_ROOT/dist-linux/MyDevTools-amd64.deb") ;;
      *_arm64.deb)      cp -f "$f" "$REPO_ROOT/dist-linux/MyDevTools-arm64.deb";      LINUX_ARTIFACTS+=("$REPO_ROOT/dist-linux/MyDevTools-arm64.deb") ;;
      *x86_64.AppImage) cp -f "$f" "$REPO_ROOT/dist-linux/MyDevTools-x86_64.AppImage"; LINUX_ARTIFACTS+=("$REPO_ROOT/dist-linux/MyDevTools-x86_64.AppImage") ;;
      *aarch64.AppImage) cp -f "$f" "$REPO_ROOT/dist-linux/MyDevTools-aarch64.AppImage"; LINUX_ARTIFACTS+=("$REPO_ROOT/dist-linux/MyDevTools-aarch64.AppImage") ;;
    esac
  done
  echo "▸ [3b/5] Linux artifacts: ${#LINUX_ARTIFACTS[@]}"
fi

# ── 4. latest.json: manifest the updater reads (signature + public URL) ───────
# NOTE: darwin-* keys only. Linux packages ship without auto-update for now —
# only AppImage can self-update, and adding linux-x86_64 here means every
# publisher of this manifest must merge rather than overwrite it.
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
if [ "${#LINUX_ARTIFACTS[@]}" -gt 0 ]; then
  echo "▸ [5/5] Uploading ${#LINUX_ARTIFACTS[@]} Linux artifacts…"
  gh release upload "$TAG" --repo "$PUBLIC_REPO" --clobber "${LINUX_ARTIFACTS[@]}"
fi

echo ""
echo "✅ Published v$VERSION. Installed apps will offer the update on next launch."
echo "   Verify: curl -sI -L https://github.com/$PUBLIC_REPO/releases/latest/download/latest.json | head -1"
