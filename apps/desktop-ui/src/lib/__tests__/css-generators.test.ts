import {
  buildBoxShadow,
  buildBorderRadius,
  buildClamp,
  clampSizeAtViewport,
  hexToCssColor,
  randomBlob,
  SHADOW_PRESETS,
  type BorderRadiusState,
  type ShadowLayer,
} from '@/lib/css-generators'

describe('hexToCssColor', () => {
  it('returns hex when alpha is 1', () => {
    expect(hexToCssColor('#FF0000', 1)).toBe('#ff0000')
  })

  it('expands 3-digit hex and produces rgba with alpha', () => {
    expect(hexToCssColor('#0f0', 0.5)).toBe('rgba(0, 255, 0, 0.5)')
  })

  it('clamps alpha into 0..1 and falls back to black on invalid hex', () => {
    expect(hexToCssColor('nonsense', 2)).toBe('#000000')
    expect(hexToCssColor('#123456', -1)).toBe('rgba(18, 52, 86, 0)')
  })
})

describe('buildBoxShadow', () => {
  it('returns none for no layers', () => {
    expect(buildBoxShadow([])).toBe('none')
  })

  it('builds a single layer with inset and alpha color', () => {
    const layer: ShadowLayer = { x: 0, y: 2, blur: 8, spread: -1, color: '#000000', alpha: 0.35, inset: true }
    expect(buildBoxShadow([layer])).toBe('inset 0px 2px 8px -1px rgba(0, 0, 0, 0.35)')
  })

  it('joins multiple layers with commas in order', () => {
    const layers: ShadowLayer[] = [
      { x: 1, y: 1, blur: 2, spread: 0, color: '#ff0000', alpha: 1, inset: false },
      { x: 0, y: 4, blur: 8, spread: 2, color: '#00ff00', alpha: 0.5, inset: false },
    ]
    expect(buildBoxShadow(layers)).toBe('1px 1px 2px 0px #ff0000, 0px 4px 8px 2px rgba(0, 255, 0, 0.5)')
  })

  it('presets all produce non-empty valid strings', () => {
    for (const preset of SHADOW_PRESETS) {
      const css = buildBoxShadow(preset.layers)
      expect(css.length).toBeGreaterThan(0)
      expect(css).not.toBe('none')
    }
  })
})

describe('buildBorderRadius', () => {
  const base: BorderRadiusState = {
    mode: 'simple',
    unit: 'px',
    tl: 8,
    tr: 8,
    br: 8,
    bl: 8,
    h: [30, 70, 70, 30],
    v: [30, 30, 70, 70],
  }

  it('collapses equal corners to a single value', () => {
    expect(buildBorderRadius(base)).toBe('8px')
  })

  it('emits four corner values in TL TR BR BL order', () => {
    expect(buildBorderRadius({ ...base, tl: 1, tr: 2, br: 3, bl: 4 })).toBe('1px 2px 3px 4px')
  })

  it('respects percent unit', () => {
    expect(buildBorderRadius({ ...base, unit: '%', tl: 50, tr: 50, br: 50, bl: 50 })).toBe('50%')
  })

  it('builds slash syntax in blob mode', () => {
    expect(buildBorderRadius({ ...base, mode: 'blob' })).toBe('30% 70% 70% 30% / 30% 30% 70% 70%')
  })

  it('randomBlob stays within 25-75% bounds', () => {
    const { h, v } = randomBlob(() => 0)
    expect(h).toEqual([25, 25, 25, 25])
    expect(v).toEqual([25, 25, 25, 25])
    const hi = randomBlob(() => 1)
    expect(hi.h).toEqual([75, 75, 75, 75])
    expect(hi.v).toEqual([75, 75, 75, 75])
  })
})

describe('buildClamp', () => {
  it('computes 16->24px over 320->1280 viewport correctly', () => {
    // slope = 8/960 = 0.008333... px/px -> 0.8333vw
    // intercept = 16 - 0.008333*320 = 13.3333px = 0.8333rem
    const r = buildClamp(16, 24, 320, 1280, 16)
    expect(r.slopeVw).toBeCloseTo(0.8333, 4)
    expect(r.interceptRem).toBeCloseTo(0.8333, 4)
    expect(r.minRem).toBe(1)
    expect(r.maxRem).toBe(1.5)
    expect(r.css).toBe('clamp(1rem, 0.8333rem + 0.8333vw, 1.5rem)')
  })

  it('handles negative slope (max < min) with ordered clamp bounds', () => {
    const r = buildClamp(24, 16, 320, 1280, 16)
    expect(r.slopeVw).toBeCloseTo(-0.8333, 4)
    // intercept = 24 - (-0.008333)*320 = 26.6667px = 1.6667rem
    expect(r.interceptRem).toBeCloseTo(1.6667, 4)
    expect(r.css).toBe('clamp(1rem, 1.6667rem - 0.8333vw, 1.5rem)')
  })

  it('respects a non-16 root font size', () => {
    const r = buildClamp(20, 40, 400, 1200, 10)
    // slope = 20/800 = 0.025 -> 2.5vw; intercept = 20 - 0.025*400 = 10px = 1rem
    expect(r.css).toBe('clamp(2rem, 1rem + 2.5vw, 4rem)')
  })

  it('throws on equal viewport bounds and non-positive root size', () => {
    expect(() => buildClamp(16, 24, 800, 800)).toThrow()
    expect(() => buildClamp(16, 24, 320, 1280, 0)).toThrow()
  })
})

describe('clampSizeAtViewport', () => {
  const params = { minPx: 16, maxPx: 24, minVw: 320, maxVw: 1280, rootPx: 16 }

  it('returns min at/below the min viewport', () => {
    expect(clampSizeAtViewport(params, 320)).toBe(16)
    expect(clampSizeAtViewport(params, 100)).toBe(16)
  })

  it('returns max at/above the max viewport', () => {
    expect(clampSizeAtViewport(params, 1280)).toBe(24)
    expect(clampSizeAtViewport(params, 3000)).toBe(24)
  })

  it('interpolates linearly in between', () => {
    expect(clampSizeAtViewport(params, 800)).toBe(20)
  })

  it('clamps correctly with a negative slope', () => {
    const inv = { minPx: 24, maxPx: 16, minVw: 320, maxVw: 1280, rootPx: 16 }
    expect(clampSizeAtViewport(inv, 320)).toBe(24)
    expect(clampSizeAtViewport(inv, 1280)).toBe(16)
    expect(clampSizeAtViewport(inv, 800)).toBe(20)
  })
})
