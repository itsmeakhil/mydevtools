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

/** Netscape `cookies.txt` (curl `-b`/`-c`, browser extensions). Our cookies always match subdomains. */
export function toNetscapeCookies(cookies: StoredCookie[]): string {
    const lines = cookies.map((c) => [
        `${c.httpOnly ? "#HttpOnly_" : ""}.${normaliseDomain(c.domain)}`,
        "TRUE",
        c.path || "/",
        c.secure ? "TRUE" : "FALSE",
        c.expires != null ? String(Math.floor(c.expires / 1000)) : "0",
        c.name,
        c.value,
    ].join("\t"))
    return ["# Netscape HTTP Cookie File", ...lines, ""].join("\n")
}

function sameSiteOf(v: unknown): StoredCookie["sameSite"] {
    const l = String(v ?? "").toLowerCase()
    return l === "strict" ? "Strict" : l === "lax" ? "Lax" : l === "none" || l === "no_restriction" ? "None" : undefined
}

/**
 * Parse a cookie file: our JSON export, a browser-extension JSON export
 * (`expirationDate` in seconds), or Netscape `cookies.txt`. Rows without a
 * name or domain are skipped.
 */
export function parseCookieFile(text: string): StoredCookie[] {
    const trimmed = text.trim()
    const out: StoredCookie[] = []
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        let data: unknown
        try { data = JSON.parse(trimmed) } catch { return [] }
        const rows = Array.isArray(data) ? data : (data as { cookies?: unknown }).cookies
        if (!Array.isArray(rows)) return []
        for (const r of rows as Record<string, unknown>[]) {
            if (!r || typeof r.name !== "string" || !r.name || typeof r.domain !== "string" || !r.domain) continue
            const expires = typeof r.expires === "number" ? r.expires
                : typeof r.expirationDate === "number" ? Math.round(r.expirationDate * 1000) : undefined
            out.push({
                name: r.name,
                value: typeof r.value === "string" ? r.value : "",
                domain: normaliseDomain(r.domain),
                path: typeof r.path === "string" && r.path ? r.path : "/",
                expires,
                secure: r.secure === true || undefined,
                httpOnly: r.httpOnly === true || undefined,
                sameSite: sameSiteOf(r.sameSite),
            })
        }
        return out
    }
    for (const raw of trimmed.split(/\r?\n/)) {
        let line = raw
        let httpOnly = false
        if (line.startsWith("#HttpOnly_")) { line = line.slice(10); httpOnly = true }
        if (!line || line.startsWith("#")) continue
        const f = line.split("\t")
        if (f.length < 7 || !f[0] || !f[5]) continue
        const exp = Number(f[4])
        out.push({
            name: f[5],
            value: f.slice(6).join("\t"),
            domain: normaliseDomain(f[0]),
            path: f[2] || "/",
            expires: Number.isFinite(exp) && exp > 0 ? exp * 1000 : undefined,
            secure: f[3].toUpperCase() === "TRUE" || undefined,
            httpOnly: httpOnly || undefined,
        })
    }
    return out
}

/** Upsert cookies into the jar (expired ones skipped). Returns how many were stored. */
export function importCookies(cookies: StoredCookie[]): number {
    const jar = readJar()
    let n = 0
    for (const c of cookies) {
        if (isExpired(c)) continue
        upsert(jar, c)
        n++
    }
    writeJar(jar)
    return n
}
