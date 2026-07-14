type Scheme = "http" | "https"

function isValidIpv4(host: string): boolean {
  const parts = host.split(".")
  if (parts.length !== 4) return false
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false
    const n = Number(part)
    if (!Number.isInteger(n) || n < 0 || n > 255) return false
  }
  return true
}

function isProbablyLocalHostname(host: string): boolean {
  const h = host.toLowerCase()
  if (h === "localhost") return true
  if (h.endsWith(".local")) return true
  return false
}

function isPrivateOrLoopbackIpv4(host: string): boolean {
  if (!isValidIpv4(host)) return false
  const [a, b] = host.split(".").map((p) => Number(p))
  if (a === 127) return true // loopback
  if (a === 10) return true // private
  if (a === 192 && b === 168) return true // private
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 169 && b === 254) return true // link-local
  if (host === "0.0.0.0") return true
  return false
}

function stripPort(host: string): string {
  // IPv6 literals may appear as "[::1]:8000"
  if (host.startsWith("[")) {
    const end = host.indexOf("]")
    if (end !== -1) return host.slice(1, end)
    return host
  }

  const idx = host.indexOf(":")
  return idx === -1 ? host : host.slice(0, idx)
}

function defaultSchemeForHostLike(hostLike: string): Scheme {
  const host = stripPort(hostLike)

  if (isProbablyLocalHostname(host)) return "http"
  if (isPrivateOrLoopbackIpv4(host)) return "http"

  // Treat any IPv6 literal as local/network target; prefer http by default.
  if (host.includes(":")) return "http"

  return "https"
}

function extractHostLike(inputWithoutScheme: string): string {
  // Take up to first '/', '?', or '#'
  const cutAt = inputWithoutScheme.search(/[/?#]/)
  return cutAt === -1 ? inputWithoutScheme : inputWithoutScheme.slice(0, cutAt)
}

/**
 * Ensures an http(s) scheme exists so `new URL()` works.
 *
 * - Keeps `http://` or `https://` as-is.
 * - For scheme-less inputs:
 *   - defaults to `http://` for `localhost`, `.local`, IPs (e.g. `127.0.0.1:8000`, `[::1]`)
 *   - defaults to `https://` for everything else (e.g. `example.com`)
 */
export function ensureHttpScheme(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  if (/^https?:\/\//i.test(trimmed)) return trimmed

  if (trimmed.startsWith("//")) {
    const withoutSlashes = trimmed.slice(2)
    const hostLike = extractHostLike(withoutSlashes)
    const scheme = defaultSchemeForHostLike(hostLike)
    return `${scheme}://${withoutSlashes}`
  }

  const hostLike = extractHostLike(trimmed)
  const scheme = defaultSchemeForHostLike(hostLike)
  return `${scheme}://${trimmed}`
}

