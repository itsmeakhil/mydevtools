# Formatters UI/UX Alignment with Dashboard Theme

**Date:** 2026-07-03
**Status:** Approved (design phase)

## Problem

The "Formatters" tool category (`json-formatter`, `json-schema-generator`, `sql-formatter`, `graphql-formatter`, `yaml-formatter`, `markdown-preview-html`, `format-converter`, `diff-checker`, `regex-tester` — as defined in `apps/web/src/lib/tool-categories.ts`) shares the dashboard's outer shell (`ClientLayout`: sidebar + nav) but the page *content* looks like a bare utility screen: no desktop page title, no icon branding, no color accents, no motion, no ambient background. The dashboard (`apps/web/src/app/dashboard/`) has a fully developed visual system: gradient hero text, icon-chip section headers, hover-sheen gradient cards, staggered `framer-motion` reveals, and an ambient radial-gradient background.

This creates a visible quality gap when navigating from the dashboard into any formatter tool.

## Scope

**In scope:** the 9 tools in the "Formatters" category exactly as defined in `tool-categories.ts`. Converters (`base64`, `unit-converter`, etc.) are a separate category and are explicitly **out of scope**.

**Functional scope:** consistency only. No new features. Specifically:
- Normalize the action button set/order (Format, Clear, Copy, Download; Save only where backend persistence already exists — i.e. JSON formatter today, not invented elsewhere).
- Normalize error-banner markup/styling across tools.
- No history/undo, no save/load expansion to other tools — explicitly deferred, not part of this plan.

**Visual scope:** full parity with dashboard's visual system (chosen over lighter alternatives): icon-chip page header, gradient/accent card treatment, ambient background, `framer-motion` reveal-on-mount, hover effects — with one carve-out (see below) for code-editor panels.

## Design

### 1. Shared component layer (build once, reuse across all 9)

Rather than editing each tool's layout file independently (guarantees drift on the next redesign), extract shared pieces — mirroring how the dashboard itself already reuses `DashboardSectionHeader`, `ToolCard`, `RevealItem` across sections instead of inlining per-section markup.

- **`ToolPageHeader`** (new, e.g. `apps/web/src/components/tools/tool-page-header.tsx`): icon chip + title + short description, styled like a compact dashboard hero. Reuses each tool's existing icon from the tools registry (`apps/web/src/lib/tools-registry.ts`) — no new icon choices. This is shown on **desktop**, closing the current gap where only a mobile-only `<h1>` exists and desktop has no page identity at all.
- **Promoted CSS utilities**: `dash-ambient`, `dashboard-grid-bg`, and the `dash-card-sheen` hover effect currently live in `globals.css` scoped conceptually to the dashboard. Generalize/rename so they're usable on any tool page shell (mechanical CSS move, same visual output).
- **`RevealItem`** (`apps/web/src/components/dashboard/dashboard-reveal.tsx`): reuse as-is or relocate to a shared location if that file is dashboard-specific in name only. Respects `prefers-reduced-motion` already — no new work needed there.
- **`ToolActionBar`** (new): normalizes the Format/Clear/Copy/Download/Save button set, order, and icon styling. Today each tool hand-rolls its own subset and order.
- **Mobile input/output switcher**: replace the hand-rolled pill toggle (`bg-muted/40 p-1` two-button div) with shadcn `Tabs`, matching how the dashboard already uses `Tabs` for its Apps/Analytics switch. One fewer bespoke pattern in the codebase.

### 2. Card treatment

Toolbar `Card` and I/O panel `Card`s adopt dashboard's `bg-gradient-to-br from-card to-card/80`, `ring-1 ring-inset ring-border/50` icon chips, and hover border/shadow glow.

**Carve-out:** the cursor-tracked `dash-card-sheen` effect applies to toolbar/header cards only — **not** the code-editor input/output panels themselves, since that effect is distracting on a surface the user is actively typing/reading in.

### 3. Spacing normalization

Replace formatter's tighter `gap-4` / `p-4` / `px-4 py-2.5` rhythm with dashboard's `gap-3 md:gap-4 xl:gap-5` (grids) and `p-3 md:p-3.5` (card padding).

### 4. Color accents

Each tool gets the accent color already assigned to it in the existing registry/category data — no new color assignments invented for this project.

### 5. Motion

`RevealItem` stagger-fade on mount: header → toolbar → panels, in that order, matching the dashboard's section stagger pattern.

## Rollout order

1. Build the shared pieces (`ToolPageHeader`, promoted CSS utilities, `ToolActionBar`) against **JSON formatter** as the pilot — it's the hardest case (resizable dual-pane via `react-resizable-panels`, existing save/load modal), so proving the pattern here first surfaces integration problems early.
2. Batch-apply to `yaml-formatter`, `sql-formatter`, `graphql-formatter` — these three are near-identical structurally today, so once the pattern lands on one it should apply cheaply to the rest.
3. Apply to `json-schema-generator`, `markdown-preview-html`, `diff-checker`, `regex-tester`.
4. Apply to `format-converter` last — structurally furthest from the code-editor-pair pattern the others share.

## Testing

- Light/dark mode, and the accent-color theme variants (`.blue`/`.purple`/`.green` etc. on `<html>`).
- Mobile breakpoints (the new `ToolPageHeader` and `Tabs`-based switcher in particular).
- `prefers-reduced-motion` — reveal animation must no-op correctly.
- Regression check: JSON formatter's save/load modal must continue working unmodified after the pilot refactor.

## Explicitly out of scope

- Converters category (separate design if ever pursued).
- New functionality: save/load expansion beyond JSON formatter, history/undo, recents.
- New icon or accent-color assignments beyond what's already registered per tool.
