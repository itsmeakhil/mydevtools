import { isDesktop } from "./is-desktop"

const EXTERNAL_SCHEMES = new Set(["mailto:", "tel:"])

/** True when `href` (resolved against `base`) leaves the app: another-origin http(s), mailto, tel. */
export function isExternalUrl(href: string, base: string): boolean {
  let url: URL
  try {
    url = new URL(href, base)
  } catch {
    return false
  }
  if (EXTERNAL_SCHEMES.has(url.protocol)) return true
  return (url.protocol === "http:" || url.protocol === "https:") && url.origin !== new URL(base).origin
}

/** Open a URL in the user's default browser (desktop) or a new tab (web). */
export async function openExternal(url: string) {
  if (!isDesktop()) {
    window.open(url, "_blank", "noopener,noreferrer")
    return
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener")
  await openUrl(url)
}

const open = (url: string) => void openExternal(url).catch((e) => console.error("open link failed", e))

/**
 * Desktop only. WKWebView ignores `target="_blank"` and `window.open`, and a plain external link
 * navigates the app's own webview away. Route every external link click and `window.open` call to
 * the default browser instead. Idempotent.
 */
export function installExternalLinkShim() {
  if (!isDesktop()) return
  const w = window as Window & { __mdtLinkShim?: true }
  if (w.__mdtLinkShim) return
  w.__mdtLinkShim = true

  const onClick = (e: MouseEvent) => {
    if (e.button > 1) return // left or middle click only
    const a = (e.target as Element | null)?.closest?.("a[href]")
    if (!(a instanceof HTMLAnchorElement) || a.hasAttribute("download")) return
    if (!isExternalUrl(a.href, location.href)) return
    e.preventDefault()
    open(a.href)
  }
  // Capture phase: runs before Next's <Link> and any React handler can navigate.
  document.addEventListener("click", onClick, true)
  document.addEventListener("auxclick", onClick, true)

  const realOpen = window.open.bind(window)
  window.open = (url?: string | URL, target?: string, features?: string) => {
    // A call with window features wants a real popup (e.g. OAuth); leave it alone.
    if (url != null && !features && isExternalUrl(String(url), location.href)) {
      open(new URL(String(url), location.href).href)
      return null
    }
    return realOpen(url, target, features)
  }
}
