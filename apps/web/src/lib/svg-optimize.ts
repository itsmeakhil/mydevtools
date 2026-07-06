import type { Config } from 'svgo/browser'

/** Preset-default keeps responsive icons working; multipass squeezes extra wins. */
const SVGO_OPTIONS = {
  multipass: true,
  plugins: ['preset-default'],
} as const satisfies Pick<Config, 'multipass' | 'plugins'>

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

// Below this, main-thread optimize beats worker round-trip + svgo chunk load.
// ponytail: fixed char threshold; tune if profiling shows jank on smaller SVGs.
export const SVG_WORKER_MIN_CHARS = 15_000

export function shouldUseSvgWorker(svg: string, hasWorker: boolean): boolean {
  return hasWorker && svg.length >= SVG_WORKER_MIN_CHARS
}

// svgo is ~525KB; load it on first optimize so the tool page paints without it.
export async function optimizeSvgMarkup(svg: string): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  const trimmed = svg.trim()
  if (!trimmed) {
    return { ok: true, data: '' }
  }
  try {
    const { optimize } = await import('svgo/browser')
    const { data } = optimize(trimmed, SVGO_OPTIONS as Config)
    return { ok: true, data }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: message }
  }
}
