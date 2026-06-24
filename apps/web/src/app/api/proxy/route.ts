import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"

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

export async function POST(req: NextRequest) {
    try {
        const authError = await requireBackendSession(req)
        if (authError) return authError

        const { url, method, headers, body } = await req.json()

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

        // ── SSRF guard: block internal/metadata IPs ──────────────────────────
        if (isBlockedRequestTarget(parsed.hostname, parsed.host)) {
            return NextResponse.json({
                status: 403,
                statusText: "Forbidden",
                headers: {},
                body: "Requests to internal/private addresses are not allowed",
                time: 0,
                size: 0,
                error: "Blocked by SSRF protection",
            })
        }

        // ── Only allow file:// and other dangerous schemes to be blocked ─────
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return NextResponse.json({
                status: 403,
                statusText: "Forbidden",
                headers: {},
                body: "Only HTTP(S) URLs are allowed",
                time: 0,
                size: 0,
                error: "Blocked protocol",
            })
        }

        const startTime = performance.now()

        const PROXY_TIMEOUT_MS = 30_000
        const proxyController = new AbortController()
        const proxyTimeout = setTimeout(() => proxyController.abort(), PROXY_TIMEOUT_MS)

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

        let requestBody: BodyInit | undefined = body || undefined

        if (body && typeof body === "object" && body.mode === "form-data" && Array.isArray(body.entries)) {
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

            requestBody = form
            const contentTypeKey = Object.keys(requestHeaders).find((key) => key.toLowerCase() === "content-type")
            if (contentTypeKey) {
                delete requestHeaders[contentTypeKey]
            }
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: requestBody,
            signal: proxyController.signal,
        }).finally(() => {
            clearTimeout(proxyTimeout)
            req.signal.removeEventListener("abort", onClientAbort)
        })

        const endTime = performance.now()
        const time = Math.round(endTime - startTime)

        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value
        })

        const contentType = response.headers.get("content-type") || ""
        let responseBody: string
        let isBase64 = false

        if (contentType.includes("image/") || contentType.includes("application/pdf") || contentType.includes("audio/") || contentType.includes("video/")) {
            const buffer = await response.arrayBuffer()
            responseBody = Buffer.from(buffer).toString("base64")
            isBase64 = true
        } else {
            responseBody = await response.text()
        }

        const size = Number(response.headers.get("content-length")) || (isBase64 ? Buffer.from(responseBody, "base64").length : responseBody.length)

        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
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
