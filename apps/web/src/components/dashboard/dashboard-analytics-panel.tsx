'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  Activity,
  BarChart3,
  Bookmark,
  Boxes,
  Braces,
  Briefcase,
  Code2,
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
    d.jsonFormatterDocuments +
    (d.codeSnippets ?? 0)
  )
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 10) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-hidden>
      <div className="h-20 rounded-xl bg-muted/60" />
      <div className="h-px bg-muted/40" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ label, activeCount }: { label: string; activeCount: number }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/40" />
      {activeCount > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-primary">
          {activeCount}
        </span>
      )}
    </div>
  )
}

function MetricChip({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string
  value: number
  icon: React.ElementType
  accent: string
  href: string
}) {
  const isEmpty = value === 0
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex min-h-[4rem] items-center gap-2.5 overflow-hidden rounded-lg border bg-card/50 px-3 py-2 shadow-sm transition-all duration-200',
        isEmpty
          ? 'border-border/25 opacity-45 hover:opacity-70 hover:border-border/50'
          : 'border-border/50 hover:border-primary/25 hover:bg-card/80 hover:shadow-md hover:-translate-y-px active:translate-y-0'
      )}
    >
      {!isEmpty && (
        <div
          className={cn(
            'pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-[0.08] blur-xl transition-opacity group-hover:opacity-[0.18]',
            accent
          )}
        />
      )}
      <div
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-sm ring-1 ring-white/10',
          isEmpty ? 'from-muted-foreground/30 to-muted-foreground/20' : accent
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'text-lg font-bold tabular-nums leading-tight tracking-tight',
            isEmpty && 'text-muted-foreground/50'
          )}
        >
          {value}
        </p>
      </div>
    </Link>
  )
}

function TaskCard({
  tasks,
  labels,
}: {
  tasks: DashboardAnalyticsSummary['tasks']
  labels: { done: string; ongoing: string; todo: string; empty: string; title: string }
}) {
  const { total, completed, ongoing, notStarted } = tasks
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)

  return (
    <Link
      href="/app/to-do"
      className="group col-span-2 flex flex-col gap-2 overflow-hidden rounded-lg border border-border/50 bg-card/50 px-3 py-2.5 shadow-sm transition-all duration-200 hover:border-amber-500/30 hover:bg-card/80 hover:shadow-md hover:-translate-y-px active:translate-y-0 sm:col-span-3"
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
            <p className="text-lg font-bold tabular-nums leading-tight">{total}</p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-0.5 text-[11px] leading-none">
            <span className="text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" />
              {labels.done}{' '}
              <span className="font-semibold tabular-nums text-foreground">{completed}</span>
            </span>
            <span className="text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
              {labels.ongoing}{' '}
              <span className="font-semibold tabular-nums text-foreground">{ongoing}</span>
            </span>
            <span className="text-muted-foreground">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 align-middle" />
              {labels.todo}{' '}
              <span className="font-semibold tabular-nums text-foreground">{notStarted}</span>
            </span>
          </div>
        )}
      </div>
      {total === 0 ? (
        <p className="text-[11px] text-muted-foreground">{labels.empty}</p>
      ) : (
        <div className="flex h-1.5 min-w-0 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30">
          {pct(completed) > 0 && (
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pct(completed)}%` }}
            />
          )}
          {pct(ongoing) > 0 && (
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${pct(ongoing)}%` }}
            />
          )}
          {pct(notStarted) > 0 && (
            <div
              className="h-full bg-muted-foreground/40 transition-all"
              style={{ width: `${pct(notStarted)}%` }}
            />
          )}
        </div>
      )}
    </Link>
  )
}

export function DashboardAnalyticsPanel() {
  const t = useTranslations('Dashboard.analytics')
  const [data, setData] = useState<DashboardAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const summary = await fetchDashboardAnalyticsSummary()
      setData(summary)
      setRefreshedAt(new Date())
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

  // Re-render "X ago" every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  void tick

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

  const vaultActiveCount = [data.passwordEntries, data.bookmarks, data.bookmarkFolders].filter(
    (v) => v > 0
  ).length
  const workspaceActiveCount = [data.tasks.total, data.notes, data.projects, data.codeSnippets ?? 0].filter(
    (v) => v > 0
  ).length
  const toolkitActiveCount = [
    data.nosqlConnections,
    data.apiClientCollections,
    data.apiClientEnvironments,
    data.apiClientHistoryEntries,
    data.jsonFormatterDocuments,
  ].filter((v) => v > 0).length

  return (
    <div className="flex flex-col gap-3">
      {/* Header band */}
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
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('totalLabel')}
              </p>
              <p className="text-xl font-bold tabular-nums leading-none text-primary md:text-2xl">
                {totalCount}
              </p>
              {refreshedAt && (
                <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground/60">
                  {timeAgo(refreshedAt)}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 gap-1.5 rounded-lg px-3"
              onClick={() => void load()}
              disabled={loading}
              title="Refresh analytics"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Group 1: Vault & Bookmarks */}
      <div className="flex flex-col gap-2">
        <SectionHeader label={t('groupVault')} activeCount={vaultActiveCount} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricChip
            label={t('passwordEntries')}
            value={data.passwordEntries}
            icon={KeyRound}
            accent="from-rose-500 to-orange-500"
            href="/app/password-manager"
          />
          <MetricChip
            label={t('bookmarks')}
            value={data.bookmarks}
            icon={Bookmark}
            accent="from-sky-500 to-cyan-500"
            href="/app/bookmarks"
          />
          <MetricChip
            label={t('bookmarkFolders')}
            value={data.bookmarkFolders}
            icon={FolderOpen}
            accent="from-violet-500 to-purple-500"
            href="/app/bookmarks"
          />
        </div>
      </div>

      {/* Group 2: Workspace */}
      <div className="flex flex-col gap-2">
        <SectionHeader label={t('groupWorkspace')} activeCount={workspaceActiveCount} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <TaskCard
            tasks={tasks}
            labels={{
              title: t('tasksTotal'),
              done: t('tasksCompleted'),
              ongoing: t('tasksOngoing'),
              todo: t('tasksNotStarted'),
              empty: t('taskMixEmpty'),
            }}
          />
          <MetricChip
            label={t('notes')}
            value={data.notes}
            icon={StickyNote}
            accent="from-amber-500 to-yellow-500"
            href="/app/notes"
          />
          <MetricChip
            label={t('projects')}
            value={data.projects}
            icon={Briefcase}
            accent="from-blue-500 to-indigo-600"
            href="/app/to-do"
          />
          <MetricChip
            label={t('codeSnippets')}
            value={data.codeSnippets ?? 0}
            icon={Code2}
            accent="from-lime-500 to-green-600"
            href="/app/snippet-manager"
          />
        </div>
      </div>

      {/* Group 3: Developer Toolkit */}
      <div className="flex flex-col gap-2">
        <SectionHeader label={t('groupToolkit')} activeCount={toolkitActiveCount} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricChip
            label={t('nosqlConnections')}
            value={data.nosqlConnections}
            icon={Database}
            accent="from-emerald-500 to-teal-500"
            href="/app/nosql-explorer"
          />
          <MetricChip
            label={t('apiClientCollections')}
            value={data.apiClientCollections}
            icon={Boxes}
            accent="from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700"
            href="/app/api-client"
          />
          <MetricChip
            label={t('apiClientEnvironments')}
            value={data.apiClientEnvironments}
            icon={Server}
            accent="from-fuchsia-500 to-pink-500"
            href="/app/api-client"
          />
          <MetricChip
            label={t('apiClientHistory')}
            value={data.apiClientHistoryEntries}
            icon={History}
            accent="from-orange-500 to-red-500"
            href="/app/api-client"
          />
          <MetricChip
            label={t('jsonFormatterDocuments')}
            value={data.jsonFormatterDocuments}
            icon={Braces}
            accent="from-cyan-500 to-blue-600"
            href="/app/json-formatter"
          />
        </div>
      </div>
    </div>
  )
}
