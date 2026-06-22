# Dashboard Analytics Graphs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard Analytics tab genuinely useful by recording real usage events and rendering four zero-dependency SVG charts (activity trend, data distribution donut, task completion donut, top tools bars).

**Architecture:** Split the work into pure, node-testable logic modules and thin presentational components. `tool-usage-utils.ts` holds the event-log operations (append/prune/derive); `use-tool-usage.ts` wires those to localStorage. `charts/chart-utils.ts` holds chart math (day bucketing, donut segments); the SVG chart components are thin renderers consuming that math. The analytics panel composes everything in a charts-first layout.

**Tech Stack:** Next.js (client components), TypeScript, Tailwind, hand-rolled SVG. Tests: Jest + ts-jest (node environment, `**/__tests__/**/*.test.ts`).

## Global Constraints

- **Zero new runtime dependencies.** No chart library. Charts are hand-rolled SVG.
- **No backend changes.** Client-only. `trackToolUsageApi` call stays as-is.
- **Test environment is node-only** (`jest-environment-node`, no jsdom/RTL). Only pure logic is unit-tested; components are verified manually.
- **Style:** enterprise-flat — solid surfaces, theme tokens (`hsl(var(--primary))`, `currentColor`, `hsl(var(--muted-foreground))`), restrained motion, respect `prefers-reduced-motion`.
- **Accessibility:** each chart `role="img"` + descriptive `aria-label`; color never the sole signal; toggles are real `<button>`s.
- **localStorage budget:** prune to `MAX_AGE_DAYS = 90` then `MAX_EVENTS = 500`.
- Test command: `cd apps/web && npx jest <path>`.
- Type aliases: `@/` → `apps/web/src/`.

---

### Task 1: Pure usage-event utilities

Extract event-log logic into a pure module so it is node-testable without localStorage.

**Files:**
- Create: `apps/web/src/lib/tool-usage-utils.ts`
- Test: `apps/web/src/lib/__tests__/tool-usage-utils.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface ToolUsage { toolId: string; timestamp: number; url: string }`
  - `const MAX_EVENTS = 500`
  - `const MAX_AGE_DAYS = 90`
  - `appendEvent(log: ToolUsage[], event: ToolUsage, now?: number): ToolUsage[]` — returns a new log with `event` prepended, then pruned (drop entries older than `MAX_AGE_DAYS` relative to `now`, then keep newest `MAX_EVENTS`). `now` defaults to `Date.now()`.
  - `deriveRecents(log: ToolUsage[], limit: number): ToolUsage[]` — newest-first, deduped by `toolId` (keep newest), sliced to `limit`.
  - `deriveCounts(log: ToolUsage[]): Record<string, { count: number; url?: string; lastUsed: number }>` — per-`toolId` launch count, most recent `url`, and max timestamp.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/__tests__/tool-usage-utils.test.ts
import {
  appendEvent,
  deriveRecents,
  deriveCounts,
  MAX_EVENTS,
  type ToolUsage,
} from '@/lib/tool-usage-utils'

const ev = (toolId: string, timestamp: number, url = `/app/${toolId}`): ToolUsage => ({
  toolId,
  timestamp,
  url,
})

describe('appendEvent', () => {
  it('prepends the new event without deduping', () => {
    const log = [ev('a', 1000)]
    const out = appendEvent(log, ev('a', 2000), 2000)
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual(ev('a', 2000))
  })

  it('prunes events older than 90 days', () => {
    const now = 90 * 24 * 60 * 60 * 1000 + 5000
    const old = ev('old', 1000) // ~epoch, older than 90d before now
    const out = appendEvent([old], ev('new', now), now)
    expect(out.map((e) => e.toolId)).toEqual(['new'])
  })

  it('caps total events at MAX_EVENTS, keeping newest', () => {
    const now = 10_000_000
    const log: ToolUsage[] = Array.from({ length: MAX_EVENTS }, (_, i) =>
      ev(`t${i}`, now - i),
    )
    const out = appendEvent(log, ev('newest', now + 1), now + 1)
    expect(out).toHaveLength(MAX_EVENTS)
    expect(out[0].toolId).toBe('newest')
    expect(out.some((e) => e.toolId === `t${MAX_EVENTS - 1}`)).toBe(false)
  })
})

describe('deriveRecents', () => {
  it('dedupes by toolId keeping newest, newest-first, sliced', () => {
    const log = [ev('a', 300), ev('b', 200), ev('a', 100)]
    const out = deriveRecents(log, 5)
    expect(out.map((e) => e.toolId)).toEqual(['a', 'b'])
    expect(out[0].timestamp).toBe(300)
  })

  it('respects the limit', () => {
    const log = [ev('a', 3), ev('b', 2), ev('c', 1)]
    expect(deriveRecents(log, 2).map((e) => e.toolId)).toEqual(['a', 'b'])
  })
})

describe('deriveCounts', () => {
  it('counts launches per tool with latest url and lastUsed', () => {
    const log = [ev('a', 300, '/app/a?v=2'), ev('b', 250), ev('a', 100, '/app/a?v=1')]
    const counts = deriveCounts(log)
    expect(counts.a.count).toBe(2)
    expect(counts.a.lastUsed).toBe(300)
    expect(counts.a.url).toBe('/app/a?v=2')
    expect(counts.b.count).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/lib/__tests__/tool-usage-utils.test.ts`
Expected: FAIL — `Cannot find module '@/lib/tool-usage-utils'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/tool-usage-utils.ts
export interface ToolUsage {
  toolId: string
  timestamp: number
  url: string
}

export const MAX_EVENTS = 500
export const MAX_AGE_DAYS = 90

const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

/** Prepend `event`, then prune by age (relative to `now`) and total count. */
export function appendEvent(
  log: ToolUsage[],
  event: ToolUsage,
  now: number = Date.now(),
): ToolUsage[] {
  const cutoff = now - MAX_AGE_MS
  return [event, ...log].filter((e) => e.timestamp >= cutoff).slice(0, MAX_EVENTS)
}

/** Newest-first, deduped by toolId (keep newest), sliced to `limit`. */
export function deriveRecents(log: ToolUsage[], limit: number): ToolUsage[] {
  const sorted = [...log].sort((a, b) => b.timestamp - a.timestamp)
  const seen = new Set<string>()
  const out: ToolUsage[] = []
  for (const e of sorted) {
    if (seen.has(e.toolId)) continue
    seen.add(e.toolId)
    out.push(e)
    if (out.length >= limit) break
  }
  return out
}

/** Per-tool launch count, latest url, and max timestamp. */
export function deriveCounts(
  log: ToolUsage[],
): Record<string, { count: number; url?: string; lastUsed: number }> {
  const out: Record<string, { count: number; url?: string; lastUsed: number }> = {}
  for (const e of log) {
    const cur = out[e.toolId]
    if (!cur) {
      out[e.toolId] = { count: 1, url: e.url, lastUsed: e.timestamp }
    } else {
      cur.count += 1
      if (e.timestamp > cur.lastUsed) {
        cur.lastUsed = e.timestamp
        cur.url = e.url
      }
    }
  }
  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx jest src/lib/__tests__/tool-usage-utils.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/tool-usage-utils.ts apps/web/src/lib/__tests__/tool-usage-utils.test.ts
git commit -m "feat(analytics): pure usage-event log utilities"
```

---

### Task 2: Wire the hook to the event log

Replace the dedupe-on-write / 20-cap behavior in the hook with the append-only log, and expose new readers.

**Files:**
- Modify: `apps/web/src/hooks/use-tool-usage.ts` (full rewrite of body; keep `'use client'`, `USAGE_STORAGE_KEY`, backend call)

**Interfaces:**
- Consumes: `ToolUsage`, `appendEvent`, `deriveRecents`, `deriveCounts` from `@/lib/tool-usage-utils` (Task 1).
- Produces (hook return):
  - `trackToolUsage(toolId: string, url: string): void`
  - `getRecentlyUsedTools(limit?: number): ToolUsage[]` (default `limit = 10`)
  - `getUsageEvents(): ToolUsage[]` — raw log, newest-first
  - `getToolUsageCounts(): Record<string, { count: number; url?: string; lastUsed: number }>`

- [ ] **Step 1: Rewrite the hook**

```ts
// apps/web/src/hooks/use-tool-usage.ts
'use client';

import { useCallback } from 'react';
import useAuth from '@/utils/useAuth';
import { trackToolUsageApi } from '@/lib/user-preferences-api';
import {
  appendEvent,
  deriveRecents,
  deriveCounts,
  type ToolUsage,
} from '@/lib/tool-usage-utils';

const USAGE_STORAGE_KEY = 'tool-usage-history';

function readLog(): ToolUsage[] {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ToolUsage[]) : [];
  } catch (error) {
    console.error('Error reading tool usage history:', error);
    return [];
  }
}

/**
 * Hook to track tool usage for analytics and recently-used features.
 * Stores an append-only event log (pruned to 90 days / 500 events).
 */
export function useToolUsage() {
  const { user } = useAuth(false);

  const trackToolUsage = useCallback((toolId: string, url: string) => {
    try {
      const next = appendEvent(readLog(), { toolId, url, timestamp: Date.now() });
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Error tracking tool usage:', error);
    }

    if (user?.uid) {
      void trackToolUsageApi(toolId).catch((error) => {
        console.error('Error updating tool stats:', error);
      });
    }
  }, [user?.uid]);

  const getRecentlyUsedTools = useCallback(
    (limit: number = 10): ToolUsage[] => deriveRecents(readLog(), limit),
    [],
  );

  const getUsageEvents = useCallback(
    (): ToolUsage[] => [...readLog()].sort((a, b) => b.timestamp - a.timestamp),
    [],
  );

  const getToolUsageCounts = useCallback(() => deriveCounts(readLog()), []);

  return {
    trackToolUsage,
    getRecentlyUsedTools,
    getUsageEvents,
    getToolUsageCounts,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit 0 (no errors). The dashboard page's existing `getRecentlyUsedTools(8)` call remains compatible (same signature + `ToolUsage` shape).

- [ ] **Step 3: Lint the hook**

Run: `cd apps/web && npx eslint src/hooks/use-tool-usage.ts`
Expected: exit 0, no warnings.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/use-tool-usage.ts
git commit -m "feat(analytics): append-only usage log + event/count readers"
```

---

### Task 3: Chart math utilities

Pure, node-testable chart math used by all SVG charts.

**Files:**
- Create: `apps/web/src/components/dashboard/charts/chart-utils.ts`
- Test: `apps/web/src/components/dashboard/charts/__tests__/chart-utils.test.ts`

**Interfaces:**
- Consumes: `ToolUsage` from `@/lib/tool-usage-utils`.
- Produces:
  - `interface DayBucket { date: string; label: string; count: number }` (`date` = `YYYY-MM-DD` local; `label` = short like `Mon` or `6/22`)
  - `bucketEventsByDay(events: ToolUsage[], days: number, now?: number): DayBucket[]` — returns exactly `days` buckets, oldest→newest, missing days filled with `count: 0`.
  - `interface DonutSegment { label: string; value: number; color: string }`
  - `donutArcs(segments: DonutSegment[]): { segment: DonutSegment; dashArray: string; dashOffset: number; percent: number }[]` — circumference-normalized stroke-dasharray values for a unit circle (radius `R = 1`, circumference `2π`). Zero-value segments produce `dashArray = "0 <circumference>"`. Total of 0 yields all-zero arcs.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/components/dashboard/charts/__tests__/chart-utils.test.ts
import {
  bucketEventsByDay,
  donutArcs,
  type DonutSegment,
} from '@/components/dashboard/charts/chart-utils'
import type { ToolUsage } from '@/lib/tool-usage-utils'

const DAY = 24 * 60 * 60 * 1000
const ev = (toolId: string, timestamp: number): ToolUsage => ({
  toolId,
  timestamp,
  url: `/app/${toolId}`,
})

describe('bucketEventsByDay', () => {
  // Fixed "now" at midday to avoid TZ edge flicker.
  const now = new Date(2026, 5, 22, 12, 0, 0).getTime() // 2026-06-22 local

  it('returns exactly `days` buckets oldest-to-newest', () => {
    const out = bucketEventsByDay([], 7, now)
    expect(out).toHaveLength(7)
    expect(out[6].date).toBe('2026-06-22')
    expect(out[0].date).toBe('2026-06-16')
  })

  it('counts events into their local day and fills gaps with 0', () => {
    const events = [
      ev('a', now), // today
      ev('b', now), // today
      ev('c', now - 2 * DAY), // two days ago
    ]
    const out = bucketEventsByDay(events, 7, now)
    expect(out[6].count).toBe(2)
    expect(out[4].count).toBe(1)
    expect(out[5].count).toBe(0)
  })

  it('ignores events outside the window', () => {
    const out = bucketEventsByDay([ev('old', now - 30 * DAY)], 7, now)
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(0)
  })
})

describe('donutArcs', () => {
  const C = 2 * Math.PI
  const segs: DonutSegment[] = [
    { label: 'A', value: 1, color: 'a' },
    { label: 'B', value: 3, color: 'b' },
  ]

  it('normalizes values to the circumference and sets offsets sequentially', () => {
    const arcs = donutArcs(segs)
    expect(arcs[0].percent).toBeCloseTo(25)
    expect(arcs[1].percent).toBeCloseTo(75)
    const [lenA] = arcs[0].dashArray.split(' ').map(Number)
    expect(lenA).toBeCloseTo(C * 0.25)
    // second segment starts where the first ended
    expect(arcs[1].dashOffset).toBeCloseTo(-C * 0.25)
  })

  it('handles an all-zero total without NaN', () => {
    const arcs = donutArcs([{ label: 'Z', value: 0, color: 'z' }])
    expect(arcs[0].percent).toBe(0)
    expect(arcs[0].dashArray.split(' ').map(Number)[0]).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx jest src/components/dashboard/charts/__tests__/chart-utils.test.ts`
Expected: FAIL — `Cannot find module '.../chart-utils'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/components/dashboard/charts/chart-utils.ts
import type { ToolUsage } from '@/lib/tool-usage-utils'

export interface DayBucket {
  date: string // YYYY-MM-DD (local)
  label: string // short, e.g. "Mon" or "6/22"
  count: number
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** `days` buckets, oldest→newest, gaps filled with 0. */
export function bucketEventsByDay(
  events: ToolUsage[],
  days: number,
  now: number = Date.now(),
): DayBucket[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const buckets: DayBucket[] = []
  const index = new Map<string, DayBucket>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const bucket: DayBucket = {
      date: localDateKey(d),
      label: days <= 7 ? WEEKDAY[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
      count: 0,
    }
    buckets.push(bucket)
    index.set(bucket.date, bucket)
  }

  for (const e of events) {
    const key = localDateKey(new Date(e.timestamp))
    const bucket = index.get(key)
    if (bucket) bucket.count += 1
  }

  return buckets
}

export interface DonutSegment {
  label: string
  value: number
  color: string
}

const CIRCUMFERENCE = 2 * Math.PI

/** Circumference-normalized stroke-dasharray arcs for a unit-radius donut. */
export function donutArcs(
  segments: DonutSegment[],
): { segment: DonutSegment; dashArray: string; dashOffset: number; percent: number }[] {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0)
  let consumed = 0
  return segments.map((segment) => {
    const fraction = total > 0 ? Math.max(0, segment.value) / total : 0
    const len = fraction * CIRCUMFERENCE
    const arc = {
      segment,
      dashArray: `${len} ${CIRCUMFERENCE - len}`,
      dashOffset: -consumed,
      percent: fraction * 100,
    }
    consumed += len
    return arc
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx jest src/components/dashboard/charts/__tests__/chart-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/charts/chart-utils.ts apps/web/src/components/dashboard/charts/__tests__/chart-utils.test.ts
git commit -m "feat(analytics): chart math utils (day buckets, donut arcs)"
```

---

### Task 4: DonutChart component

Generic SVG donut used by both the distribution and task-completion donuts.

**Files:**
- Create: `apps/web/src/components/dashboard/charts/donut-chart.tsx`

**Interfaces:**
- Consumes: `donutArcs`, `DonutSegment` from `./chart-utils` (Task 3).
- Produces: `DonutChart` (default-ish named export).
  - Props: `{ segments: DonutSegment[]; centerValue?: string | number; centerLabel?: string; ariaLabel: string }`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/src/components/dashboard/charts/donut-chart.tsx
'use client'

import { donutArcs, type DonutSegment } from './chart-utils'

interface DonutChartProps {
  segments: DonutSegment[]
  centerValue?: string | number
  centerLabel?: string
  ariaLabel: string
}

// Geometry: viewBox is centered at 0,0. r chosen so circumference = 2π (unit),
// matching donutArcs() normalization, scaled by SVG units below.
const R = 1
const STROKE = 0.42

export function DonutChart({ segments, centerValue, centerLabel, ariaLabel }: DonutChartProps) {
  const arcs = donutArcs(segments)
  const hasData = segments.some((s) => s.value > 0)

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="-1.4 -1.4 2.8 2.8"
        className="h-28 w-28 shrink-0 -rotate-90"
        role="img"
        aria-label={ariaLabel}
      >
        {/* track */}
        <circle
          cx="0"
          cy="0"
          r={R}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={STROKE}
        />
        {hasData &&
          arcs.map((arc, i) => (
            <circle
              key={i}
              cx="0"
              cy="0"
              r={R}
              fill="none"
              stroke={arc.segment.color}
              strokeWidth={STROKE}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              strokeLinecap="butt"
            />
          ))}
      </svg>

      <div className="min-w-0 flex-1">
        {(centerValue !== undefined || centerLabel) && (
          <div className="mb-2">
            {centerValue !== undefined && (
              <p className="text-2xl font-bold tabular-nums leading-none">{centerValue}</p>
            )}
            {centerLabel && (
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {centerLabel}
              </p>
            )}
          </div>
        )}
        <ul className="flex flex-col gap-1">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="truncate text-muted-foreground">{s.label}</span>
              <span className="ml-auto shrink-0 font-semibold tabular-nums">{s.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && npx tsc --noEmit && npx eslint src/components/dashboard/charts/donut-chart.tsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/charts/donut-chart.tsx
git commit -m "feat(analytics): zero-dep SVG DonutChart"
```

---

### Task 5: ActivityBarChart component

Daily-launch vertical bars with a 7d⇄30d toggle and a thin-data empty-state hint.

**Files:**
- Create: `apps/web/src/components/dashboard/charts/activity-bar-chart.tsx`

**Interfaces:**
- Consumes: `bucketEventsByDay`, `DayBucket` from `./chart-utils`; `ToolUsage` from `@/lib/tool-usage-utils`.
- Produces: `ActivityBarChart`.
  - Props: `{ events: ToolUsage[]; emptyHint: string; title: string }`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/src/components/dashboard/charts/activity-bar-chart.tsx
'use client'

import { useMemo, useState } from 'react'
import { bucketEventsByDay } from './chart-utils'
import type { ToolUsage } from '@/lib/tool-usage-utils'
import { cn } from '@/lib/utils'

interface ActivityBarChartProps {
  events: ToolUsage[]
  emptyHint: string
  title: string
}

export function ActivityBarChart({ events, emptyHint, title }: ActivityBarChartProps) {
  const [range, setRange] = useState<7 | 30>(7)
  const buckets = useMemo(() => bucketEventsByDay(events, range), [events, range])

  const max = Math.max(1, ...buckets.map((b) => b.count))
  const total = buckets.reduce((s, b) => s + b.count, 0)
  const activeDays = buckets.filter((b) => b.count > 0).length
  const thin = activeDays < 2

  const peak = buckets.reduce((a, b) => (b.count > a.count ? b : a), buckets[0])
  const ariaLabel = `Tool launches per day over the last ${range} days. Total ${total}, peak ${peak.count} on ${peak.label}.`

  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Time range">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer',
                range === r
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="flex h-24 items-end gap-1" role="img" aria-label={ariaLabel}>
          {buckets.map((b) => (
            <div key={b.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-sm bg-primary/70 transition-[height] duration-300 motion-reduce:transition-none"
                style={{ height: `${(b.count / max) * 100}%`, minHeight: b.count > 0 ? 2 : 0 }}
                title={`${b.label}: ${b.count}`}
              />
            </div>
          ))}
        </div>
        {range === 7 && (
          <div className="mt-1 flex gap-1">
            {buckets.map((b) => (
              <span
                key={b.date}
                className="flex-1 text-center text-[9px] text-muted-foreground/60"
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
        {thin && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-background/80 px-3 py-1 text-center text-[11px] text-muted-foreground backdrop-blur-sm">
              {emptyHint}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && npx tsc --noEmit && npx eslint src/components/dashboard/charts/activity-bar-chart.tsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/charts/activity-bar-chart.tsx
git commit -m "feat(analytics): activity bar chart with 7/30d toggle"
```

---

### Task 6: TopToolsBars component

Horizontal bars of most-launched tools (real counts).

**Files:**
- Create: `apps/web/src/components/dashboard/charts/top-tools-bars.tsx`

**Interfaces:**
- Consumes: nothing new (pure presentational).
- Produces: `TopToolsBars`.
  - `interface TopTool { id: string; title: string; icon?: React.ElementType; count: number; url?: string }`
  - Props: `{ tools: TopTool[]; title: string }`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/src/components/dashboard/charts/top-tools-bars.tsx
'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'

export interface TopTool {
  id: string
  title: string
  icon?: React.ElementType
  count: number
  url?: string
}

interface TopToolsBarsProps {
  tools: TopTool[]
  title: string
}

export function TopToolsBars({ tools, title }: TopToolsBarsProps) {
  if (tools.length === 0) return null
  const max = Math.max(1, ...tools.map((t) => t.count))

  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {tools.map((t) => {
          const Icon = t.icon ?? Zap
          return (
            <li key={t.id}>
              <Link
                href={t.url ?? '/dashboard'}
                className="group flex items-center gap-2.5 cursor-pointer"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="w-24 shrink-0 truncate text-xs text-foreground group-hover:text-primary transition-colors">
                  {t.title}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                    style={{ width: `${(t.count / max) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                  {t.count}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && npx tsc --noEmit && npx eslint src/components/dashboard/charts/top-tools-bars.tsx`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/dashboard/charts/top-tools-bars.tsx
git commit -m "feat(analytics): top tools horizontal bars"
```

---

### Task 7: i18n strings for charts

Add the new chart labels to all 27 locale files under `Dashboard.analytics`, reusing English copy as fallback for non-en (matches the existing pattern in this codebase for newly added keys).

**Files:**
- Modify: `apps/web/messages/*.json` (27 files), `Dashboard.analytics` object.

**Interfaces:**
- Produces these keys under `Dashboard.analytics`:
  - `activityTitle` = "Activity"
  - `activityEmpty` = "Activity builds as you use tools"
  - `distributionTitle` = "Data distribution"
  - `topToolsTitle` = "Top tools"
  - `taskDonutTitle` = "Task completion"

- [ ] **Step 1: Add keys via script**

```bash
cd apps/web && python3 - <<'PY'
import json, glob, collections
NEW = {
  "activityTitle": "Activity",
  "activityEmpty": "Activity builds as you use tools",
  "distributionTitle": "Data distribution",
  "topToolsTitle": "Top tools",
  "taskDonutTitle": "Task completion",
}
for f in glob.glob('messages/*.json'):
    data = json.load(open(f, encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    analytics = data.get('Dashboard', {}).get('analytics')
    if not isinstance(analytics, dict):
        continue
    changed = False
    for k, v in NEW.items():
        if k not in analytics:
            analytics[k] = v
            changed = True
    if changed:
        json.dump(data, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(f, 'a').write('\n')
        print('updated', f)
print('done')
PY
```

- [ ] **Step 2: Verify diff is minimal**

Run: `cd /Users/max/Works/Personal/mydevtools.tech && git diff --numstat apps/web/messages/ | awk '{print $1+$2, $3}' | sort -rn | head -3`
Expected: each file ~10 changed lines (5 inserts), no wholesale reformat.

- [ ] **Step 3: Commit**

```bash
git add apps/web/messages/
git commit -m "i18n(analytics): add chart section labels"
```

---

### Task 8: Compose charts into the analytics panel

Add the charts-first zone to the panel; fix the KPI third card to real counts; remove the fake "Most used locally" block.

**Files:**
- Modify: `apps/web/src/components/dashboard/dashboard-analytics-panel.tsx`

**Interfaces:**
- Consumes: `useToolUsage` (`getUsageEvents`, `getToolUsageCounts`) from Task 2; `DonutChart` (Task 4); `ActivityBarChart` (Task 5); `TopToolsBars` + `TopTool` (Task 6); `findToolById` (existing in file).

- [ ] **Step 1: Replace the localStorage-derived `topUsedTools` with real counts + add usage events**

Replace the existing `topUsedTools` `useMemo` (the block reading `localStorage.getItem('tool-usage-history')` and parsing it, currently lines ~444-471) with hook-based data. Add near the top of the component body (after the existing `useState` hooks):

```tsx
  const { getUsageEvents, getToolUsageCounts } = useToolUsage()
  const usageEvents = useMemo(() => getUsageEvents(), [getUsageEvents])

  const topUsedTools = useMemo<TopTool[]>(() => {
    const counts = getToolUsageCounts()
    return Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([id, info]) => {
        const found = findToolById(id)
        return {
          id,
          title: found?.title ?? id,
          icon: found?.icon,
          count: info.count,
          url: info.url,
        }
      })
  }, [getToolUsageCounts])
```

Add the import for `useToolUsage`:

```tsx
import { useToolUsage } from '@/hooks/use-tool-usage'
```

Add chart imports:

```tsx
import { DonutChart } from './charts/donut-chart'
import { ActivityBarChart } from './charts/activity-bar-chart'
import { TopToolsBars, type TopTool } from './charts/top-tools-bars'
import { type DonutSegment } from './charts/chart-utils'
```

Remove the now-unused local `TopTool` interface (lines ~347-353) and the `TopUsedTools` component (lines ~355-391) — both replaced by `TopToolsBars`. Remove `TrendingUp` from the lucide import if it becomes unused after deleting `TopUsedTools`.

- [ ] **Step 2: Fix the third KPI card to real counts**

In the KPI strip, change the third `KpiCard` (currently `label="Tools used locally"`, `value={topUsedTools.length}`) to:

```tsx
        <KpiCard
          label={t('toolsUsedLocally') /* existing key if present; else keep literal "Tools used" */}
          value={Object.keys(getToolUsageCounts()).length}
          icon={Zap}
          accent="border-violet-500/20"
          sub={
            usageEvents.length > 0
              ? `${usageEvents.length} launches`
              : 'No history yet'
          }
        />
```

If `t('toolsUsedLocally')` is not an existing key, keep the current literal string the file already uses for this label (do not invent a new i18n key in this task).

- [ ] **Step 3: Insert the chart zone**

Immediately after the header strip `</div>` (the block containing the `heroBadge` / Refresh button, ends ~line 613) and before the `{/* Group 1: Vault & Bookmarks */}` comment, insert:

```tsx
      {/* ── Charts ─────────────────────────────────────────────────────────── */}
      <ActivityBarChart
        events={usageEvents}
        title={t('activityTitle')}
        emptyHint={t('activityEmpty')}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-3 md:p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('distributionTitle')}
          </p>
          <DonutChart
            ariaLabel={t('distributionTitle')}
            centerValue={totalCount}
            centerLabel={t('totalLabel')}
            segments={
              [
                { label: t('groupVault'), value: data.passwordEntries + data.bookmarks + data.bookmarkFolders, color: 'hsl(var(--primary))' },
                { label: t('groupWorkspace'), value: data.tasks.total + data.notes + data.projects + (data.codeSnippets ?? 0), color: '#f59e0b' },
                { label: t('groupToolkit'), value: data.nosqlConnections + data.apiClientCollections + data.apiClientEnvironments + data.apiClientHistoryEntries + data.jsonFormatterDocuments, color: '#06b6d4' },
              ] satisfies DonutSegment[]
            }
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-3 md:p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('taskDonutTitle')}
          </p>
          <DonutChart
            ariaLabel={t('taskDonutTitle')}
            centerValue={`${completionPct}%`}
            centerLabel={t('tasksCompleted')}
            segments={
              [
                { label: t('tasksCompleted'), value: tasks.completed, color: '#10b981' },
                { label: t('tasksOngoing'), value: tasks.ongoing, color: '#f59e0b' },
                { label: t('tasksNotStarted'), value: tasks.notStarted, color: 'hsl(var(--muted-foreground))' },
              ] satisfies DonutSegment[]
            }
          />
        </div>
      </div>

      <TopToolsBars tools={topUsedTools} title={t('topToolsTitle')} />
```

- [ ] **Step 4: Remove the old TopUsedTools render**

Delete the `<TopUsedTools tools={topUsedTools} />` line near the end of the returned JSX (~line 680) since `TopToolsBars` now covers it.

- [ ] **Step 5: Typecheck + lint**

Run: `cd apps/web && npx tsc --noEmit && npx eslint src/components/dashboard/dashboard-analytics-panel.tsx`
Expected: exit 0, no unused-var warnings (confirm `TrendingUp` / old `TopTool` / `TopUsedTools` fully removed).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/dashboard/dashboard-analytics-panel.tsx
git commit -m "feat(analytics): charts-first panel with activity, donuts, top tools"
```

---

### Task 9: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full analytics-related test suite**

Run: `cd apps/web && npx jest src/lib/__tests__/tool-usage-utils.test.ts src/components/dashboard/charts/__tests__/chart-utils.test.ts`
Expected: all PASS.

- [ ] **Step 2: Typecheck whole app**

Run: `cd apps/web && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Lint touched files**

Run: `cd apps/web && npx eslint src/hooks/use-tool-usage.ts src/components/dashboard/charts/ src/components/dashboard/dashboard-analytics-panel.tsx`
Expected: exit 0.

- [ ] **Step 4: Manual visual check**

Run the app, open `/dashboard`, switch to the Analytics tab. Verify (light + dark, widths 375/768/1024/1440):
- Activity chart shows the empty-state hint when there is little/no history; click a few tools, return, confirm bars appear and 7d⇄30d toggle works.
- Distribution donut sums to the total tracked items; segments + legend readable.
- Task donut shows completion %.
- Top tools bars show real counts (≥1, increasing as tools are reused — no longer capped at 1).
- No console errors; existing chip sections + refresh/show-empty still work.

- [ ] **Step 5: Final commit (if any manual fixes were needed)**

```bash
git add -A apps/web/src/components/dashboard apps/web/src/hooks
git commit -m "fix(analytics): manual verification adjustments"
```

---

## Self-Review

**Spec coverage:**
- Data layer (append-only log, prune, recents read-time dedupe, getUsageEvents, getToolUsageCounts) → Tasks 1, 2.
- Back-compat (old array input) → Task 1 tests use plain arrays; hook reads same key.
- Chart components (donut reused 2×, activity bars, top-tools bars) → Tasks 4, 5, 6.
- Chart math + a11y labels → Tasks 3, 4, 5.
- Panel layout A (KPI fix, activity, 2-col donuts, top tools, chips kept) → Task 8.
- Empty-state hint → Task 5.
- i18n → Task 7.
- Tests + manual verification → Tasks 1, 3, 9.

**Placeholder scan:** No TBD/TODO. The only conditional copy ("if `toolsUsedLocally` not an existing key, keep current literal") is an explicit instruction tied to verifiable repo state, not a placeholder.

**Type consistency:** `ToolUsage` shared from `tool-usage-utils`. `DonutSegment` defined in `chart-utils`, consumed by `DonutChart` and panel. `TopTool` defined in `top-tools-bars`, imported by panel (old in-file `TopTool` removed in Task 8). Hook return names (`getUsageEvents`, `getToolUsageCounts`) match panel consumption. `donutArcs` field names (`dashArray`, `dashOffset`, `percent`, `segment`) consistent across Task 3 test, impl, and Task 4 usage.
