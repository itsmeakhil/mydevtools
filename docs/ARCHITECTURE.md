# MyDevTools architecture

How the desktop app is put together, for contributors. User-facing docs live at
[mydevtools.tech/help](https://mydevtools.tech/help); the front door is the
[README](../README.md).

## One sentence

A Next.js UI (`apps/desktop-ui`) runs inside a Tauri v2 shell (`apps/desktop`);
everything the UI would normally ask a server for — storage, database drivers,
HTTP/gRPC, vault crypto — is answered by Rust on the same machine.

There is no MyDevTools backend, no account system and no sync service. The
marketing site (`apps/web`) is a separate, static Next.js app and never runs the
tools.

## Repository layout

```
apps/
├── desktop/                 Tauri v2 shell (Rust)
│   └── src-tauri/src/
│       ├── lib.rs           Tauri commands: local_api, http_request(_stream), proxy_grpc, mock_server_start
│       ├── router/          Local API router — one module per resource (notes, tasks, bookmarks,
│       │                    snippets, api_client, master_vault, preferences, workspaces, backup, …)
│       ├── db/              SQLCipher open/migrate, device key from the OS keychain
│       ├── dbtools/         Native drivers: Postgres, MySQL, MongoDB, Redis, SQLite
│       └── http/            reqwest proxy, gRPC over h2, mock server
│
├── desktop-ui/              Next.js 16 / React 19 UI — the 80+ tools
│   ├── src/app/app/         One route per tool (page.tsx + layout.tsx)
│   ├── src/components/      Tool layouts, sidebar, command palette, shared UI
│   ├── src/lib/             Pure tool logic (unit-tested), crypto, local API client
│   ├── src/lib/desktop/     Tauri bridge: api-fetch.ts, updater, backup
│   ├── src/store/           Zustand stores
│   └── messages/            next-intl locale files (27 languages, en.json is canonical)
│
└── web/                     mydevtools.tech — marketing/SEO only (Next.js, static)
```

## Data flow

```
┌──────────────────────── Tauri window ─────────────────────────┐
│                                                               │
│   Next.js UI (apps/desktop-ui)                                │
│     │  lib/backend-api.ts  →  lib/desktop/api-fetch.ts        │
│     │  "fetch('/api/v1/notes')"  is a *contract*, never HTTP  │
│     ▼                                                         │
│   invoke("local_api", { method, path, body })  ── Tauri IPC   │
│     │                                                         │
│     ▼                                                         │
│   Rust router (src-tauri/src/router/*)                        │
│     ├── SQLCipher (rusqlite, bundled)  ← key from OS keychain │
│     ├── dbtools/*   → your Postgres / MySQL / MongoDB / Redis │
│     └── http/*      → your API endpoints, gRPC, mock server   │
└───────────────────────────────────────────────────────────────┘
```

- **`/api/v1/...` paths** in the UI are routed by the Rust router, not by any
  web server. Keeping the REST-shaped contract means tool code reads like
  ordinary fetch code and is easy to unit-test.
- **Storage** is a single SQLCipher database in the app data directory,
  encrypted with a device key held in the macOS Keychain (`db/device_key.rs`).
  Schema migrations live in `db/migrations.rs`.
- **Vault data** (password manager, API keys, database credentials) is
  additionally encrypted with a user master password; the master key never
  leaves the machine. Creating/unlocking the vault is entirely offline.
- **Database clients** use native Rust drivers, so a connection goes straight
  from the user's machine to their database — nothing is proxied.
- **API client** requests go through `reqwest` in Rust, which is why the app
  is not subject to browser CORS rules. Streaming responses and gRPC use the
  same path (`http_request_stream`, `proxy_grpc`).
- **Updater** checks `github.com/mydevtools-tech/mydevtools/releases/latest/download/latest.json`
  (Tauri updater, minisign-verified).

## Privacy boundaries

| Leaves the machine | Only when |
|---|---|
| API client / WebSocket / webhook traffic | you send a request to an endpoint you typed |
| Database connections | you configure a host and connect |
| DNS / WHOIS queries | you run those tools (public resolvers / RDAP) |
| Update check | the updater runs (GitHub Releases) |
| `app_started`, `tool_opened {tool}` | **only** if you opt in to anonymous usage stats — rotating session id, app version, locale; no tool input, paths or stable ids (`apps/desktop-ui/src/lib/telemetry.ts`) |

Nothing else. There is no crash reporter, no analytics SDK in the app and no
MyDevTools server to talk to. Marketing-site analytics exist only in `apps/web`.

## Identity

There are no accounts. `utils/useAuth` returns a fixed local `uid` (`"local"`);
the display name and avatar are local preferences (`useAppUser`). Historical
web-era routes such as `/account/plan` redirect to `/download` because shipped
builds still hard-open them.

## Tech stack

| Layer | Technology |
|---|---|
| Shell | Tauri v2 (Rust) |
| Storage | SQLCipher via `rusqlite` (`bundled-sqlcipher-vendored-openssl`), OS keychain via `keyring` |
| DB drivers | `tokio-postgres`, `mysql_async`, `mongodb`, `redis`, `rusqlite` |
| HTTP / gRPC | `reqwest` (HTTP), `h2` (gRPC framing, no tonic) |
| UI | Next.js 16, React 19, TypeScript 5.7, Tailwind, shadcn/ui, Radix |
| Editors | Monaco (code), Tiptap (notes) |
| State | Zustand |
| i18n | next-intl — 27 locales |
| Tests | Jest (`apps/desktop-ui`), `cargo test` (`apps/desktop/src-tauri`) |

## Adding a tool

See [CONTRIBUTING.md → Adding a new tool](../CONTRIBUTING.md#adding-a-new-tool):
per-tool files plus six registries (`metadata.ts`, `route-config.ts`,
`tab-registry.tsx`, `tool-categories.ts`, `tool-i18n.ts`, sidebar data) and
i18n keys in all 27 locales.
