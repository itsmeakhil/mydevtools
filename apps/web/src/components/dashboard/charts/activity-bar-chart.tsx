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
