/**
 * Pure helpers for the Whois Lookup tool.
 * No React, no network — everything here is unit-testable.
 */

export type TargetType = 'domain' | 'ip'

export interface NormalizedTarget {
  target: string
  type: TargetType
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export function isIPv4(value: string): boolean {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false
    if (p.length > 1 && p[0] === '0') return false // no leading zeros
    return Number(p) <= 255
  })
}

export function isIPv6(value: string): boolean {
  if (!value.includes(':')) return false
  const halves = value.split('::')
  if (halves.length > 2) return false
  const toGroups = (part: string) => (part === '' ? [] : part.split(':'))
  const head = toGroups(halves[0])
  const tail = halves.length === 2 ? toGroups(halves[1]) : []
  const groups = [...head, ...tail]
  if (halves.length === 1 && groups.length !== 8) return false
  if (halves.length === 2 && groups.length >= 8) return false
  return groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))
}

/**
 * Normalize user input into a lookup target:
 * strips scheme / path / query / trailing dot / port, lowercases,
 * and detects whether it is an IP address or a domain name.
 * Returns null when the input is neither.
 */
export function normalizeTarget(input: string): NormalizedTarget | null {
  let target = input.trim()
  target = target.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '') // scheme
  target = target.split('/')[0].split('?')[0].split('#')[0] // path/query/hash
  target = target.trim().replace(/^\.+|\.+$/g, '').toLowerCase()
  if (target.startsWith('[') && target.endsWith(']')) target = target.slice(1, -1)

  if (!target || target.length > 253) return null

  if (isIPv4(target) || isIPv6(target)) return { target, type: 'ip' }

  // Not an IP — drop a :port suffix, then validate as a domain.
  const host = /:\d+$/.test(target) ? target.replace(/:\d+$/, '') : target
  if (DOMAIN_RE.test(host)) return { target: host, type: 'domain' }

  return null
}

const RELATIVE_UNITS: { unit: string; ms: number }[] = [
  { unit: 'year', ms: 365 * 24 * 3600 * 1000 },
  { unit: 'month', ms: 30 * 24 * 3600 * 1000 },
  { unit: 'day', ms: 24 * 3600 * 1000 },
  { unit: 'hour', ms: 3600 * 1000 },
  { unit: 'minute', ms: 60 * 1000 },
]

/**
 * Human-readable relative age for an ISO date string, e.g.
 * "28 years ago" or "in 2 months". Returns null for unparseable input.
 */
export function relativeTime(iso: string, now: Date = new Date()): string | null {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return null
  const diff = ts - now.getTime()
  const abs = Math.abs(diff)
  if (abs < 60 * 1000) return 'just now'
  for (const { unit, ms } of RELATIVE_UNITS) {
    if (abs >= ms) {
      const n = Math.round(abs / ms)
      const label = `${n} ${unit}${n === 1 ? '' : 's'}`
      return diff < 0 ? `${label} ago` : `in ${label}`
    }
  }
  return 'just now'
}

/** Format an ISO date string as a compact UTC date, e.g. "1995-08-14". Null if invalid. */
export function formatIsoDate(iso: string): string | null {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return null
  return new Date(ts).toISOString().slice(0, 10)
}
