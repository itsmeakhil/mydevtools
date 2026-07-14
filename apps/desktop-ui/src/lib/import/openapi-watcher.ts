/**
 * Polls an OpenAPI endpoint, computes a content hash, fires `onChange` when
 * the spec has actually moved. Caller decides whether to re-import.
 */

import { importOpenApiSpec } from "./openapi"
import type { Collection } from "@/components/api-client/types"
import { isDesktop } from "@/lib/desktop/is-desktop"

export interface OpenApiWatchHandle {
    stop: () => void
}

export interface OpenApiWatchOptions {
    url: string
    intervalMs?: number
    onChange: (collection: Collection, hash: string) => void
    onError?: (err: Error) => void
}

async function sha256Hex(s: string): Promise<string> {
    const enc = new TextEncoder().encode(s)
    const hash = await crypto.subtle.digest("SHA-256", enc as BufferSource)
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

export function watchOpenApi(opts: OpenApiWatchOptions): OpenApiWatchHandle {
    const interval = Math.max(30_000, opts.intervalMs ?? 60_000)
    let lastHash: string | null = null
    let cancelled = false

    const tick = async () => {
        if (cancelled) return
        // Offline: skip silently (the caller already tolerates missed ticks).
        if (typeof navigator !== "undefined" && !navigator.onLine) return
        try {
            let text: string
            if (isDesktop()) {
                // Route through the Rust proxy (no CORS, no webview leak).
                const { proxyGet } = await import("@/lib/desktop/proxy-get")
                const r = await proxyGet(opts.url)
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                text = r.isBase64 ? atob(r.body) : r.body
            } else {
                const res = await fetch(opts.url)
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                text = await res.text()
            }
            const hash = await sha256Hex(text)
            if (hash !== lastHash) {
                lastHash = hash
                const collection = importOpenApiSpec(text)
                opts.onChange(collection, hash)
            }
        } catch (e) {
            opts.onError?.(e as Error)
        }
    }

    void tick()
    const id = setInterval(tick, interval)
    return {
        stop() {
            cancelled = true
            clearInterval(id)
        },
    }
}
