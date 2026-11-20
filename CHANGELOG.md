# Changelog

All notable changes to MyDevTools. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.1] — Unreleased

Mostly an API Client release: it closes most of the gap with Bruno for day-to-day use. The Terminal becomes a place to run coding agents side by side: it shows which agent each pane runs and whether it needs you, starts tasks in their own git worktrees, and connects to your saved databases, environments and API requests.

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
- Agent status: panes show when a command is running, when an agent is blocked on you, and when it has finished. Works for Claude and about 20 other coding agents (Codex, Gemini, opencode, Cursor, Amp and more), read from their screens using herdr's detection rules. (#442, #444)
- The "needs you" list says why a pane is waiting and for how long, and puts blocked panes first. (#443)
- Each pane shows which agent it is running. (#445)
- Long shell commands (30 s or more) notify you when they finish or fail, with the exit code and how long they took. (#446)
- Start an agent or a saved project command from the new-tab menu. (#447)
- Start a task in its own git worktree, so agents working in parallel don't edit the same files. Closing the tab offers to remove the worktree; the branch is kept. (#448)
- After a restart, a pane that was running Claude or Codex offers to resume that session. (#449)
- Jump to any terminal pane from ⌘K anywhere in the app, and run terminal actions from it. (#450)
- Terminal settings: font, line height, cursor, scrollback, copy on select, and which notifications to show. (#451)
- Insert file paths from a file picker, quoted for the shell. (#452)
- Layout presets (side by side, stacked, three columns, grid of four), and saving a tab's layout. (#453)
- Screen reader announcements when a pane needs you, an optional screen reader mode, and a visible focus ring on the active pane. (#454)
- A keyboard shortcut sheet (⌘/), and how long a busy pane has been running. (#455)
- Open a saved database connection in its own CLI (`psql`, `mysql`, `sqlite3`, `redis-cli`), already signed in. (#457)
- Open a terminal tab with an Environment Manager environment's variables set. (#458)
- Run the current API Client request as `curl` in a terminal tab. (#459)
- Terminals come back after a restart, with their scrollback and working directory.
- Closing a terminal always asks first, with a stronger warning when a command is running or an agent is waiting for you. (#461)
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

- Passwords and tokens handed to the Terminal (database CLIs, environments, API requests) reach only that pane's process as environment variables. They are never typed into the shell or its history, and never saved. Variables that would change how the shell starts, such as `PATH` or `LD_PRELOAD`, are refused. (#457–#459)
- Upgraded Next.js from 16.4.3 to 16.4.6 to pick up a security fix. (#438)
- Every webview page now has a Content Security Policy, which blocks scripts from sending data out through `import()`. (#435)

### Known limitations

- Files dragged from Finder can't be dropped into a terminal pane; use **Insert file path…** in the pane's right-click menu.
- Converting a PFX certificate uses the system `/usr/bin/openssl`, so it only works on macOS.

## [0.2.0]

Baseline for this changelog. Earlier changes are in the git history.
