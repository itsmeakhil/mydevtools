/**
 * Pure logic for the CSS Generators tool (box-shadow, border-radius, fluid clamp()).
 * No React — everything here is unit-testable.
 */

/* ------------------------------- Box shadow ------------------------------ */

export interface ShadowLayer {
  x: number
  y: number
  blur: number
  spread: number
  /** Hex color like #000000 (with or without leading #, 3 or 6 digits). */
  color: string
  /** 0..1 */
  alpha: number
  inset: boolean
}

/** Convert a hex color + alpha into a CSS color string (rgba when alpha < 1). */
export function hexToCssColor(hex: string, alpha: number): string {
  let h = hex.replace(/^#/, '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = '000000'
  const a = Math.min(1, Math.max(0, alpha))
  if (a >= 1) return `#${h.toLowerCase()}`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // keep alpha compact (max 2 decimals)
  const alphaStr = String(Math.round(a * 100) / 100)
  return `rgba(${r}, ${g}, ${b}, ${alphaStr})`
}

/** Build a `box-shadow` value string from a list of layers. */
export function buildBoxShadow(layers: ShadowLayer[]): string {
  if (layers.length === 0) return 'none'
  return layers
    .map((l) => {
      const parts: string[] = []
      if (l.inset) parts.push('inset')
      parts.push(`${l.x}px`, `${l.y}px`, `${l.blur}px`, `${l.spread}px`, hexToCssColor(l.color, l.alpha))
      return parts.join(' ')
    })
    .join(', ')
}

export interface ShadowPreset {
  id: string
  layers: ShadowLayer[]
}

export const SHADOW_PRESETS: ShadowPreset[] = [
  {
    id: 'subtleCard',
    layers: [{ x: 0, y: 1, blur: 3, spread: 0, color: '#000000', alpha: 0.12, inset: false }],
  },
  {
    id: 'elevated',
    layers: [
      { x: 0, y: 10, blur: 15, spread: -3, color: '#000000', alpha: 0.1, inset: false },
      { x: 0, y: 4, blur: 6, spread: -4, color: '#000000', alpha: 0.1, inset: false },
    ],
  },
  {
    id: 'hardOffset',
    layers: [{ x: 6, y: 6, blur: 0, spread: 0, color: '#000000', alpha: 1, inset: false }],
  },
  {
    id: 'neonGlow',
    layers: [
      { x: 0, y: 0, blur: 12, spread: 2, color: '#22d3ee', alpha: 0.8, inset: false },
      { x: 0, y: 0, blur: 32, spread: 8, color: '#a855f7', alpha: 0.45, inset: false },
    ],
  },
  {
    id: 'inner',
    layers: [{ x: 0, y: 2, blur: 8, spread: 0, color: '#000000', alpha: 0.35, inset: true }],
  },
  {
    id: 'layeredSmooth',
    layers: [
      { x: 0, y: 1, blur: 2, spread: 0, color: '#000000', alpha: 0.07, inset: false },
      { x: 0, y: 2, blur: 4, spread: 0, color: '#000000', alpha: 0.07, inset: false },
      { x: 0, y: 4, blur: 8, spread: 0, color: '#000000', alpha: 0.07, inset: false },
      { x: 0, y: 8, blur: 16, spread: 0, color: '#000000', alpha: 0.07, inset: false },
    ],
  },
]

/* ----------------------------- Border radius ----------------------------- */

export type RadiusUnit = 'px' | '%'

export interface BorderRadiusState {
  mode: 'simple' | 'blob'
  unit: RadiusUnit
  /** simple mode corner values: top-left, top-right, bottom-right, bottom-left */
  tl: number
  tr: number
  br: number
  bl: number
  /** blob mode horizontal radii (percent): tl, tr, br, bl */
  h: [number, number, number, number]
  /** blob mode vertical radii (percent): tl, tr, br, bl */
  v: [number, number, number, number]
}

/** Build a `border-radius` value string (simple corner or slash syntax). */
export function buildBorderRadius(state: BorderRadiusState): string {
  if (state.mode === 'blob') {
    const h = state.h.map((n) => `${n}%`).join(' ')
    const v = state.v.map((n) => `${n}%`).join(' ')
    return `${h} / ${v}`
  }
  const { tl, tr, br, bl, unit } = state
  if (tl === tr && tr === br && br === bl) return `${tl}${unit}`
  return `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`
}

/** Random blob state (values 25–75% so shapes stay organic, not degenerate). */
export function randomBlob(rand: () => number = Math.random): {
  h: [number, number, number, number]
  v: [number, number, number, number]
} {
  const r = () => Math.round(25 + rand() * 50)
  return { h: [r(), r(), r(), r()], v: [r(), r(), r(), r()] }
}

/* ------------------------------ Fluid clamp() ---------------------------- */

export interface ClampParams {
  minPx: number
  maxPx: number
  minVw: number
  maxVw: number
  rootPx: number
}

export interface ClampResult {
  css: string
  /** slope expressed in vw units (slope * 100) */
  slopeVw: number
  /** intercept expressed in rem */
  interceptRem: number
  minRem: number
  maxRem: number
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}

/**
 * Compute a fluid typography clamp() between (minVw, minPx) and (maxVw, maxPx).
 * Output: clamp(<lower>rem, <interceptRem>rem + <slopeVw>vw, <upper>rem)
 * where lower/upper are ordered so the clamp is valid even for negative slopes.
 */
export function buildClamp(minPx: number, maxPx: number, minVw: number, maxVw: number, rootPx = 16): ClampResult {
  if (maxVw === minVw) throw new Error('Viewport bounds must differ')
  if (rootPx <= 0) throw new Error('Root font size must be positive')

  const slope = (maxPx - minPx) / (maxVw - minVw) // px per vw-px
  const interceptPx = minPx - slope * minVw

  const slopeVw = round4(slope * 100)
  const interceptRem = round4(interceptPx / rootPx)
  const minRem = round4(minPx / rootPx)
  const maxRem = round4(maxPx / rootPx)

  const lower = Math.min(minRem, maxRem)
  const upper = Math.max(minRem, maxRem)

  const sign = slopeVw < 0 ? '-' : '+'
  const css = `clamp(${lower}rem, ${interceptRem}rem ${sign} ${Math.abs(slopeVw)}vw, ${upper}rem)`
  return { css, slopeVw, interceptRem, minRem, maxRem }
}

/** Computed font size in px at a given viewport width (px), applying the clamp. */
export function clampSizeAtViewport(params: ClampParams, vw: number): number {
  const { minPx, maxPx, minVw, maxVw } = params
  const slope = (maxPx - minPx) / (maxVw - minVw)
  const interceptPx = minPx - slope * minVw
  const preferred = interceptPx + slope * vw
  const lower = Math.min(minPx, maxPx)
  const upper = Math.max(minPx, maxPx)
  return round4(Math.min(upper, Math.max(lower, preferred)))
}
