# Releasing MyDevTools desktop (with auto-update)

The app updates itself in place via the Tauri updater — users never re-download
or reinstall, and the local SQLCipher database is never touched by an update.
A release is: **build → sign/notarize → publish artifacts → publish `latest.json`**.

## One-time setup

### Updater signing key (authenticity of updates)
A minisign-style keypair signs every update; the app refuses anything that
doesn't verify against the public key in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json)
(`plugins.updater.pubkey`).

- Private key: `~/.tauri/mydevtools_updater.key` — **keep it secret; back it up.**
  If it's lost, you can't sign updates and must ship a new pubkey (a manual
  reinstall for existing users).
- To rotate/regenerate: `pnpm --filter @mydevtools/desktop exec tauri signer generate -w ~/.tauri/mydevtools_updater.key -f`, then paste the new `.pub` into `tauri.conf.json`.

This is **separate** from Apple code signing (which proves the app is from you to
Gatekeeper). A production update needs **both**.

### Apple signing + notarization
See the Developer ID cert + notarization credentials setup (Apple Developer
Program). Have these in the environment at build time.

## Build a release

```bash
# Updater signing (required for the .app.tar.gz signature the manifest needs)
export TAURI_SIGNING_PRIVATE_KEY_PATH="$HOME/.tauri/mydevtools_updater.key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""        # set if you gave the key a password

# Apple signing + notarization
export APPLE_SIGNING_IDENTITY="Developer ID Application: NAME (TEAMID)"
export APPLE_ID="you@example.com" APPLE_PASSWORD="app-specific-pw" APPLE_TEAM_ID="TEAMID"

# Bump the version first in src-tauri/tauri.conf.json ("version") — the updater
# compares it against latest.json. Then:
pnpm --filter @mydevtools/desktop build:bundle
```

`createUpdaterArtifacts` is on, so the build emits (per arch) under
`src-tauri/target/release/bundle/`:

- `macos/MyDevTools.app.tar.gz`      ← the update payload
- `macos/MyDevTools.app.tar.gz.sig`  ← its updater signature
- `dmg/MyDevTools.dmg`               ← first-install download

Build once on Apple Silicon and once on Intel (or a universal target) so both
`darwin-aarch64` and `darwin-x86_64` are covered.

## Publish

1. Upload each `MyDevTools.app.tar.gz` (and the `.dmg` for new installs) to your
   host (S3 / GitHub Releases / static site).
2. Fill in [`latest.json.example`](latest.json.example) → `latest.json`:
   - `version` = the new version (must be > users' current version).
   - each `signature` = the **contents** of that arch's `.app.tar.gz.sig`.
   - each `url` = the public download URL of that arch's `.app.tar.gz`.
3. Publish `latest.json` at the endpoint in `tauri.conf.json`
   (`https://releases.mydevtools.tech/latest.json`).

That's it. On next launch (or via Settings → Updates) clients see the new
version, verify the signature, download, swap, and relaunch.

## Data safety across updates

- App bundle and data live in different places — replacing the `.app` never
  touches `~/Library/Application Support/tech.mydevtools.desktop/mydevtools.db`.
- Schema changes run through versioned, forward-only migrations, and the DB is
  snapshotted to `mydevtools.db.bak-v<version>` right before any upgrade
  (see `snapshot_before_upgrade` in `src-tauri/src/db/mod.rs`). Keep migrations
  **additive** (add tables/columns; never destructive) so an upgrade can't lose
  data.
