import { getAllToolsMetadata } from '@/lib/tools-registry'

export type AuditChange = { field: string; before: unknown; after: unknown }
export type AuditDevice = { browser: string; os: string; device_type: string }

export type AuditEvent = {
  id: string
  uid: string | null
  action: string
  module: string | null
  entity_type: string | null
  entity_id: string | null
  method: string
  path: string
  status: number
  outcome: 'success' | 'failure'
  changes: AuditChange[] | null
  summary: string | null
  ip: string | null
  ua_raw: string | null
  device: AuditDevice | null
  latency_ms: number
  ts: number
}

export type AuditListResponse = {
  items: AuditEvent[]
  total: number
  skip: number
  limit: number
}

export type AuditQuery = {
  skip?: number
  limit?: number
  module?: string
  action?: string
  outcome?: 'success' | 'failure'
  from?: number
  to?: number
  search?: string
}

// Local activity source: the append-only tool-launch log written by useToolUsage.
const USAGE_STORAGE_KEY = 'tool-usage-history'

type Usage = { toolId: string; url: string; timestamp: number }

function readUsage(): Usage[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(USAGE_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is Usage =>
        !!e &&
        typeof e === 'object' &&
        typeof (e as Usage).url === 'string' &&
        typeof (e as Usage).timestamp === 'number' &&
        Number.isFinite((e as Usage).timestamp),
    )
  } catch {
    return []
  }
}

// url -> { title, group }. Built lazily from the static sidebar registry.
let toolIndex: { exact: Map<string, { title: string; group: string }>; list: { url: string; title: string; group: string }[] } | null = null

function resolveTool(url: string): { title: string; group: string } | undefined {
  if (!toolIndex) {
    const exact = new Map<string, { title: string; group: string }>()
    const list: { url: string; title: string; group: string }[] = []
    for (const t of getAllToolsMetadata()) {
      const meta = { title: t.title, group: t.category.split(' > ')[0] }
      exact.set(t.url, meta)
      list.push({ url: t.url, ...meta })
    }
    toolIndex = { exact, list }
  }
  return (
    toolIndex.exact.get(url) ??
    // Fall back to suffix match so locale-prefixed paths (/en/app/...) still resolve.
    toolIndex.list.find((t) => t.url.length > 1 && url.endsWith(t.url))
  )
}

function titleFromUrl(url: string): string {
  const slug = url.split('?')[0].replace(/\/+$/, '').split('/').pop() || 'tool'
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function toEvent(u: Usage): AuditEvent {
  const meta = resolveTool(u.url)
  const title = meta?.title ?? titleFromUrl(u.url)
  return {
    id: `${u.toolId}-${u.timestamp}`,
    uid: null,
    action: 'tool.open',
    module: meta?.group ?? null,
    entity_type: 'tool',
    entity_id: u.toolId,
    method: 'GET',
    path: u.url,
    status: 200,
    outcome: 'success',
    changes: null,
    summary: `Opened ${title}`,
    ip: null,
    ua_raw: null,
    device: null,
    latency_ms: 0,
    ts: u.timestamp,
  }
}

/** Top-level tool groups — used to populate the activity module filter. */
export function auditModules(): string[] {
  return Array.from(new Set(getAllToolsMetadata().map((t) => t.category.split(' > ')[0])))
}

/**
 * Read the local activity log (tool launches from localStorage), applying the
 * same filters/pagination the old backend endpoint did. Async signature kept so
 * callers don't change.
 */
export async function fetchAuditLog(query: AuditQuery = {}): Promise<AuditListResponse> {
  const { skip = 0, limit = 50, module, outcome, from, to, search } = query

  let events = readUsage()
    .map(toEvent)
    .sort((a, b) => b.ts - a.ts)

  if (module) events = events.filter((e) => e.module === module)
  if (outcome) events = events.filter((e) => e.outcome === outcome)
  if (from != null) events = events.filter((e) => e.ts >= from)
  if (to != null) events = events.filter((e) => e.ts <= to)
  if (search) {
    const q = search.toLowerCase()
    events = events.filter(
      (e) =>
        (e.summary ?? '').toLowerCase().includes(q) ||
        e.path.toLowerCase().includes(q) ||
        (e.module ?? '').toLowerCase().includes(q),
    )
  }

  const total = events.length
  return { items: events.slice(skip, skip + limit), total, skip, limit }
}
