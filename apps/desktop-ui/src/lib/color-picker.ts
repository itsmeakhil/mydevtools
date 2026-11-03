/**
 * Color math for the accent picker. Local (not the `color` package) so it stays
 * dependency-free and plain-jest testable, like lib/accent-color.ts.
 */

/** HSV with s/v in 0–100. Kept as picker state so hue survives s=0 or v=0. */
export interface Hsv {
  h: number
  s: number
  v: number
}

/** OKLCH with l in 0–100 and c in 0–MAX_CHROMA (CSS units: `oklch(l% c h)`). */
export interface Oklch {
  l: number
  c: number
  h: number
}

type Rgb = [number, number, number] // 0–1

export const MAX_CHROMA = 0.37

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const wrapHue = (h: number) => ((h % 360) + 360) % 360

/** `e8704a`, `#E8704A`, `#e87` → `#e8704a`; anything else → null. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(raw)) return `#${raw.replace(/./g, (c) => c + c)}`.toLowerCase()
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toLowerCase()
  return null
}

function hexToRgb(hex: string): Rgb {
  const n = parseInt(normalizeHex(hex)!.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) => Math.round(clamp(c, 0, 1) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

export function hsvFromHex(hex: string): Hsv {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: wrapHue(h * 60), s: max ? (d / max) * 100 : 0, v: max * 100 }
}

export function hexFromHsv({ h, s, v }: Hsv): string {
  const sv = clamp(s, 0, 100) / 100
  const vv = clamp(v, 0, 100) / 100
  const f = (n: number) => {
    const k = (n + wrapHue(h) / 60) % 6
    return vv - vv * sv * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return rgbToHex([f(5), f(3), f(1)])
}

// sRGB transfer functions + Björn Ottosson's OKLab matrices.
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const fromLinear = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)

export function oklchFromHex(hex: string): Oklch {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.hypot(A, B)
  // Achromatic colors have no meaningful hue; 0 keeps sliders stable.
  return { l: L * 100, c, h: c < 1e-4 ? 0 : wrapHue((Math.atan2(B, A) * 180) / Math.PI) }
}

/** Out-of-gamut values are clipped per channel to sRGB. */
export function hexFromOklch({ l, c, h }: Oklch): string {
  const L = clamp(l, 0, 100) / 100
  const a = (clamp(c, 0, MAX_CHROMA) * Math.cos((h * Math.PI) / 180))
  const b = (clamp(c, 0, MAX_CHROMA) * Math.sin((h * Math.PI) / 180))
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return rgbToHex([
    fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  ])
}

/** Wheel geometry: hue 0° at 3 o'clock, increasing clockwise; saturation = distance from centre. */
export function wheelPoint(h: number, s: number, radius: number): { x: number; y: number } {
  const a = (h * Math.PI) / 180
  const r = (clamp(s, 0, 100) / 100) * radius
  return { x: radius + Math.cos(a) * r, y: radius + Math.sin(a) * r }
}

/** Inverse of `wheelPoint`, for a pointer at (x, y) relative to the wheel's top-left. */
export function wheelHsFromPoint(x: number, y: number, radius: number): { h: number; s: number } {
  const dx = x - radius
  const dy = y - radius
  const h = wrapHue((Math.atan2(dy, dx) * 180) / Math.PI)
  const s = clamp((Math.hypot(dx, dy) / radius) * 100, 0, 100)
  return { h, s }
}

export type ContrastLevel = 'aa' | 'aaLarge' | 'fail'

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** WCAG 2: 4.5 normal text, 3 large text. */
export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 4.5) return 'aa'
  if (ratio >= 3) return 'aaLarge'
  return 'fail'
}
