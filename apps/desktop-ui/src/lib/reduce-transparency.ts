/**
 * In-app "Reduce transparency" (Settings → Appearance). Mirrors the macOS
 * accessibility setting for people who don't know it exists: sets
 * `data-reduce-transparency` on <html>, which globals.css turns into solid
 * surfaces. The pre-paint script in app/layout.tsx applies it before render.
 */
export const REDUCE_TRANSPARENCY_KEY = 'app-reduce-transparency'

export function getReduceTransparency(): boolean {
  try {
    return localStorage.getItem(REDUCE_TRANSPARENCY_KEY) === '1'
  } catch {
    return false
  }
}

export function setReduceTransparency(on: boolean): void {
  document.documentElement.toggleAttribute('data-reduce-transparency', on)
  try {
    localStorage.setItem(REDUCE_TRANSPARENCY_KEY, on ? '1' : '0')
  } catch {}
}
