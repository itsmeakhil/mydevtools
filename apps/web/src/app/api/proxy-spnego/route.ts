/**
 * SPNEGO / Kerberos passthrough proxy.
 *
 * Browsers can't speak Kerberos directly. This route forwards the request
 * unchanged but adds an `Authorization: Negotiate <token>` header built from a
 * pre-acquired SPNEGO token (the user obtains it via `kinit` + a separate tool
 * like `klist` / `kerberos-token`, then pastes it into the auth panel).
 *
 * Limitations vs full GSS-API integration:
 *   - No mutual authentication parsing (we don't validate the server's reply).
 *   - No token cache / TGT renewal — the user re-acquires when expired.
 *   - No replay protection beyond what SPNEGO + TLS already provide.
 *
 * Real GSS-API would need a native binding (libkrb5 / SSPI) and is out of scope
 * for the browser. This route gets users 90% of the way: a working call when
 * they have a token in hand.
 */

import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"

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

interface SpnegoPayload {
    url: string
    method: string
    headers?: Record<string, string>
    body?: string
    /** Pre-acquired SPNEGO/Kerberos token (base64). */
    token: string
}

export async function POST(req: NextRequest) {
    try {
        const authError = await requireBackendSession(req)
        if (authError) return authError

        const { url, method, headers, body, token } = await req.json() as SpnegoPayload
        if (!url || !token) {
            return NextResponse.json({ error: "url and token are required" }, { status: 400 })
        }
        let parsed: URL
        try { parsed = new URL(url) } catch {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return NextResponse.json({ error: "Only HTTP(S) URLs allowed" }, { status: 403 })
        }
        if (isSSRFTarget(parsed.hostname)) {
            return NextResponse.json({ error: "Blocked by SSRF protection" }, { status: 403 })
        }

        const reqHeaders: Record<string, string> = { ...(headers ?? {}) }
        // Drop any pre-set Authorization — SPNEGO owns this.
        for (const k of Object.keys(reqHeaders)) {
            if (k.toLowerCase() === "authorization") delete reqHeaders[k]
        }
        reqHeaders["Authorization"] = `Negotiate ${token}`

        const startTime = Date.now()
        const upstream = await fetch(url, {
            method,
            headers: reqHeaders,
            body: body && method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD" ? body : undefined,
        })
        const elapsed = Date.now() - startTime

        const respHeaders: Record<string, string> = {}
        upstream.headers.forEach((v: string, k: string) => { respHeaders[k] = v })

        const text = await upstream.text()
        return NextResponse.json({
            status: upstream.status,
            statusText: upstream.statusText,
            headers: respHeaders,
            body: text,
            time: elapsed,
            size: text.length,
            // Surface server's mutual-auth reply token if present (not validated).
            mutualReply: respHeaders["www-authenticate"]?.startsWith("Negotiate ")
                ? respHeaders["www-authenticate"].slice("Negotiate ".length)
                : undefined,
        })
    } catch (error) {
        const err = error as Error
        return NextResponse.json({
            error: err.message,
            status: 0,
            body: err.message,
        }, { status: 502 })
    }
}
