/**
 * Pure helpers for the WebSocket Tester tool.
 * No React, no side effects — everything here is unit-testable.
 */

export type LogDirection = 'sent' | 'received' | 'system'

export interface LogEntry {
  direction: LogDirection
  text: string
  /** Epoch milliseconds. */
  timestamp: number
}

const DIRECTION_TAG: Record<LogDirection, string> = {
  sent: 'SENT',
  received: 'RECV',
  system: 'SYS ',
}

/** Format a timestamp as HH:MM:SS.mmm (local time). */
export function formatLogTimestamp(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

/**
 * Render a single log entry as one line of plain text,
 * used for "copy all" and the .txt download.
 */
export function formatLogEntry(entry: LogEntry): string {
  return `[${formatLogTimestamp(entry.timestamp)}] [${DIRECTION_TAG[entry.direction]}] ${entry.text}`
}

/**
 * If `text` is valid JSON (object or array), return it pretty-printed with
 * 2-space indentation. Returns null for anything else (including JSON
 * primitives, where pretty-printing adds nothing).
 */
export function tryPrettyJson(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (parsed === null || typeof parsed !== 'object') return null
    return JSON.stringify(parsed, null, 2)
  } catch {
    return null
  }
}

/** Well-known WebSocket close codes (RFC 6455 + convention). */
export const CLOSE_CODE_NAMES: Record<number, string> = {
  1000: 'Normal Closure',
  1001: 'Going Away',
  1002: 'Protocol Error',
  1003: 'Unsupported Data',
  1005: 'No Status Received',
  1006: 'Abnormal Closure',
  1007: 'Invalid Frame Payload Data',
  1008: 'Policy Violation',
  1009: 'Message Too Big',
  1010: 'Mandatory Extension',
  1011: 'Internal Error',
  1015: 'TLS Handshake Failure',
}

/**
 * Human-readable description of a close event, e.g.
 * `Connection closed: 1006 (Abnormal Closure) — server went away`.
 */
export function describeCloseEvent(code: number, reason?: string): string {
  const name = CLOSE_CODE_NAMES[code]
  const codePart = name ? `${code} (${name})` : `${code}`
  const reasonPart = reason && reason.trim() ? ` — ${reason.trim()}` : ''
  return `Connection closed: ${codePart}${reasonPart}`
}

/**
 * Parse a comma-separated subprotocol list into a clean array:
 * trimmed, empties dropped, duplicates removed (order preserved).
 */
export function parseProtocols(input: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of input.split(',')) {
    const p = raw.trim()
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push(p)
  }
  return out
}

/** Validate a WebSocket URL (ws:// or wss:// only). */
export function isValidWsUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    return url.protocol === 'ws:' || url.protocol === 'wss:'
  } catch {
    return false
  }
}
