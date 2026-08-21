# Releasing the MyDevTools desktop app

The app updates itself in place via the Tauri updater — users never re-download or
reinstall, and the local SQLCipher database is never touched by an update.

Every release is: **build → sign + notarize → sign the update payload → publish**.
Releases go to this repo (`mydevtools-tech/mydevtools`), which the updater endpoint
and the website download button point at. The old `mydevtools-releases` mirror is
historical — it only still matters for installs from v0.1.11 and earlier.

`scripts/release-local.sh` publishes **one release containing both macOS and Linux**,
so users find every platform under a single tag. macOS is built natively; Linux is
built in Docker (see `Dockerfile.linux`), because it can't be cross-compiled from
macOS. Set `SKIP_LINUX=1` for a macOS-only release, or `LINUX_PLATFORMS="linux/amd64"`
to skip the slower ARM build.

- **Local** — run `scripts/release-local.sh` on your Mac. No CI minutes; needs one-time setup.
- **CI** — push to the `release` branch; GitHub builds it. No local setup; uses Actions minutes.

> **Pick one method per version.** Both publish tag `v<version>` to the same repo, so
> running both for the same version fails with "tag already exists". Always **bump the
> version** first — the updater only offers a *higher* version.

---

## Local release

### One-time setup

Done once per machine (already set up on the current dev Mac).

**1. Apple Developer ID certificate** — in your login keychain:
```bash
security find-identity -v -p codesigning | grep "Developer ID Application"
# → Developer ID Application: Nishanth P V (STTF2NVQK8)
```
If missing: Xcode → Settings → Accounts → your team → Manage Certificates → `+` → Developer ID Application.

**2. Notarization keychain profile** (so the script notarizes without a password prompt):
```bash
xcrun notarytool store-credentials "mydevtools-notary" \
  --apple-id "YOUR_APPLE_ID@email.com" \
  --team-id "STTF2NVQK8" \
  --password "APP_SPECIFIC_PASSWORD"     # appleid.apple.com → App-Specific Passwords
```

**3. Updater signing key** at `~/.tauri/mydevtools-updater.key` (+ `.password`). This key
signs updates; its pubkey (`B0A29640`) is baked into every build via
[`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) (`plugins.updater.pubkey`).
```bash
ls ~/.tauri/mydevtools-updater.key ~/.tauri/mydevtools-updater.password
```
> ⚠️ **Back up the key + password in a password manager.** If lost, you cannot ship
> updates existing installs will accept — everyone would need to reinstall.

**4. Rust targets** (for the universal build):
```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

**5. GitHub CLI** with write access to the public repo:
```bash
gh auth status
gh repo view mydevtools-tech/mydevtools-releases
```

**6. Frontend build env** — the desktop UI build requires the Firebase vars.
`apps/desktop-ui/.env.local` is gitignored, so create it once (copy the public vars from web):
```bash
grep '^NEXT_PUBLIC_' apps/web/.env.local > apps/desktop-ui/.env.local
```

**7. Grant codesign keychain access** (fixes `errSecInternalComponent`, since
codesign runs non-interactively inside `tauri build`):
```bash
security set-key-partition-list -S apple-tool:,apple:,codesign: -s \
  -k "YOUR_MAC_LOGIN_PASSWORD" ~/Library/Keychains/login.keychain-db
```

> **If `pnpm` fails** with "Failed to switch pnpm to vX" or "Unknown system error -8"
> (a broken managed pnpm on Apple Silicon), disable auto-switching and use the
> installed pnpm: add `manage-package-manager-versions=false` to `~/.npmrc`.
> After any `git pull` that changed dependencies, run `pnpm install`.

### Cutting a release — the commands

```bash
# 1. Bump the version (edit these so they match):
#      src-tauri/tauri.conf.json   "version": "0.1.1" -> "0.1.2"
#      src-tauri/Cargo.toml        version = "0.1.2"
#      src-tauri/Cargo.lock        (mydevtools-desktop entry) version = "0.1.2"
#      package.json                "version": "0.1.2"

# 2. Run the release script in an INTERACTIVE Terminal (codesign needs your keychain):
cd apps/desktop
bash scripts/release-local.sh

# If macOS prompts "codesign wants to use your key", click "Always Allow".
# Ends with: ✅ Published v0.1.2
```

That one command:
1. builds + Apple-signs the universal app
2. notarizes + staples the app
3. tars the app and **signs it with your updater key** → `.app.tar.gz` + `.sig`
4. builds + signs + notarizes the `.dmg`
5. builds the Linux `.deb` + AppImage in Docker (amd64 and arm64)
6. writes `latest.json` (version + signature + public URL)
7. uploads everything to a single release `v<version>`

Takes ~20–40 min (macOS compile, two notarization round-trips, plus the Linux
builds). Docker must be running for the Linux half; if it isn't, the script says so
and publishes macOS only.

> **Linux has no auto-update.** Only AppImage can self-update, and `latest.json`
> currently advertises the `darwin-*` platforms only. Linux users re-download. If you
> add a `linux-x86_64` entry later, every publisher of that manifest must **merge**
> into it rather than overwrite, or one platform will wipe the other's entries.

### Verify

```bash
# was 404 before publishing; should be 200 now
curl -sI -L "https://github.com/mydevtools-tech/mydevtools-releases/releases/latest/download/latest.json" | head -1

# manifest shows the version you shipped
curl -sL "https://github.com/mydevtools-tech/mydevtools-releases/releases/latest/download/latest.json"
```
Then launch an app on an **older** version → "Update available" toast appears within a launch or two.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `v0.1.2 already exists` | Version not bumped, or already published. Bump higher. |
| `codesign … errSecInternalComponent` / hangs | Run in Terminal.app (not a non-interactive shell) and click "Always Allow" on the keychain prompt. |
| `notarytool … Invalid` | Check the log: `xcrun notarytool log <id> --keychain-profile mydevtools-notary`. |
| Notarization stuck `In Progress` 30+ min | Apple queue backlog — wait; check https://developer.apple.com/system-status. |
| Users don't get the update | Version wasn't bumped, or they're on a build predating the current endpoint/key (auto-update only works forward). |

---

## CI release (alternative)

```bash
# 1. Bump the version (same as above), commit to main.
# 2. Promote to the release branch:
git checkout release && git merge main && git push
#   first time only: git checkout -b release && git push -u origin release
```
GitHub Actions builds, signs, notarizes, and mirrors to the public repo automatically —
watch it under the repo's **Actions** tab. Each push to `release` uses ~200 billed
Actions minutes, so promote deliberately.

---

## Data safety across updates

- The app bundle and data live in different places — replacing the `.app` never touches
  `~/Library/Application Support/tech.mydevtools.desktop/mydevtools.db`.
- Schema changes run through versioned, forward-only migrations, and the DB is snapshotted
  to `mydevtools.db.bak-v<version>` right before any upgrade (see `snapshot_before_upgrade`
  in `src-tauri/src/db/mod.rs`). Keep migrations **additive** (add tables/columns; never
  destructive) so an upgrade can't lose data.

---

## Don't break these

- **Never rotate the updater key** or **change the updater endpoint** — existing installs
  would reject every future update and need a manual reinstall.
- **Always bump the version** before releasing.
- **Keep the updater key backed up** — it's critical infrastructure.

---

## Building the Linux app

Linux **cannot be cross-compiled from macOS** — the build links against
webkit2gtk/GTK system libraries, so it has to run on Linux (a machine, a VM, WSL2,
or a container). Unlike macOS there is **no signing or notarization**: no Apple
account, no certificate, no notarytool. You just build and ship the artifacts.

### Build dependencies (Debian/Ubuntu)

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf \
  libdbus-1-dev xdg-utils
```

`libdbus-1-dev` is required by the `dbus-secret-service` crate, which backs the
Linux keyring (see the platform-split `keyring` dependency in `Cargo.toml`).

`xdg-utils` is required by the AppImage bundler — `tauri-plugin-opener` embeds
`xdg-open`, and bundling fails with "xdg-open binary not found" without it.

> On a memory-constrained builder (e.g. Docker Desktop), the release profile's fat
> LTO can get the linker OOM-killed (`signal: 9, SIGKILL`). Build with
> `CARGO_PROFILE_RELEASE_LTO=false` if that happens.

### Build

```bash
pnpm install --frozen-lockfile
cd apps/desktop

# updater artifacts are signed, so the key must be present
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/mydevtools-updater.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(cat ~/.tauri/mydevtools-updater.password)"

pnpm tauri build --bundles deb,appimage
# → src-tauri/target/release/bundle/{deb,appimage}/
```

### Verify before shipping

The keyring is the one thing that can compile fine and still fail at runtime: the
app fetches the SQLCipher key from the Secret Service at startup, and a headless
shell has no keyring daemon.

```bash
sudo apt install -y gnome-keyring dbus-x11
dbus-run-session -- ./src-tauri/target/release/mydevtools-desktop
```

Then: create a note → quit → **reboot** → reopen. If the note is still there, the
key persisted correctly.

### Publishing

Only **AppImage** can self-update — Tauri's updater cannot replace a `.deb`/`.rpm`
(the package manager owns those files), so AppImage is the auto-updating format and
`.deb` is a manual-install convenience.

> ⚠️ `latest.json` is shared across platforms. The macOS release writes a manifest
> containing only the `darwin-*` keys, so uploading a Linux manifest with
> `--clobber` **erases the macOS entries** (and vice versa) and silently breaks
> auto-update for the other OS. Merge the platform keys into the existing
> `latest.json` instead of overwriting it.
