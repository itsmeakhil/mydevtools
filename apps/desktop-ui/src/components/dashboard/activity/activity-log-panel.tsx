'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Activity,
  CheckCircle2,
  Filter,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { auditModules, fetchAuditLog, type AuditEvent } from '@/lib/audit-log-api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AuditEventRow } from './audit-event-row'

const PAGE = 50
const DAY_MS = 86_400_000

type Outcome = '' | 'success' | 'failure'
type Range = 'all' | 'today' | '7d' | '30d'

// Local activity is grouped by tool category, not backend module.
const MODULE_OPTIONS: string[] = auditModules()

function rangeBounds(range: Range): { from?: number; to?: number } {
  if (range === 'all') return {}
  const now = Date.now()
  if (range === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return { from: start.getTime(), to: now }
  }
  if (range === '7d') return { from: now - 7 * DAY_MS, to: now }
  return { from: now - 30 * DAY_MS, to: now }
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function dayLabel(key: string, t: (k: string) => string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = today.toISOString().slice(0, 10)
  const yest = new Date(today.getTime() - DAY_MS).toISOString().slice(0, 10)
  if (key === todayKey) return t('today')
  if (key === yest) return t('yesterday')
  return new Date(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year:
      new Date(key).getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

export function ActivityLogPanel({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('Dashboard.activity')
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)

  const [outcome, setOutcome] = useState<Outcome>('')
  const [module, setModule] = useState<string>('')
  const [range, setRange] = useState<Range>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Debounce search 250ms.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => window.clearTimeout(id)
  }, [searchInput])

  const filtersKey = `${outcome}|${module}|${range}|${search}`

  const load = useCallback(
    async (reset: boolean, currentSkip: number) => {
      setLoading(true)
      setError(null)
      try {
        const { from, to } = rangeBounds(range)
        const nextSkip = reset ? 0 : currentSkip
        const res = await fetchAuditLog({
          skip: nextSkip,
          limit: PAGE,
          outcome: outcome || undefined,
          module: module || undefined,
          from,
          to,
          search: search || undefined,
        })
        setTotal(res.total)
        setSkip(nextSkip + res.items.length)
        setEvents((prev) => (reset ? res.items : [...prev, ...res.items]))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('loadError'))
      } finally {
        setLoading(false)
        setInitialLoad(false)
      }
    },
    [outcome, module, range, search, t],
  )

  // Reload on filter change.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      void load(true, 0)
      return
    }
    setInitialLoad(true)
    void load(true, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  const activeFilterCount =
    (outcome ? 1 : 0) + (module ? 1 : 0) + (range !== 'all' ? 1 : 0) + (search ? 1 : 0)

  const resetAll = () => {
    setOutcome('')
    setModule('')
    setRange('all')
    setSearchInput('')
    setSearch('')
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEvent[]>()
    for (const ev of events) {
      const k = dayKey(ev.ts)
      const arr = map.get(k) ?? []
      arr.push(ev)
      map.set(k, arr)
    }
    return Array.from(map.entries())
  }, [events])

  const filters = (
    <div className="flex flex-col gap-2.5">
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label={t('search')}
          placeholder={t('search')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-8 pl-8 pr-8 text-[13px]"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Range — segmented control */}
      <div className="inline-flex w-fit flex-wrap rounded-[10px] bg-foreground/[0.06] p-[3px]">
        {(['all', 'today', '7d', '30d'] as Range[]).map((r) => {
          const label =
            r === 'all'
              ? t('allTime')
              : r === 'today'
                ? t('today')
                : r === '7d'
                  ? t('last7')
                  : t('last30')
          const active = range === r
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'h-7 rounded-[7px] px-2.5 text-xs font-medium transition-colors duration-150',
                active
                  ? 'bg-card text-foreground shadow-elev-1'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={active}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Outcome + module */}
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-[10px] bg-foreground/[0.06] p-[3px]">
          {(
            [
              { v: '', label: t('all'), icon: null },
              {
                v: 'success',
                label: t('success'),
                icon: <CheckCircle2 className="h-3 w-3" aria-hidden />,
              },
              {
                v: 'failure',
                label: t('failure'),
                icon: <XCircle className="h-3 w-3" aria-hidden />,
              },
            ] as { v: Outcome; label: string; icon: React.ReactNode }[]
          ).map((o) => {
            const active = outcome === o.v
            return (
              <button
                key={o.v || 'all'}
                type="button"
                onClick={() => setOutcome(o.v)}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-[7px] px-2.5 text-xs font-medium transition-colors duration-150',
                  active
                    ? cn(
                        'bg-card text-foreground shadow-elev-1',
                        o.v === 'success' && 'text-success',
                        o.v === 'failure' && 'text-destructive',
                      )
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={active}
              >
                {o.icon}
                <span>{o.label}</span>
              </button>
            )
          })}
        </div>

        <Select value={module || 'ALL'} onValueChange={(v) => setModule(v === 'ALL' ? '' : v)}>
          <SelectTrigger
            className="h-[34px] w-auto min-w-[140px] gap-1 text-xs"
            aria-label={t('filterModule')}
          >
            <Filter className="h-3 w-3 text-muted-foreground" aria-hidden />
            <SelectValue placeholder={t('filterModule')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all')}</SelectItem>
            {MODULE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="ml-auto gap-1 px-2 text-xs text-muted-foreground"
          >
            <X aria-hidden />
            {t('resetFilters')}
          </Button>
        )}
      </div>
    </div>
  )

  const skeleton = (
    <div className="space-y-2 py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  )

  const list = (
    <>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/[0.06] px-3 py-2 text-[13px] text-destructive">
          {error}
        </div>
      )}

      {initialLoad && loading && skeleton}

      {!error && !initialLoad && events.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-12 text-center shadow-elev-1">
          <Activity className="h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="text-[13px] text-muted-foreground">
            {activeFilterCount > 0 ? t('emptyFiltered') : t('empty')}
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('resetFilters')}
            </button>
          )}
        </div>
      )}

      {!initialLoad && events.length > 0 && (
        <div className="space-y-4">
          {grouped.map(([key, items]) => (
            <section key={key}>
              <div className="sticky top-0 z-10 -mx-0.5 mb-1 glass-bar px-0.5 py-1">
                <h3 className="text-[13px] font-semibold text-muted-foreground">
                  {dayLabel(key, t)}
                </h3>
              </div>
              <ul className="divide-y divide-border">
                {items.map((e) => (
                  <li key={e.id}>
                    <AuditEventRow event={e} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!initialLoad && events.length > 0 && events.length < total && (
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(false, skip)}
            disabled={loading}
          >
            {loading ? t('loadingMore') : t('loadMore')}
          </Button>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {t('showingOf', { shown: events.length, total })}
          </span>
        </div>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 pb-3">{filters}</div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{list}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <div className="mb-5 rounded-xl border border-border bg-card p-3 shadow-elev-1">
        {filters}
      </div>
      {list}
    </div>
  )
}
