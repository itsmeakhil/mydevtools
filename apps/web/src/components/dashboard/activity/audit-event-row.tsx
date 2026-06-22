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

/** Verb segment of an action ("create", "post", "login", …) → human label. */
const VERB_LABELS: Record<string, string> = {
  create: 'Created',
  add: 'Added',
  post: 'Created',
  update: 'Updated',
  patch: 'Updated',
  edit: 'Updated',
  put: 'Saved',
  delete: 'Deleted',
  remove: 'Deleted',
  move: 'Moved',
  import: 'Imported',
  export: 'Exported',
  get: 'Viewed',
  login: 'Signed in',
  logout: 'Signed out',
  register: 'Created account',
  token_refresh: 'Refreshed session',
  'clear-all': 'Cleared all',
}

/** Module segment → friendly singular noun. */
const MODULE_NOUNS: Record<string, string> = {
  'bookmark-folders': 'folder',
  'bookmark_folders': 'folder',
  'code_snippets': 'snippet',
  'code-snippets': 'snippet',
  'api-client': 'API request',
  'api_client': 'API request',
  'user-preferences': 'preferences',
  'user_preferences': 'preferences',
  'sql-client': 'SQL connection',
  'sql_client': 'SQL connection',
  'environment-manager': 'environment',
  'environment_manager': 'environment',
  'url-shortener': 'short link',
  'game-scores': 'game score',
  nosql: 'database connection',
  passwords: 'password',
  bookmarks: 'bookmark',
  tasks: 'task',
  notes: 'note',
  projects: 'project',
  feedback: 'feedback',
}

function prettyModule(mod: string | null): string {
  if (!mod) return 'item'
  if (MODULE_NOUNS[mod]) return MODULE_NOUNS[mod]
  return mod.replace(/[-_]/g, ' ').replace(/s$/, '')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Human title for an event when no server summary is set. */
function describeAction(event: AuditEvent): string {
  const action = event.action || ''
  const dot = action.indexOf('.')
  const mod = dot > -1 ? action.slice(0, dot) : event.module
  const verb = dot > -1 ? action.slice(dot + 1) : event.method.toLowerCase()
  const verbLabel = VERB_LABELS[verb]

  if (mod === 'auth') {
    return verbLabel || capitalize(verb.replace(/_/g, ' '))
  }
  if (verbLabel) return `${verbLabel} ${prettyModule(mod)}`
  return capitalize(prettyModule(mod))
}

/** Friendly category chip ("Bookmarks", "Account", …). */
function categoryLabel(event: AuditEvent): string {
  const mod = event.module
  if (mod === 'auth') return 'Account'
  if (!mod) return 'Activity'
  return capitalize(mod.replace(/[-_]/g, ' '))
}

export function AuditEventRow({ event }: { event: AuditEvent }) {
  const t = useTranslations('Dashboard.activity')
  const [open, setOpen] = useState(false)
  const hasChanges = !!event.changes && event.changes.length > 0
  const device = event.device
    ? `${event.device.browser} on ${event.device.os}`
    : '—'
  const title = event.summary?.trim() || describeAction(event)
  const category = categoryLabel(event)

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
            <span className="text-xs font-medium text-muted-foreground">{category}</span>
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
          {/* Meaningful description: server summary, else a humanized verb+noun. Never the raw API URL. */}
          <div className="truncate text-sm font-medium">{title}</div>
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
