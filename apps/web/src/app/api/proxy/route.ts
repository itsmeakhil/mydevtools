import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"

// Node runtime + raised wall-clock budget so big multipart bodies and slow upstreams
// don't get cut off by the platform's default 10s edge limit.
export const runtime = "nodejs"
export const maxDuration = 60

// ── SSRF Protection: only allow proxying to the configured backend ────────────
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000"

/** Resolve the allowed backend host once at module load. */
function getAllowedHost(): string {
    try {
        return new URL(FASTAPI_BASE_URL).host
    } catch {
        return "localhost:8000"
    }
}

const ALLOWED_HOST = getAllowedHost()

const DEFAULT_PROXY_TIMEOUT_MS = 30_000
const MAX_PROXY_TIMEOUT_MS = 55_000  // stay under `maxDuration` so we surface a timeout, not a 504
const MAX_REDIRECTS = Number(process.env.PROXY_MAX_REDIRECTS ?? 5)

/** Pick an effective per-request timeout, clamped to the platform budget. */
function resolveTimeoutMs(userValue: unknown): number {
    const n = Number(userValue)
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_PROXY_TIMEOUT_MS
    return Math.min(Math.floor(n), MAX_PROXY_TIMEOUT_MS)
}

/**
 * Heuristic: is this content-type safe to decode as UTF-8 text?
 * Default to base64 for anything else — zip/xlsx/fonts/octet-stream were previously
 * returned as garbled text strings.
 */
function isTextualContentType(ct: string): boolean {
    if (!ct) return false
    const lower = ct.toLowerCase()
    if (lower.startsWith("text/")) return true
    if (lower.includes("json")) return true
    if (lower.includes("xml")) return true
    if (lower.includes("javascript") || lower.includes("ecmascript")) return true
    if (lower.includes("html")) return true
    if (lower.includes("yaml")) return true
    if (lower.includes("csv")) return true
    if (lower.includes("urlencoded")) return true
    if (lower.includes("graphql")) return true
    if (lower.includes("x-ndjson")) return true
    return false
}

/** In `next dev`, NODE_ENV is `development` — allow localhost/private targets without extra env (metadata still blocked). */
function allowPrivateProxyTargets(): boolean {
    return (
        (process.env.ALLOW_PRIVATE_PROXY_TARGETS || "").toLowerCase() === "true" ||
        process.env.NODE_ENV !== "production"
    )
}

/**
 * Block SSRF-prone targets. Always allows the configured FastAPI host (port must match).
 * In non-production, allows localhost/private IPs except well-known metadata endpoints.
 */
function isBlockedRequestTarget(hostname: string, host: string): boolean {
    if (host === ALLOWED_HOST) {
        return false
    }

    const hl = hostname.toLowerCase()

    if (allowPrivateProxyTargets()) {
        const metadataHosts = [
            "169.254.169.254",
            "metadata.google.internal",
            "metadata.google",
            "100.100.100.200",
        ]
        return metadataHosts.some((b) => hl === b)
    }

    const ipv6Bare = hl.replace(/^\[|\]$/g, "")
    const probablyIpv6 = hl.includes(":")

    if (hl === "localhost" || hl.endsWith(".localhost")) return true
    if (hl.endsWith(".local")) return true
    if (hl.endsWith(".internal")) return true
    if (ipv6Bare === "::1") return true
    if (probablyIpv6) {
        if (ipv6Bare.startsWith("fe80:")) return true
        if (ipv6Bare.startsWith("fc") || ipv6Bare.startsWith("fd")) return true
    }

    // Block common internal/metadata endpoints
    const blocked = [
        "169.254.169.254",  // AWS/GCP metadata
        "metadata.google.internal",
        "metadata.google",
        "100.100.100.200",  // Alibaba metadata
        "fd00::",
        "[::1]",
        "0.0.0.0",
    ]
    if (blocked.some((b) => hostname === b)) return true

    // Block private IP ranges
    const parts = hostname.split(".")
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
        const a = parseInt(parts[0]!)
        const b = parseInt(parts[1]!)
        if (a === 10) return true                           // 10.0.0.0/8
        if (a === 172 && b >= 16 && b <= 31) return true    // 172.16.0.0/12
        if (a === 192 && b === 168) return true             // 192.168.0.0/16
        if (a === 127) return true                          // 127.0.0.0/8
        if (a === 0) return true                            // 0.0.0.0/8
    }

    return false
}

/** Apply both guards (SSRF + scheme) consistently for every hop. Throws on block. */
function assertHopAllowed(parsed: URL): void {
    if (isBlockedRequestTarget(parsed.hostname, parsed.host)) {
        throw new ProxyHopBlockedError(`Blocked target: ${parsed.hostname}`)
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new ProxyHopBlockedError(`Blocked scheme: ${parsed.protocol}`)
    }
}

class ProxyHopBlockedError extends Error {
    readonly isProxyBlock = true
}

interface RedirectHop {
    url: string
    status: number
}

interface FetchWithRedirectsResult {
    response: Response
    finalUrl: string
    /** All hops walked BEFORE the final response. Final hop not included. */
    chain: RedirectHop[]
}

/**
 * Manual redirect follower so each hop runs through `isBlockedRequestTarget`.
 * Default `fetch` (redirect: "follow") resolves redirects inside undici without
 * giving us a chance to inspect — an open-redirect on the target host could land
 * us on `169.254.169.254` or another internal IP.
 */
async function fetchFollowingRedirects(args: {
    initialUrl: string
    method: string
    headers: Record<string, string>
    buildBody: () => BodyInit | undefined
    signal: AbortSignal
}): Promise<FetchWithRedirectsResult> {
    const { initialUrl, headers, buildBody, signal } = args
    const chain: RedirectHop[] = []
    let currentUrl = initialUrl
    let currentMethod = args.method
    let dropBody = false

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const parsed = new URL(currentUrl)
        assertHopAllowed(parsed)

        const useBody =
            !dropBody && currentMethod !== "GET" && currentMethod !== "HEAD"
                ? buildBody()
                : undefined

        const response = await fetch(currentUrl, {
            method: currentMethod,
            headers,
            body: useBody,
            redirect: "manual",
            signal,
        })

        const isRedirect = response.status >= 300 && response.status < 400 && response.status !== 304
        if (!isRedirect) {
            return { response, finalUrl: currentUrl, chain }
        }

        const location = response.headers.get("location")
        if (!location) {
            // 30x without Location — treat as terminal.
            return { response, finalUrl: currentUrl, chain }
        }

        chain.push({ url: currentUrl, status: response.status })

        const nextUrl = new URL(location, currentUrl).toString()

        // RFC 7231 §6.4.4: 303 always switches to GET and drops the body.
        // 301/302 historically (and matching browser fetch) switch POST/PUT/… to GET.
        // 307/308 preserve both method and body.
        if (response.status === 303) {
            currentMethod = "GET"
            dropBody = true
        } else if (
            (response.status === 301 || response.status === 302) &&
            currentMethod !== "GET" &&
            currentMethod !== "HEAD"
        ) {
            currentMethod = "GET"
            dropBody = true
        }

        currentUrl = nextUrl
    }

    throw new ProxyHopBlockedError(`Too many redirects (>${MAX_REDIRECTS})`)
}

/** Pull every Set-Cookie header as a discrete entry — Fetch joins them with ", " otherwise. */
function readSetCookies(headers: Headers): string[] {
    type WithGetSetCookie = Headers & { getSetCookie?: () => string[] }
    const h = headers as WithGetSetCookie
    if (typeof h.getSetCookie === "function") {
        return h.getSetCookie()
    }
    const joined = headers.get("set-cookie")
    // Fallback for older runtimes — best-effort, single entry.
    return joined ? [joined] : []
}

export async function POST(req: NextRequest) {
    try {
        const authError = await requireBackendSession(req)
        if (authError) return authError

        const { url, method, headers, body, timeoutMs } = await req.json()

        if (!url) {
            return NextResponse.json({
                status: 400,
                statusText: "Bad Request",
                headers: {},
                body: "URL is required",
                time: 0,
                size: 0,
                error: "URL is required",
            })
        }

        let parsed: URL
        try {
            parsed = new URL(url)
        } catch {
            return NextResponse.json({
                status: 400,
                statusText: "Bad Request",
                headers: {},
                body: "Invalid URL format",
                time: 0,
                size: 0,
                error: "Invalid URL format",
            })
        }

        try {
            assertHopAllowed(parsed)
        } catch (e) {
            const msg = (e as Error).message
            return NextResponse.json({
                status: 403,
                statusText: "Forbidden",
                headers: {},
                body: msg.startsWith("Blocked scheme")
                    ? "Only HTTP(S) URLs are allowed"
                    : "Requests to internal/private addresses are not allowed",
                time: 0,
                size: 0,
                error: msg,
            })
        }

        const startTime = performance.now()

        const effectiveTimeoutMs = resolveTimeoutMs(timeoutMs)
        const proxyController = new AbortController()
        const proxyTimeout = setTimeout(() => proxyController.abort(), effectiveTimeoutMs)

        // Propagate client disconnect (Strict Mode unmount, navigation) to upstream so
        // we don't keep reading a response no one will receive.
        const onClientAbort = () => proxyController.abort()
        req.signal.addEventListener("abort", onClientAbort, { once: true })

        const requestHeaders = { ...(headers || {}) } as Record<string, string>

        // ── Cookie forwarding: ONLY forward cookies to the trusted backend ───
        const isBackendRequest = parsed.host === ALLOWED_HOST
        const incomingCookie = req.headers.get("cookie")
        if (isBackendRequest && incomingCookie && !Object.keys(requestHeaders).some((k) => k.toLowerCase() === "cookie")) {
            requestHeaders["cookie"] = incomingCookie
        }

        // For trusted backend calls only, forward the real client's User-Agent + IP so the
        // audit log records the actual device (not this server's fetch agent). Never leak
        // these to arbitrary SSRF-checked targets.
        if (isBackendRequest) {
            const hasHeader = (name: string) =>
                Object.keys(requestHeaders).some((k) => k.toLowerCase() === name)
            const userAgent = req.headers.get("user-agent")
            if (userAgent && !hasHeader("user-agent")) requestHeaders["user-agent"] = userAgent
            const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")
            if (forwardedFor && !hasHeader("x-forwarded-for")) requestHeaders["x-forwarded-for"] = forwardedFor
        }

        // Body builder: called per hop so 307/308 redirects can re-emit the same payload
        // (FormData streams are consumed after one fetch and can't be reused directly).
        const isMultipart =
            body && typeof body === "object" && body.mode === "form-data" && Array.isArray(body.entries)

        const buildBody = (): BodyInit | undefined => {
            if (!body) return undefined
            if (!isMultipart) return body as BodyInit
            const form = new FormData()
            for (const entry of body.entries) {
                if (!entry?.key) continue
                if (entry.type === "file") {
                    if (!entry.fileContentBase64) continue
                    const fileBuffer = Buffer.from(entry.fileContentBase64, "base64")
                    const blob = new Blob([fileBuffer], { type: entry.fileType || "application/octet-stream" })
                    form.append(entry.key, blob, entry.fileName || "upload.bin")
                } else {
                    form.append(entry.key, entry.value || "")
                }
            }
            return form
        }

        if (isMultipart) {
            // Let undici set the multipart Content-Type with its own boundary.
            const contentTypeKey = Object.keys(requestHeaders).find((key) => key.toLowerCase() === "content-type")
            if (contentTypeKey) delete requestHeaders[contentTypeKey]
        }

        let walked: FetchWithRedirectsResult
        try {
            walked = await fetchFollowingRedirects({
                initialUrl: url,
                method,
                headers: requestHeaders,
                buildBody,
                signal: proxyController.signal,
            })
        } finally {
            clearTimeout(proxyTimeout)
            req.signal.removeEventListener("abort", onClientAbort)
        }

        const { response, chain: redirectChain } = walked
        const endTime = performance.now()
        const time = Math.round(endTime - startTime)

        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value
        })

        const setCookies = readSetCookies(response.headers)

        const contentType = response.headers.get("content-type") || ""
        let responseBody: string
        let isBase64 = false

        if (isTextualContentType(contentType)) {
            responseBody = await response.text()
        } else {
            // Everything non-textual (octet-stream, zip/xlsx/font/protobuf/binary, also
            // missing content-type) goes through base64 so the client gets faithful bytes
            // it can preview-or-download instead of UTF-8-mangled garbage.
            const buffer = await response.arrayBuffer()
            responseBody = Buffer.from(buffer).toString("base64")
            isBase64 = true
        }

        const declaredLength = Number(response.headers.get("content-length"))
        const size = Number.isFinite(declaredLength) && declaredLength > 0
            ? declaredLength
            : isBase64
                ? Buffer.from(responseBody, "base64").length
                : Buffer.byteLength(responseBody, "utf8")

        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            setCookies,
            redirectChain,
            body: responseBody,
            isBase64,
            time,
            size,
        })

    } catch (error) {
        const err = error as Error
        // Client aborted (Strict Mode unmount, navigation) — no point returning a body,
        // and trying to write one triggers Next's "ReadableStream is locked" pipe error.
        if (req.signal.aborted || err?.name === "AbortError") {
            return new NextResponse(null, { status: 499 })
        }
        if (err instanceof ProxyHopBlockedError) {
            return NextResponse.json({
                status: 403,
                statusText: "Forbidden",
                headers: {},
                body: err.message,
                time: 0,
                size: 0,
                error: err.message,
            })
        }
        return NextResponse.json({
            status: 0,
            statusText: "Error",
            headers: {},
            body: err.message,
            time: 0,
            size: 0,
            error: err.message,
        })
    }
}
