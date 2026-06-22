'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { fetchAuditLog, type AuditEvent } from '@/lib/audit-log-api'
import { AuditEventRow } from './audit-event-row'

const PAGE = 50

export function ActivityLogPanel({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('Dashboard.activity')
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [outcome, setOutcome] = useState<'' | 'success' | 'failure'>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const nextSkip = reset ? 0 : skip
        const res = await fetchAuditLog({
          skip: nextSkip,
          limit: PAGE,
          outcome: outcome || undefined,
          search: search || undefined,
        })
        setTotal(res.total)
        setSkip(nextSkip + res.items.length)
        setEvents((prev) => (reset ? res.items : [...prev, ...res.items]))
      } catch (e) {
        setError(e instanceof Error ? e.message : t('loadError'))
      } finally {
        setLoading(false)
      }
    },
    [skip, outcome, search, t],
  )

  useEffect(() => {
    void load(true)
    // reload when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, search])

  const filters = (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label={t('filterOutcome')}
        value={outcome}
        onChange={(e) => setOutcome(e.target.value as '' | 'success' | 'failure')}
        className="rounded-md border border-border bg-background px-2 py-1 text-sm"
      >
        <option value="">{t('all')}</option>
        <option value="success">{t('success')}</option>
        <option value="failure">{t('failure')}</option>
      </select>
      <input
        aria-label={t('search')}
        placeholder={t('search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
      />
    </div>
  )

  const list = (
    <>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!error && events.length === 0 && !loading && (
        <div className="text-sm text-muted-foreground">{t('empty')}</div>
      )}

      <div>
        {events.map((e) => (
          <AuditEventRow key={e.id} event={e} />
        ))}
      </div>

      {events.length < total && (
        <button
          type="button"
          onClick={() => void load(false)}
          disabled={loading}
          className="mt-4 rounded-md border border-border px-3 py-1.5 text-sm"
        >
          {t('loadMore')}
        </button>
      )}
    </>
  )

  // Drawer variant: fills the sheet, filters pinned, list scrolls.
  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 pb-3">{filters}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t('subtitle')}</p>
      <div className="mb-4">{filters}</div>
      {list}
    </div>
  )
}
