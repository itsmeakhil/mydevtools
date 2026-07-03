# Converters UI/UX Alignment with Dashboard Theme

**Date:** 2026-07-03
**Status:** Approved (design phase)

## Problem

The "Converters" tool category (`base64`, `url-encode`, `url-parser`, `number-base-converter`, `timestamp-converter`, `unit-converter`, `csv-excel-json`, `image-to-base64` — as defined in `apps/web/src/lib/tool-categories.ts`) shares the dashboard's outer shell (sidebar + nav via `client-layout.tsx`) but each tool page is a bare shadcn form: `Card`/`Label`/`Input`/`Select` with no desktop page header, no icon/accent branding, no motion, no ambient background. The dashboard (`apps/web/src/app/dashboard/`) has a developed visual system: icon-chip section headers, gradient/ring-inset hover-glow cards, staggered `framer-motion` reveals, ambient background layers. On top of the visual gap, common utility affordances (copy, swap direction, file drag-drop) are missing or inconsistent tool-to-tool.

This is the same class of gap already identified and approved for the Formatters category in `2026-07-03-formatters-dashboard-alignment-design.md`, which explicitly scoped Converters **out** as a separate plan. This document is that plan.

## Scope

**In scope:** the 8 tools in the "Converters" category exactly as defined in `tool-categories.ts`: Base64 Encoder (`base64`), URL Encoder (`url-encode`), URL Parser (`url-parser`), Number Base Converter (`number-base-converter`), Timestamp Converter (`timestamp-converter`), Unit Converter (`unit-converter`), CSV/Excel↔JSON (`csv-excel-json`), Image to Base64 (`image-to-base64`).

**Explicitly excluded:** `format-converter`. It reads as a converter but is canonically categorized as `Formatters` in `tool-categories.ts:20`, and is already claimed by the approved Formatters plan's own rollout (its step 4). Touching it here would duplicate or conflict with that work.

**Functional scope:**
- Visual parity with dashboard's visual system: icon-chip page header, gradient/ring-inset card treatment, ambient background, `framer-motion` reveal-on-mount, hover effects.
- Common utility features, applied wherever each tool's shape supports them:
  - Copy-to-clipboard on every output field.
  - Swap/reverse-direction control on bidirectional conversions.
  - Drag-and-drop file input on file-based tools.
- No history/recents panel — explicitly declined for this plan.
- No new icon or accent-color assignments — reuse what's already registered (see below).

## Design

### 1. Shared component layer — reuse Formatters' pieces, don't fork them

The Formatters plan already designs `ToolPageHeader`, promoted CSS utilities (`dash-ambient`, `dashboard-grid-bg`, `dash-card-sheen`, generalized from dashboard-only scope), and reuse of `RevealItem`. As of this writing none of these exist yet (`ToolPageHeader`/`ToolActionBar` not found in the tree) — the Formatters plan is approved but unimplemented.

Rule for whichever plan executes first: build these shared pieces under a category-neutral location (not `components/dashboard/` or `components/formatters/`), e.g. `apps/web/src/components/tools/tool-page-header.tsx`, with generalized CSS utility names already specified by the Formatters plan. The second plan to execute reuses them as-is — no parallel `ConverterPageHeader` fork.

**New, Converters-specific additions** (not covered by the Formatters plan, since Formatters tools don't need them):
- **`CopyButton`** (`apps/web/src/components/tools/copy-button.tsx`): icon button, `navigator.clipboard.writeText`, checkmark/toast feedback on success, toast on failure. Generic — takes the string to copy as a prop, so any tool's output field can use it.
- **`SwapButton`**: icon button with rotate-on-click animation, takes a `onSwap` callback. Generic — each tool wires its own swap logic since state shape differs per tool (see below).
- **`FileDropzone`**: dashed-border drop target wrapping/replacing existing file `<input type="file">`, click-to-browse fallback, hover state on drag-over.

### 2. Per-tool integration

All 8 get `ToolPageHeader` (icon from `sidebar-data.ts`'s existing per-tool icon, e.g. `IconTransform` for Base64) and the dashboard card treatment. Copy/swap/dropzone applied per tool's actual shape — confirmed at implementation time, best current read:

| Tool | Copy | Swap | Dropzone |
|---|---|---|---|
| Base64 Encoder | output field | encode ↔ decode | — |
| URL Encoder | output field | encode ↔ decode | — |
| URL Parser | per parsed field | — (parse-only, one direction) | — |
| Number Base Converter | output field | from-base ↔ to-base | — |
| Timestamp Converter | per format output | likely N/A — shows multiple formats at once, not A→B (confirm during implementation) | — |
| Unit Converter | output field | from-unit ↔ to-unit | — |
| CSV/Excel↔JSON | JSON/CSV output | conversion direction toggle | file upload |
| Image to Base64 | base64 output | — (one-directional: image → string only) | image upload |

### 3. Card treatment

Toolbar and result `Card`s adopt dashboard's `bg-gradient-to-br from-card to-card/80`, `ring-1 ring-inset ring-border/50`, and hover border/shadow glow — same recipe as the Formatters plan, not a new one.

### 4. Spacing normalization

Match dashboard's `gap-3 md:gap-4 xl:gap-5` (grouped fields) and `p-3 md:p-3.5` (card padding) rhythm, replacing each tool's current ad hoc spacing.

### 5. Color accent

Converters category accent is already registered: `bg-amber-500/10` / `text-amber-600 dark:text-amber-400` (`apps/web/src/components/dashboard/types.ts:132`, `categoryAccent('Converters')`). Applied to each `ToolPageHeader` icon chip — no new accent color invented.

### 6. Motion

`RevealItem` stagger-fade on mount: header → toolbar → result card, matching the dashboard's and Formatters' section stagger pattern. Must respect `prefers-reduced-motion` (already handled by `RevealItem`).

## Rollout order

Build shared pieces first (or reuse them if the Formatters plan lands first), then batch-apply to all 8 Converters tools in one pass — no separate pilot-then-rollout phase.

## Error handling

- Clipboard write failure (permissions/insecure context): catch, show error toast, don't throw uncaught.
- Dropzone: reject non-matching file types with each tool's existing inline validation error pattern — no new validation framework.
- Swap: no-op safely if there's nothing meaningful to swap (e.g., empty input).

## Testing

No test framework in the repo (`apps/web/package.json` has no `test` script) — verification is manual:
- Light/dark mode and the accent-color theme variants (`.blue`/`.purple`/`.green` etc. on `<html>`).
- Mobile breakpoints for `ToolPageHeader` and any switcher UI.
- `prefers-reduced-motion` — reveal animation must no-op correctly.
- Exercise all 8 tools: copy works on every output field, swap works where applicable, dropzone accepts/rejects files correctly on the 2 file-based tools.
- `eslint .` clean.

## Explicitly out of scope

- `format-converter` — owned by the Formatters plan.
- History/recents panel.
- New icon or accent-color assignments beyond what's already registered per tool/category.
