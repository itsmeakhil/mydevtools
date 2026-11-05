import {
  contrastLevel,
  contrastRatio,
  hexFromHsv,
  hexFromOklch,
  hsvFromHex,
  normalizeHex,
  oklchFromHex,
  wheelHsFromPoint,
  wheelPoint,
} from '../color-picker'

describe('color-picker', () => {
  it('normalizes hex input', () => {
    expect(normalizeHex('E8704A')).toBe('#e8704a')
    expect(normalizeHex(' #abc ')).toBe('#aabbcc')
    expect(normalizeHex('#12345')).toBeNull()
    expect(normalizeHex('zzzzzz')).toBeNull()
  })

  it('round-trips HSV', () => {
    for (const hex of ['#e8704a', '#6366f1', '#000000', '#ffffff', '#22c55e']) {
      expect(hexFromHsv(hsvFromHex(hex))).toBe(hex)
    }
  })

  it('round-trips OKLCH in CSS units', () => {
    const o = oklchFromHex('#e8704a')
    expect(o.l).toBeCloseTo(68, 0)
    expect(o.c).toBeCloseTo(0.158, 2)
    expect(hexFromOklch(o)).toBe('#e8704a')
    expect(oklchFromHex('#808080').h).toBe(0) // achromatic: no NaN hue
  })

  it('maps the wheel both ways', () => {
    const r = 92
    for (const [h, s] of [[14, 68], [200, 100], [359, 30]]) {
      const p = wheelPoint(h, s, r)
      const back = wheelHsFromPoint(p.x, p.y, r)
      expect(back.h).toBeCloseTo(h, 5)
      expect(back.s).toBeCloseTo(s, 5)
    }
    expect(wheelHsFromPoint(500, r, r).s).toBe(100) // outside the rim clamps
  })

  it('grades contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastLevel(4.5)).toBe('aa')
    expect(contrastLevel(3.07)).toBe('aaLarge')
    expect(contrastLevel(2)).toBe('fail')
  })
})
