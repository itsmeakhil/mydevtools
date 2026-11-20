/**
 * Server-sent events over the Rust `http_request_stream` relay. Plain
 * `EventSource` can't help: GET only, no custom headers, and the webview's
 * CORS rules apply.
 */
import { isDesktop } from "@/lib/desktop/is-desktop"

/** One streamed message — an SSE event, or a GraphQL subscription payload. */
export interface StreamEvent {
    event?: string
    data: string
    id?: string
    /** Epoch ms when it arrived. */
    timestamp: number
}

/** True when the request asks for an event stream (`Accept: text/event-stream`). */
export function wantsEventStream(headers: Record<string, string>): boolean {
    return Object.entries(headers).some(([k, v]) => k.toLowerCase() === "accept" && v.toLowerCase().includes("text/event-stream"))
}

/**
 * Pull complete events out of a rolling buffer. Events end at a blank line;
 * `data:` lines join with "\n"; `:` lines are comments. Returns the events plus
 * the unterminated tail to prepend to the next chunk.
 */
export function pullSseEvents(buf: string, now = Date.now()): { events: StreamEvent[]; remaining: string } {
    const events: StreamEvent[] = []
    const blocks = buf.split(/\r?\n\r?\n/)
    const remaining = blocks.pop() ?? ""
    for (const block of blocks) {
        const data: string[] = []
        const ev: StreamEvent = { data: "", timestamp: now }
        for (const line of block.split(/\r?\n/)) {
            if (!line || line.startsWith(":")) continue
            const colon = line.indexOf(":")
            const field = colon < 0 ? line : line.slice(0, colon)
            const raw = colon < 0 ? "" : line.slice(colon + 1)
            const value = raw.startsWith(" ") ? raw.slice(1) : raw
            if (field === "data") data.push(value)
            else if (field === "event") ev.event = value
            else if (field === "id") ev.id = value
        }
        if (data.length === 0 && !ev.event) continue
        events.push({ ...ev, data: data.join("\n") })
    }
    return { events, remaining }
}

export interface StreamMeta {
    status: number
    statusText: string
    headers: Record<string, string>
}

type RelayMessage =
    | ({ kind: "meta" } & StreamMeta)
    | { kind: "chunk"; data: string }
    | { kind: "end" }
    | { kind: "error"; message: string }

/**
 * Stream a request through the desktop relay. Resolves when the stream ends,
 * is cancelled via `signal`, or fails (the error message is returned).
 */
export async function streamSse(args: {
    input: Record<string, unknown>
    signal: AbortSignal
    onMeta: (meta: StreamMeta) => void
    onEvents: (events: StreamEvent[]) => void
}): Promise<{ error?: string; raw: string }> {
    // Dev-only (never in the shipped app): no relay outside the Tauri window.
    if (!isDesktop()) return { error: "Streaming responses need the desktop app.", raw: "" }
    const { invoke, Channel } = await import("@tauri-apps/api/core")
    const { withGlobalNet } = await import("@/lib/api-client/network-settings")

    // The raw text too, for the Body tab — a server that ignores the Accept
    // header answers with plain JSON/HTML that holds no SSE events.
    let raw = ""
    let buf = ""
    let error: string | undefined
    let done!: () => void
    const finished = new Promise<void>((resolve) => { done = resolve })
    const flush = (text: string) => {
        const { events, remaining } = pullSseEvents(text)
        buf = remaining
        if (events.length) args.onEvents(events)
    }

    const channel = new Channel<RelayMessage>()
    channel.onmessage = (msg) => {
        if (msg.kind === "meta") args.onMeta(msg)
        else if (msg.kind === "chunk") {
            // ponytail: Body keeps the first 2 MB; the Stream tab has the rest.
            if (raw.length < 2_000_000) raw += msg.data
            flush(buf + msg.data)
        }
        else {
            if (msg.kind === "error") error = msg.message
            if (buf.trim()) flush(buf + "\n\n")
            done()
        }
    }

    let id: number
    try {
        id = await invoke<number>("http_request_stream", { input: await withGlobalNet(args.input as { net?: undefined }), channel })
    } catch (e) {
        return { error: String(e), raw }
    }
    const cancel = () => { void invoke("http_request_stream_cancel", { id }) }
    if (args.signal.aborted) cancel()
    else args.signal.addEventListener("abort", cancel, { once: true })
    await finished
    args.signal.removeEventListener("abort", cancel)
    return { error, raw }
}
