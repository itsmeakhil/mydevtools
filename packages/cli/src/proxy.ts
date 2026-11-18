/**
 * Node implementation of the `/api/proxy` envelope the runner and OAuth2 code
 * send through — the desktop app's Rust `http_request` (src-tauri/src/http/
 * proxy.rs) in TypeScript: same redirect walk, metadata-host block, body cap
 * and envelope shape.
 */
import { Agent, FormData, fetch, type Response as UndiciResponse } from "undici"

const METADATA_HOSTS = new Set(["169.254.169.254", "metadata.google.internal", "metadata.google", "100.100.100.200"])
const DEFAULT_MAX_REDIRECTS = 5
const MAX_REDIRECTS_CAP = 50
const CREDENTIAL_HEADERS = new Set(["authorization", "cookie", "proxy-authorization"])
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 600_000
const MAX_BODY_BYTES = 50 * 1024 * 1024

export interface ProxyInput {
    url: string
    method?: string
    headers?: Record<string, string>
    /** string | { mode: "form-data", entries } | { mode: "base64", data } | JSON value */
    body?: unknown
    timeoutMs?: number
    followRedirects?: boolean
    maxRedirects?: number
    verifySsl?: boolean
}

export interface ProxyEnvelope {
    status: number
    statusText: string
    headers: Record<string, string>
    setCookies: string[]
    redirectChain: { url: string; status: number }[]
    body: string
    isBase64: boolean
    time: number
    size: number
    error?: string
}

const fail = (status: number, statusText: string, error: string): ProxyEnvelope => ({
    status, statusText, headers: {}, setCookies: [], redirectChain: [], body: error, isBase64: false, time: 0, size: 0, error,
})

function blockedHop(url: URL): string | null {
    if (url.protocol !== "http:" && url.protocol !== "https:") return `Blocked scheme: ${url.protocol}`
    const host = url.hostname.toLowerCase()
    return METADATA_HOSTS.has(host) ? `Blocked target: ${host}` : null
}

function isTextual(contentType: string): boolean {
    const l = contentType.toLowerCase()
    return l.startsWith("text/") ||
        ["json", "xml", "javascript", "ecmascript", "html", "yaml", "csv", "urlencoded", "graphql", "x-ndjson"].some((t) => l.includes(t))
}

type Body = string | Buffer | FormData | undefined

function buildBody(body: unknown): Body {
    if (body == null) return undefined
    if (typeof body === "string") return body
    const b = body as { mode?: string; entries?: Record<string, string>[]; data?: string }
    if (b.mode === "base64") return Buffer.from(b.data ?? "", "base64")
    if (b.mode === "form-data") {
        const form = new FormData()
        for (const e of b.entries ?? []) {
            if (!e.key) continue
            if (e.type === "file") {
                const blob = new Blob([Buffer.from(e.fileContentBase64 ?? "", "base64")], { type: e.fileType || "application/octet-stream" })
                form.append(e.key, blob, e.fileName || "upload.bin")
            } else {
                form.append(e.key, e.value ?? "")
            }
        }
        return form
    }
    return JSON.stringify(body)
}

/** Message plus causes ("fetch failed: connect ECONNREFUSED …"), like the Rust error chain. */
function errorChain(e: unknown): string {
    const parts: string[] = []
    let cur = e as { message?: string; cause?: unknown } | undefined
    while (cur && parts.length < 5) {
        if (cur.message) parts.push(cur.message)
        cur = cur.cause as typeof cur
    }
    return parts.join(": ") || String(e)
}

async function readCapped(res: UndiciResponse): Promise<Buffer> {
    const declared = Number(res.headers.get("content-length") ?? 0)
    const tooLarge = (n: number) => new Error(`Response body too large (${Math.floor(n / 1048576)} MB, limit ${MAX_BODY_BYTES / 1048576} MB)`)
    if (declared > MAX_BODY_BYTES) {
        await res.body?.cancel()
        throw tooLarge(declared)
    }
    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of (res.body ?? []) as AsyncIterable<Uint8Array>) {
        total += chunk.length
        if (total > MAX_BODY_BYTES) throw tooLarge(total)
        chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

export function createProxy(opts: { insecure?: boolean; defaultTimeoutMs?: number } = {}) {
    // One pooled agent per TLS mode, so a no-verify connection is never reused for a verifying request.
    const secureAgent = new Agent()
    const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })

    const proxy = async (input: ProxyInput): Promise<ProxyEnvelope> => {
        let url: URL
        try { url = new URL(input.url ?? "") } catch { return fail(400, "Bad Request", input.url ? "Invalid URL format" : "URL is required") }
        const blocked = blockedHop(url)
        if (blocked) return fail(403, "Forbidden", blocked)

        let body: Body
        try { body = buildBody(input.body) } catch (e) { return fail(0, "Error", errorChain(e)) }
        const isMultipart = body instanceof FormData
        const follow = input.followRedirects !== false
        const maxRedirects = Math.min(input.maxRedirects ?? DEFAULT_MAX_REDIRECTS, MAX_REDIRECTS_CAP)
        const timeoutMs = Math.min(input.timeoutMs && input.timeoutMs > 0 ? input.timeoutMs : opts.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
        const dispatcher = opts.insecure || input.verifySsl === false ? insecureAgent : secureAgent
        const signal = AbortSignal.timeout(timeoutMs)

        let method = (input.method || "GET").toUpperCase()
        let dropBody = false
        const chain: ProxyEnvelope["redirectChain"] = []
        const started = performance.now()
        // Like curl and browsers: credentials go only to the origin the user addressed.
        const origin = url.origin
        try {
            for (let hop = 0; ; hop++) {
                const headers = Object.entries(input.headers ?? {})
                    // Let undici set the multipart boundary itself.
                    .filter(([k]) => !(isMultipart && k.toLowerCase() === "content-type"))
                    .filter(([k]) => url.origin === origin || !CREDENTIAL_HEADERS.has(k.toLowerCase()))
                const res = await fetch(url, {
                    method,
                    headers,
                    body: !dropBody && method !== "GET" && method !== "HEAD" ? body : undefined,
                    redirect: "manual",
                    dispatcher,
                    signal,
                })
                const location = res.headers.get("location")
                if (follow && res.status >= 300 && res.status < 400 && res.status !== 304 && location) {
                    await res.body?.cancel()
                    if (hop >= maxRedirects) return fail(0, "Error", `Too many redirects (>${maxRedirects})`)
                    chain.push({ url: url.toString(), status: res.status })
                    if (res.status === 303 || ((res.status === 301 || res.status === 302) && method !== "GET" && method !== "HEAD")) {
                        method = "GET"
                        dropBody = true
                    }
                    url = new URL(location, url)
                    const hopBlocked = blockedHop(url)
                    if (hopBlocked) return fail(403, "Forbidden", hopBlocked)
                    continue
                }
                const time = Math.round(performance.now() - started)
                const headersOut: Record<string, string> = {}
                res.headers.forEach((v, k) => { headersOut[k] = v })
                const bytes = await readCapped(res)
                const contentType = res.headers.get("content-type") ?? ""
                const textual = isTextual(contentType)
                return {
                    status: res.status,
                    statusText: res.statusText,
                    headers: headersOut,
                    setCookies: res.headers.getSetCookie(),
                    redirectChain: chain,
                    body: textual ? bytes.toString("utf8") : bytes.toString("base64"),
                    isBase64: !textual,
                    time,
                    size: Number(res.headers.get("content-length")) || bytes.length,
                }
            }
        } catch (e) {
            return fail(0, "Error", signal.aborted ? `Request timed out after ${timeoutMs} ms` : errorChain(e))
        }
    }

    const close = () => Promise.all([secureAgent.close(), insecureAgent.close()])
    return { proxy, close }
}

/**
 * The app's runner and OAuth2 code send through `apiFetch("/api/proxy")`, which
 * outside the desktop window is a plain `fetch("/api/proxy")`. Serve exactly
 * that path from the Node proxy; everything else goes to the real fetch.
 */
export function installProxyFetch(proxy: (input: ProxyInput) => Promise<ProxyEnvelope>): void {
    const real = globalThis.fetch
    const proxied: typeof globalThis.fetch = async (input, init) => {
        if (input === "/api/proxy") {
            const envelope = await proxy(JSON.parse(String(init?.body ?? "{}")))
            return new Response(JSON.stringify(envelope), { headers: { "Content-Type": "application/json" } })
        }
        return real(input, init)
    }
    globalThis.fetch = proxied
}

/** The app's cookie jar lives in localStorage; give the run an in-memory one. */
export function installMemoryStorage(): void {
    const store = new Map<string, string>()
    const storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, String(v)) },
        removeItem: (k: string) => { store.delete(k) },
        clear: () => store.clear(),
    }
    Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true })
    // cookie-jar.ts only touches storage when `window` exists.
    if (typeof (globalThis as { window?: unknown }).window === "undefined") {
        Object.defineProperty(globalThis, "window", { value: {}, configurable: true })
    }
}
