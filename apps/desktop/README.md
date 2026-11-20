# MyDevTools Desktop (macOS and Linux, Tauri v2)

Free and open source desktop app with 80+ developer tools. It opens directly to
the dashboard and stores app data locally in SQLCipher. There are no accounts,
activation, cloud sync or required MyDevTools server.

## Architecture

- **Frontend**: `apps/desktop-ui`, statically exported by
  `apps/desktop-ui/scripts/build-tauri.mjs`. `apps/web` is the separate marketing
  site and is not bundled into the app.
- **Local data**: `lib/backend-api.ts` / `lib/desktop/api-fetch.ts` call the
  `local_api` Tauri command. Rust dispatches `/api/v1/...` paths locally; they are
  not HTTP endpoints.
- **Storage and vault**: SQLCipher uses a device key from macOS Keychain or the
  Linux Secret Service. Vault creation and unlocking happen offline in Rust.
- **Database tools**: native Rust drivers connect directly to the databases the
  user configures.
- **API Client**: Rust handles HTTP, streaming responses, gRPC and the local mock
  server. Requests go to endpoints the user chooses.
- **Updates**: signed macOS update payloads are fetched from GitHub Releases.
  Linux packages currently require a manual download.

See [the architecture guide](../../docs/ARCHITECTURE.md) for the full data flow.

## Development

From the repository root, with Rust and the platform build dependencies installed:

```sh
nvm use                        # Node 22, pinned in .nvmrc
pnpm install --frozen-lockfile  # pnpm version is pinned in root package.json
pnpm dev:desktop               # Tauri shell + desktop UI dev server
```

## Build

Build only the desktop frontend:

```sh
pnpm --filter @mydevtools/desktop-ui build:tauri
# Output: apps/desktop-ui/out/
```

Build a macOS app and DMG locally:

```sh
pnpm build:desktop
# Output: apps/desktop/src-tauri/target/release/bundle/
```

The bundle configuration enables signed updater artifacts, so packaging requires
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. A local
build does not automatically notarize or publish the app. The release script
loads the existing updater key and handles signing, notarization and upload;
see [RELEASING.md](RELEASING.md) for setup and the macOS/Linux publishing commands.

## Verify

```sh
cd apps/desktop/src-tauri
cargo check --locked
cargo test --locked
```

Ignored integration tests require their external services; inspect each test's
requirements before running `cargo test -- --ignored`.

Before shipping, check that vault creation/unlocking and saved notes survive a
restart, terminal panes restore correctly, and the API Client and database tools
can connect to local services. On Linux, also reboot and confirm that saved data
can still be opened through the Secret Service keyring.
