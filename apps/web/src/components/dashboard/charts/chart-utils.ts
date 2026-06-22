import type { ToolUsage } from '@/lib/tool-usage-utils'

export interface DayBucket {
  date: string // YYYY-MM-DD (local)
  label: string // short, e.g. "Mon" or "6/22"
  count: number
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** `days` buckets, oldest→newest, gaps filled with 0. */
export function bucketEventsByDay(
  events: ToolUsage[],
  days: number,
  now: number = Date.now(),
): DayBucket[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const buckets: DayBucket[] = []
  const index = new Map<string, DayBucket>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const bucket: DayBucket = {
      date: localDateKey(d),
      label: days <= 7 ? WEEKDAY[d.getDay()] : `${d.getMonth() + 1}/${d.getDate()}`,
      count: 0,
    }
    buckets.push(bucket)
    index.set(bucket.date, bucket)
  }

  for (const e of events) {
    const key = localDateKey(new Date(e.timestamp))
    const bucket = index.get(key)
    if (bucket) bucket.count += 1
  }

  return buckets
}

export interface DonutSegment {
  label: string
  value: number
  color: string
}

const CIRCUMFERENCE = 2 * Math.PI

/** Circumference-normalized stroke-dasharray arcs for a unit-radius donut. */
export function donutArcs(
  segments: DonutSegment[],
): { segment: DonutSegment; dashArray: string; dashOffset: number; percent: number }[] {
  const total = segments.reduce((s, seg) => s + Math.max(0, seg.value), 0)
  let consumed = 0
  return segments.map((segment) => {
    const fraction = total > 0 ? Math.max(0, segment.value) / total : 0
    const len = fraction * CIRCUMFERENCE
    const arc = {
      segment,
      dashArray: `${len} ${CIRCUMFERENCE - len}`,
      dashOffset: -consumed,
      percent: fraction * 100,
    }
    consumed += len
    return arc
  })
}
