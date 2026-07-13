/**
 * Pure helpers for the Webhook Tester tool (no React).
 */

export interface WebhookBin {
  binId: string
  createdAt: string
  expiresAt: string
}

export interface RecordedRequest {
  id: string
  method: string
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: string
  body_encoding: 'text' | 'base64'
  body_truncated: boolean
  content_type: string | null
  size: number
  source_ip: string | null
  received_at: string
}

/** Public receive URL for a bin (FastAPI mounts the API under /api/v1). */
export function buildReceiveUrl(baseUrl: string, binId: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/v1/webhook-tester/in/${binId}`
}

/** Sample curl command for the empty state. */
export function buildCurlExample(url: string): string {
  return `curl -X POST '${url}' -H 'Content-Type: application/json' -d '{"hello":"world"}'`
}

/** Human-readable byte size: 0 B, 812 B, 1.2 KB, 3.4 MB. */
export function formatRequestSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${trimDecimal(kb)} KB`
  return `${trimDecimal(kb / 1024)} MB`
}

function trimDecimal(value: number): string {
  const fixed = value.toFixed(1)
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
}

/** Tailwind classes per HTTP method (badge coloring). */
export function methodColor(method: string): { text: string; bg: string } {
  switch (method.toUpperCase()) {
    case 'GET':
      return { text: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' }
    case 'POST':
      return { text: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' }
    case 'PUT':
      return { text: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' }
    case 'PATCH':
      return { text: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' }
    case 'DELETE':
      return { text: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' }
    case 'HEAD':
      return { text: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' }
    case 'OPTIONS':
      return { text: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20' }
    default:
      return { text: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' }
  }
}

/** Short relative time: "just now", "42s ago", "5m ago", "3h ago", "2d ago". */
export function relativeTime(iso: string, nowMs: number = Date.now()): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return ''
  const seconds = Math.floor((nowMs - ts) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/** True when the bin's expiry timestamp has passed (or is unparseable). */
export function isBinExpired(expiresAt: string, nowMs: number = Date.now()): boolean {
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts)) return true
  return ts <= nowMs
}

/** Remaining lifetime: "23h 59m", "45m", "<1m", or "expired". */
export function formatCountdown(expiresAt: string, nowMs: number = Date.now()): string {
  const ts = Date.parse(expiresAt)
  if (Number.isNaN(ts) || ts <= nowMs) return 'expired'
  const totalMinutes = Math.floor((ts - nowMs) / 60000)
  if (totalMinutes < 1) return '<1m'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

/** Pretty-printed JSON when the text is valid JSON, otherwise null. */
export function tryPrettyJson(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || (!'[{"-0123456789tfn'.includes(trimmed[0]))) return null
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return null
  }
}
