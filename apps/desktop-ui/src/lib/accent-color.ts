/**
 * Accent palette + the CSS variables it drives. A stored accent is either a
 * preset id or a custom `#rrggbb` chosen from the color picker, so everything
 * downstream resolves through `accentCssVars`.
 */
export const ACCENT_PRESETS = [
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'blue', name: 'Blue', hex: '#3b82f6' },
  { id: 'sky', name: 'Sky', hex: '#0ea5e9' },
  { id: 'cyan', name: 'Teal', hex: '#06b6d4' },
  { id: 'teal', name: 'Aqua', hex: '#14b8a6' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'green', name: 'Green', hex: '#22c55e' },
  { id: 'lime', name: 'Lime', hex: '#84cc16' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
  { id: 'red', name: 'Red', hex: '#ef4444' },
  { id: 'rose', name: 'Rose', hex: '#f43f5e' },
  { id: 'pink', name: 'Pink', hex: '#ec4899' },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#d946ef' },
  { id: 'purple', name: 'Purple', hex: '#a855f7' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6' },
  { id: 'slate', name: 'Slate', hex: '#64748b' },
] as const

export type AccentPresetId = (typeof ACCENT_PRESETS)[number]['id']

/** Preset id, or a custom hex color. */
export type AccentColor = AccentPresetId | (string & {})

export const DEFAULT_ACCENT: AccentPresetId = 'indigo'

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
const PRESET_HEX = new Map<string, string>(ACCENT_PRESETS.map((p) => [p.id, p.hex]))

/** Foreground pair: the HSL triple written to CSS + its hex, for contrast math. */
const DARK_FG = { hsl: '222 47% 11%', hex: '#0f1729' }
const LIGHT_FG = { hsl: '0 0% 100%', hex: '#ffffff' }

export function isAccentColor(value: string | undefined | null): value is AccentColor {
  return !!value && (PRESET_HEX.has(value) || HEX_RE.test(value))
}

export function isCustomAccent(value: string): boolean {
  return !PRESET_HEX.has(value) && HEX_RE.test(value)
}

/** Resolved swatch color for a stored accent; falls back to the default preset. */
export function accentHex(value: string): string {
  const preset = PRESET_HEX.get(value)
  if (preset) return preset
  return HEX_RE.test(value) ? value.toLowerCase() : PRESET_HEX.get(DEFAULT_ACCENT)!
}

const round = (n: number) => Math.round(n * 10) / 10

/**
 * Local color math (rather than the `color` package wcag-contrast.ts uses) so the
 * theme provider stays dependency-free and this stays plain-jest testable.
 */
function toRgb(hex: string): [number, number, number] {
  const raw = hex.slice(1)
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((c) => c / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))

  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = (h * 60 + 360) % 360
  }

  return [h, s * 100, l * 100]
}

/** WCAG 2.1 relative luminance (0–1). */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// ── OKLCH (perceptual) tonal scale ─────────────────────────────────────────
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)

function hexToOklch(hex: string): [number, number, number] {
  const [r, g, b] = toRgb(hex).map((c) => toLinear(c / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI]
}

/** OKLCH → sRGB in 0–1, or null when out of gamut. */
function oklchToRgb(L: number, C: number, H: number): [number, number, number] | null {
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear)
  return rgb.every((c) => c >= -0.0005 && c <= 1.0005)
    ? (rgb.map((c) => Math.min(1, Math.max(0, c))) as [number, number, number])
    : null
}

/** Gamut-map by shrinking chroma (keeps hue + lightness), return `#rrggbb`. */
function oklchToHex(L: number, C: number, H: number): string {
  let c = C
  let rgb = oklchToRgb(L, c, H)
  while (!rgb && c > 0) {
    c = Math.max(0, c - 0.005)
    rgb = oklchToRgb(L, c, H)
  }
  return '#' + (rgb ?? [L, L, L]).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}

const hslTriple = (hex: string) => {
  const [h, s, l] = toHsl(hex)
  return `${round(h)} ${round(s)}% ${round(l)}%`
}

/** [step, mix toward the light (+) or dark (−) end, chroma factor]. 500 = the chosen color. */
const SCALE: [number, number, number][] = [
  [50, 0.93, 0.22], [100, 0.84, 0.38], [200, 0.68, 0.6], [300, 0.48, 0.8], [400, 0.25, 0.95],
  [600, -0.14, 1], [700, -0.28, 0.95], [800, -0.45, 0.85], [900, -0.6, 0.7], [950, -0.74, 0.55],
]
const LIGHT_END = 0.985
const DARK_END = 0.17

/** `--primary-50 … --primary-950` as HSL triples, generated perceptually in OKLCH. */
export function accentScale(value: string): Record<string, string> {
  const hex = accentHex(value)
  const [L, C, H] = hexToOklch(hex)
  const out: Record<string, string> = { '--primary-500': hslTriple(hex) }
  for (const [step, t, cf] of SCALE) {
    const target = t > 0 ? L + (Math.max(L, LIGHT_END) - L) * t : L + (Math.min(L, DARK_END) - L) * -t
    out[`--primary-${step}`] = hslTriple(oklchToHex(target, C * cf, H))
  }
  return out
}

/**
 * CSS custom properties for an accent. `--primary-foreground` follows whichever
 * of dark/white text contrasts better, so bright accents (yellow, lime) stay
 * readable instead of shipping white-on-yellow. Semantic tokens
 * (--primary-hover/-subtle/…) map onto the scale per theme in globals.css.
 */
export function accentCssVars(value: string): Record<string, string> {
  const hex = accentHex(value)
  const triple = hslTriple(hex)
  const fg = contrast(hex, LIGHT_FG.hex) >= contrast(hex, DARK_FG.hex) ? LIGHT_FG : DARK_FG

  return {
    '--primary': triple,
    '--primary-foreground': fg.hsl,
    '--ring': triple,
    '--sidebar-primary': triple,
    '--sidebar-primary-foreground': fg.hsl,
    '--sidebar-ring': triple,
    ...accentScale(hex),
  }
}
