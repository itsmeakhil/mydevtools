import { backendFetch } from '@/lib/backend-auth'

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

export async function fetchAuditLog(query: AuditQuery = {}): Promise<AuditListResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const url = `/api/backend/audit-log${qs ? `?${qs}` : ''}`
  const res = await backendFetch(url, { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Audit log failed (${res.status})`)
  }
  return (await res.json()) as AuditListResponse
}
