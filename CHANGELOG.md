# Changelog

All notable changes to MyDevTools. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.1] — Unreleased

Mostly an API Client release: it closes most of the gap with Bruno for day-to-day use. The Terminal also gains find, restore after restart and agent status.

### Changed — read before upgrading

- **"No auth" now means no auth.** Previously a request set to *No auth* silently used its folder's or collection's auth. Now it sends no auth. A new **Inherit** option takes the nearest folder/collection auth and is the default for new requests. Existing requests saved as *No auth* are migrated to *Inherit* on first launch, so nothing you have today changes behaviour. The database is backed up to `mydevtools.db.bak-v3` before the migration runs. (#439)

### Added — API Client

**Variables and scripting**
- Collection-level auth, headers, variables and pre/post scripts, inherited by folders and requests.
- Default headers, with a per-request option to leave any of them out.
- Global variables and secret environment variables.
- Dynamic variables (`{{$uuid}}`, `{{$timestamp}}`, …) and variable highlighting in the URL bar.
- Scripts: async/await, `pm.sendRequest`, chai-style `expect`, `require()` for `uuid` and `crypto-js`.
- A declarative Assertions tab for checks that need no script.
- Better imports: Bruno script globals, `pm.collectionVariables` and `pm.globals`.

**Collections and files**
- Open a Bruno folder in place. Edits are written back as `.bru` files, and changes made on disk show up in the app.
- `mdt run`: run collections from a terminal or CI, with the same HTML report as the app.
- Markdown docs on requests, folders and collections. Export a collection's docs as one offline HTML file.
- Sync a collection from its OpenAPI spec.
- Collections sidebar: search, drag and drop, duplicate, move, and workspace assignment.
- An unsaved-changes dot on tabs, and ⌘S saves in place.

**Requests and protocols**
- Client certificates (PEM and PFX), custom CA files, and a manual HTTP/HTTPS/SOCKS5 proxy.
- Digest auth answers the server's 401 challenge. OAuth 2 gains the password and refresh_token grants.
- Custom HTTP methods, binary file bodies and XML bodies.
- A per-request Settings tab for timeout, redirects, SSL verification and the cookie jar.
- Live Server-Sent Events streams, GraphQL subscriptions and NDJSON responses.
- Live gRPC calls, including client-streaming and bidirectional.
- GraphQL autocomplete and a schema docs explorer.
- A JSONPath filter for JSON responses.
- Import and export the cookie jar.

**Tools around requests**
- A Timeline tab that shows exactly what was sent, and when.
- Code generation for 16 clients, covering every auth type.
- Runner: sign requests with any auth type, run a selected subset, stop on the first failure, add a delay between requests, and export an HTML report.
- Mock server: choose the port and latency, start and stop it, read its request log, and match `:param` routes.
- A plugins dialog to add, enable, disable and delete plugins.
- A shared shortcut map, tab cycling, and ⌘K palette actions.
- All new strings are translated into the 27 supported languages.

### Added — Terminal

- Find in scrollback, zoom, clear, and faster GPU (WebGL) rendering.
- Jump between prompts. The status bar shows the shell's current directory.
- Agent status: panes show when a command is running and when an agent needs you.
- Terminals come back after a restart, with their scrollback and working directory.
- Closing a pane that is running or waiting for you asks first.
- Restart a pane whose shell has exited. It opens in the same directory.
- A right-click menu on panes, plus shortcuts: ⌘⌥ arrows to move focus, ⌘1–9 to jump to a pane, ⌘⇧↵ to maximize.
- An Option-as-Meta setting, off by default so ⌥ still types characters like @ and € on non-US keyboards.
- The "needs you" badge is now a warning colour instead of an error red.

### Fixed

- Fixed a crash at launch on macOS: two windows both claimed to be the main window. (#438)
- Requests no longer send credentials to another site when they follow a redirect. Applies to both the app and `mdt`.
- Collection share links no longer contain literal credentials.
- Edits were sometimes lost after quitting right after opening a tab. They are now saved.
- SSE streams no longer break multi-byte characters that arrive split across chunks, and they respect the SSL verification setting.
- The sidebar and tab bar no longer redraw on every keystroke.

### Security

- Upgraded Next.js from 16.4.3 to 16.4.6 to pick up a security fix. (#438)
- Every webview page now has a Content Security Policy, which blocks scripts from sending data out through `import()`. (#435)

### Known limitations

- Converting a PFX certificate uses the system `/usr/bin/openssl`, so it only works on macOS.

## [0.2.0]

Baseline for this changelog. Earlier changes are in the git history.
