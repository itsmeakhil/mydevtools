/**
 * Client-side cookie jar for the API client.
 *
 * The browser's own cookie store can't help here — fetches go through our
 * proxy, target arbitrary hosts, and many real APIs use `HttpOnly` cookies
 * the page would never see. We mimic curl-style cookie persistence:
 * parse `Set-Cookie` from each response, store by (domain, path, name), and
 * send back matching cookies on subsequent requests to the same domain.
 *
 * Storage is localStorage keyed by user — anonymous users get a single shared
 * jar; signed-in users move to backend persistence in a later batch.
 */

const STORAGE_KEY = "api-client-cookie-jar"

export interface StoredCookie {
    name: string
    value: string
    domain: string
    path: string
    /** Epoch ms. `undefined` ⇒ session cookie (never persisted past tab close in spirit;
     *  we keep them in localStorage anyway since this app's tab IS the session). */
    expires?: number
    secure?: boolean
    httpOnly?: boolean
    sameSite?: "Strict" | "Lax" | "None"
}

interface CookieJarShape {
    cookies: StoredCookie[]
}

function readJar(): CookieJarShape {
    if (typeof window === "undefined") return { cookies: [] }
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { cookies: [] }
        const parsed = JSON.parse(raw) as CookieJarShape
        if (!parsed.cookies || !Array.isArray(parsed.cookies)) return { cookies: [] }
        return parsed
    } catch {
        return { cookies: [] }
    }
}

function writeJar(jar: CookieJarShape): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jar))
    } catch {
        // QuotaExceeded — drop the entire jar rather than ship half a write.
        try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
    }
}

/** Normalise a domain like `.example.com` → `example.com` for matching. */
function normaliseDomain(d: string): string {
    return d.replace(/^\./, "").toLowerCase()
}

/** Cookie domain-matches the request host per RFC 6265 §5.1.3. */
function domainMatches(reqHost: string, cookieDomain: string): boolean {
    const host = reqHost.toLowerCase()
    const cd = normaliseDomain(cookieDomain)
    if (host === cd) return true
    return host.endsWith("." + cd)
}

/** Cookie path-matches the request path per RFC 6265 §5.1.4. */
function pathMatches(reqPath: string, cookiePath: string): boolean {
    if (cookiePath === "/" || reqPath === cookiePath) return true
    if (reqPath.startsWith(cookiePath)) {
        return cookiePath.endsWith("/") || reqPath[cookiePath.length] === "/"
    }
    return false
}

function isExpired(c: StoredCookie): boolean {
    return c.expires != null && c.expires <= Date.now()
}

/** Parse a single `Set-Cookie` header into a StoredCookie. Returns null on garbage. */
export function parseSetCookie(raw: string, requestUrl: string): StoredCookie | null {
    const parts = raw.split(";").map((s) => s.trim())
    const nv = parts[0] ?? ""
    const eq = nv.indexOf("=")
    if (eq < 0) return null
    const name = nv.slice(0, eq).trim()
    const value = nv.slice(eq + 1)
    if (!name) return null

    let domain: string | undefined
    let path: string | undefined
    let expires: number | undefined
    let maxAge: number | undefined
    let secure = false
    let httpOnly = false
    let sameSite: StoredCookie["sameSite"] | undefined

    for (const attr of parts.slice(1)) {
        const lower = attr.toLowerCase()
        if (lower === "httponly") httpOnly = true
        else if (lower === "secure") secure = true
        else if (lower.startsWith("path=")) path = attr.slice(5)
        else if (lower.startsWith("domain=")) domain = attr.slice(7)
        else if (lower.startsWith("expires=")) {
            const d = new Date(attr.slice(8))
            if (!isNaN(d.getTime())) expires = d.getTime()
        }
        else if (lower.startsWith("max-age=")) {
            const n = Number(attr.slice(8))
            if (Number.isFinite(n)) maxAge = n
        }
        else if (lower.startsWith("samesite=")) {
            const v = attr.slice(9).trim().toLowerCase()
            if (v === "strict") sameSite = "Strict"
            else if (v === "lax") sameSite = "Lax"
            else if (v === "none") sameSite = "None"
        }
    }

    // Max-Age takes precedence over Expires per RFC.
    if (maxAge != null) expires = Date.now() + maxAge * 1000

    let url: URL
    try { url = new URL(requestUrl) } catch { return null }
    return {
        name,
        value,
        domain: domain ? normaliseDomain(domain) : url.hostname.toLowerCase(),
        path: path ?? "/",
        expires,
        secure: secure || undefined,
        httpOnly: httpOnly || undefined,
        sameSite,
    }
}

/** Upsert: if a cookie with same (name, domain, path) exists, replace it. */
function upsert(jar: CookieJarShape, c: StoredCookie): void {
    const idx = jar.cookies.findIndex(
        (x) => x.name === c.name && x.domain === c.domain && x.path === c.path,
    )
    if (idx >= 0) jar.cookies[idx] = c
    else jar.cookies.push(c)
}

/**
 * Store every `Set-Cookie` header value from a response into the jar.
 * Expired cookies (`Max-Age=0` or past `Expires`) act as deletions per RFC.
 */
export function storeCookiesFromResponse(requestUrl: string, setCookies: string[]): void {
    if (!setCookies || setCookies.length === 0) return
    const jar = readJar()
    for (const raw of setCookies) {
        const c = parseSetCookie(raw, requestUrl)
        if (!c) continue
        if (isExpired(c)) {
            jar.cookies = jar.cookies.filter(
                (x) => !(x.name === c.name && x.domain === c.domain && x.path === c.path),
            )
            continue
        }
        upsert(jar, c)
    }
    writeJar(jar)
}

/** Return the `Cookie:` header value for a request URL — empty string when nothing matches. */
export function cookieHeaderForUrl(requestUrl: string): string {
    let url: URL
    try { url = new URL(requestUrl) } catch { return "" }
    const jar = readJar()
    const isHttps = url.protocol === "https:"

    const matches = jar.cookies
        .filter((c) => !isExpired(c))
        .filter((c) => domainMatches(url.hostname, c.domain))
        .filter((c) => pathMatches(url.pathname || "/", c.path))
        .filter((c) => !c.secure || isHttps)
    return matches.map((c) => `${c.name}=${c.value}`).join("; ")
}

export function listCookies(): StoredCookie[] {
    return readJar().cookies.filter((c) => !isExpired(c))
}

export function deleteCookie(name: string, domain: string, path: string): void {
    const jar = readJar()
    jar.cookies = jar.cookies.filter(
        (c) => !(c.name === name && c.domain === domain && c.path === path),
    )
    writeJar(jar)
}

export function clearCookies(domain?: string): void {
    const jar = readJar()
    jar.cookies = domain
        ? jar.cookies.filter((c) => c.domain !== normaliseDomain(domain))
        : []
    writeJar(jar)
}

/** Inspector-friendly export — opt-in for the management UI. */
export function exportJar(): StoredCookie[] {
    return [...readJar().cookies]
}
