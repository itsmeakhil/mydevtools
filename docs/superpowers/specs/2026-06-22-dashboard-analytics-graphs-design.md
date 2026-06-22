# Dashboard Analytics — Clear Data & Graphs

**Date:** 2026-06-22
**Status:** Design (approved in brainstorming)
**Scope:** Client-only. Make the dashboard Analytics tab genuinely useful by adding real
usage tracking and four hand-rolled SVG charts.

## Problem

The Analytics tab ([dashboard-analytics-panel.tsx](../../../apps/web/src/components/dashboard/dashboard-analytics-panel.tsx))
shows count chips but **no graphs**. Two data problems make it weak:

1. **No chart library** is installed; the panel renders only numeric chips + one thin
   stacked progress bar.
2. **Usage history is unusable for analytics.** [use-tool-usage.ts](../../../apps/web/src/hooks/use-tool-usage.ts)
   dedupes by `toolId` on write and caps at 20 entries. So the "Most used locally · N×"
   counts are effectively fake (max 1 each), and there is no time-series data for trends.

Backend (`/api/backend/analytics/summary`) returns **static counts only** — no time dimension.

## Goals

- Real, honest graphs that make the tab useful at a glance.
- Zero new dependencies (hand-rolled SVG charts).
- Match the enterprise-flat dashboard style already established (solid surfaces, restrained
  motion, theme tokens, `prefers-reduced-motion` respected, accessible).

## Non-Goals

- No backend changes (no server-side time-series). Client-only this pass.
- No new chart library.
- No change to the visual style direction (stays flat/enterprise).

## Decisions (from brainstorming)

| Question | Decision |
|----------|----------|
| Data scope | Fix client tracking + add charts (client-only) |
| Chart tech | Hand-rolled zero-dep SVG |
| Graphs | Activity trend, Data distribution donut, Top tools by real usage, Task completion donut |
| Layout | Approach A — charts-first hero, detail chips below |
| Empty trend period | Show chart immediately with a subtle empty-state hint when data is thin |

## Architecture

### 1. Data layer — `src/hooks/use-tool-usage.ts`

Convert the deduped/capped store into an **append-only event log**.

```ts
interface ToolUsage {
  toolId: string
  timestamp: number
  url: string
}
```

- **Constants:** `MAX_EVENTS = 500`, `MAX_AGE_DAYS = 90`.
- **`trackToolUsage(toolId, url)`** — append a new event (no dedupe). After append, prune:
  drop events older than `MAX_AGE_DAYS`, then keep the most recent `MAX_EVENTS`.
  Backend `trackToolUsageApi` call stays unchanged.
- **`getRecentlyUsedTools(limit)`** — unchanged *behavior*: read log, sort by timestamp
  desc, **dedupe by `toolId` at read time** (keep newest), slice to `limit`. The dashboard
  "Recently used" section keeps working identically.
- **New `getUsageEvents(): ToolUsage[]`** — raw log (sorted desc), for the activity trend.
- **New `getToolUsageCounts(): Record<string, { count: number; url?: string; lastUsed: number }>`**
  — real per-tool launch counts, for top-tools bars.

**Back-compat:** existing stored value is already `ToolUsage[]` with the same field shape, so
no migration is needed — the code simply stops capping at 20 and the log grows from now on.
Old data (≤20 deduped points) is valid input.

Storage budget: 500 × ~80 bytes ≈ 40 KB localStorage. Acceptable.

### 2. Chart components — new `src/components/dashboard/charts/`

All zero-dep SVG. Shared rules: use theme tokens (`hsl(var(--primary))`, `currentColor`,
`hsl(var(--muted-foreground))`), `role="img"` + descriptive `aria-label`, no entrance
animation when `prefers-reduced-motion: reduce`, `tabular-nums` for figures.

- **`donut-chart.tsx`** — generic donut. Props: `segments: { label, value, color }[]`,
  optional `centerValue` / `centerLabel`. Renders stroke-dasharray arcs + center text +
  compact legend. Reused by **both** the distribution donut and the task completion donut.
- **`activity-bar-chart.tsx`** — vertical bars of launches/day. Props: `events: ToolUsage[]`,
  internal `range` state `7 | 30` with a small toggle. Buckets events by day in local time,
  fills missing days with 0. When fewer than 2 days have any events, overlays a subtle
  empty-state hint ("Activity builds as you use tools") instead of faking data.
- **`top-tools-bars.tsx`** — horizontal bars. Props: `tools: { id, title, icon?, count, url? }[]`.
  Bar width = count / max. Links to the tool. Replaces the old fake "Most used locally" block.

### 3. Panel layout — `dashboard-analytics-panel.tsx`

Approach A (charts-first hero, detail below):

1. **KPI strip** (keep). Fix the third card: "Tools used locally" uses real distinct-tool
   count from `getToolUsageCounts()`; sub-label shows total launches.
2. **Activity trend** — full-width card (`activity-bar-chart`).
3. **Distribution donut | Task completion donut** — 2-column row (md+), stack on mobile.
   - Distribution segments: aggregate the tracked-item counts into the three existing groups
     (Vault / Workspace / Toolkit) using the same field groupings already defined in the
     panel; center = total tracked items (`sumTrackedItems`).
   - Task donut segments: completed / ongoing / notStarted; center = completion %.
4. **Top tools bars** — full-width (`top-tools-bars`), real counts from `getToolUsageCounts()`.
   Removes the existing `TopUsedTools` "Most used locally" section.
5. **Detail chip sections** (Vault / Workspace / Toolkit metric chips) — kept below as
   drill-down detail, including the existing show/hide-empty toggle and refresh control.

The existing skeleton/error/empty states and `useCountUp` animation are retained (count-up
is gated by reduced-motion via existing patterns or left as-is — it is opacity/number only,
not layout motion).

## Component boundaries

| Unit | Does | Depends on |
|------|------|-----------|
| `use-tool-usage` | Persist + read usage events/counts/recents | localStorage, backend track API |
| `donut-chart` | Render a donut from segments | none (pure SVG + theme tokens) |
| `activity-bar-chart` | Render daily-launch bars + range toggle | `ToolUsage[]` |
| `top-tools-bars` | Render ranked horizontal bars | tool list |
| `dashboard-analytics-panel` | Compose KPI + charts + detail from summary & local data | all above, analytics API |

## Accessibility & a11y

- Each chart: `role="img"` with an `aria-label` summarizing the data (e.g. "Tool launches per
  day, last 7 days, peak 12 on Tuesday").
- Color is not the only signal: donut/bars include text labels + values.
- Range toggle is a real `<button>` with `aria-pressed`.
- Respect `prefers-reduced-motion` for any transition.

## Testing

- `use-tool-usage`: unit-test append + prune (age + count cap), `getRecentlyUsedTools`
  read-time dedupe, `getUsageEvents` ordering, `getToolUsageCounts` aggregation. Cover the
  back-compat case (old ≤20 array as input).
- Charts: render tests for empty data, single-segment, and typical data; assert `aria-label`
  present and empty-state hint shows when activity data is thin.
- Manual: verify Analytics tab on 375 / 768 / 1024 / 1440 px, light + dark.

## Risks

- localStorage growth — bounded by prune (90d / 500). 
- Activity trend looks sparse early — mitigated by empty-state hint (accepted).
- Read-time dedupe cost for recents — negligible at ≤500 events.
