# MyDevTools — Website Redesign · Handoff

Self-contained context for continuing the **website redesign** in a fresh Claude window/project.
Rename this to `CLAUDE.md` if you want Claude Code to auto-load it as project instructions.

## What this is
A deck-style (dark, premium, gradient) revamp of the MyDevTools marketing site, matching the
investor-deck aesthetic. Pitch-deck work is separate and **not** part of this.

## Where things are
- **Repo root:** `mydevtools-web/` — pnpm monorepo, clone of `github.com/itsmeakhil/mydevtools.tech`.
- **Web app:** `apps/web/` — Next.js 16, React 19, Tailwind 3 + shadcn/ui, framer-motion, next-themes, next-intl, Geist + Geist Mono fonts.
- **Local branch:** `redesign/devtools-deck-style` (11 commits).
- **Pushed to:** branch **`Devtools_1.0`** on `github.com/itsmeakhil/mydevtools.git` (separate repo; its `main` == this branch's base `ca526da`). Local remote `target` points there. PR (not yet opened): https://github.com/itsmeakhil/mydevtools/pull/new/Devtools_1.0

## Run it locally
```bash
cd mydevtools-web
pnpm install
cd apps/web && ./node_modules/.bin/next dev      # localhost:3000
```
- `pnpm dev` can fail on a deps "verify" step (ignored build scripts) — run `next` directly as above, or `pnpm approve-builds`.
- A fresh clone 500s without Firebase env. There's a gitignored `apps/web/.env.local` with **placeholder** Firebase keys for local preview; recreate it if cloning elsewhere (vars: `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_STORAGE_BUCKET`, `_MESSAGING_SENDER_ID`, `_APP_ID`).
- No Playwright installed; the Chrome app is — use `--headless` for screenshots. Verified the fixed header via Chrome DevTools Protocol (node script + global `WebSocket`).

## Design system (all in `apps/web/src/app/globals.css`, appended "DECK" sections)
- `--mdt-*` tokens: bg `#08090f`, surfaces, border, text/muted/faint, gradient `--mdt-grad` (indigo `#5b63f0` → violet `#9a5cf2` → cyan `#4fd0e6`), green/amber.
- `.mdt-deck` wrapper forces the dark look; `.mdt-deck::before` = fixed ambient color glows; fixed backdrop div (z-index:-1) holds `.mdt-grid` + `.mdt-noise`.
- Helpers: `.mdt-grad-text` (+ `.mdt-grad-anim` sheen), `.mdt-kicker` (mono eyebrow), `.mdt-btn-grad`, `.mdt-btn-ghost`, `.mdt-surface`, `.mdt-rail`, `.mdt-pill`, `.mdt-card-hover`, `.mdt-icon-grad` (gradient-stroke icons via hidden `#mdtGrad` svg).
- Dark palette retuned in an appended `.dark { ... }` block (unlayered, overrides shadcn defaults).
- Motion tokens from the `motion-design` skill: `--ease-out-quart/quint/expo`, `--dur-1..5`; global `prefers-reduced-motion` guard.

## Custom components (`apps/web/src/components/`)
- `mdt-aurora.tsx` — canvas aurora field in heroes (pointer-reactive, pauses offscreen).
- `mdt-fx.tsx` — scroll-progress beam + cursor-spotlight border on `.glass-overlay` cards.
- `mdt-magnetic.tsx` — magnetic buttons (spring). `mdt-tilt.tsx` — pointer 3D tilt + glare (wraps hero dashboard).
- `mdt-boot.tsx` — CRT-monitor boot loader: drawn monitor, green-phosphor status log types ~3.4s then fades; plays once per hard load (flag set on COMPLETION to survive React StrictMode double-mount); SSR-safe; reduced-motion aware.
- `mdt-dashboard.tsx` — crisp vector SQL-client hero mock (replaced the pixelated PNG): tool rail, syntax SQL + blinking caret, Run bar, results table w/ plan pills + roving highlight, live latency.
- Restyled: `header.tsx` (position **fixed** + scroll-translucent + magnetic CTA), `marketing-seo-page.tsx` (shared by /pricing /features /security /self-host /developer-tools), `app/page.tsx` (landing), `app/tools/page.tsx`.
- **Removed:** `mdt-hero-grid.tsx` (cursor-warp grid — user disliked it).

## Gotchas learned (don't re-trip these)
- `position: fixed/sticky` silently breaks if an ancestor has `overflow: clip/hidden` **or** a rule forces `position:relative`. A `.mdt-deck > *` rule was overriding Tailwind's `.fixed` (unlayered beats `@layer utilities`) — removed it; backdrop is `z-index:-1` so content stacks above without a blanket position rule. Header is now `position: fixed`.
- CRT loader vanished after ~2s because the play-once flag was set on mount → StrictMode's 2nd mount hid it. Fix: set the flag on completion.
- Hero stats panel: near-black frosted glass (`bg-[#0a0b12]/80 backdrop-blur-md`), NOT white; sized to `text-2xl` max so "Self-host" doesn't clip.
- Edits via shell `sed`/`cat` don't satisfy the "must Read before Edit" rule — use the Read tool first.

## Business decisions (from planning, not yet implemented)
- **Pricing (recommended):** Free (self-host + capped cloud) · **Pro $9/mo ($84/yr)** · **Team $15/user/mo ($144/yr)** · Enterprise custom. Annual ≈ 2 months free. Launch founder pricing optional.
- **Payments:** founders India-based, no company (planning Dubai later). Stripe-India needs a registered business → use a **Merchant of Record** (Lemon Squeezy or Polar) as individuals now; it handles US sales tax / EU VAT / Japan/Korea tax. Revisit Stripe-direct after incorporating (Dubai only with real substance — POEM/residency risk; or Delaware C-corp if raising US VCs).
- LS↔Claude **MCP** exists (community/Composio/Zapier) but is for store *ops*, not for charging users (that's checkout + REST API + webhooks in-app).

## Likely next steps
- Lemon Squeezy/Polar integration: checkout on the pricing CTAs → webhook → entitlement → gate Pro/Team features.
- Fill the deck's pricing slide with the numbers above.
- Optional polish: section-pinned scroll storytelling (GSAP), WebGL shader hero, magnetic buttons on more CTAs, PR + deploy.
