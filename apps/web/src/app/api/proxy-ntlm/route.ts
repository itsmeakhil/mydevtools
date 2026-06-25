/**
 * NTLMv2-aware proxy. Runs the three-step handshake against an upstream HTTP
 * endpoint and returns the final response.
 *
 * Standard NTLM HTTP exchange (RFC 4559 + [MS-NLMP]):
 *   1. Client → proxy (this route) with credentials in the body
 *   2. Proxy → upstream: original request + `Authorization: NTLM <Type1>`
 *   3. Upstream → proxy: `401 Unauthorized` + `WWW-Authenticate: NTLM <Type2>`
 *   4. Proxy → upstream: same request + `Authorization: NTLM <Type3>` ON THE SAME TCP CONNECTION
 *   5. Upstream → proxy: real response (200/etc.)
 *
 * Step 4's connection affinity is critical — IIS / SharePoint enforce it.
 * We use undici's `Agent` with `pipelining: 1, connections: 1` so both fetches
 * land on the same dispatcher and (in practice) the same keepalive socket.
 */

import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"
import { Agent, fetch as undiciFetch } from "undici"
import { createType1Message, parseType2Message, createType3Message } from "@/lib/auth/ntlm"

export const runtime = "nodejs"
export const maxDuration = 60

function isSSRFTarget(hostname: string): boolean {
    const hl = hostname.toLowerCase()
    if (process.env.NODE_ENV !== "production") {
        return ["169.254.169.254", "metadata.google.internal"].includes(hl)
    }
    if (hl === "localhost" || hl.endsWith(".localhost")) return true
    if (hl.endsWith(".local") || hl.endsWith(".internal")) return true
    const parts = hostname.split(".")
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
        const a = Number(parts[0]), b = Number(parts[1])
        if (a === 10) return true
        if (a === 172 && b >= 16 && b <= 31) return true
        if (a === 192 && b === 168) return true
        if (a === 127) return true
    }
    return false
}

function parseNtlmChallenge(wwwAuth: string | null): string | null {
    if (!wwwAuth) return null
    // Header may carry several schemes: `Negotiate, NTLM <b64>`.
    for (const part of wwwAuth.split(",")) {
        const trimmed = part.trim()
        if (/^NTLM\s+/i.test(trimmed)) {
            return trimmed.replace(/^NTLM\s+/i, "").trim()
        }
    }
    return null
}

export async function POST(req: NextRequest) {
    try {
        const authError = await requireBackendSession(req)
        if (authError) return authError

        const { url, method, headers, body, ntlm } = await req.json() as {
            url: string
            method: string
            headers?: Record<string, string>
            body?: string
            ntlm: { username: string; password: string; domain?: string; workstation?: string }
        }

        if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })
        if (!ntlm?.username || !ntlm?.password) {
            return NextResponse.json({ error: "ntlm.username and ntlm.password are required" }, { status: 400 })
        }
        let parsed: URL
        try { parsed = new URL(url) } catch {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return NextResponse.json({ error: "Only HTTP(S) URLs are allowed" }, { status: 403 })
        }
        if (isSSRFTarget(parsed.hostname)) {
            return NextResponse.json({ error: "Blocked by SSRF protection" }, { status: 403 })
        }

        // One agent for the whole handshake — pins both fetches to the same TCP socket.
        const agent = new Agent({
            keepAliveTimeout: 30_000,
            keepAliveMaxTimeout: 60_000,
            pipelining: 1,
            connections: 1,
        })

        const baseHeaders: Record<string, string> = { ...(headers ?? {}) }
        // Drop any Authorization the user pre-filled — NTLM owns this header.
        for (const k of Object.keys(baseHeaders)) {
            if (k.toLowerCase() === "authorization") delete baseHeaders[k]
        }

        const startTime = performance.now()

        // ── Step 1: send Type1 ──
        const type1 = createType1Message(ntlm.domain ?? "", ntlm.workstation ?? "")
        const res1 = await undiciFetch(url, {
            method,
            headers: { ...baseHeaders, Authorization: `NTLM ${type1}` },
            body: body && method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD" ? body : undefined,
            dispatcher: agent,
        })

        if (res1.status !== 401) {
            // Server did not challenge — return what we got.
            const respHeaders: Record<string, string> = {}
            res1.headers.forEach((v: string, k: string) => { respHeaders[k] = v })
            return NextResponse.json({
                status: res1.status,
                statusText: res1.statusText,
                headers: respHeaders,
                body: await res1.text(),
                time: Math.round(performance.now() - startTime),
                size: 0,
                handshake: "skipped",
            })
        }

        // ── Step 2: parse Type2 ──
        const wwwAuth = res1.headers.get("www-authenticate")
        const type2B64 = parseNtlmChallenge(wwwAuth)
        if (!type2B64) {
            return NextResponse.json({
                error: "Server returned 401 but no NTLM challenge in WWW-Authenticate",
                wwwAuthenticate: wwwAuth,
            }, { status: 502 })
        }
        // Drain the Type2 response body so the connection is ready for the next request.
        await res1.body?.cancel().catch(() => { /* noop */ })

        const type2 = parseType2Message(type2B64)

        // ── Step 3: send Type3 on same dispatcher ──
        const type3 = createType3Message({
            type2,
            username: ntlm.username,
            password: ntlm.password,
            domain: ntlm.domain,
            workstation: ntlm.workstation,
        })
        const res2 = await undiciFetch(url, {
            method,
            headers: { ...baseHeaders, Authorization: `NTLM ${type3}` },
            body: body && method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD" ? body : undefined,
            dispatcher: agent,
        })

        const respHeaders: Record<string, string> = {}
        res2.headers.forEach((v: string, k: string) => { respHeaders[k] = v })
        const text = await res2.text()
        const elapsed = Math.round(performance.now() - startTime)

        await agent.close().catch(() => { /* noop */ })

        return NextResponse.json({
            status: res2.status,
            statusText: res2.statusText,
            headers: respHeaders,
            body: text,
            time: elapsed,
            size: text.length,
            handshake: "ntlmv2",
        })
    } catch (error) {
        const err = error as Error
        return NextResponse.json({
            status: 0,
            statusText: "Error",
            headers: {},
            body: err.message,
            error: err.message,
        }, { status: 500 })
    }
}
