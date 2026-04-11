'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Activity,
  BarChart3,
  Bookmark,
  Boxes,
  Braces,
  Briefcase,
  Database,
  FolderOpen,
  History,
  KeyRound,
  ListTodo,
  RefreshCw,
  Server,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchDashboardAnalyticsSummary,
  type DashboardAnalyticsSummary,
} from '@/lib/dashboard-analytics-api'
import { cn } from '@/lib/utils'

function sumTrackedItems(d: DashboardAnalyticsSummary): number {
  return (
    d.passwordEntries +
    d.bookmarks +
    d.bookmarkFolders +
    d.tasks.total +
    d.projects +
    d.nosqlConnections +
    d.notes +
    d.apiClientCollections +
    d.apiClientEnvironments +
    d.apiClientHistoryEntries +
    d.jsonFormatterDocuments
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse" aria-hidden>
      <div className="h-16 rounded-xl bg-muted/60" />
      <div className="h-10 rounded-lg bg-muted/50" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}

function MetricChip({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ElementType
  accent: string
}) {
  return (
    <div
      className={cn(
        'group relative flex min-h-[3.25rem] items-center gap-2 overflow-hidden rounded-lg border border-border/50 bg-card/50 px-2 py-1.5 shadow-sm',
        'transition-colors hover:border-primary/20 hover:bg-card/80'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-[0.1] blur-xl transition-opacity group-hover:opacity-20',
          accent
        )}
      />
      <div
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm ring-1 ring-white/10',
          accent
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-base font-bold tabular-nums leading-tight tracking-tight md:text-lg">{value}</p>
      </div>
    </div>
  )
}

function TaskMixInline({
  tasks,
  labels,
}: {
  tasks: DashboardAnalyticsSummary['tasks']
  labels: { done: string; ongoing: string; todo: string; empty: string }
}) {
  const { total, completed, ongoing, notStarted } = tasks
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)

  if (total === 0) {
    return <p className="text-[11px] leading-snug text-muted-foreground">{labels.empty}</p>
  }

  const segments = [
    { key: 'done', value: completed, pct: pct(completed), className: 'bg-emerald-500' },
    { key: 'ongoing', value: ongoing, pct: pct(ongoing), className: 'bg-amber-500' },
    { key: 'todo', value: notStarted, pct: pct(notStarted), className: 'bg-muted-foreground/40' },
  ]

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className={cn('h-full min-w-0', s.className)}
              style={{ width: `${s.pct}%` }}
              title={`${s.pct}%`}
            />
          ) : null
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 text-[10px] leading-none">
        <span className="text-muted-foreground">
          <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
          {labels.done} <span className="font-semibold tabular-nums text-foreground">{completed}</span>
        </span>
        <span className="text-muted-foreground">
          <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
          {labels.ongoing} <span className="font-semibold tabular-nums text-foreground">{ongoing}</span>
        </span>
        <span className="text-muted-foreground">
          <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 align-middle" />
          {labels.todo} <span className="font-semibold tabular-nums text-foreground">{notStarted}</span>
        </span>
      </div>
    </div>
  )
}

export function DashboardAnalyticsPanel() {
  const t = useTranslations('Dashboard.analytics')
  const [data, setData] = useState<DashboardAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const summary = await fetchDashboardAnalyticsSummary()
      setData(summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loadError'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const totalCount = useMemo(() => (data ? sumTrackedItems(data) : 0), [data])

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 animate-pulse" aria-hidden />
          <span>{t('loadingLabel')}</span>
        </div>
        <AnalyticsSkeleton />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-destructive/25 bg-gradient-to-br from-destructive/5 to-background p-6 text-center">
        <div className="absolute inset-0 dashboard-grid-bg opacity-30" aria-hidden />
        <div className="relative mx-auto max-w-md space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <BarChart3 className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-destructive">{error || t('loadError')}</p>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { tasks } = data

  return (
    <div className="flex flex-col gap-2 md:gap-2.5">
      {/* Compact header + totals — one band */}
      <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-primary/[0.06] via-background to-violet-500/[0.05] shadow-sm">
        <div className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-[0.25]" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-3 p-3 md:gap-4 md:p-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              <span className="relative flex h-1 w-1">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-1 w-1 rounded-full bg-primary" />
              </span>
              {t('heroBadge')}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-600 text-white shadow-md">
                <BarChart3 className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold tracking-tight md:text-base">{t('title')}</h2>
                <p className="truncate text-[11px] text-muted-foreground md:text-xs">{t('subtitle')}</p>
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <div className="glass-card stats-glow rounded-lg border border-border/50 px-3 py-1.5 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t('totalLabel')}</p>
              <p className="text-xl font-bold tabular-nums leading-none text-primary md:text-2xl">{totalCount}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-lg px-3"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              {t('retry')}
            </Button>
          </div>
        </div>

        {/* Task mix — same card, minimal height */}
        <div className="relative flex flex-wrap items-center gap-2 border-t border-border/40 bg-background/30 px-3 py-2 md:px-3.5">
          <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <ListTodo className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
            <span className="tabular-nums">
              {t('taskMixTitle')} ({tasks.total})
            </span>
          </div>
          <TaskMixInline
            tasks={tasks}
            labels={{
              done: t('tasksCompleted'),
              ongoing: t('tasksOngoing'),
              todo: t('tasksNotStarted'),
              empty: t('taskMixEmpty'),
            }}
          />
        </div>
      </div>

      {/* Dense metric grid: 6 × 2 on large screens → no vertical scroll on typical laptops */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <MetricChip
          label={t('passwordEntries')}
          value={data.passwordEntries}
          icon={KeyRound}
          accent="from-rose-500 to-orange-500"
        />
        <MetricChip
          label={t('bookmarks')}
          value={data.bookmarks}
          icon={Bookmark}
          accent="from-sky-500 to-cyan-500"
        />
        <MetricChip
          label={t('bookmarkFolders')}
          value={data.bookmarkFolders}
          icon={FolderOpen}
          accent="from-violet-500 to-purple-500"
        />
        <MetricChip
          label={t('projects')}
          value={data.projects}
          icon={Briefcase}
          accent="from-blue-500 to-indigo-600"
        />
        <MetricChip
          label={t('notes')}
          value={data.notes}
          icon={StickyNote}
          accent="from-amber-500 to-yellow-500"
        />
        <MetricChip
          label={t('nosqlConnections')}
          value={data.nosqlConnections}
          icon={Database}
          accent="from-emerald-500 to-teal-500"
        />
        <MetricChip
          label={t('apiClientCollections')}
          value={data.apiClientCollections}
          icon={Boxes}
          accent="from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700"
        />
        <MetricChip
          label={t('apiClientEnvironments')}
          value={data.apiClientEnvironments}
          icon={Server}
          accent="from-fuchsia-500 to-pink-500"
        />
        <MetricChip
          label={t('apiClientHistory')}
          value={data.apiClientHistoryEntries}
          icon={History}
          accent="from-orange-500 to-red-500"
        />
        <MetricChip
          label={t('jsonFormatterDocuments')}
          value={data.jsonFormatterDocuments}
          icon={Braces}
          accent="from-cyan-500 to-blue-600"
        />
      </div>
    </div>
  )
}
