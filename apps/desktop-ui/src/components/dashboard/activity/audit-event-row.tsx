'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Activity,
  Bookmark,
  ChevronDown,
  Code2,
  Database,
  FileText,
  Folder,
  KeyRound,
  Layers,
  ListTodo,
  Lock,
  MessageSquare,
  Monitor,
  Server,
  Settings,
  Smartphone,
  Tablet,
  UserCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AuditEvent } from '@/lib/audit-log-api'

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

function absoluteTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

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

const MODULE_NOUNS: Record<string, string> = {
  'bookmark-folders': 'folder',
  bookmark_folders: 'folder',
  code_snippets: 'snippet',
  'code-snippets': 'snippet',
  'api-client': 'API request',
  api_client: 'API request',
  'user-preferences': 'preferences',
  user_preferences: 'preferences',
  'sql-client': 'SQL connection',
  sql_client: 'SQL connection',
  'environment-manager': 'environment',
  environment_manager: 'environment',
  nosql: 'database connection',
  passwords: 'password',
  bookmarks: 'bookmark',
  tasks: 'task',
  notes: 'note',
  projects: 'project',
  feedback: 'feedback',
}

type IconCmp = React.ComponentType<{ className?: string }>

// Neutral icons per module — color is reserved for meaning (outcome/status).
const MODULE_ICON: Record<string, IconCmp> = {
  auth: UserCircle2,
  bookmarks: Bookmark,
  'bookmark-folders': Folder,
  bookmark_folders: Folder,
  notes: FileText,
  tasks: ListTodo,
  passwords: Lock,
  'code-snippets': Code2,
  code_snippets: Code2,
  'api-client': Server,
  api_client: Server,
  'sql-client': Database,
  sql_client: Database,
  nosql: Database,
  'environment-manager': Layers,
  environment_manager: Layers,
  'user-preferences': Settings,
  user_preferences: Settings,
  projects: Folder,
  feedback: MessageSquare,
  passwords_session: KeyRound,
}

function iconFor(mod: string | null): IconCmp {
  if (!mod) return Activity
  return MODULE_ICON[mod] ?? Activity
}

function renderDeviceIcon(type: string | undefined, className: string) {
  if (type === 'mobile') return <Smartphone className={className} aria-hidden />
  if (type === 'tablet') return <Tablet className={className} aria-hidden />
  return <Monitor className={className} aria-hidden />
}

function prettyModule(mod: string | null): string {
  if (!mod) return 'item'
  if (MODULE_NOUNS[mod]) return MODULE_NOUNS[mod]
  return mod.replace(/[-_]/g, ' ').replace(/s$/, '')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function describeAction(event: AuditEvent): string {
  const action = event.action || ''
  const dot = action.indexOf('.')
  const mod = dot > -1 ? action.slice(0, dot) : event.module
  const verb = dot > -1 ? action.slice(dot + 1) : event.method.toLowerCase()
  const verbLabel = VERB_LABELS[verb]
  if (mod === 'auth') return verbLabel || capitalize(verb.replace(/_/g, ' '))
  if (verbLabel) return `${verbLabel} ${prettyModule(mod)}`
  return capitalize(prettyModule(mod))
}

function categoryLabel(event: AuditEvent): string {
  const mod = event.module
  if (mod === 'auth') return 'Account'
  if (!mod) return 'Activity'
  return capitalize(mod.replace(/[-_]/g, ' '))
}

function statusTone(status: number): string {
  if (status >= 500) return 'text-destructive'
  if (status >= 400) return 'text-warning'
  if (status >= 300) return 'text-primary'
  return 'text-success'
}

export function AuditEventRow({ event }: { event: AuditEvent }) {
  const t = useTranslations('Dashboard.activity')
  const [open, setOpen] = useState(false)

  const hasChanges = !!event.changes && event.changes.length > 0
  const title = event.summary?.trim() || describeAction(event)
  const category = categoryLabel(event)
  const Icon = iconFor(event.module)
  const deviceType = event.device?.device_type
  const success = event.outcome === 'success'

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.04] focus:outline-none"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.05] text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              {category}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                success
                  ? 'bg-success/[0.12] text-success'
                  : 'bg-destructive/[0.12] text-destructive',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  success ? 'bg-success' : 'bg-destructive',
                )}
                aria-hidden
              />
              {success ? t('success') : t('failure')}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[13px] font-medium text-foreground">
            {title}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
            <div className="inline-flex items-center gap-1">
              {renderDeviceIcon(deviceType, 'h-3 w-3')}
              <span className="truncate max-w-[120px]">
                {event.device ? event.device.browser : '—'}
              </span>
            </div>
            <div className="tabular-nums">{relativeTime(event.ts)}</div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </div>
      </button>

      {open && (
        <div className="mb-2 ml-11 mr-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Field label={t('when')}>
              <span className="tabular-nums">{absoluteTime(event.ts)}</span>
            </Field>
            <Field label={t('status')}>
              <span className={cn('font-mono tabular-nums', statusTone(event.status))}>
                {event.method} · {event.status}
              </span>
            </Field>
            <Field label={t('endpoint')} className="sm:col-span-2">
              <span className="break-all font-mono text-[11px] text-muted-foreground">
                {event.path}
              </span>
            </Field>
            <Field label={t('latency')}>
              <span className="tabular-nums">{event.latency_ms} ms</span>
            </Field>
            <Field label={t('actionKey')}>
              <span className="break-all font-mono text-[11px]">
                {event.action || '—'}
              </span>
            </Field>
            <Field label={t('device')}>
              <span className="inline-flex items-center gap-1">
                {renderDeviceIcon(deviceType, 'h-3 w-3')}
                {event.device
                  ? `${event.device.browser} · ${event.device.os}`
                  : '—'}
              </span>
            </Field>
            <Field label={t('ipAddress')}>
              <span className="font-mono">{event.ip || '—'}</span>
            </Field>
          </dl>

          {hasChanges && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-2 text-[11px] font-semibold text-muted-foreground">
                {t('changedFields')}
              </div>
              <ul className="space-y-1.5">
                {event.changes!.map((c) => (
                  <li
                    key={c.field}
                    className="grid grid-cols-[max-content,1fr] gap-x-3 gap-y-0.5"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.field}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <code className="rounded bg-destructive/10 px-1 py-0.5 text-destructive line-through">
                        {String(c.before ?? '∅')}
                      </code>
                      <span className="text-muted-foreground">→</span>
                      <code className="rounded bg-success/10 px-1 py-0.5 text-success">
                        {String(c.after ?? '∅')}
                      </code>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{children}</dd>
    </div>
  )
}
