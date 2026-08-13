# MyDevTools — Claude Code instructions

All-in-one developer toolkit (~80 tools: formatters, security, generators, notes, bookmarks, tasks, API client…). Full product doc: `docs/MYDEVTOOLS.md`.

## Product model (current direction — do not regress)

- **The desktop Tauri app is the product.** Fully offline, no server. **No accounts, no sign-in, no activation** — the app opens straight to the dashboard. Never reintroduce auth, Firebase, or a backend.
- **Free & open source (AGPL-3.0).** No plans, no pricing, no paywalls — never reintroduce them. "Free & Open Source" page; `/account/plan` redirects to `/download` (shipped desktop builds hard-open the URL).
- **Web (`apps/web`) = marketing/SEO only**: landing, SEO pages (download CTAs). No login, no dashboard, no API routes except `/api/app-version` (updater). Never reintroduce web tool pages or cloud sync.
- Identity is local: fixed `uid` `"local"` from `utils/useAuth`, editable display name/avatar in local preferences (`useAppUser`).
- All app data goes through `lib/backend-api.ts` / `lib/desktop/api-fetch.ts` → Tauri `local_api` → SQLCipher. The `/api/v1/...` paths are the local Rust router's contract, never HTTP.
- Vault/masterkey creation is offline-only (desktop Rust mirror).

## Monorepo (pnpm)

| App | Role |
|---|---|
| `apps/desktop-ui` | Next.js UI the Tauri app builds from — **all tool work happens here** (clone-then-prune of apps/web) |
| `apps/desktop` | Tauri v2 shell — SQLCipher keyed by macOS Keychain, native Rust DB drivers |
| `apps/web` | Marketing/SEO site (Next.js 16, React 19, Tailwind, shadcn/ui, next-intl) |

## Build / verify

- `pnpm exec` is broken (implicit install fails on ignored build scripts). Use repo-local bins: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/jest`, `./node_modules/.bin/next dev`. Node at `/Users/max/.nvm/versions/node/v24.18.0/bin`.
- Run `next typegen` after adding routes, else tsc errors on stale `.next/dev/types`.
- Known pre-existing failing suite (ignore): react-window (`react-window` is not installed).
- Rust: `cargo check` / `cargo test` in `apps/desktop/src-tauri`.
- Desktop-ui: `pnpm dev:tauri` (sets `NEXT_PUBLIC_TAURI=1`), `pnpm build:tauri`.

## Adding a tool

Per-tool files (`page.tsx`, `layout.tsx` with `generateToolMetadata`, `components/<slug>/<slug>-layout.tsx`, pure logic in `lib/<slug>.ts` + jest test) **plus six registries**: `lib/metadata.ts`, `lib/route-config.ts`, `lib/tab-registry.tsx`, `lib/tool-categories.ts`, `lib/tool-i18n.ts`, `components/sidebar/data/sidebar-data.ts`. Then i18n: `Navigation.<key>`, `Dashboard.tools.<key>`, top-level `<Namespace>` block in `messages/en.json` **and all 26 other locales** (preserve ICU plurals; ru/uk/pl/cs need few/many, ar full set). This list now applies to `apps/desktop-ui`.

## Design patterns (follow these)

- Every user-visible string through `useTranslations("<Namespace>")` — no hardcoded UI text.
- Async mutations (notes/bookmarks/vault) can throw user-facing reasons (vault locked, no workspace). Wrap in try/catch and `toast.error(message)` (sonner) — never let them bubble as uncaught rejections.
- Failed autosave: set dirty flag back to true and reset save state so the next edit retries — never silently drop edits.
- Collapsible sidebar sections: header button with `IconChevronRight` (`rotate-90` when open) + framer-motion `AnimatePresence` height/opacity collapse, `overflow-hidden`, ~0.2s; render nothing when the section is empty.
- `React.memo` on list-item components in long sidebars.
- Tool headers: `ToolPageHeader` + `RevealItem` + `CATEGORY_ACCENT[category]`. Sidebar icons @tabler, route-config icons lucide (`Image` imported `as ImageIcon`).

## Marketing/SEO copy rules

- Never say "online", "browser-based", "in your browser", "no install" in marketing prose/meta/JSON-LD. Say: desktop app, offline, local-first, on your device, privacy-first. Tool count = "80+".
- **Never rename slugs/URLs**, even ones containing "online" — rewrite words, keep the URL.
- Marketing surface is English-only; 27 locales cover in-app UI only.

## Gotchas (learned the hard way)

- `position: fixed/sticky` silently breaks under an ancestor with `overflow: clip/hidden` or a blanket `position: relative` rule; unlayered CSS beats Tailwind `@layer utilities`.
- Play-once flags (loaders/intros): set on **completion**, not mount — React StrictMode double-mount hides them otherwise.
- Edit files with the Read/Edit tools, not shell `sed`/`cat`.
