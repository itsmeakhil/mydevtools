# MyDevTools — Adaptive Liquid Glass

The desktop app's design system: Apple-style material, depth and translucency on
window chrome; solid, quiet, readable surfaces for content. It should feel like a
native macOS app, not a website in a window.

Source of truth: `src/app/globals.css` (tokens + materials) and
`tailwind.config.ts`. Shared primitives in `src/components/ui/*` already follow
it — prefer them over hand-rolled markup.

## Principles

1. **Content first.** Chrome recedes; tool content is the hero.
2. **Layered glass.** A soft, accent-derived backdrop (`.app-backdrop`) sits
   behind the window. The sidebar (`.liquid`), toolbar capsules (`.liquid`)
   and the content pane (`.content-surface`) float over it as frosted glass
   with a specular rim. Big cards use `.glass-card` (frosted, mostly opaque).
   Dense data — table cells, grids, editors, inputs — stays **solid** for
   readability; never put `backdrop-filter` on per-row elements.
3. **One accent, used sparingly** — primary action, selection, focus, links,
   active state. Never on headings, borders of every card, or decoration.
4. **Tokens, never raw colors.** No `zinc-*`, `slate-*`, `gray-*`, `neutral-*`,
   `bg-white`, `bg-black`, `#hex`, or `dark:` color pairs in feature code.
   Semantic status colors are fine when meaning-bearing (`text-destructive`,
   `text-success`, `text-warning`; HTTP method / log-level colors in tools).
5. **Native conventions** — system font, default cursor on controls, no hover
   lift/glow, restrained motion, selection that feels like a source list.

## Tokens (Tailwind classes)

| Role | Class |
|---|---|
| App canvas | `bg-background` |
| Solid content surface | `bg-card` (+ `border border-border`, `shadow-elev-1`) |
| Recessed / secondary fill | `bg-muted`, `bg-secondary`, or `bg-foreground/[0.04]` |
| Hover tint on rows/ghost controls | `hover:bg-foreground/[0.05]` |
| Selected row | `bg-primary/[0.12] text-foreground` (+ icon `text-primary`) |
| Primary text / secondary / faint | `text-foreground` / `text-muted-foreground` / `text-muted-foreground/70` |
| Hairline | `border-border` (dividers `bg-border` or `divide-border`) |
| Accent + scale | `primary`, `primary-hover`, `primary-subtle`, `primary-50…950` |
| Status | `destructive`, `success`, `warning` |
| Elevation | `shadow-elev-1` (surface) · `-2` (raised card) · `-3` (popover) · `-4` (modal) |

**Radius:** `rounded-sm` 8 · `rounded-md` 10 (inputs, small controls) ·
`rounded-lg` 12 (buttons, rows) · `rounded-xl` 16 (cards, panels) ·
`rounded-2xl` 20 (large cards) · `rounded-3xl` 24 (dialogs) · `rounded-full` pills.

**Materials (CSS classes):** `liquid` (floating shell panes + capsules, rim
+ inner light), `content-surface` (the tool pane), `glass-card` (frosted
cards/panels — the `Card` primitive uses it), `glass-subtle` (tooltips),
`glass` (menus, popovers), `glass-prominent` (floating nav), `glass-overlay`
(dialogs/sheets), `glass-bar` (sticky translucent toolbars), `surface` (solid
card), `scrim` (modal backdrop), `chrome` (non-selectable UI chrome).
Page roots inside the pane must not paint `bg-background` — let the pane show.

## Typography

System stack (SF Pro on macOS). Body 14px / 1.5. Sizes in use:
`text-[11px]` caption/section label · `text-xs` 12 small · `text-[13px]` dense UI
(rows, toolbar, tabs) · `text-sm` 14 body · `text-[15px]` card title ·
`text-[17px]` dialog title · `text-xl`/`text-2xl` page titles (semibold,
`tracking-[-0.01em]`). Weights: 400, 500, 600 only (no 700+ in UI).
Sentence case. No ALL-CAPS labels with wide tracking.

**`font-mono` only for code and data** — editors, JSON/HTTP bodies, keys,
hashes, IDs, URLs inside inputs, SQL. Never for labels, buttons, headings, nav,
empty states, or descriptions.

## Patterns

- **Tool page header:** quiet — title `text-[15px] font-semibold`, optional
  `text-[13px] text-muted-foreground` subtitle, actions right. No gradient icon
  tiles, no glow. A plain `h-4 w-4 text-muted-foreground` icon is fine.
- **Panels / cards:** `rounded-xl border border-border bg-card shadow-elev-1`.
  Padding 16–24. Panel headers: `h-11 px-4 border-b border-border`, title
  `text-[13px] font-semibold`.
- **Split views (list | detail):** list pane `bg-muted/40` or
  `bg-[hsl(var(--surface-2))]` with `border-r border-border`; rows `h-8–9
  rounded-lg px-2.5 text-[13px]`, selected = accent tint (above). Detail pane
  `bg-card` or `bg-background`.
- **Toolbars inside tools:** `h-11` row, ghost icon buttons `size="icon"`
  variant `ghost`, groups separated by `h-5 w-px bg-border`.
- **Tables / data grids:** solid `bg-card`, header `bg-muted/50 text-[12px]
  font-medium text-muted-foreground` (sentence case), rows hairline-divided,
  hover `bg-foreground/[0.03]`, selected accent tint, `tabular-nums`.
- **Empty states:** centered, icon `h-8 w-8 text-muted-foreground/60` (no
  colored tile), title `text-sm font-medium`, hint `text-[13px]
  text-muted-foreground`, one action.
- **Badges / chips:** `<Badge>` — pills, tinted (`bg-primary/[0.12]
  text-primary`), never solid saturated blocks.
- **Code / editor panes:** solid, `bg-card` or `bg-muted/40`, `rounded-xl`,
  mono 12–13px.

## Motion — the liquid part

Shared springs in `lib/motion.ts` (`glassSpring`, `glassSpringSoft`,
`glassLift`). Springs on enter, short eases on exit; animate transform,
opacity and shadow only — **never `backdrop-filter`** (not composited on
WebKit).

- **Lift:** glass launcher cards `y: -2` on hover (`glassLift`) + the
  pointer-tracked sheen (`Card variant="glass"` / `useGlassSheen`).
- **Press:** `scale: 0.985`, released on an overshoot curve (built into
  `<Button>`).
- **Surface:** menus/popovers/dialogs enter at `scale .96 → 1` on an overshoot
  curve (260ms), exit 120ms ease-out (globals.css, keyed on `data-state`).
- **Collapse:** sidebar sections ~0.2s height/opacity; sidebar → 72px rail
  with a soft overshoot.
- One motion per interaction; lists stagger ≤ 8 items at 40ms.
  `prefers-reduced-motion` kills the sheen and transitions.

## Shell

- 12px canvas gap (`md:p-3 md:gap-3`) around every pane.
- Sidebar: floating `.liquid` pane, 236px → 72px icon rail (⌃⌘S); traffic
  lights live in its top row (`tauri.macos.conf.json` `trafficLightPosition`).
- Toolbar: tab capsule + round `.liquid` buttons (`Button variant="glass"`).
- Content: `.content-surface` pane; tool headers (`ToolPageHeader`) are a
  sticky `.liquid` bar with an accent icon well.
- Status bar: 28px `.liquid` pill (vault state · workspace · version).

## Performance & accessibility

- ≤ 6 live `backdrop-filter` elements; blur capped at 36px; nothing inside a
  scroll container carries `backdrop-filter` (cards are alpha-only over the
  already-frosted pane). Max two stacked glass layers — a third falls back to
  solid (globals.css).
- Raw `backdrop-*` classes outside `components/ui`, `components/shell`,
  `components/sidebar` fail lint (`eslint.config.mjs`).
- Reduce transparency: OS setting **and** Settings → Appearance toggle
  (`data-reduce-transparency`, applied pre-paint). `prefers-contrast: more`
  strengthens edges and muted text. Muted text on glass uses
  `--on-glass-muted` automatically inside glass materials.

## Deviations from "MyDevTools — Liquid Glass Design Guidelines" (2026-11-03)

That guideline is the reference; these are deliberate differences:

- **Accent:** the user-chosen accent (Settings → Appearance) drives every tint.
  No per-category hues (`CATEGORY_ACCENT` collapsed to the accent).
- **Layout:** floating panes (sidebar + frosted content pane) rather than an
  edge-attached sidebar over a bare canvas.
- **Fonts:** system stack (SF Pro / SF Mono) instead of Inter / JetBrains Mono.
- **Colors** are computed in JS (OKLCH scale in `lib/accent-color.ts`), not
  `color-mix(in oklch)` — macOS 12 WebKit (Safari 15) lacks `color-mix`.
- **Scrollbars** stay native macOS overlay scrollbars (custom
  `::-webkit-scrollbar` styling would make them permanently visible).
- Break Room / sync status references in the guideline no longer apply.

## Remove on sight

Gradient fills/text (`bg-gradient-*`, `from-*/to-*` decoration), glow shadows
(`shadow-primary/*`, `shadow-[0_0_*]`), grid/dot backgrounds,
`animate-pulse` used as decoration, ring-inset decorative rings on icon tiles,
mixed radii, `font-mono` on UI chrome, `uppercase tracking-widest` labels, raw
`backdrop-*` utilities in feature code.
