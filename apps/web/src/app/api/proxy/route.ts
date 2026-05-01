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

/** Check if a hostname resolves to a private/internal IP range. */
function isBlockedHostname(hostname: string): boolean {
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
        const { url, method, headers, body } = await req.json()

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
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
        if (isBlockedHostname(parsed.hostname)) {
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

        const requestHeaders = { ...(headers || {}) } as Record<string, string>

        // ── Cookie forwarding: ONLY forward cookies to the trusted backend ───
        const isBackendRequest = parsed.host === ALLOWED_HOST
        const incomingCookie = req.headers.get("cookie")
        if (isBackendRequest && incomingCookie && !Object.keys(requestHeaders).some((k) => k.toLowerCase() === "cookie")) {
            requestHeaders["cookie"] = incomingCookie
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
        return NextResponse.json({
            status: 0,
            statusText: "Error",
            headers: {},
            body: (error as Error).message,
            time: 0,
            size: 0,
            error: (error as Error).message,
        })
    }
}
