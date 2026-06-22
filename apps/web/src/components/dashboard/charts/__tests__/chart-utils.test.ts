import {
  bucketEventsByDay,
  donutArcs,
  type DonutSegment,
} from '@/components/dashboard/charts/chart-utils'
import type { ToolUsage } from '@/lib/tool-usage-utils'

const DAY = 24 * 60 * 60 * 1000
const ev = (toolId: string, timestamp: number): ToolUsage => ({
  toolId,
  timestamp,
  url: `/app/${toolId}`,
})

describe('bucketEventsByDay', () => {
  // Fixed "now" at midday to avoid TZ edge flicker.
  const now = new Date(2026, 5, 22, 12, 0, 0).getTime() // 2026-06-22 local

  it('returns exactly `days` buckets oldest-to-newest', () => {
    const out = bucketEventsByDay([], 7, now)
    expect(out).toHaveLength(7)
    expect(out[6].date).toBe('2026-06-22')
    expect(out[0].date).toBe('2026-06-16')
  })

  it('counts events into their local day and fills gaps with 0', () => {
    const events = [
      ev('a', now), // today
      ev('b', now), // today
      ev('c', now - 2 * DAY), // two days ago
    ]
    const out = bucketEventsByDay(events, 7, now)
    expect(out[6].count).toBe(2)
    expect(out[4].count).toBe(1)
    expect(out[5].count).toBe(0)
  })

  it('ignores events outside the window', () => {
    const out = bucketEventsByDay([ev('old', now - 30 * DAY)], 7, now)
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(0)
  })
})

describe('donutArcs', () => {
  const C = 2 * Math.PI
  const segs: DonutSegment[] = [
    { label: 'A', value: 1, color: 'a' },
    { label: 'B', value: 3, color: 'b' },
  ]

  it('normalizes values to the circumference and sets offsets sequentially', () => {
    const arcs = donutArcs(segs)
    expect(arcs[0].percent).toBeCloseTo(25)
    expect(arcs[1].percent).toBeCloseTo(75)
    const [lenA] = arcs[0].dashArray.split(' ').map(Number)
    expect(lenA).toBeCloseTo(C * 0.25)
    // second segment starts where the first ended
    expect(arcs[1].dashOffset).toBeCloseTo(-C * 0.25)
  })

  it('handles an all-zero total without NaN', () => {
    const arcs = donutArcs([{ label: 'Z', value: 0, color: 'z' }])
    expect(arcs[0].percent).toBe(0)
    expect(arcs[0].dashArray.split(' ').map(Number)[0]).toBe(0)
  })
})
