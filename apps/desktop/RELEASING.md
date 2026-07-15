# Releasing the MyDevTools desktop app

The app updates itself in place via the Tauri updater — users never re-download or
reinstall, and the local SQLCipher database is never touched by an update.

Every release is: **build → sign + notarize → sign the update payload → publish to
the public releases repo**. Both methods below produce the same result and publish to
[`mydevtools-tech/mydevtools-releases`](https://github.com/mydevtools-tech/mydevtools-releases)
(public), which the updater endpoint and the website download button point at.

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
5. writes `latest.json` (version + signature + public URL)
6. uploads all four to the public repo release `v<version>`

Takes ~10–20 min (Rust compile + two notarization round-trips).

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
