# MyDevTools — Claude Code instructions

All-in-one developer toolkit (~80 tools: formatters, security, generators, notes, bookmarks, tasks, API client…). Full product doc: `docs/MYDEVTOOLS.md`. Web-redesign handoff: `HANDOFF.md`.

## Product model (current direction — do not regress)

- **The desktop Tauri app is the product.** Fully offline after a mandatory one-time browser activation (loopback OAuth + `mydevtools://` deep link; activation stored in SQLCipher `kv` key `activation`). No per-session login, no periodic recheck.
- **Web (`apps/web`) = marketing/auth/plan only**: landing, pricing, SEO pages (download CTAs), login handoff, `/account/plan`. Never reintroduce web tool pages or cloud sync.
- **Plans**: first 250 signups get lifetime Pro (`plan_source="early_adopter"`, atomic counter in backend `users_repo.py`). Users #251+: free, full access, no paywall yet.
- **Pricing (planned, show both tiers with strikethrough anchor price)**: $59/yr (actual $100) · $100 lifetime (actual $300) · first 250 users free.
- Vault/masterkey creation is offline-only (desktop Rust mirror). Payments later via Merchant of Record (Lemon Squeezy/Polar — founders are India-based individuals, no Stripe-direct yet).

## Monorepo (pnpm)

| App | Role |
|---|---|
| `apps/desktop-ui` | Next.js UI the Tauri app builds from — **all tool work happens here** (clone-then-prune of apps/web) |
| `apps/desktop` | Tauri v2 shell — SQLCipher keyed by macOS Keychain, native Rust DB drivers |
| `apps/web` | Marketing/SEO/auth site (Next.js 16, React 19, Tailwind, shadcn/ui, next-intl) |
| `apps/backend` | FastAPI — health + auth + plan grant only |

## Build / verify

- `pnpm exec` is broken (implicit install fails on ignored build scripts). Use repo-local bins: `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/jest`, `./node_modules/.bin/next dev`. Node at `/Users/max/.nvm/versions/node/v24.18.0/bin`.
- Run `next typegen` after adding routes, else tsc errors on stale `.next/dev/types`.
- Known pre-existing failing suites (ignore): react-window, pending-invitations-badge, encrypted-tool-placeholder, workspace-store.
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
