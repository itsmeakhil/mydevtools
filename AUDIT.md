# MyDevTools — UI/UX & Performance Audit

_Date: 2026-07-16 · Auditor: automated senior-frontend audit (Claude Code) · Status: DRAFT — measurements in progress_

## If you do only three things this week

(placeholder — filled after Phase 3)

---

## 1. Scope & method

- **Apps audited**: `apps/desktop-ui` (the product — 77 routes under `src/app/app/`: 72 tools + 5 break-room games) and `apps/web` (marketing/SEO/auth; its `/tools/*` routes are static SEO landing pages, not functional tools).
- **Baseline commit**: `main` @ `97ec0984bb9d727e7f2e7fa27090fc2e69fdc0cc`. All audit work on branch `audit/ui-perf`; reference PRs on `audit/pr*` branches off main.
- **Machine**: macOS (Darwin 25.5.0, Apple Silicon), Node v24.18.0, Next.js 16.2.10.
- **Bundlers**: production serving + all page-weight numbers = default `next build` (Turbopack). Dependency attribution treemaps = `ANALYZE=true next build --webpack` (`@next/bundle-analyzer`; analyzer wiring for desktop-ui added on the audit branch, gated off by default). Turbopack and webpack numbers are never mixed in a before/after comparison.
- **Servers**: `next start -p 3100` (web), `next start -p 3200` (desktop-ui). FastAPI backend (localhost:8000) intentionally NOT running — none of the audited pages require it.
- **Lighthouse**: v12 via `npx lighthouse@12`, Chrome for Testing 150.0.7871.124 (pinned, installed via `@puppeteer/browsers`), `--chrome-flags="--headless=new"`, categories performance+accessibility. Mobile = LH default simulated slow-4G + 4× CPU throttle; desktop = `--preset=desktop`. 3 runs per page per form factor; medians reported.
- **Reproduce**: every number's command is in Appendix A. Note: Next 16 no longer prints per-route First Load JS in build output (either bundler); per-route JS is measured by fetching each route's HTML from the running server and gzip-summing its script/preload chunks (`route-sweep.js`, Appendix A).

## 2. App map & network egress inventory

### Route map

- `apps/web` (Next 16): `/`, `/pricing`, `/features`, `/security`, `/developer-tools`, `/use-cases`, `/download`, `/blog[/slug]`, `/compare/[slug]`, `/tools`, `/tools/[slug]` (SEO landing pages), `/help`, `/login`, `/oauth/callback`, `/account/plan`, `/dashboard`, API routes (`/api/proxy`, `/api/og`, `/api/app-version`, `/api/backend/[...path]`).
- `apps/desktop-ui`: `/` , `/dashboard`, `/settings`, `/activate`, `/login`, `/help`, and 77 `/app/<tool>` routes. Tabbed workspace lazy-loads tools via `src/lib/tab-registry.tsx` (~66 `dynamic(..., {ssr:false})` entries — code-splitting for tool internals already exists).

### Rendering strategy

- **`apps/web` is 100 % request-dynamic.** `src/app/layout.tsx:19` sets `export const dynamic = 'force-dynamic'`, and `src/i18n/request.ts:13` reads the `NEXT_LOCALE` cookie on every request. Build route table (`next build`, both bundlers): **every page `ƒ` (dynamic); only `/robots.txt` and `/sitemap.xml` static** — the `generateStaticParams` on `/tools/[slug]`, `/blog/[slug]`, `/compare/[slug]` is dead weight. For an SEO-focused marketing site this forfeits CDN caching and prerendering entirely. (Note: CLAUDE.md says the marketing surface is English-only, so the cookie-locale machinery isn't even needed on public routes.)
- `apps/desktop-ui`: static export (`output: 'export'`) only when `TAURI_BUILD=1`; 66 of 77 tool pages are thin server-component SEO wrappers around client components.

### Network egress (privacy audit)

| Endpoint | Where | Tool/feature | Verdict |
|---|---|---|---|
| `cdn.jsdelivr.net` (~15 requests, ~4–5 MB) | `@monaco-editor/react` default loader — **no `loader.config` anywhere in repo**; `src/components/lazy/LazyMonaco.tsx` | Every Monaco editor surface (code-screenshot, snippet-manager, api-client, …) | 🔴 **Unexpected.** Editor tools break fully offline and fetch from a third-party CDN at runtime despite `monaco-editor` being a local dependency. Contradicts offline/local-first claim. → **Reference PR2** |
| `www.google.com/s2/favicons`, `icons.duckduckgo.com` | `src/lib/favicon-utils.ts:6-7`, `src/lib/password-utils.ts:77`; rendered by `bookmarks/bookmark-card.tsx`, `password-manager/password-{card,list,item-swipeable}.tsx` | Bookmarks, Password Manager | 🔴 **Unexpected.** Domains of stored bookmarks and password entries are sent to Google/DuckDuckGo to fetch icons — user vault metadata leaves the device by default. → **Reference PR3** |
| `api.pwnedpasswords.com/range/` | `src/lib/hibp.ts` | Password breach check | 🟡 By-design (k-anonymity: only first 5 chars of SHA-1 sent), but should be disclosed/opt-in labelled in UI. |
| `dns.google/resolve` | `src/lib/dns-doh.ts` | DNS Lookup | 🟢 By-design — the tool's purpose is a network query. |
| `rdap.org` | `src/lib/rdap.ts` | Whois Lookup | 🟢 By-design. |
| User-supplied URLs/sockets | api-client, websocket-tester, graphql/grpc panels, s3-drive (aws4fetch), email-validator, gitignore-generator | Network tools | 🟢 By-design / user-initiated. |
| Firebase auth (`identitytoolkit`, `securetoken`), Vercel Analytics/Speed Insights, MS Clarity | root layout preconnects; lazy-loaded in `client-shell.tsx` | Auth + telemetry | 🟡 Telemetry in a privacy-first desktop app deserves an explicit disclosure/opt-out; Firebase chunks also load on every page (~40 KB gz, §3). |
| `api.qrserver.com` | **only** in `next.config.ts` `remotePatterns` of both apps — zero source usage | — | 🟢 False alarm: QR generation is fully local (`qrcode`, `qr-code-styling`). Stale config entry; remove. |

### False leads verified (report-only, no PR)

- **DB drivers (`mongodb`, `pg`, `mysql2`, `ioredis`) are NOT in the client bundle.** `grep -rlE "MongoClient|createPool|ioredis" .next/static/chunks/` matches only a gpt-tokenizer BPE-vocabulary chunk (" MongoClient" is literally a token in the o200k vocab). The pool files `src/lib/{sql,nosql}-client-pool.ts` are imported only by their own tests; `mysql2`/`ioredis` imported by nothing in `src/` → 4 removable dependencies + 2 dead files.
- **`gpt-tokenizer` already lazy**: per-encoding dynamic imports in `token-counter-layout.tsx`.

## 3. Bundle reality

### apps/web (Turbopack prod, gzip)

- Shared entry (`rootMainFiles`): **123.1 KB gz**.
- First Load JS per route (`route-sweep.js` against `next start`):

| Route | First Load JS (gz) |
|---|---|
| `/` | **391.1 KB** (21 scripts) |
| `/tools` | 373.5 KB |
| `/dashboard` | 357.4 KB |
| `/login` | 360.5 KB |
| `/pricing` | 350.8 KB |
| `/features` | 349.6 KB |
| `/download` | 346.2 KB |
| `/tools/json-formatter` | 344.9 KB |
| `/blog` | 344.9 KB |
| `/account/plan` | 335.6 KB |

- 10 heaviest packages (webpack treemap, gz): next 231 KB, react-dom 55, motion-dom 36, @firebase/auth 25, framer-motion 16, @tabler/icons-react 15, lucide-react 13, sonner 9, @formatjs/icu-messageformat-parser 7, tailwind-merge 6. Firebase is mostly tree-shaken/lazy — the marketing bundle is not dominated by any single rogue dependency; the ~345 KB floor is framework + shell.

### apps/desktop-ui (Turbopack prod, gzip)

- Shared entry (`rootMainFiles`): **129.8 KB gz** — but the real floor per tool page is far higher:

| Route | First Load JS (gz) |
|---|---|
| `/app/database-explorer` (heaviest) | 632.6 KB |
| `/app/s3-drive` | 615.7 KB |
| `/app/code-screenshot` | 614.3 KB |
| `/dashboard` | 595.9 KB |
| … | … |
| `/app/color-picker` (lightest tool) | **562.4 KB** |
| `/app/uuid-generator` (lightest-function tool) | **572.4 KB** |

  **Every tool page pays a ~562 KB gz floor** — a trivial tool (uuid-generator) costs within 11 % of the heaviest (database-explorer). The weight is in shared `/app` layout chunks, not per-tool code (tab-registry lazy-loading works — tool internals are split). Signature probe of the 30 chunks uuid-generator loads (overlapping, gz): radix-containing chunks 71 KB, sidebar 46 KB, **firebase 40 KB (loaded on every tool page)**, framer-motion 39 KB, tabler-icons 20 KB.
- **i18n payload: the full 173 KB `messages/en.json` is serialized into every page's HTML.** Every page HTML is ~245 KB raw / 66–67 KB gz, dominated by the all-namespaces message bag passed to `NextIntlClientProvider` (all 80 tools' strings on every page, twice the cost: HTML bytes + client-side parse).
- 10 heaviest packages (webpack treemap, gz): **gpt-tokenizer 1 408 KB** (lazy, token-counter only), next 285, @codemirror/legacy-modes 189, lucide-react 157, svgo 150, xlsx 136, vanilla-jsoneditor 126, katex 74, sql-formatter 71, @codemirror/view 60. Monaco is absent from the bundle — because it loads from CDN at runtime (§2 🔴).

## 4. Lab metrics

Medians of 3 runs. LH = Lighthouse 12.8, Chrome for Testing 150, `--headless=new`. Mobile = simulated slow-4G + 4× CPU; Desktop = `--preset=desktop`. Local `next start` — TTFB is not representative of production (no network/CDN); LCP/TBT/CLS are.

### apps/web

| Page | FF | Perf | LCP | FCP | TBT | CLS | TTFB | A11y |
|---|---|---|---|---|---|---|---|---|
| `/` | mobile | 72 | **9 309 ms** | 910 ms | 116 ms | 0.017 | 16 ms | 100 |
| `/` | desktop | 91 | 1 272 ms | 250 ms | 0 ms | 0.007 | 10 ms | 100 |
| `/pricing` | mobile | 76 | **6 010 ms** | 910 ms | 29 ms | 0.017 | 11 ms | 100 |
| `/pricing` | desktop | 93 | 1 131 ms | 251 ms | 0 ms | 0.007 | 7 ms | 100 |
| `/tools/json-formatter` | mobile | 87 | 4 077 ms | 909 ms | 18 ms | 0.005 | 13 ms | 100 |
| `/tools/json-formatter` | desktop | 100 | 809 ms | 249 ms | 0 ms | 0.004 | 7 ms | 100 |

**LCP element & root cause (`/` mobile)**: hero text (`p.text-lg` / `h1`). LCP phase breakdown: TTFB 5 %, **render delay 95 % (8 821 ms)**. Two compounding causes, both verified in code:
1. `MdtBoot` (`src/components/mdt-boot.tsx:31`) — a full-screen CRT boot overlay SSR-rendered to "cover first paint", visible ≈4 s (3.4 s + 0.64 s fade) on **every hard load** (the play-once flag is a module variable, reset on every page load; it only skips SPA navigations). Every visitor from Google gets a 4-second fake boot screen before any content.
2. Hero content mounted with framer-motion `initial="hidden"` (`src/app/page.tsx:48-56,296-346`: opacity 0 + blur 6px) — text stays invisible until hydration (bootup 1 609 ms at 4× CPU; main-thread total 3 839 ms) plus a 0.7 s staggered fade.
Render-blocking: one CSS file, 757 ms (mobile `/`). Unused JS ≈65–69 KB/page (LH estimate); unused CSS ≈11–14 KB. CLS negligible. Layout-shift sources: none above 0.005.

### apps/desktop-ui — measurement caveat

Tool routes are client-gated by activation + Firebase auth (`src/components/require-auth.tsx` → redirect `/activate`), so in a browser lab the tool URLs render the **activation screen**, not the tool. The LH rows below are therefore "app entry screen" metrics; they still expose real shell problems (shared CSS/JS, entrance animation) because the shell is common. First Load JS per tool route (§3) is unaffected (measured from server HTML). In-product startup happens inside Tauri (local disk) and is not LH-measurable here.

| Page (renders /activate) | FF | Perf | LCP | FCP | TBT | CLS | A11y |
|---|---|---|---|---|---|---|---|
| `/app/json-formatter` | mobile | 75 | **8 531 ms** | 1 358 ms | 35 ms | 0 | 95 |
| `/app/json-formatter` | desktop | 94 | 1 647 ms | 368 ms | 0 ms | 0 | 95 |
| `/app/uuid-generator` | mobile | 74 | 8 516 ms | 1 358 ms | 10 ms | 0 | 95 |
| `/app/token-counter` | mobile | 74 | 8 520 ms | 1 358 ms | 30 ms | 0 | 95 |

Same signature as web: LCP is animated-in text, ~7 s render delay after a 1.36 s FCP — the entrance-animation pattern (`RevealItem`/fade-up) gates LCP under CPU throttle. Render-blocking CSS up to 1 206 ms (mobile). **A11y 95: `color-contrast` failure** on the activation screen's button (WCAG AA 1.4.3). Unused JS ≈210 KB/page (LH estimate) — consistent with the 562 KB shared floor (§3).

### INP risk (keystroke cost)

LH cannot measure INP in lab navigation mode; two-part evidence instead:
1. **Isolated worst-legal-input computation cost** (Node 24 = same V8; command in Appendix A): regex-tester `findMatchRanges` at its 200 000-char cap: **1 ms**/keystroke; diff-checker `buildLineDiffRows`+`countDiffRows` at its 250 000-char cap: **18 ms**/keystroke (≈4 ms / 72 ms under 4× CPU throttle). Both under the 200 ms INP threshold — the existing input caps (`MAX_TEST_TEXT_LENGTH`, `DIFF_MAX_INPUT_CHARS`) do their job, and heavy tools (bcrypt, mock-data, svg-optimize, json format) already run in Web Workers.
2. **Remaining risk is DOM, not computation**: diff-checker renders up to `DIFF_MAX_ROWS` = 5 000 rows **per pane, unvirtualized** (`diff-checker-layout.tsx:107,132` — plain `rows.map`, new array identity every keystroke → full 10 000-node re-render per keystroke). `@tanstack/react-virtual` is already a dependency (used in 2 other components). Could not be measured end-to-end in browser lab (activation gate); flagged on code evidence + the isolated numbers.

## 5. Findings table (ranked by impact ÷ effort)

Genuine wins first; cosmetic tail separated. Effort S <½ day, M ≈1–2 days, L >2 days.

| # | Finding | Evidence | Proposed fix | Effort | Impact | Risk |
|---|---|---|---|---|---|---|
| 1 | 🎯 **web: boot overlay + hidden-initial hero destroy mobile LCP** (9.3 s home, 6.0 s pricing; render delay = 95 % of LCP) | §4 LH; `mdt-boot.tsx:31`, `page.tsx:296` | Play boot overlay once per browser (flag set on completion, per CLAUDE.md gotcha), let hero paint visible-first (CSS animation, no `initial="hidden"` above the fold) | S | Mobile LCP ≈9.3 s → ≈1.5 s on the two highest-traffic marketing pages; directly improves CWV ranking signal | Low — visual-only; keep animation below fold. **→ Reference PR1** |
| 2 | 🎯 **desktop-ui: Monaco loads 4–5 MB from jsdelivr CDN at runtime** — editor tools break offline, third-party egress | §2 egress; no `loader.config` in repo; `monaco-editor@0.53` already installed | Self-host: `loader.config({ monaco })` + local workers in a shared setup module imported by the 9 Monaco entry points | S | Offline claim restored for 6+ tools; ~15 CDN requests → 0 | Low — verify workers + highlight. **→ Reference PR2** |
| 3 | 🎯 **desktop-ui: bookmarks & password-manager send stored domains to Google/DuckDuckGo** (favicon services; desktop proxies via Rust but the query still reaches the third party) | `favicon-utils.ts:6-7`, `password-utils.ts:77`, `use-favicon.ts` | Disable remote favicon fetch (existing letter-avatar fallbacks take over); optional user setting later | S | Vault/bookmark metadata egress → 0 by default; aligns product with its privacy claim | Low — icons degrade to letter avatars. **→ Reference PR3** |
| 4 | **web: 100 % request-dynamic — zero prerendered pages on an SEO site** (`force-dynamic` + cookie locale; `generateStaticParams` dead) | §2; build route table: all ƒ | Remove `layout.tsx:19` `force-dynamic`; stop reading cookies on public routes (marketing is English-only per CLAUDE.md) → SSG + CDN caching for ~160 SEO pages | M | TTFB/resilience at the CDN edge + crawl budget; local TTFB delta is negligible (7–16 ms), the win is production caching | Med — verify `/account/plan`, `/dashboard`, locale switch |
| 5 | **desktop-ui: 173 KB `en.json` serialized into every page HTML** (all 80 tools' strings, every page ≈245 KB raw / 67 KB gz) | §3 i18n | Pass only needed namespaces to `NextIntlClientProvider` (per-route namespace map or `pick()`) | M | −~150 KB raw HTML + parse per page load, every page | Med — missing-namespace regressions; needs the tool-i18n registry |
| 6 | **desktop-ui: every tool pays a 562 KB gz First-Load floor** (uuid-generator ≈ database-explorer −11 %); firebase ≈40 KB of it on every page | §3 route sweep + chunk probes | Audit `/app` layout imports: defer firebase until auth UI needed, lazy command palette (already dynamic — verify), split sidebar data | M | Faster cold start in Tauri + web; −40 KB min | Med — shell refactor |
| 7 | **desktop-ui: diff-checker re-renders up to 10 000 unvirtualized rows per keystroke** | §4 INP; `diff-checker-layout.tsx:107,132` | Virtualize panes with already-installed `@tanstack/react-virtual`, or memo rows | S/M | Keystroke jank on large diffs eliminated | Low |
| 8 | **reduced-motion not honored by JS animations**: 27/32 framer-motion files unguarded (CSS kill-switch doesn't stop JS springs) — WCAG 2.3.3 | §6; `app-sidebar.tsx:157` | Wrap springs with `useReducedMotion` (pattern exists in 5 files) or a global `MotionConfig reducedMotion="user"` | S | A11y compliance; `MotionConfig` is a one-liner at the provider level | Low |
| 9 | **activation screen contrast failure** (WCAG AA 1.4.3, LH a11y 95) | §4 dt LH `color-contrast` | Fix button contrast token on `/activate` | S | First-run screen meets AA | Low |
| 10 | **entrance animations gate LCP in desktop-ui shell too** (same pattern as #1: LCP text ~8.5 s mobile lab) | §4 dt LH | Same treatment as PR1 for `RevealItem`/`AppLoadingScreen` when web-served; low priority inside Tauri | S/M | Lab CWV; minor for packaged app | Low |

Cosmetic / hygiene tail (do opportunistically): remove 4 dead DB-driver deps + 2 dead pool files (§2); remove stale `remotePatterns` (qrserver, google) from both `next.config.ts`; bump `@next/bundle-analyzer` to a Next-16-matching major; migrate ~17 tools to `ToolPageHeader` and 9 hand-rolled copy paths to `use-copy-to-clipboard` (silent-fail fix in `color-picker-tool-layout.tsx:93` is the one real bug here); 24–28 px icon-button touch targets (75 files) — desktop-first app, fix when touching those files; boot-log copy says "60 utilities" vs the "80+" marketing standard (`mdt-boot.tsx:20`); sidebar offers no browse/search (palette covers it — consider a "All tools" sidebar link).

## 6. UX & accessibility notes

Static code audit of `apps/desktop-ui` (all file refs relative to it). What's genuinely good: the command palette (Cmd/Ctrl+K, cmdk fuzzy search, recents capped at 8 in localStorage, pinned group — `src/components/global-command-palette.tsx:92-323`), the shared copy hook (`src/hooks/use-copy-to-clipboard.ts:34-54`: try/catch, toast, auto-reset `isCopied`, used by 65 files), inline error/empty states in all 6 sampled tools (json-formatter toast, regex-tester inline destructive box `regex-tester-layout.tsx:165-174`, diff-checker per-pane `emptyState`, csv-excel-json distinguishes unsupported/parse/invalid), and zero `<div onClick>` fake buttons — icon buttons carry `aria-label` or `title` (exemplary: `json-formatter-layout.tsx:403,462` with `aria-pressed`).

The issues are the un-migrated tail, not the core:

- **Reduced-motion gap (WCAG 2.3.3 risk, MED)**: 32 files import framer-motion, only 5 use `useReducedMotion`. The global CSS kill-switch (`src/app/globals.css:1834-1842`) only stops CSS animations — framer-motion JS springs still run, e.g. sidebar `layoutId` spring pill `app-sidebar.tsx:157-163`, nav-group, onboarding-modal, tools-grid, mobile-nav.
- **Touch targets (WCAG 2.5.5/2.5.8, MED)**: 75 files use 24–28 px icon buttons (`h-6 w-6`/`h-7 w-7`), e.g. `base64-layout.tsx:307`, `json-diff-layout.tsx:86`, `image-compressor-layout.tsx:372`. Mitigated by the app's explicit desktop orientation (`mobile-desktop-hint.tsx` shows a "use desktop" banner), but tools still render at 375 px.
- **Copy feedback fragmentation (MED)**: 9 tools bypass the shared hook with bare `navigator.clipboard.writeText`; `color-picker-tool-layout.tsx:93-96` has no try/catch and no toast — clipboard rejection fails silently. The aria-labelled shared `CopyButton` component exists but is used in only 2 files vs 65+ copy sites.
- **Header consistency (LOW/MED)**: 53/70 tool layouts use the standard `ToolPageHeader` (+52 `RevealItem`, 45 `CATEGORY_ACCENT`); ~17 tools have one-off headers.
- **Sidebar is a browsing dead end (LOW)**: it shows only Dashboard + Pinned (`app-sidebar.tsx:143-190`) — no search box, no full tool list; discovery relies on knowing Cmd+K or going through the dashboard grid. Sidebar header/footer are hidden entirely on mobile (`app-sidebar.tsx:111,192`).
- **Keyboard shortcuts (LOW)**: only Cmd+K is global; ~40 files have ad-hoc keydown handlers (games, to-do) with no registry or user-visible shortcut help beyond the palette footer.

## 7. Reference PRs

(placeholder)

## 8. Backlog & rejected ideas

(placeholder)

## Appendix A — Reproduce every number

```bash
export PATH="/Users/max/.nvm/versions/node/v24.18.0/bin:$PATH"
# builds (pnpm exec is broken in this repo — use repo-local bins)
cd apps/web && ./node_modules/.bin/next build              # Turbopack prod
cd apps/desktop-ui && ./node_modules/.bin/next build
# treemaps
ANALYZE=true ./node_modules/.bin/next build --webpack      # each app; output .next/analyze/client.html
# serve
(cd apps/web && ./node_modules/.bin/next start -p 3100) &
(cd apps/desktop-ui && ./node_modules/.bin/next start -p 3200) &
# shared chunk
node -e "const m=require('./.next/build-manifest.json'),z=require('zlib'),f=require('fs');let t=0;for(const x of m.rootMainFiles)t+=z.gzipSync(f.readFileSync('.next/'+x)).length;console.log((t/1024).toFixed(1)+' KB gz')"
# per-route First Load JS (script in audit scratchpad; reproduced in this repo under scripts/ if adopted)
node route-sweep.js http://localhost:3200 apps/desktop-ui /dashboard /app/uuid-generator ...
# DB-driver check
grep -rlE "MongoClient|createPool|ioredis" apps/desktop-ui/.next/static/chunks/
# lighthouse (3 runs x mobile+desktop per URL, Chrome for Testing 150 pinned)
npx lighthouse@12 "$URL" --chrome-flags="--headless=new" --only-categories=performance,accessibility --output=json [--preset=desktop]
# TTFB
curl -so /dev/null -w "%{time_starttransfer}s " "$URL"   # x5
```
