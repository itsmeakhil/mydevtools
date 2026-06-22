'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { AuditEvent } from '@/lib/audit-log-api'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(ts).toLocaleDateString()
}

export function AuditEventRow({ event }: { event: AuditEvent }) {
  const t = useTranslations('Dashboard.activity')
  const [open, setOpen] = useState(false)
  const hasChanges = !!event.changes && event.changes.length > 0
  const device = event.device
    ? `${event.device.browser} on ${event.device.os}`
    : '—'

  return (
    <div className="border-b border-border py-3">
      <button
        type="button"
        onClick={() => hasChanges && setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={hasChanges ? open : undefined}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{event.action}</span>
            <span
              className={
                event.outcome === 'success'
                  ? 'text-xs text-emerald-600'
                  : 'text-xs text-red-600'
              }
            >
              {event.outcome === 'success' ? t('success') : t('failure')}
            </span>
          </div>
          <div className="truncate text-sm">{event.summary || event.path}</div>
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground">
          <div>{device}</div>
          <div className="tabular-nums">{relativeTime(event.ts)}</div>
        </div>
      </button>

      {open && hasChanges && (
        <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
          <div className="mb-1 font-medium">{t('changedFields')}</div>
          <ul className="space-y-1">
            {event.changes!.map((c) => (
              <li key={c.field} className="flex flex-wrap gap-1">
                <span className="font-mono">{c.field}:</span>
                <span className="text-muted-foreground">{String(c.before ?? '∅')}</span>
                <span>→</span>
                <span>{String(c.after ?? '∅')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
