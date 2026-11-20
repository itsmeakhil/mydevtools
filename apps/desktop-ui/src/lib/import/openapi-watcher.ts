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

/** Download a spec's text — through the Rust proxy on desktop (no CORS, no webview leak). */
export async function fetchOpenApiText(url: string): Promise<string> {
    if (isDesktop()) {
        const { proxyGet } = await import("@/lib/desktop/proxy-get")
        const r = await proxyGet(url)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.isBase64 ? new TextDecoder().decode(Uint8Array.from(atob(r.body), (c) => c.charCodeAt(0))) : r.body
    }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
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
            const text = await fetchOpenApiText(opts.url)
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
