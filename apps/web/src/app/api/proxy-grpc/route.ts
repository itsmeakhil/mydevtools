/**
 * Native gRPC proxy. Browsers can't open raw HTTP/2 sockets, so this route
 * tunnels gRPC calls on the user's behalf:
 *
 *   browser → POST /api/proxy-grpc { url, body(b64) }  ← HTTP/1.1, JSON
 *   route   → HTTP/2 client to upstream target         ← node:http2
 *   route   → JSON { body(b64), trailers, …} back     ← HTTP/1.1, JSON
 *
 * Wire format is the standard gRPC frame: 1-byte flags + 4-byte BE length +
 * payload. We don't transcode — the browser sends the same bytes it would
 * send for gRPC-Web; the only difference is the transport.
 */

import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"
import http2 from "node:http2"

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

interface GrpcRequestPayload {
    /** Full URL, e.g. https://grpc.example.com/package.Service/Method */
    url: string
    /** Single request frame bytes, base64-encoded. Unary / server-streaming. */
    body?: string
    /** Multiple request frames for client-streaming / bidi.
     *  When present, `body` is ignored. Each entry = one already-framed message. */
    bodyFrames?: string[]
    /** Optional user metadata headers (e.g. authorization). */
    headers?: Record<string, string>
    /** Default 30s; capped server-side. */
    timeoutMs?: number
}

interface GrpcResponsePayload {
    /** HTTP/2 response status (commonly 200 even for gRPC errors — check grpcStatus). */
    status: number
    /** Concatenated response frame bytes, base64-encoded. */
    body: string
    headers: Record<string, string>
    trailers: Record<string, string>
    grpcStatus?: number
    grpcMessage?: string
    timeMs: number
    sizeBytes: number
}

export async function POST(req: NextRequest) {
    try {
        const authError = await requireBackendSession(req)
        if (authError) return authError

        const payload = await req.json() as GrpcRequestPayload
        if (!payload.url) {
            return NextResponse.json({ error: "url is required" }, { status: 400 })
        }
        let parsed: URL
        try { parsed = new URL(payload.url) } catch {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
        }
        if (!["http:", "https:"].includes(parsed.protocol)) {
            return NextResponse.json({ error: "Only HTTP(S) URLs are allowed" }, { status: 403 })
        }
        if (isSSRFTarget(parsed.hostname)) {
            return NextResponse.json({ error: "Blocked by SSRF protection" }, { status: 403 })
        }

        // Build the request stream: either one frame (unary / server-streaming)
        // or many frames concatenated (client-streaming / bidi).
        const frames: Buffer[] = payload.bodyFrames && payload.bodyFrames.length > 0
            ? payload.bodyFrames.map((b) => Buffer.from(b, "base64"))
            : [Buffer.from(payload.body ?? "", "base64")]
        const requestBytes = Buffer.concat(frames)
        const timeout = Math.min(Math.max(1_000, payload.timeoutMs ?? 30_000), 55_000)
        const origin = `${parsed.protocol}//${parsed.host}`
        const startTime = Date.now()

        const result = await new Promise<GrpcResponsePayload>((resolve, reject) => {
            const client = http2.connect(origin, {
                rejectUnauthorized: process.env.NODE_ENV === "production",
            })
            const cleanup = () => {
                try { client.close() } catch { /* noop */ }
                clearTimeout(timer)
            }
            const timer = setTimeout(() => {
                cleanup()
                reject(new Error(`gRPC call timed out after ${timeout}ms`))
            }, timeout)

            client.on("error", (err) => {
                cleanup()
                reject(err)
            })

            const reqHeaders: http2.OutgoingHttpHeaders = {
                ":method": "POST",
                ":path": parsed.pathname + (parsed.search || ""),
                "content-type": "application/grpc+proto",
                "te": "trailers",
                "user-agent": "mydevtools-grpc/0.1",
                ...(payload.headers ?? {}),
            }

            const stream = client.request(reqHeaders)
            stream.write(requestBytes)
            stream.end()

            let responseHeaders: Record<string, string> = {}
            let trailerHeaders: Record<string, string> = {}
            const chunks: Buffer[] = []
            let httpStatus = 0

            stream.on("response", (h) => {
                const out: Record<string, string> = {}
                for (const [k, v] of Object.entries(h)) {
                    if (k.startsWith(":")) {
                        if (k === ":status" && typeof v === "string") httpStatus = Number(v)
                        else if (k === ":status" && typeof v === "number") httpStatus = v
                        continue
                    }
                    out[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "")
                }
                responseHeaders = out
            })

            stream.on("trailers", (t) => {
                const out: Record<string, string> = {}
                for (const [k, v] of Object.entries(t)) {
                    out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v ?? "")
                }
                trailerHeaders = out
            })

            stream.on("data", (chunk: Buffer) => { chunks.push(chunk) })

            stream.on("end", () => {
                cleanup()
                const body = Buffer.concat(chunks)
                // gRPC servers may return status on response headers (trailers-only error)
                // or on trailers (normal success / trailing error). Merge with trailers preferred.
                const grpcStatus = trailerHeaders["grpc-status"] ?? responseHeaders["grpc-status"]
                const grpcMessage = trailerHeaders["grpc-message"] ?? responseHeaders["grpc-message"]
                resolve({
                    status: httpStatus || 200,
                    body: body.toString("base64"),
                    headers: responseHeaders,
                    trailers: trailerHeaders,
                    grpcStatus: grpcStatus !== undefined ? Number(grpcStatus) : undefined,
                    grpcMessage,
                    timeMs: Date.now() - startTime,
                    sizeBytes: body.length,
                })
            })

            stream.on("error", (err) => {
                cleanup()
                reject(err)
            })
        })

        return NextResponse.json(result)
    } catch (error) {
        const err = error as Error
        return NextResponse.json({
            error: err.message,
            status: 0,
            body: "",
            headers: {},
            trailers: {},
        }, { status: 502 })
    }
}
