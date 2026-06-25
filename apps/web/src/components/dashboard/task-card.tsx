'use client'

import Link from 'next/link'
import { ListTodo } from 'lucide-react'
import { type DashboardAnalyticsSummary } from '@/lib/dashboard-analytics-api'
import { useCountUp } from '@/hooks/use-count-up'

export function TaskCard({
  tasks,
  labels,
}: {
  tasks: DashboardAnalyticsSummary['tasks']
  labels: { done: string; ongoing: string; todo: string; empty: string; title: string }
}) {
  const { total, completed, ongoing, notStarted } = tasks
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const animatedTotal = useCountUp(total)
  const animatedPct = useCountUp(completionPct)

  return (
    <Link
      href="/app/to-do"
      className="group col-span-2 flex flex-col gap-3 overflow-hidden rounded-lg border border-border/50 bg-card/50 px-3 py-3 shadow-sm transition-all duration-200 hover:border-amber-500/30 hover:bg-card/80 hover:shadow-md hover:-translate-y-px active:translate-y-0 sm:col-span-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-sm ring-1 ring-white/10">
            <ListTodo className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
              {labels.title}
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight">{animatedTotal}</p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-emerald-500 leading-none">
              {animatedPct}%
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {labels.done}
            </span>
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="text-[11px] text-muted-foreground">{labels.empty}</p>
      ) : (
        <>
          <div className="flex h-2 min-w-0 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30">
            {pct(completed) > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${pct(completed)}%` }}
              />
            )}
            {pct(ongoing) > 0 && (
              <div
                className="h-full bg-amber-500 transition-all duration-700"
                style={{ width: `${pct(ongoing)}%` }}
              />
            )}
            {pct(notStarted) > 0 && (
              <div
                className="h-full bg-muted-foreground/40 transition-all duration-700"
                style={{ width: `${pct(notStarted)}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-none">
            <span className="text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
              {labels.done}{' '}
              <span className="font-semibold tabular-nums text-foreground">{completed}</span>
              {' '}
              <span className="text-muted-foreground/60">({pct(completed)}%)</span>
            </span>
            <span className="text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
              {labels.ongoing}{' '}
              <span className="font-semibold tabular-nums text-foreground">{ongoing}</span>
              {' '}
              <span className="text-muted-foreground/60">({pct(ongoing)}%)</span>
            </span>
            <span className="text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 align-middle" />
              {labels.todo}{' '}
              <span className="font-semibold tabular-nums text-foreground">{notStarted}</span>
              {' '}
              <span className="text-muted-foreground/60">({pct(notStarted)}%)</span>
            </span>
          </div>
        </>
      )}
    </Link>
  )
}
