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

/**
 * CSS custom properties for an accent. `--primary-foreground` follows whichever
 * of dark/white text contrasts better, so bright accents (yellow, lime) stay
 * readable instead of shipping white-on-yellow.
 */
export function accentCssVars(value: string): Record<string, string> {
  const hex = accentHex(value)
  const [h, s, l] = toHsl(hex)
  const triple = `${round(h)} ${round(s)}% ${round(l)}%`
  const fg = contrast(hex, LIGHT_FG.hex) >= contrast(hex, DARK_FG.hex) ? LIGHT_FG : DARK_FG

  return {
    '--primary': triple,
    '--primary-foreground': fg.hsl,
    '--ring': triple,
    '--sidebar-primary': triple,
    '--sidebar-primary-foreground': fg.hsl,
    '--sidebar-ring': triple,
  }
}
