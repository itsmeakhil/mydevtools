/**
 * Listen for postMessage events from the mydevtools browser extension.
 * The companion content script relays captured requests as
 *   `{ kind: "mdt-extension-import", payload: { method, url, headers, ... } }`
 * to the page; we wire it into a new REST tab.
 */

import type { ApiRequestState } from "@/components/api-client/types"

export interface CapturedRequest {
    method: string
    url: string
    headers?: Record<string, string>
    body?: string
}

export function listenForExtensionImports(
    onImport: (req: CapturedRequest) => void,
): () => void {
    if (typeof window === "undefined") return () => {}
    const handler = (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return
        const data = ev.data as { kind?: string; payload?: CapturedRequest }
        if (data?.kind !== "mdt-extension-import" || !data.payload?.url) return
        onImport(data.payload)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
}

export function capturedToTab(captured: CapturedRequest): Partial<ApiRequestState> {
    return {
        method: (captured.method?.toUpperCase() ?? "GET") as ApiRequestState["method"],
        url: captured.url,
        headers: Object.entries(captured.headers ?? {}).map(([key, value], i) => ({
            id: `ext-${i}`,
            key,
            value,
            active: true,
        })),
        body: captured.body
            ? { type: "json" as const, content: captured.body }
            : { type: "none" as const, content: "" },
    }
}
