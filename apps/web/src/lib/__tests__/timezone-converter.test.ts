import {
  convertParts,
  dayShift,
  formatOffset,
  splitZone,
  wallTimeToInstant,
  workingHoursBand,
  zoneLabel,
  zoneOffsetMinutes,
} from '@/lib/timezone-converter'

describe('zoneOffsetMinutes', () => {
  it('is 0 for UTC', () => {
    expect(zoneOffsetMinutes(new Date('2025-06-15T12:00:00Z'), 'UTC')).toBe(0)
  })

  it('handles the half-hour zone Asia/Kolkata (+05:30)', () => {
    expect(zoneOffsetMinutes(new Date('2025-06-15T12:00:00Z'), 'Asia/Kolkata')).toBe(330)
    expect(zoneOffsetMinutes(new Date('2025-01-15T12:00:00Z'), 'Asia/Kolkata')).toBe(330)
  })

  it('captures the America/New_York DST transition (March 9, 2025)', () => {
    // 06:30Z is 01:30 EST (offset -300); 07:30Z is 03:30 EDT (offset -240)
    expect(zoneOffsetMinutes(new Date('2025-03-09T06:30:00Z'), 'America/New_York')).toBe(-300)
    expect(zoneOffsetMinutes(new Date('2025-03-09T07:30:00Z'), 'America/New_York')).toBe(-240)
  })
})

describe('convertParts', () => {
  it('converts a fixed instant into New York wall time across DST', () => {
    const before = convertParts(new Date('2025-03-09T06:30:00Z'), 'America/New_York')
    expect(before).toMatchObject({ y: 2025, m: 3, d: 9, hh: 1, mm: 30, weekday: 'Sun' })

    const after = convertParts(new Date('2025-03-09T07:30:00Z'), 'America/New_York')
    expect(after).toMatchObject({ y: 2025, m: 3, d: 9, hh: 3, mm: 30 })
  })

  it('converts into Asia/Kolkata with the 30-minute offset', () => {
    const p = convertParts(new Date('2025-03-09T07:30:00Z'), 'Asia/Kolkata')
    expect(p).toMatchObject({ y: 2025, m: 3, d: 9, hh: 13, mm: 0, weekday: 'Sun' })
  })

  it('handles midnight without producing hour 24', () => {
    const p = convertParts(new Date('2025-06-01T00:00:00Z'), 'UTC')
    expect(p.hh).toBe(0)
    expect(p.d).toBe(1)
  })
})

describe('dayShift', () => {
  it('is +1 when the target zone is already on the next day', () => {
    const instant = new Date('2025-06-15T22:00:00Z')
    const ny = convertParts(instant, 'America/New_York') // 18:00 June 15
    const tokyo = convertParts(instant, 'Asia/Tokyo') // 07:00 June 16
    expect(dayShift(ny, tokyo)).toBe(1)
  })

  it('is -1 when the target zone is on the previous day', () => {
    const instant = new Date('2025-06-15T02:00:00Z')
    const utc = convertParts(instant, 'UTC') // June 15
    const la = convertParts(instant, 'America/Los_Angeles') // 19:00 June 14
    expect(dayShift(utc, la)).toBe(-1)
  })

  it('is 0 for the same calendar day and handles month boundaries', () => {
    const instant = new Date('2025-07-01T00:30:00Z')
    const utc = convertParts(instant, 'UTC') // Jul 1
    const london = convertParts(instant, 'Europe/London') // 01:30 Jul 1 (BST)
    expect(dayShift(utc, london)).toBe(0)
    const la = convertParts(instant, 'America/Los_Angeles') // 17:30 Jun 30
    expect(dayShift(utc, la)).toBe(-1)
  })
})

describe('workingHoursBand', () => {
  it('classifies working hours 09-18', () => {
    expect(workingHoursBand(9)).toBe('work')
    expect(workingHoursBand(12)).toBe('work')
    expect(workingHoursBand(17)).toBe('work')
  })

  it('classifies edge hours 07-09 and 18-22', () => {
    expect(workingHoursBand(7)).toBe('edge')
    expect(workingHoursBand(8)).toBe('edge')
    expect(workingHoursBand(18)).toBe('edge')
    expect(workingHoursBand(21)).toBe('edge')
  })

  it('classifies night hours', () => {
    expect(workingHoursBand(22)).toBe('night')
    expect(workingHoursBand(0)).toBe('night')
    expect(workingHoursBand(3)).toBe('night')
    expect(workingHoursBand(6)).toBe('night')
  })
})

describe('wallTimeToInstant', () => {
  it('round-trips a normal New York winter time', () => {
    const instant = wallTimeToInstant({ y: 2025, m: 1, d: 15, hh: 12, mm: 0 }, 'America/New_York')
    expect(instant.toISOString()).toBe('2025-01-15T17:00:00.000Z')
  })

  it('round-trips a New York summer (EDT) time', () => {
    const instant = wallTimeToInstant({ y: 2025, m: 7, d: 4, hh: 9, mm: 30 }, 'America/New_York')
    expect(instant.toISOString()).toBe('2025-07-04T13:30:00.000Z')
  })

  it('round-trips just after the March 2025 DST spring-forward', () => {
    const instant = wallTimeToInstant({ y: 2025, m: 3, d: 9, hh: 3, mm: 30 }, 'America/New_York')
    expect(instant.toISOString()).toBe('2025-03-09T07:30:00.000Z')
    expect(convertParts(instant, 'America/New_York')).toMatchObject({ hh: 3, mm: 30 })
  })

  it('round-trips Asia/Kolkata half-hour offset', () => {
    const instant = wallTimeToInstant({ y: 2025, m: 6, d: 1, hh: 9, mm: 0 }, 'Asia/Kolkata')
    expect(instant.toISOString()).toBe('2025-06-01T03:30:00.000Z')
  })

  it('resolves a nonexistent spring-forward time to a nearby valid instant', () => {
    // 02:30 on 2025-03-09 does not exist in New York (clocks jump 02:00 -> 03:00)
    const instant = wallTimeToInstant({ y: 2025, m: 3, d: 9, hh: 2, mm: 30 }, 'America/New_York')
    const back = convertParts(instant, 'America/New_York')
    expect(back.d).toBe(9)
    // maps to either 01:30 EST or 03:30 EDT depending on iteration parity
    expect([1, 3]).toContain(back.hh)
    expect(back.mm).toBe(30)
  })
})

describe('formatOffset / labels', () => {
  it('formats positive, negative, and half-hour offsets', () => {
    expect(formatOffset(0)).toBe('UTC+00:00')
    expect(formatOffset(330)).toBe('UTC+05:30')
    expect(formatOffset(-240)).toBe('UTC-04:00')
  })

  it('splits and labels zone ids', () => {
    expect(splitZone('America/New_York')).toEqual({ region: 'America', city: 'New York' })
    expect(splitZone('UTC')).toEqual({ region: '', city: 'UTC' })
    expect(zoneLabel('America/Argentina/Buenos_Aires')).toBe('America / Argentina / Buenos Aires')
    expect(zoneLabel('UTC')).toBe('UTC')
  })
})
