/**
 * graphql-ws protocol client (RFC-style, subprotocol "graphql-transport-ws").
 *
 * Lifecycle:
 *   1. open WebSocket with subprotocol
 *   2. send `connection_init`
 *   3. wait for `connection_ack`
 *   4. send `subscribe` with id + payload
 *   5. receive zero or more `next` events
 *   6. receive `complete` (or `error`)
 *
 * Supports per-call cleanup. No reconnection — caller restarts on close.
 */

export interface SubscribeOptions {
    url: string
    query: string
    variables?: Record<string, unknown>
    operationName?: string
    connectionParams?: Record<string, unknown>
    onNext: (data: unknown, errors?: unknown[]) => void
    onError?: (err: Error) => void
    onComplete?: () => void
}

export interface SubscriptionHandle {
    close: () => void
    /** Resolves when the WS handshake + connection_ack has completed. */
    ready: Promise<void>
}

interface GraphQlWsMessage {
    id?: string
    type: string
    payload?: unknown
}

export function subscribeGraphqlWs(opts: SubscribeOptions): SubscriptionHandle {
    const ws = new WebSocket(opts.url, "graphql-transport-ws")
    const subscriptionId = crypto.randomUUID()
    let acked = false
    let closed = false

    const ready = new Promise<void>((resolve, reject) => {
        ws.addEventListener("open", () => {
            ws.send(JSON.stringify({ type: "connection_init", payload: opts.connectionParams ?? {} }))
        })
        ws.addEventListener("message", (ev) => {
            let msg: GraphQlWsMessage
            try { msg = JSON.parse(String(ev.data)) }
            catch { return }
            switch (msg.type) {
                case "connection_ack":
                    acked = true
                    ws.send(JSON.stringify({
                        id: subscriptionId,
                        type: "subscribe",
                        payload: {
                            query: opts.query,
                            variables: opts.variables,
                            operationName: opts.operationName,
                        },
                    }))
                    resolve()
                    break
                case "next":
                    if (msg.id !== subscriptionId) return
                    {
                        const payload = (msg.payload ?? {}) as { data?: unknown; errors?: unknown[] }
                        opts.onNext(payload.data, payload.errors)
                    }
                    break
                case "error":
                    if (msg.id !== subscriptionId) return
                    opts.onError?.(new Error(JSON.stringify(msg.payload)))
                    break
                case "complete":
                    if (msg.id !== subscriptionId) return
                    opts.onComplete?.()
                    try { ws.close(1000) } catch { /* noop */ }
                    break
                case "ping":
                    ws.send(JSON.stringify({ type: "pong" }))
                    break
            }
        })
        ws.addEventListener("error", () => {
            if (!acked) reject(new Error("WebSocket error before ack"))
            opts.onError?.(new Error("WebSocket error"))
        })
        ws.addEventListener("close", () => {
            closed = true
            if (!acked) reject(new Error("Closed before ack"))
            opts.onComplete?.()
        })
    })

    return {
        ready,
        close() {
            if (closed) return
            try {
                ws.send(JSON.stringify({ id: subscriptionId, type: "complete" }))
                ws.close(1000)
            } catch { /* noop */ }
        },
    }
}
