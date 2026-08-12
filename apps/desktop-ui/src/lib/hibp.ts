import { isDesktop } from "@/lib/desktop/is-desktop"

/**
 * Outcome for one entry. `unknown` is deliberately its own state rather than
 * being folded into a zero count: a network blip, a rate limit or a proxy
 * failure must never render as "this password is not in any breach". A false
 * negative dressed as an assurance is worse than no check at all.
 */
export type BreachResult =
    | { status: "clean" }
    | { status: "breached"; count: number }
    | { status: "unknown" }

async function sha1Hex(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-1", encoded)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
}

/** Suffix → breach count, for one 5-character hash prefix. */
type Range = Map<string, number>

async function requestRange(prefix: string): Promise<Range> {
  const url = `https://api.pwnedpasswords.com/range/${prefix}`
  // Desktop routes through the Rust proxy (only the k-anonymity SHA-1 prefix
  // leaves the machine — no plaintext, no user data). Web calls HIBP directly.
  let text: string
  let status: number
  let retryAfter: string | null = null
  if (isDesktop()) {
    const { proxyGet } = await import("@/lib/desktop/proxy-get")
    const r = await proxyGet(url, { headers: { "Add-Padding": "true" } })
    status = r.status
    if (!r.ok) throw new HibpError(status, retryAfter)
    text = r.isBase64 ? atob(r.body) : r.body
  } else {
    const res = await fetch(url, { headers: { "Add-Padding": "true" } })
    status = res.status
    retryAfter = res.headers.get("Retry-After")
    if (!res.ok) throw new HibpError(status, retryAfter)
    text = await res.text()
  }

  const range: Range = new Map()
  for (const line of text.split("\n")) {
    const [suffix, count] = line.trim().split(":")
    if (suffix) range.set(suffix, parseInt(count, 10) || 0)
  }
  return range
}

class HibpError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null
  ) {
    super(`HIBP request failed: ${status}`)
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * One range fetch with a single retry when the server asks us to back off.
 * 429 is the one failure worth waiting on — everything else is reported as
 * unknown rather than silently retried into a longer stall.
 */
async function fetchRangeWithBackoff(prefix: string): Promise<Range> {
  try {
    return await requestRange(prefix)
  } catch (e) {
    if (e instanceof HibpError && e.status === 429) {
      const seconds = Number(e.retryAfter)
      await sleep(Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 10) * 1000 : 2000)
      return requestRange(prefix)
    }
    throw e
  }
}

/** Number of times this password appears in known breaches. Throws if the
 *  lookup could not be completed — callers must not treat that as zero. */
export async function checkPasswordBreach(password: string): Promise<number> {
  const hash = await sha1Hex(password)
  const range = await fetchRangeWithBackoff(hash.slice(0, 5))
  return range.get(hash.slice(5)) ?? 0
}

export interface BreachEntry {
  id: string
  password: string
}

/**
 * Bulk check. Ranges are cached per prefix for the run, which matters most for
 * exactly the passwords this feature exists to find: a reused password hashes
 * to the same prefix every time, so N copies cost one request.
 *
 * Requests are spaced 150ms apart to respect HIBP's rate limit — cache hits are
 * not, since they touch the network at all.
 */
export async function checkPasswordsBreached(
  entries: BreachEntry[],
  onProgress?: (checked: number, total: number) => void
): Promise<Map<string, BreachResult>> {
  const results = new Map<string, BreachResult>()
  const ranges = new Map<string, Range>()

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    try {
      const hash = await sha1Hex(entry.password)
      const prefix = hash.slice(0, 5)
      let range = ranges.get(prefix)
      if (!range) {
        if (ranges.size > 0) await sleep(150)
        range = await fetchRangeWithBackoff(prefix)
        ranges.set(prefix, range)
      }
      const count = range.get(hash.slice(5)) ?? 0
      results.set(entry.id, count > 0 ? { status: "breached", count } : { status: "clean" })
    } catch {
      // Reported, never assumed clean.
      results.set(entry.id, { status: "unknown" })
    }
    onProgress?.(i + 1, entries.length)
  }

  return results
}
