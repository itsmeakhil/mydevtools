import { accentCssVars, accentHex, isAccentColor, isCustomAccent } from '@/lib/accent-color'

describe('accent-color', () => {
  it('resolves presets, custom hex, and garbage', () => {
    expect(accentHex('indigo')).toBe('#6366f1')
    expect(accentHex('#AABBCC')).toBe('#aabbcc')
    expect(accentHex('not-a-color')).toBe('#6366f1')
  })

  it('validates stored values', () => {
    expect(isAccentColor('blue')).toBe(true)
    expect(isAccentColor('#f0f')).toBe(true)
    expect(isAccentColor('rebeccapurple')).toBe(false)
    expect(isAccentColor(undefined)).toBe(false)
    expect(isCustomAccent('blue')).toBe(false)
    expect(isCustomAccent('#123456')).toBe(true)
  })

  it('emits an HSL triple for --primary', () => {
    expect(accentCssVars('red')['--primary']).toBe('0 84.2% 60.2%')
  })

  it('flips --primary-foreground to dark text on bright accents', () => {
    expect(accentCssVars('yellow')['--primary-foreground']).toBe('222 47% 11%')
    expect(accentCssVars('#ffff00')['--primary-foreground']).toBe('222 47% 11%')
    expect(accentCssVars('indigo')['--primary-foreground']).toBe('0 0% 100%')
    expect(accentCssVars('#000000')['--primary-foreground']).toBe('0 0% 100%')
  })
})
