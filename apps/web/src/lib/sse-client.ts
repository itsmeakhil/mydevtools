/**
 * Streaming SSE client — fetches `/api/proxy-stream`, decodes the
 * `text/event-stream` body chunk-by-chunk, and surfaces each event to the
 * caller as it arrives.
 *
 * Plain `EventSource` doesn't help here: it only does GET, no custom headers,
 * and is locked to same-origin (which our streaming proxy isn't, by design).
 */

export interface SseEvent {
    event?: string
    data: string
    id?: string
    retry?: number
    /** Epoch ms when the event was delivered to the caller. */
    timestamp: number
}

export interface SseMeta {
    status: number
    statusText: string
    headers: Record<string, string>
    contentType: string
}

export interface SseStreamArgs {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
    onMeta?: (meta: SseMeta) => void
    onEvent: (event: SseEvent) => void
    onClose?: () => void
    signal?: AbortSignal
}

function parseHeadersJson(raw: string | null): Record<string, string> {
    if (!raw) return {}
    try { return JSON.parse(raw) as Record<string, string> } catch { return {} }
}

/**
 * Pull complete events out of a rolling buffer. SSE separates events with a blank line
 * (i.e. consecutive `\n\n` or `\r\n\r\n`); within an event, lines starting with
 * `data:`, `event:`, `id:`, `retry:` carry the parts. Multiple `data:` lines concatenate
 * with `\n`. Returns the events found + the remaining buffer past the last complete event.
 */
export function pullSseEvents(buf: string): { events: SseEvent[]; remaining: string } {
    const events: SseEvent[] = []
    let cursor = 0
    while (true) {
        // Find an event terminator — either \n\n or \r\n\r\n.
        const dblLf = buf.indexOf("\n\n", cursor)
        const dblCrLf = buf.indexOf("\r\n\r\n", cursor)
        const end = dblLf >= 0 && (dblCrLf < 0 || dblLf < dblCrLf)
            ? { idx: dblLf, len: 2 }
            : dblCrLf >= 0
                ? { idx: dblCrLf, len: 4 }
                : null
        if (!end) break

        const block = buf.slice(cursor, end.idx)
        cursor = end.idx + end.len

        const ev: { event?: string; data: string[]; id?: string; retry?: number } = { data: [] }
        for (const rawLine of block.split(/\r?\n/)) {
            if (!rawLine || rawLine.startsWith(":")) continue  // comment / empty
            const colon = rawLine.indexOf(":")
            const field = colon < 0 ? rawLine : rawLine.slice(0, colon)
            // Per spec: skip exactly one leading space after the colon, if present.
            const valueRaw = colon < 0 ? "" : rawLine.slice(colon + 1)
            const value = valueRaw.startsWith(" ") ? valueRaw.slice(1) : valueRaw
            if (field === "data") ev.data.push(value)
            else if (field === "event") ev.event = value
            else if (field === "id") ev.id = value
            else if (field === "retry") {
                const n = Number(value)
                if (Number.isFinite(n)) ev.retry = n
            }
        }
        // Skip events that carried no data field at all (per spec — these are no-ops).
        if (ev.data.length === 0 && !ev.event) continue
        events.push({
            event: ev.event,
            data: ev.data.join("\n"),
            id: ev.id,
            retry: ev.retry,
            timestamp: Date.now(),
        })
    }
    return { events, remaining: buf.slice(cursor) }
}

export async function streamSseRequest(args: SseStreamArgs): Promise<void> {
    const res = await fetch("/api/proxy-stream", {
        method: "POST",
        credentials: "include",
        signal: args.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: args.url,
            method: args.method,
            headers: args.headers,
            body: args.body,
        }),
    })

    const meta: SseMeta = {
        status: Number(res.headers.get("X-Mdt-Upstream-Status") ?? res.status),
        statusText: res.headers.get("X-Mdt-Upstream-Status-Text") ?? res.statusText,
        headers: parseHeadersJson(res.headers.get("X-Mdt-Upstream-Headers")),
        contentType: res.headers.get("X-Mdt-Upstream-Headers")
            ? (parseHeadersJson(res.headers.get("X-Mdt-Upstream-Headers"))["content-type"] ?? "")
            : (res.headers.get("Content-Type") ?? ""),
    }
    args.onMeta?.(meta)

    if (!res.body) {
        args.onClose?.()
        return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ""
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const { events, remaining } = pullSseEvents(buf)
            for (const ev of events) args.onEvent(ev)
            buf = remaining
        }
        // Flush any trailing partial event when the upstream ends without a blank line.
        if (buf.trim()) {
            const finalChunk = buf + "\n\n"
            const { events } = pullSseEvents(finalChunk)
            for (const ev of events) args.onEvent(ev)
        }
    } finally {
        try { reader.releaseLock() } catch { /* noop */ }
        args.onClose?.()
    }
}
