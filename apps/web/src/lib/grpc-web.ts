/**
 * gRPC-Web protocol helpers.
 *
 * Wire format per gRPC-Web spec:
 *   each message is prefixed by 5 bytes:
 *     - 1 byte flags (bit 0 = compressed, bit 7 = trailers in this frame)
 *     - 4 bytes BE uint32 length
 *   followed by the encoded message bytes.
 *
 * Two content types:
 *   - application/grpc-web+proto: raw binary over fetch
 *   - application/grpc-web-text+proto: base64-encoded body (works in environments
 *     where binary bodies are mangled)
 *
 * Trailers (status + status-message) are appended as a final frame with the
 * 0x80 flag bit set; the body is `Grpc-Status: 0\r\nGrpc-Message: …\r\n`.
 */

const TRAILER_FLAG = 0x80

export interface GrpcWebFrame {
    flags: number
    payload: Uint8Array
    isTrailer: boolean
}

/** Encode a single message frame (no trailers). */
export function encodeMessageFrame(message: Uint8Array): Uint8Array {
    const frame = new Uint8Array(5 + message.length)
    frame[0] = 0  // flags: not compressed, not trailer
    const len = message.length
    frame[1] = (len >>> 24) & 0xff
    frame[2] = (len >>> 16) & 0xff
    frame[3] = (len >>> 8) & 0xff
    frame[4] = len & 0xff
    frame.set(message, 5)
    return frame
}

/** Pull every complete frame out of a rolling buffer; return remaining bytes. */
export function readFrames(buf: Uint8Array): { frames: GrpcWebFrame[]; remaining: Uint8Array } {
    const frames: GrpcWebFrame[] = []
    let cursor = 0
    while (cursor + 5 <= buf.length) {
        const flags = buf[cursor]
        const length = (buf[cursor + 1] << 24) | (buf[cursor + 2] << 16) | (buf[cursor + 3] << 8) | buf[cursor + 4]
        if (cursor + 5 + length > buf.length) break
        const payload = buf.subarray(cursor + 5, cursor + 5 + length)
        frames.push({ flags, payload, isTrailer: (flags & TRAILER_FLAG) !== 0 })
        cursor += 5 + length
    }
    return { frames, remaining: buf.subarray(cursor) }
}

/** Parse a trailer payload `Grpc-Status: 0\r\nGrpc-Message: ...\r\n` into a map. */
export function parseTrailers(payload: Uint8Array): Record<string, string> {
    const text = new TextDecoder().decode(payload)
    const out: Record<string, string> = {}
    for (const line of text.split(/\r?\n/)) {
        if (!line) continue
        const colon = line.indexOf(":")
        if (colon < 0) continue
        const k = line.slice(0, colon).trim().toLowerCase()
        const v = line.slice(colon + 1).trim()
        out[k] = v
    }
    return out
}

/** Convert raw bytes ↔ base64 (for grpc-web-text mode). */
export function bytesToBase64(bytes: Uint8Array): string {
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin)
}

export function base64ToBytes(s: string): Uint8Array {
    const bin = atob(s)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

export interface GrpcWebResult {
    status: number
    statusText: string
    grpcStatus?: number
    grpcMessage?: string
    headers: Record<string, string>
    /** Each successful message frame, in arrival order. */
    messages: Uint8Array[]
    trailers: Record<string, string>
}

/**
 * Send a single unary gRPC-Web request and collect every message frame + trailers.
 * Use a proxy URL if the target server lacks CORS — the proxy doesn't need any
 * special gRPC awareness, since this is just an HTTP request from its POV.
 */
export async function sendGrpcWeb(args: {
    url: string
    message: Uint8Array
    extraHeaders?: Record<string, string>
    /** "binary" sends `application/grpc-web+proto`; "text" sends base64 + `+text`. */
    format?: "binary" | "text"
    signal?: AbortSignal
}): Promise<GrpcWebResult> {
    const format = args.format ?? "binary"
    const frame = encodeMessageFrame(args.message)
    const headers: Record<string, string> = {
        "Content-Type": format === "text"
            ? "application/grpc-web-text+proto"
            : "application/grpc-web+proto",
        "Accept": format === "text" ? "application/grpc-web-text+proto" : "application/grpc-web+proto",
        "X-Grpc-Web": "1",
        "X-User-Agent": "mydevtools-grpc-web/0.1",
        ...(args.extraHeaders ?? {}),
    }

    const body: BodyInit = format === "text"
        ? bytesToBase64(frame)
        : (frame as BufferSource)

    const res = await fetch(args.url, {
        method: "POST",
        headers,
        body,
        signal: args.signal,
    })

    const respHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => { respHeaders[k] = v })

    const raw = new Uint8Array(await res.arrayBuffer())
    const bytes = format === "text" && raw.length > 0
        ? base64ToBytes(new TextDecoder().decode(raw))
        : raw

    const { frames } = readFrames(bytes)
    const messages: Uint8Array[] = []
    let trailers: Record<string, string> = {}
    for (const f of frames) {
        if (f.isTrailer) trailers = parseTrailers(f.payload)
        else messages.push(f.payload)
    }

    // Servers may also place grpc-status / grpc-message on response headers when
    // there are no payload trailers (e.g. for empty errors).
    if (!trailers["grpc-status"] && respHeaders["grpc-status"]) {
        trailers["grpc-status"] = respHeaders["grpc-status"]
    }
    if (!trailers["grpc-message"] && respHeaders["grpc-message"]) {
        trailers["grpc-message"] = respHeaders["grpc-message"]
    }

    return {
        status: res.status,
        statusText: res.statusText,
        grpcStatus: trailers["grpc-status"] !== undefined ? Number(trailers["grpc-status"]) : undefined,
        grpcMessage: trailers["grpc-message"],
        headers: respHeaders,
        messages,
        trailers,
    }
}

/**
 * Send a native gRPC (HTTP/2) request through the proxy. Same caller contract
 * as `sendGrpcWeb`, but the bytes go out over HTTP/2 instead of HTTP/1.1.
 */
export async function sendNativeGrpc(args: {
    url: string
    /** Single request message (unary / server-streaming). */
    message?: Uint8Array
    /** Multiple request messages (client-streaming / bidi). Wins over `message` when set. */
    messages?: Uint8Array[]
    extraHeaders?: Record<string, string>
    timeoutMs?: number
    signal?: AbortSignal
}): Promise<GrpcWebResult> {
    const bodyFrames = args.messages && args.messages.length > 0
        ? args.messages.map((m) => bytesToBase64(encodeMessageFrame(m)))
        : undefined
    const singleFrame = !bodyFrames && args.message
        ? bytesToBase64(encodeMessageFrame(args.message))
        : undefined
    const res = await fetch("/api/proxy-grpc", {
        method: "POST",
        credentials: "include",
        signal: args.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: args.url,
            headers: args.extraHeaders ?? {},
            body: singleFrame,
            bodyFrames,
            timeoutMs: args.timeoutMs,
        }),
    })
    if (!res.ok && res.status !== 502) {
        const text = await res.text().catch(() => "")
        throw new Error(`gRPC proxy ${res.status}: ${text.slice(0, 300)}`)
    }

    const data = await res.json() as {
        status: number
        body: string
        headers: Record<string, string>
        trailers: Record<string, string>
        grpcStatus?: number
        grpcMessage?: string
        timeMs?: number
        sizeBytes?: number
        error?: string
    }
    if (data.error) {
        throw new Error(data.error)
    }

    const bytes = base64ToBytes(data.body || "")
    const { frames } = readFrames(bytes)
    const messages = frames.filter((f) => !f.isTrailer).map((f) => f.payload)

    return {
        status: data.status,
        statusText: data.status === 200 ? "OK" : String(data.status),
        grpcStatus: data.grpcStatus,
        grpcMessage: data.grpcMessage,
        headers: data.headers ?? {},
        messages,
        trailers: data.trailers ?? {},
    }
}
