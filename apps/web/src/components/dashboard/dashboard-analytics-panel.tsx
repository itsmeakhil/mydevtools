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
  Cable,
  Database,
  FolderOpen,
  History,
  KeyRound,
  Layers,
  ListTodo,
  RefreshCw,
  Server,
  Shield,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    <div className="space-y-8 animate-pulse" aria-hidden>
      <div className="h-36 rounded-2xl bg-muted/60" />
      <div className="h-24 rounded-2xl bg-muted/50" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/50" />
        ))}
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
  accent,
  className,
}: {
  label: string
  value: number
  icon: React.ElementType
  accent: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/50 bg-card/40 p-4 shadow-sm transition-all duration-300',
        'hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
        'backdrop-blur-sm',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.12] blur-2xl transition-opacity group-hover:opacity-25',
          accent
        )}
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ring-1 ring-white/10',
            accent
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  )
}

function TaskMixBar({
  tasks,
  labels,
}: {
  tasks: DashboardAnalyticsSummary['tasks']
  labels: { done: string; ongoing: string; todo: string; empty: string }
}) {
  const { total, completed, ongoing, notStarted } = tasks
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">{labels.empty}</p>
    )
  }

  const segments = [
    { key: 'done', value: completed, pct: pct(completed), className: 'bg-emerald-500', label: labels.done },
    { key: 'ongoing', value: ongoing, pct: pct(ongoing), className: 'bg-amber-500', label: labels.ongoing },
    {
      key: 'todo',
      value: notStarted,
      pct: pct(notStarted),
      className: 'bg-muted-foreground/35',
      label: labels.todo,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/40">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              className={cn('h-full min-w-0 transition-all duration-500 first:rounded-l-full last:rounded-r-full', s.className)}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${s.value} (${s.pct}%)`}
            />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', s.className)} aria-hidden />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
            <span className="tabular-nums text-muted-foreground">({s.pct}%)</span>
          </div>
        ))}
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
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse" aria-hidden />
          <span>{t('loadingLabel')}</span>
        </div>
        <AnalyticsSkeleton />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-destructive/25 bg-gradient-to-br from-destructive/5 to-background p-8 text-center">
        <div className="absolute inset-0 dashboard-grid-bg opacity-30" aria-hidden />
        <div className="relative mx-auto max-w-md space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <BarChart3 className="h-7 w-7" strokeWidth={1.5} />
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
    <div className="space-y-8 md:space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.07] via-background to-violet-500/[0.06] p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-[0.35]" aria-hidden />
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl"
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {t('heroBadge')}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/25">
                <BarChart3 className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h2>
                <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-3">
            <div className="glass-card stats-glow flex min-w-[160px] flex-1 flex-col justify-center rounded-2xl border border-border/50 px-6 py-4 sm:flex-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('totalLabel')}</p>
              <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-primary">{totalCount}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{t('totalHint')}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-auto shrink-0 gap-2 rounded-2xl border-border/60 bg-background/80 px-5 py-4 shadow-sm backdrop-blur-sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              <span className="text-sm font-medium">{t('retry')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Task mix */}
      <Card className="overflow-hidden border-border/50 bg-card/30 shadow-md backdrop-blur-sm">
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <ListTodo className="h-4 w-4" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">{t('taskMixTitle')}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('tasksTotal')}: <span className="font-semibold text-foreground">{tasks.total}</span>
                </p>
              </div>
            </div>
          </div>
          <TaskMixBar
            tasks={tasks}
            labels={{
              done: t('tasksCompleted'),
              ongoing: t('tasksOngoing'),
              todo: t('tasksNotStarted'),
              empty: t('taskMixEmpty'),
            }}
          />
        </CardContent>
      </Card>

      {/* Vault & bookmarks */}
      <section className="space-y-4">
        <div className="section-header-line flex items-center gap-2 pb-2">
          <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
            <Shield className="h-4 w-4" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">{t('groupVault')}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label={t('passwordEntries')}
            value={data.passwordEntries}
            icon={KeyRound}
            accent="from-rose-500 to-orange-500"
          />
          <MetricTile
            label={t('bookmarks')}
            value={data.bookmarks}
            icon={Bookmark}
            accent="from-sky-500 to-cyan-500"
          />
          <MetricTile
            label={t('bookmarkFolders')}
            value={data.bookmarkFolders}
            icon={FolderOpen}
            accent="from-violet-500 to-purple-500"
          />
        </div>
      </section>

      {/* Workspace */}
      <section className="space-y-4">
        <div className="section-header-line flex items-center gap-2 pb-2">
          <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
            <Layers className="h-4 w-4" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">{t('groupWorkspace')}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label={t('projects')}
            value={data.projects}
            icon={Briefcase}
            accent="from-blue-500 to-indigo-600"
          />
          <MetricTile
            label={t('notes')}
            value={data.notes}
            icon={StickyNote}
            accent="from-amber-500 to-yellow-500"
          />
        </div>
      </section>

      {/* Developer toolkit */}
      <section className="space-y-4">
        <div className="section-header-line flex items-center gap-2 pb-2">
          <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
            <Cable className="h-4 w-4" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-semibold tracking-tight">{t('groupToolkit')}</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile
            label={t('nosqlConnections')}
            value={data.nosqlConnections}
            icon={Database}
            accent="from-emerald-500 to-teal-500"
          />
          <MetricTile
            label={t('apiClientCollections')}
            value={data.apiClientCollections}
            icon={Boxes}
            accent="from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700"
          />
          <MetricTile
            label={t('apiClientEnvironments')}
            value={data.apiClientEnvironments}
            icon={Server}
            accent="from-fuchsia-500 to-pink-500"
          />
          <MetricTile
            label={t('apiClientHistory')}
            value={data.apiClientHistoryEntries}
            icon={History}
            accent="from-orange-500 to-red-500"
          />
          <MetricTile
            label={t('jsonFormatterDocuments')}
            value={data.jsonFormatterDocuments}
            icon={Braces}
            accent="from-cyan-500 to-blue-600"
          />
        </div>
      </section>
    </div>
  )
}
