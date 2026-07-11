# MyDevTools Desktop (macOS, Tauri v2)

Offline-first desktop app. All 57 tools work; **all data lives on this Mac**
(SQLCipher database keyed by a macOS Keychain device key) unless you turn on
Cloud Sync for your personal workspace. Shared/team workspaces are always
cloud-backed and require sign-in.

## Architecture

- **Frontend**: the Next.js web app, statically exported by
  `apps/web/scripts/build-tauri.mjs` (exclusion build — API routes,
  middleware, and dynamic marketing pages are moved aside during the build).
- **Local data**: single `local_api(method, path, body)` Rust command →
  `router/` dispatcher mirroring the FastAPI `/api/v1/*` JSON contracts →
  SQLCipher (`entries` table stores opaque docs; E2E crypto stays in the
  webview — Rust never sees plaintext vault data).
- **Cloud**: `remote_api` command (reqwest + persistent cookie jar in
  SQLCipher) calls FastAPI directly — no CORS, no backend changes. Cloud
  sign-in happens in the system browser (`/login?desktop=1`) and hands a
  Firebase custom token back via the `mydevtools://auth` deep link.
- **Sync**: TS engine (`apps/web/src/lib/desktop/sync-engine.ts`) reconciles
  the local personal workspace against the remote one — push dirty rows
  first, then pull with last-write-wins on `updatedAt`. Toggle in Settings.
- **Live DB tools**: native Rust drivers (tokio-postgres, mysql_async,
  mongodb, redis) behind the same JSON contracts as the web API routes.
- **api-client**: `http_request` / `http_request_stream` commands (reqwest)
  replace the `/api/proxy` and `/api/proxy-stream` routes.

## Dev workflow

```sh
nvm use 20.19.5        # Node >= 20.19 required (older 20.x breaks the export)
pnpm dev:desktop       # tauri dev against next dev :3000
pnpm build:desktop     # static export → release build → .app + .dmg
```

Artifacts land in `apps/desktop/src-tauri/target/release/bundle/`.

The `.dmg` is unsigned: on first launch, **right-click the app → Open →
Open** to pass Gatekeeper (or `xattr -dr com.apple.quarantine
/Applications/MyDevTools.app`).

Rust tests: `cargo test` (unit) and `cargo test -- --ignored` (integration —
needs local `mongod` on 27017, `redis-server` on 6379, and network for the
httpbin proxy test).

## Not in v1 (planned v1.1)

- gRPC / NTLM / SPNEGO proxies and the mock server (api-client advanced)
- Redis MONITOR + pub/sub live subscribe (SSE panes show an error)
- CSP hardening in `tauri.conf.json` (currently null)
- Signing/notarization, auto-update, user-preferences sync

## Regression matrix

Offline pass (Wi-Fi off): 41 pure-client tools · master-vault
create/unlock/relaunch · password-manager, api-keys, environment-manager,
snippets, bookmarks, notes (text), to-do, api-client
collections/history/environments, DB connection vaults · gitignore-generator
(bundled templates) · sql-client/database-explorer/redis-commander against
local servers.

Online pass: cloud sign-in via browser handoff · session survives relaunch ·
shared workspace round-trip with web · sync toggle on → offline edits appear
on web, web edits propagate back, deletes propagate both ways · online-only
gates (s3-drive, url-shortener, dns-lookup, email-validator) unlock.
