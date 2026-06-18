'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Eye,
  EyeOff,
  FolderOpen,
  History,
  KeyRound,
  ListTodo,
  RefreshCw,
  Server,
  StickyNote,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  fetchDashboardAnalyticsSummary,
  type DashboardAnalyticsSummary,
} from '@/lib/dashboard-analytics-api'
import { sidebarData } from '@/components/sidebar/data/sidebar-data'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Resolve a "groupIndex-itemIndex[-subIndex]" id to a ToolItem
function findToolById(id: string): { title: string; icon?: React.ElementType } | undefined {
  const parts = id.split('-').map(Number)
  if (parts.some(isNaN) || parts.length < 2) return undefined
  const [gi, ii, si] = parts
  const group = sidebarData.navGroups[gi]
  if (!group) return undefined
  const item = group.items[ii]
  if (!item) return undefined
  if (si !== undefined) {
    const sub = item.items?.[si]
    return sub ? { title: sub.title, icon: (sub.icon ?? item.icon) as React.ElementType | undefined } : undefined
  }
  return { title: item.title, icon: item.icon as React.ElementType | undefined }
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 550): number {
  const [count, setCount] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (target === from) return
    const start = Date.now()
    let raf: number
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out-cubic
      setCount(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return count
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Section header ───────────────────────────────────────────────────────────

type GroupColor = 'rose' | 'amber' | 'cyan' | 'default'

const groupColorMap: Record<GroupColor, string> = {
  rose:    'text-rose-500  bg-rose-500/10  border-rose-500/20',
  amber:   'text-amber-500 bg-amber-500/10 border-amber-500/20',
  cyan:    'text-cyan-500  bg-cyan-500/10  border-cyan-500/20',
  default: 'text-primary   bg-primary/10   border-primary/20',
}

function SectionHeader({
  label,
  activeCount,
  color = 'default',
}: {
  label: string
  activeCount: number
  color?: GroupColor
}) {
  const cls = groupColorMap[color]
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={cn('text-[10px] font-bold uppercase tracking-widest', cls.split(' ')[0])}>
        {label}
      </span>
      <div className="h-px flex-1 bg-border/40" />
      {activeCount > 0 && (
        <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-bold tabular-nums', cls)}>
          {activeCount}
        </span>
      )}
    </div>
  )
}

// ─── Metric chip ──────────────────────────────────────────────────────────────

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
  const display = useCountUp(value)
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
          {display}
        </p>
      </div>
    </Link>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
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
          {/* Progress bar — 8px tall */}
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
          {/* Legend */}
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

// ─── KPI strip ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  suffix = '',
  icon: Icon,
  accent,
  sub,
}: {
  label: string
  value: number
  suffix?: string
  icon: React.ElementType
  accent: string
  sub?: string
}) {
  const display = useCountUp(value)
  return (
    <div className={cn('relative flex flex-col gap-1 overflow-hidden rounded-xl border bg-card/50 px-4 py-3 shadow-sm', accent)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none tracking-tight">
        {display}{suffix}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground/70 leading-tight">{sub}</p>}
    </div>
  )
}

// ─── Top used tools ───────────────────────────────────────────────────────────

interface TopTool {
  id: string
  title: string
  icon?: React.ElementType
  count: number
  url?: string
}

function TopUsedTools({ tools }: { tools: TopTool[] }) {
  if (tools.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 py-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
          Most used locally
        </span>
        <div className="h-px flex-1 bg-border/40" />
        <TrendingUp className="h-3 w-3 text-violet-500/60" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link
              key={tool.id}
              href={tool.url ?? '/dashboard'}
              className="group flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-2.5 py-2 transition-all hover:border-violet-500/30 hover:bg-card/70 hover:-translate-y-px"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/20 to-purple-500/10 text-violet-500 ring-1 ring-violet-500/20">
                {Icon
                  ? <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  : <Zap className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold leading-tight">{tool.title}</p>
                <p className="text-[10px] tabular-nums text-muted-foreground/60">{tool.count}×</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Empty group CTA ──────────────────────────────────────────────────────────

function EmptyGroupHint({ message, href, cta }: { message: string; href: string; cta: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-dashed border-border/40 bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
    >
      <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
      <span>{message}</span>
      <span className="ml-auto shrink-0 font-medium text-primary/70">{cta} →</span>
    </Link>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function DashboardAnalyticsPanel() {
  const t = useTranslations('Dashboard.analytics')
  const [data, setData] = useState<DashboardAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)
  const [showEmpty, setShowEmpty] = useState(false)

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

  useEffect(() => { void load() }, [load])

  // Re-render "X ago" every 30s
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  void tick

  // Top used tools from localStorage
  const topUsedTools = useMemo<TopTool[]>(() => {
    try {
      const raw = localStorage.getItem('tool-usage-history')
      if (!raw) return []
      const history: { toolId: string; url?: string }[] = JSON.parse(raw)
      const counts: Record<string, number> = {}
      const urls: Record<string, string> = {}
      history.forEach((h) => {
        counts[h.toolId] = (counts[h.toolId] ?? 0) + 1
        if (h.url) urls[h.toolId] = h.url
      })
      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => {
          const found = findToolById(id)
          return {
            id,
            title: found?.title ?? id,
            icon: found?.icon,
            count,
            url: urls[id],
          }
        })
    } catch {
      return []
    }
  }, [])

  const totalCount = useMemo(() => (data ? sumTrackedItems(data) : 0), [data])
  const completionPct = useMemo(() => {
    if (!data || data.tasks.total === 0) return 0
    return Math.round((data.tasks.completed / data.tasks.total) * 100)
  }, [data])

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

  const vaultAllEmpty   = data.passwordEntries === 0 && data.bookmarks === 0 && data.bookmarkFolders === 0
  const workspaceAllEmpty = data.tasks.total === 0 && data.notes === 0 && data.projects === 0 && (data.codeSnippets ?? 0) === 0
  const toolkitAllEmpty = data.nosqlConnections === 0 && data.apiClientCollections === 0 && data.apiClientEnvironments === 0 && data.apiClientHistoryEntries === 0 && data.jsonFormatterDocuments === 0

  const vaultActiveCount     = [data.passwordEntries, data.bookmarks, data.bookmarkFolders].filter((v) => v > 0).length
  const workspaceActiveCount = [data.tasks.total, data.notes, data.projects, data.codeSnippets ?? 0].filter((v) => v > 0).length
  const toolkitActiveCount   = [data.nosqlConnections, data.apiClientCollections, data.apiClientEnvironments, data.apiClientHistoryEntries, data.jsonFormatterDocuments].filter((v) => v > 0).length

  const vaultChips = [
    { label: t('passwordEntries'), value: data.passwordEntries, icon: KeyRound,   accent: 'from-rose-500 to-orange-500',    href: '/app/password-manager' },
    { label: t('bookmarks'),        value: data.bookmarks,       icon: Bookmark,   accent: 'from-sky-500 to-cyan-500',       href: '/app/bookmarks' },
    { label: t('bookmarkFolders'), value: data.bookmarkFolders, icon: FolderOpen, accent: 'from-violet-500 to-purple-500',  href: '/app/bookmarks' },
  ]

  const workspaceChips = [
    { label: t('notes'),        value: data.notes,            icon: StickyNote, accent: 'from-amber-500 to-yellow-500', href: '/app/notes' },
    { label: t('projects'),     value: data.projects,         icon: Briefcase,  accent: 'from-blue-500 to-indigo-600',  href: '/app/to-do' },
    { label: t('codeSnippets'), value: data.codeSnippets ?? 0, icon: Code2,     accent: 'from-lime-500 to-green-600',   href: '/app/snippet-manager' },
  ]

  const toolkitChips = [
    { label: t('nosqlConnections'),        value: data.nosqlConnections,        icon: Database, accent: 'from-emerald-500 to-teal-500',                                       href: '/app/database-explorer' },
    { label: t('apiClientCollections'),    value: data.apiClientCollections,    icon: Boxes,    accent: 'from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700', href: '/app/api-client' },
    { label: t('apiClientEnvironments'),   value: data.apiClientEnvironments,   icon: Server,   accent: 'from-fuchsia-500 to-pink-500',                                      href: '/app/api-client' },
    { label: t('apiClientHistory'),        value: data.apiClientHistoryEntries, icon: History,  accent: 'from-orange-500 to-red-500',                                        href: '/app/api-client' },
    { label: t('jsonFormatterDocuments'),  value: data.jsonFormatterDocuments,  icon: Braces,   accent: 'from-cyan-500 to-blue-600',                                         href: '/app/json-formatter' },
  ]

  const visibleVault     = showEmpty ? vaultChips     : vaultChips.filter((c) => c.value > 0)
  const visibleWorkspace = showEmpty ? workspaceChips : workspaceChips.filter((c) => c.value > 0)
  const visibleToolkit   = showEmpty ? toolkitChips   : toolkitChips.filter((c) => c.value > 0)

  return (
    <div className="flex flex-col gap-4">

      {/* ── 3-KPI summary strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard
          label={t('totalLabel')}
          value={totalCount}
          icon={BarChart3}
          accent="border-primary/20"
          sub={refreshedAt ? timeAgo(refreshedAt) : undefined}
        />
        <KpiCard
          label="Task completion"
          value={completionPct}
          suffix="%"
          icon={ListTodo}
          accent="border-emerald-500/20"
          sub={tasks.total > 0 ? `${tasks.completed} of ${tasks.total}` : 'No tasks yet'}
        />
        <KpiCard
          label="Tools used locally"
          value={topUsedTools.length}
          icon={Zap}
          accent="border-violet-500/20"
          sub={topUsedTools.length > 0 ? `Top: ${topUsedTools[0]?.title ?? '—'}` : 'No history yet'}
        />
      </div>

      {/* ── Header strip ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
            <span className="relative flex h-1 w-1">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-40" />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-primary" />
            </span>
            {t('heroBadge')}
          </span>
          <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground"
            onClick={() => setShowEmpty((v) => !v)}
            title={showEmpty ? 'Hide empty categories' : 'Show empty categories'}
          >
            {showEmpty
              ? <><EyeOff className="h-3.5 w-3.5" /><span className="hidden sm:inline">Hide empty</span></>
              : <><Eye     className="h-3.5 w-3.5" /><span className="hidden sm:inline">Show empty</span></>
            }
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 rounded-lg px-2"
            onClick={() => void load()}
            disabled={loading}
            title="Refresh analytics"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Group 1: Vault & Bookmarks ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader label={t('groupVault')} activeCount={vaultActiveCount} color="rose" />
        {vaultAllEmpty && !showEmpty ? (
          <EmptyGroupHint
            message="No vault data yet — save passwords or bookmarks to see stats."
            href="/app/password-manager"
            cta="Open vault"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(showEmpty ? vaultChips : visibleVault).map((c) => (
              <MetricChip key={c.label} {...c} />
            ))}
          </div>
        )}
      </div>

      {/* ── Group 2: Workspace ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader label={t('groupWorkspace')} activeCount={workspaceActiveCount} color="amber" />
        {workspaceAllEmpty && !showEmpty ? (
          <EmptyGroupHint
            message="No workspace data yet — create notes, tasks, or snippets."
            href="/app/to-do"
            cta="Open tasks"
          />
        ) : (
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
            {(showEmpty ? workspaceChips : visibleWorkspace).map((c) => (
              <MetricChip key={c.label} {...c} />
            ))}
          </div>
        )}
      </div>

      {/* ── Group 3: Developer Toolkit ───────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <SectionHeader label={t('groupToolkit')} activeCount={toolkitActiveCount} color="cyan" />
        {toolkitAllEmpty && !showEmpty ? (
          <EmptyGroupHint
            message="No toolkit data yet — connect a DB, create API collections, or save JSON docs."
            href="/app/api-client"
            cta="Open API client"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(showEmpty ? toolkitChips : visibleToolkit).map((c) => (
              <MetricChip key={c.label} {...c} />
            ))}
          </div>
        )}
      </div>

      {/* ── Top used tools ───────────────────────────────────────────────── */}
      <TopUsedTools tools={topUsedTools} />
    </div>
  )
}
