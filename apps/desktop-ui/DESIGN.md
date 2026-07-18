# DESIGN — MyDevTools Desktop ("Pro Instrument")

The desktop app is a **pro instrument**, not a web dashboard. Reference the things
that make Figma, Linear, Raycast, and Adobe apps feel native and expensive:
custom window chrome, dense information, one confident accent, keyboard-first
navigation, and motion that only ever conveys state.

Register: **product** (design serves the task). The tool disappears into the work.

## Anti-references (what it must NOT look like)
- shadcn/Vercel starter dark mode (neutral zinc). The current dark theme IS this — replace it.
- A 247px white sidebar + uniform card grid + `0.5rem` radius everywhere (SaaS template silhouette).
- User-selectable accent colors (blue/purple/green picker). One brand accent only.
- A browser-style OS title bar sitting above web content.

## Theme
- **Dark is the signature and default.** One genuinely-refined **Light** exists (manual toggle). No `system`, no color picker.
- Graphite blue-black surfaces (hue ~225, low chroma), stepped by lightness — never pure black, never zinc-neutral.

## Color (HSL tokens, dark)
| Role | Token | Value | Use |
|---|---|---|---|
| App base | `--background` | `225 14% 8%` | behind panels, titlebar |
| Panel | `--surface-1` / `--card` | `225 13% 11%` | content surface |
| Raised | `--surface-2` | `225 12% 13%` | toolbars, tab strip |
| Hover/input | `--surface-3` | `225 11% 16%` | inputs, hovered rows |
| Ink | `--foreground` | `220 16% 96%` | primary text |
| Muted ink | `--muted-foreground` | `222 10% 64%` | labels (≥4.5:1) |
| Hairline | `--border` | `225 9% 20%` | 1px separators |
| **Accent** | `--primary` / `--ring` | `235 84% 67%` | **electric indigo — selection + primary action + state only, never decoration** |

- Per-**category** accent colors stay (they help navigate 80 tools). The single brand accent is separate.
- Semantic: destructive red kept; success/warning/info to be added as tokens when needed.
- Mono (`--font-geist-mono`) for all values: hashes, JSON, timestamps, byte counts. Values feel like data.

## Typography
- One family: **Geist Sans** (UI) + **Geist Mono** (data). No display pairing.
- Fixed rem scale, tight ratio (~1.2). UI is dense: ~13px controls, 12px secondary labels, 11px micro. Reading prose 14px, capped 65–75ch.
- Headings tighten letter-spacing slightly; never fluid/clamp in-app.

## Shape, density, elevation
- `--radius: 0.375rem` (6px) base; controls tighter. No 8px-everywhere.
- Dense spacing on a 4px grid. Rely on **surface steps + hairline borders**, not shadows. One soft shadow reserved for popovers / the ⌘K palette.

## Chrome architecture
- **Custom unified titlebar+toolbar** (Tauri, decorations off): inset macOS traffic lights, app mark, current-tool breadcrumb, ⌘K trigger, actions. No OS strip.
- **Left nav**: dense sidebar (~220px) collapsible to a ~52px icon rail. Not a white 247px web sidebar.
- **⌘K command palette**: the primary way to move across 80 tools.

## Tabs (Figma-style)
- **Not pills.** Square tabs, softly rounded **top** corners only (`rounded-t`, square bottom).
- Tabs sit on a raised strip (`--surface-2`) and align to its bottom edge.
- **Dividers** (1px) between inactive tabs; suppressed next to the active tab.
- **Active tab is welded to the content**: its background matches the content surface and it breaks the strip's bottom border (the seam), with a 2px accent bar on top. Clear top-strip / content separation.
- Monochrome tool icon (accent-tinted when active) — no random rainbow chips.

## Motion
- 120–200ms, ease-out (quart/expo). State only: selection, panel open, palette, feedback. No page-load choreography, no decorative motion.
- Every animation has a `prefers-reduced-motion` fallback.

## Component contract
Every interactive element ships default/hover/focus/active/disabled/loading. Skeletons over spinners. Empty states teach. Same button/control vocabulary everywhere.
