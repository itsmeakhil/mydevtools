<p align="center">
  <img src="https://mydevtools.tech/favicon.ico" alt="MyDevTools Logo" width="80" height="80" />
</p>

<h1 align="center">MyDevTools</h1>

<p align="center">
  <strong>The Offline Developer Workstation</strong>
</p>

<p align="center">
  80+ developer tools, an API client, SQL / MongoDB / Redis clients, encryption<br />
  and productivity utilities — all running locally on your machine.
</p>

<p align="center">
  <strong>Free · Open Source · Offline · No Account · No Ads</strong>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/releases/latest"><strong>⬇️ Download</strong></a> •
  <a href="https://mydevtools.tech"><strong>🌐 Website</strong></a> •
  <a href="docs/MYDEVTOOLS.md"><strong>📚 Docs</strong></a> •
  <a href="#-tools">🧰 Tools</a> •
  <a href="#-contributing">🤝 Contribute</a>
</p>

<p align="center">
  <a href="https://github.com/mydevtools-tech/mydevtools/stargazers"><img src="https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=for-the-badge&color=6d7cf5" alt="GitHub stars" /></a>
  <img src="https://img.shields.io/badge/License-AGPL%203.0-blue?style=for-the-badge" alt="License AGPL 3.0" />
  <img src="https://img.shields.io/badge/100%25-Offline-22c55e?style=for-the-badge" alt="100% Offline" />
  <img src="https://img.shields.io/badge/Accounts-None-8b5cf6?style=for-the-badge" alt="No account required" />
  <img src="https://img.shields.io/badge/Price-Free-0ea5e9?style=for-the-badge" alt="Free" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri 2" />
  <img src="https://img.shields.io/badge/Rust-stable-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.7" />
  <img src="https://img.shields.io/badge/SQLCipher-encrypted-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLCipher" />
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/mydevtools?embed=true&utm_source=badge-featured&utm_medium=badge" target="_blank">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1041847&theme=neutral&t=1764002797983" alt="MyDevTools on Product Hunt" width="250" height="54" />
  </a>
</p>

---

## What is MyDevTools?

MyDevTools is a **desktop application** that replaces the pile of tabs, one-off
websites and single-purpose apps a developer opens every day. Formatters,
converters, generators, crypto utilities, an API client, SQL / MongoDB / Redis
clients, notes, snippets and a credential vault — one app, one search box, one
keyboard shortcut.

It runs on your machine. There is no MyDevTools server, no account and no sync.

| The usual setup | MyDevTools |
|---|---|
| A dozen tabs of single-purpose tool sites | One desktop app, `⌘K` to jump anywhere |
| Tools that upload your payload to a server to format it | Processing happens on your machine |
| Sign-up walls and license keys | No account, no sign-in, no activation |
| Separate apps for SQL, MongoDB and Redis | SQL + MongoDB + Redis + S3 in one place |
| Paid tiers for basic utilities | Free — every tool, every feature |
| Closed-source tooling you cannot audit | AGPL-3.0, the whole app is in this repo |

> **Note on the table above:** it describes the workflow MyDevTools replaces, not
> any specific competing product. Feature parity with dedicated tools like
> DBeaver or Postman is not claimed — see [Where MyDevTools stops](#where-mydevtools-stops).

---

## 🚀 Quick start

**Download the app** — [latest release](https://github.com/mydevtools-tech/mydevtools/releases/latest)
(macOS universal build, signed and notarized; Apple Silicon and Intel).

Open it and start working: no sign-up, no configuration, no API keys.

Windows and Linux builds are not published yet — the Tauri shell can be built
from source on those platforms, but they are untested. See
[Building from source](#-building-from-source).

---

## 🧰 Tools

83 tools ship in the app today, grouped the way the sidebar groups them.

### 📝 Formatters & validators

| Tool | Description |
|---|---|
| **JSON Formatter** | Format, validate and edit JSON in a Monaco editor |
| **JSON Visualizer** | Explore JSON as an interactive node graph with search and image export |
| **JSON Diff** | Compare two JSON documents semantically, ignoring key order and formatting |
| **JSON Schema Generator** | Infer JSON Schema from a sample payload |
| **JSON to Code** | Generate TypeScript, Go, Rust, Python, Java, Kotlin and Swift models from JSON |
| **JSONPath Playground** | Query JSON with JSONPath or JMESPath expressions |
| **YAML Formatter** | Format, validate and convert YAML to JSON |
| **Format Converter** | Convert between JSON, YAML, TOML and XML in any direction |
| **Beautify & Minify** | Beautify or minify HTML, CSS, JavaScript, XML and JSON |
| **SQL Formatter** | Format SQL for MySQL, PostgreSQL and SQLite |
| **GraphQL Formatter** | Format GraphQL with syntax highlighting and a query builder |
| **Markdown Preview** | Live Markdown renderer with HTML export and HTML → Markdown |
| **Diff Checker** | Side-by-side line diff of two texts |
| **Regex Tester** | Test regex with live match highlighting and capture groups |

### 🌐 Network & API

| Tool | Description |
|---|---|
| **API Client** | Build, send and debug HTTP requests — collections, environments, auth, gRPC and a mock server. Not bound by browser CORS |
| **cURL to Code** | Turn a curl command into fetch, axios, Python, Go, PHP, Ruby, Java or C# |
| **Webhook Tester** | Capture and inspect incoming webhook requests in real time |
| **WebSocket Tester** | Connect to WebSocket endpoints and send, receive and inspect messages live |
| **DNS Lookup** | Query A, AAAA, MX, TXT, NS, CNAME, SOA, CAA and PTR records |
| **Whois Lookup** | Domain and IP registration details via RDAP/WHOIS |
| **IP / Subnet Calculator** | IPv4 and IPv6 CIDR: netmask, host range, address counts |
| **HTTP Status Codes** | Searchable reference for 1xx–5xx |
| **User-Agent Parser** | Browser, OS and device details from a user-agent string |
| **MIME Type Lookup** | MIME type for a file extension or filename |

### 🗄️ Database & storage clients

| Tool | Description |
|---|---|
| **SQL Client** | Connect to PostgreSQL, MySQL and MariaDB, run queries, browse schemas — credentials in an encrypted store |
| **Database Explorer** | Browse MongoDB databases, collections and documents |
| **Redis Commander** | Browse keys, inspect values, run raw commands and flush patterns |
| **S3 Drive** | Manage AWS S3 and DigitalOcean Spaces buckets — browse, upload, delete |

Database drivers are **native Rust clients** in the Tauri shell, so connections
go straight from your machine to your database.

### 🔐 Security & crypto

| Tool | Description |
|---|---|
| **Password Manager** | Credential vault encrypted with a password only you know |
| **Encryption Playground** | AES-GCM with a raw key or passphrase; encrypt/decrypt JSON bundles |
| **JWT Decoder** | Decode JWT header, payload and expiry |
| **Hash Generator** | MD5, SHA-1, SHA-256/384/512 digests for text or files |
| **HMAC Generator** | HMAC-SHA1/256/384/512 for webhook and API signing tests |
| **Bcrypt Generator & Checker** | Hash passwords with bcrypt and verify hashes |
| **TOTP / 2FA Generator** | Six-digit codes from a Base32 authenticator secret |
| **SSH / RSA Key Generator** | Ed25519 or RSA key pairs in OpenSSH and PEM formats |
| **Certificate / PEM Decoder** | X.509 certificates and CSRs: subject, issuer, validity, SANs |
| **Environment Manager** | Encrypted `.env` sets per project and environment |
| **Secret / API Key Generator** | Cryptographically random strings with configurable alphabet |
| **Email Validator** | Verify and validate email addresses |

### 🔄 Converters

| Tool | Description |
|---|---|
| **Base64 Encoder** | Encode and decode Base64 |
| **Image to Base64** | Images to Data URI or raw Base64 |
| **URL Encoder** · **URL Parser** | Percent-encode/decode, and split a URL into its parts |
| **Escape / Encode** | HTML entities, backslash strings, hex ↔ ASCII, Unicode `\uXXXX` |
| **String Case Converter** | camelCase, snake_case, kebab-case, CONSTANT_CASE and more |
| **String Inspector** | Characters, words, bytes, invisible and non-ASCII code points |
| **Line Sort & Dedupe** | Sort, deduplicate, trim and clean up lists |
| **CSV / Excel ↔ JSON** | Convert spreadsheets to JSON and back |
| **Number Base Converter** | Integers between bases 2–36 |
| **Timestamp Converter** · **Timezone Converter** | Unix/ISO/relative time, and time across timezones |
| **Unit Converter** | 323 units across 43 categories |
| **Chmod Calculator** | Unix permissions between checkboxes, octal and symbolic |
| **LLM Token Counter** | Count tokens and estimate API cost for any text |

### ⚙️ Generators

| Tool | Description |
|---|---|
| **UUID / ULID** | Generate UUIDs and ULIDs with bulk export |
| **Mock Data Generator** | Define a schema, export random JSON, CSV, SQL or XML |
| **Cron Builder** | Visual cron builder, presets and parser |
| **Docker Compose Generator** | Compose local stacks — Postgres, Redis, NGINX, Kafka and more |
| **.gitignore Generator** | Merged `.gitignore` files from 500+ stacks |
| **QR Code Generator** | PNG QR codes from text or URLs |
| **Markdown Table Generator** | Build Markdown and HTML tables in a spreadsheet-like editor |
| **Lorem Ipsum** | Placeholder text for layouts and mockups |

### 🎨 Media & design

| Tool | Description |
|---|---|
| **Color Picker** · **Contrast Checker** | HEX/RGB/HSL conversion, and WCAG 2.1 AA/AAA ratios |
| **CSS Gradient Builder** · **CSS Generators** | Gradients, box-shadow, border-radius and fluid `clamp()` |
| **Image Compressor** | Compress JPEG, PNG and WebP with a quality slider |
| **SVG Optimizer** | Strip junk with SVGO and see the size reduction |
| **EXIF Viewer & Remover** | Inspect and strip photo metadata |
| **Favicon Generator** | Favicons, app icons and manifest snippets |
| **Code Screenshot** | Turn source code into shareable images |
| **Keycode Inspector** | Inspect JavaScript keyboard events: key, code, modifiers |

### 📱 Productivity

| Tool | Description |
|---|---|
| **Notes** | Rich-text notes powered by Tiptap — headings, lists, code blocks, images |
| **Code Snippets** | Save snippets with syntax highlighting and auto language detection |
| **Tasks** | To-do lists with priorities, statuses and drag-and-drop |
| **Bookmarks** | Organize links in one place |
| **API Keys** | Encrypted API keys and secrets per environment (dev / staging / prod) |
| **Break Room** | 2048, Sudoku, Snake, Minesweeper, Tetris |

Everything is searchable from one command palette, in dark or light mode, in 27
languages.

---

## 🔒 Privacy by design

MyDevTools Desktop is built to work locally. Your developer data stays on your
machine instead of being posted to someone else's tool backend.

- **No MyDevTools server.** There is no backend to sign in to, no sync service
  and no account system. Tool input, notes, snippets, tasks and bookmarks are
  written to a local SQLCipher database, encrypted with a key held in the OS
  keychain.
- **Credentials are vault-encrypted.** Database passwords, API keys and password
  manager entries are encrypted locally with a master password only you know.
- **You choose every outbound connection.** The app itself needs no network, but
  some tools exist to talk to *your* destinations: the API client sends the
  requests you write, the database clients connect to the hosts you configure,
  DNS/WHOIS lookups query public registries, and the updater checks GitHub
  releases. Those are the connections you asked for — nothing else leaves.
- **Optional, anonymous usage stats.** Off unless you switch them on. When on,
  two events (`app_started`, `tool_opened`) are sent with a rotating session id,
  the app version and the locale. No device id, no paths, nothing typed into a
  tool. See [`apps/desktop-ui/src/lib/telemetry.ts`](apps/desktop-ui/src/lib/telemetry.ts).
- **Auditable.** AGPL-3.0. The claims above are in this repo — read them.

### Desktop vs. website

| | What it is |
|---|---|
| **MyDevTools Desktop** (this repo, `apps/desktop-ui` + `apps/desktop`) | The product. Runs the 83 tools locally, offline, with no account and no backend |
| **mydevtools.tech** (`apps/web`) | An informational site: what the app does, tool documentation and the download link. The tools do **not** run there |

The website is a normal marketing site and uses standard web analytics. Its
privacy properties are not the app's — the app is the offline part.

---

## 🏗️ Architecture

```
apps/
├── desktop/          Tauri v2 shell (Rust)
│   └── src-tauri/src/
│       ├── router/   Local API over SQLCipher — the /api/v1/... contract, never HTTP
│       ├── dbtools/  Native Postgres / MySQL / MongoDB / Redis drivers
│       ├── http/     Request proxy, gRPC, mock server (no browser CORS limits)
│       └── db/       Schema migrations, device key
│
├── desktop-ui/       Next.js UI the desktop app is built from — all 83 tools
│   ├── src/app/app/  Tool pages
│   ├── src/lib/      Tool logic (pure, unit-tested), crypto, local API client
│   └── messages/     next-intl locale files (27 languages)
│
└── web/              mydevtools.tech — marketing and SEO site
```

| Layer | Technology |
|---|---|
| **Shell** | [Tauri v2](https://v2.tauri.app/) (Rust) |
| **Storage** | [SQLCipher](https://www.zetetic.net/sqlcipher/) via `rusqlite`, keyed from the OS keychain |
| **Database drivers** | Native Rust clients for PostgreSQL, MySQL, MongoDB and Redis |
| **HTTP / gRPC** | `reqwest` + `h2` |
| **UI** | [Next.js 16](https://nextjs.org/) · [React 19](https://react.dev/) · [TypeScript 5.7](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) · [Radix UI](https://www.radix-ui.com/) |
| **Editors** | [Monaco](https://microsoft.github.io/monaco-editor/) · [Tiptap](https://tiptap.dev/) |
| **State** | [Zustand](https://github.com/pmndrs/zustand) |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app/) — 27 languages |

Longer write-up: [`docs/MYDEVTOOLS.md`](docs/MYDEVTOOLS.md).

---

## 🛠️ Building from source

### Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 9
- **Rust** stable (for the desktop shell)

### Setup

```bash
git clone https://github.com/mydevtools-tech/mydevtools.git
cd mydevtools
pnpm install
```

No configuration step — no API keys, no accounts, no services.

### Commands

| Command | Description |
|---|---|
| `pnpm dev:desktop` | Run the Tauri desktop app in dev mode |
| `pnpm build:desktop` | Build the desktop app |
| `pnpm dev` | Run the marketing site at [localhost:3000](http://localhost:3000) |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | Lint across all workspaces |
| `pnpm clean-install` | Fresh dependency install for the monorepo |

---

## Where MyDevTools stops

Being honest about the edges is more useful than a feature list:

- **macOS only** for published builds today.
- **Database clients are for everyday work**, not a replacement for a full DBA
  suite — no visual schema designer, no migration tooling.
- **No team features.** No shared workspaces, no sync, no collaboration. Local
  workspaces only.
- **Some tools need the network by definition** — DNS, WHOIS, webhooks, API
  requests, database connections.

---

## 🤝 Contributing

Contributions are welcome — bug fixes, new tools, UI polish, translations and
docs all count.

1. **Fork** the repository
2. **Branch**: `git checkout -b feature/amazing-feature`
3. **Commit**: `git commit -m 'Add amazing feature'`
4. **Push**: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

Please make sure `pnpm lint` passes and follow the surrounding code style.
`CLAUDE.md` documents the repo conventions, including the files and registries a
new tool has to touch.

**Report a bug** or **request a feature** with the
[issue templates](https://github.com/mydevtools-tech/mydevtools/issues/new/choose).

---

## 🧑‍💻 Contributors

<a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=mydevtools-tech/mydevtools" />
</a>

---

## ⭐ Support the project

If MyDevTools saves you time, consider starring the repository — it helps other
developers find the project and keeps the work going.

[![Star on GitHub](https://img.shields.io/github/stars/mydevtools-tech/mydevtools?style=social)](https://github.com/mydevtools-tech/mydevtools)

---

## 📄 License

[GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) — see [LICENSE](LICENSE).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/itsmeakhil">Akhil</a> and <a href="https://github.com/mydevtools-tech/mydevtools/graphs/contributors">contributors</a>
</p>
