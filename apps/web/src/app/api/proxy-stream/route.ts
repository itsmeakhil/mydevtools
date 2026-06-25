/**
 * Streaming proxy for SSE and other long-lived response bodies.
 *
 * Same SSRF + auth guards as the JSON proxy, but the upstream response body
 * is forwarded directly as a ReadableStream — no `await response.text()` that
 * would coalesce the whole thing into a single buffer (and block the live
 * `text/event-stream` semantics).
 *
 * Upstream status/headers ride along on `X-Mdt-Upstream-*` response headers so
 * the client can render them without having to peek into the body stream.
 */

import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 300

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000"

function getAllowedHost(): string {
    try { return new URL(FASTAPI_BASE_URL).host } catch { return "localhost:8000" }
}

const ALLOWED_HOST = getAllowedHost()

function allowPrivateProxyTargets(): boolean {
    return (
        (process.env.ALLOW_PRIVATE_PROXY_TARGETS || "").toLowerCase() === "true" ||
        process.env.NODE_ENV !== "production"
    )
}

function isBlockedRequestTarget(hostname: string, host: string): boolean {
    if (host === ALLOWED_HOST) return false
    const hl = hostname.toLowerCase()
    if (allowPrivateProxyTargets()) {
        const meta = ["169.254.169.254", "metadata.google.internal", "metadata.google", "100.100.100.200"]
        return meta.includes(hl)
    }
    const ipv6Bare = hl.replace(/^\[|\]$/g, "")
    const probablyIpv6 = hl.includes(":")
    if (hl === "localhost" || hl.endsWith(".localhost")) return true
    if (hl.endsWith(".local") || hl.endsWith(".internal")) return true
    if (ipv6Bare === "::1") return true
    if (probablyIpv6 && (ipv6Bare.startsWith("fe80:") || ipv6Bare.startsWith("fc") || ipv6Bare.startsWith("fd"))) return true
    const parts = hostname.split(".")
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
        const a = parseInt(parts[0]!), b = parseInt(parts[1]!)
        if (a === 10) return true
        if (a === 172 && b >= 16 && b <= 31) return true
        if (a === 192 && b === 168) return true
        if (a === 127) return true
        if (a === 0) return true
    }
    return false
}

export async function POST(req: NextRequest) {
    try {
        const authError = await requireBackendSession(req)
        if (authError) return authError

        const { url, method, headers, body } = await req.json()
        if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

        let parsed: URL
        try { parsed = new URL(url) } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
        }
        if (isBlockedRequestTarget(parsed.hostname, parsed.host)) {
            return NextResponse.json({ error: "Blocked by SSRF protection" }, { status: 403 })
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return NextResponse.json({ error: "Only HTTP(S) URLs are allowed" }, { status: 403 })
        }

        const proxyController = new AbortController()
        // Tear the upstream connection down if the client gives up (tab close, navigation).
        req.signal.addEventListener("abort", () => proxyController.abort(), { once: true })

        const upstreamRes = await fetch(url, {
            method,
            headers: headers ?? {},
            body: body && typeof body === "string" ? body : undefined,
            signal: proxyController.signal,
        })

        // Squash upstream headers into JSON we can ship on a single response header.
        const upstreamHeaders: Record<string, string> = {}
        upstreamRes.headers.forEach((v, k) => { upstreamHeaders[k] = v })
        // Keep encoded header header under the 16KB typical limit.
        const headersBlob = JSON.stringify(upstreamHeaders)
        const headersForClient = headersBlob.length < 12_000 ? headersBlob : "{}"

        const out: Record<string, string> = {
            "Content-Type": upstreamRes.headers.get("content-type") ?? "application/octet-stream",
            "X-Mdt-Upstream-Status": String(upstreamRes.status),
            "X-Mdt-Upstream-Status-Text": upstreamRes.statusText,
            "X-Mdt-Upstream-Headers": headersForClient,
            // Disable buffering on Nginx + similar reverse proxies so SSE stays live.
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache, no-transform",
        }

        return new NextResponse(upstreamRes.body, {
            status: 200,
            headers: out,
        })
    } catch (error) {
        const err = error as Error
        if (req.signal.aborted || err?.name === "AbortError") {
            return new NextResponse(null, { status: 499 })
        }
        return NextResponse.json({ error: err.message }, { status: 502 })
    }
}
