/**
 * Pure timezone conversion logic built on Intl APIs.
 * No React and no calls to Date.now() — callers pass Date instances explicitly,
 * which keeps everything deterministic and testable.
 */

export interface ZoneParts {
  y: number
  m: number // 1-12
  d: number
  hh: number // 0-23
  mm: number
  weekday: string // short, e.g. "Mon"
}

interface FullParts extends ZoneParts {
  ss: number
}

const dtfCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(tz: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(tz)
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    })
    dtfCache.set(tz, dtf)
  }
  return dtf
}

function partsInZone(date: Date, tz: string): FullParts {
  const parts = getFormatter(tz).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    y: parseInt(get('year'), 10),
    m: parseInt(get('month'), 10),
    d: parseInt(get('day'), 10),
    hh: parseInt(get('hour'), 10) % 24,
    mm: parseInt(get('minute'), 10),
    ss: parseInt(get('second'), 10),
    weekday: get('weekday'),
  }
}

/** Offset of `tz` from UTC in minutes at the given instant (e.g. +330 for Asia/Kolkata). */
export function zoneOffsetMinutes(date: Date, tz: string): number {
  const p = partsInZone(date, tz)
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss)
  // strip sub-second part of the instant for a clean diff
  const instant = date.getTime() - (date.getTime() % 1000)
  return Math.round((asUtc - instant) / 60000)
}

/** Wall-clock parts of the given instant in `tz`. */
export function convertParts(date: Date, tz: string): ZoneParts {
  const { y, m, d, hh, mm, weekday } = partsInZone(date, tz)
  return { y, m, d, hh, mm, weekday }
}

/** Whole-day difference between target and source wall-clock dates (+1, 0, -1, ...). */
export function dayShift(source: ZoneParts, target: ZoneParts): number {
  const a = Date.UTC(source.y, source.m - 1, source.d)
  const b = Date.UTC(target.y, target.m - 1, target.d)
  return Math.round((b - a) / 86400000)
}

export type WorkingBand = 'work' | 'edge' | 'night'

/**
 * Meeting-planning band for a local hour:
 * work 09-18, edge 07-09 and 18-22, night otherwise.
 */
export function workingHoursBand(hour: number): WorkingBand {
  if (hour >= 9 && hour < 18) return 'work'
  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 22)) return 'edge'
  return 'night'
}

export interface WallTime {
  y: number
  m: number // 1-12
  d: number
  hh: number
  mm: number
}

/**
 * Convert a wall-clock time in `tz` to a UTC instant (inverse of convertParts).
 * Uses an iterative offset fix so DST transitions resolve correctly.
 */
export function wallTimeToInstant(parts: WallTime, tz: string): Date {
  const targetUtc = Date.UTC(parts.y, parts.m - 1, parts.d, parts.hh, parts.mm)
  // first guess: assume offset at the naive UTC interpretation
  let guess = targetUtc - zoneOffsetMinutes(new Date(targetUtc), tz) * 60000
  // refine (handles cases where the guess crosses a DST boundary)
  for (let i = 0; i < 3; i++) {
    const offset = zoneOffsetMinutes(new Date(guess), tz)
    const next = targetUtc - offset * 60000
    if (next === guess) break
    guess = next
  }
  return new Date(guess)
}

/** Format an offset in minutes as "UTC+05:30" / "UTC-04:00" / "UTC±00:00". */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

/** "America/New_York" -> { region: "America", city: "New York" } */
export function splitZone(tz: string): { region: string; city: string } {
  const idx = tz.indexOf('/')
  if (idx === -1) return { region: '', city: tz.replace(/_/g, ' ') }
  const region = tz.slice(0, idx)
  const city = tz.slice(idx + 1).replace(/_/g, ' ').replace(/\//g, ' / ')
  return { region, city }
}

/** Display label like "America / New York". */
export function zoneLabel(tz: string): string {
  const { region, city } = splitZone(tz)
  return region ? `${region} / ${city}` : city
}

export const DEFAULT_TARGET_ZONES = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata']
