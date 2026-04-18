import { optimize, type Config } from 'svgo/browser'

/** Preset-default keeps responsive icons working; multipass squeezes extra wins. */
const SVGO_OPTIONS = {
  multipass: true,
  plugins: ['preset-default'],
} as const satisfies Pick<Config, 'multipass' | 'plugins'>

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function optimizeSvgMarkup(svg: string): { ok: true; data: string } | { ok: false; error: string } {
  const trimmed = svg.trim()
  if (!trimmed) {
    return { ok: true, data: '' }
  }
  try {
    const { data } = optimize(trimmed, SVGO_OPTIONS as Config)
    return { ok: true, data }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}
