import { expect } from "./script-expect"

/** What `pm.sendRequest` hands to the main thread (then to the normal send proxy). */
export interface SandboxRequest {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
}

export interface SandboxResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    time: number
}

/** Main-thread services a script may call. Passed to the worker as a Comlink proxy. */
export interface ScriptHost {
    sendRequest(req: SandboxRequest): Promise<SandboxResponse>
}

type KV = { key?: string; value?: unknown; disabled?: boolean }

/**
 * Postman's `pm.sendRequest` argument → plain request. Accepts a URL string or
 * `{ url, method, header, body }` where `header` is an object or `[{key, value}]`
 * and `body` is a string, `{ mode: "raw", raw }`, or `{ mode: "urlencoded", urlencoded: [...] }`.
 */
export function normalizeSendRequest(arg: unknown): SandboxRequest {
    if (typeof arg === "string") return { url: arg, method: "GET", headers: {} }
    if (!arg || typeof arg !== "object") throw new TypeError("pm.sendRequest expects a URL string or a request object")
    const r = arg as { url?: unknown; method?: unknown; header?: unknown; headers?: unknown; body?: unknown }
    const url = typeof r.url === "string" ? r.url : (r.url as { raw?: string } | undefined)?.raw
    if (!url) throw new TypeError("pm.sendRequest: request has no url")

    const headers: Record<string, string> = {}
    const rawHeaders = r.header ?? r.headers
    if (Array.isArray(rawHeaders)) {
        for (const h of rawHeaders as KV[]) if (h?.key && !h.disabled) headers[h.key] = String(h.value ?? "")
    } else if (rawHeaders && typeof rawHeaders === "object") {
        for (const [k, v] of Object.entries(rawHeaders)) headers[k] = String(v)
    }

    let body: string | undefined
    const b = r.body as { mode?: string; raw?: unknown; urlencoded?: KV[] } | string | undefined
    if (typeof b === "string") body = b
    else if (b?.mode === "raw") body = String(b.raw ?? "")
    else if (b?.mode === "urlencoded") {
        body = new URLSearchParams((b.urlencoded ?? []).filter((p) => p.key && !p.disabled).map((p) => [p.key!, String(p.value ?? "")])).toString()
        if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        }
    } else if (b?.mode) throw new TypeError(`pm.sendRequest: body mode "${b.mode}" is not supported (use raw or urlencoded)`)

    return { url, method: typeof r.method === "string" ? r.method.toUpperCase() : "GET", headers, body }
}

/** Postman-shaped response object (`pm.response`, and what `pm.sendRequest` resolves to). */
export function toPmResponse(r: SandboxResponse) {
    let parsed: { value: unknown } | null = null
    const headerKey = (name: string) => Object.keys(r.headers).find((h) => h.toLowerCase() === String(name).toLowerCase())
    return {
        code: r.status,
        status: r.statusText,
        responseTime: r.time,
        headers: {
            get: (name: string) => {
                const k = headerKey(name)
                return k ? r.headers[k] : undefined
            },
            has: (name: string) => headerKey(name) !== undefined,
            toObject: () => ({ ...r.headers }),
        },
        text: () => r.body,
        json: () => {
            // Parsed once; scripts commonly call json() several times.
            if (!parsed) {
                try { parsed = { value: JSON.parse(r.body) } } catch (e) {
                    throw new Error(`Response body is not valid JSON: ${(e as Error).message}`)
                }
            }
            return parsed.value
        },
        /** `pm.response.to.have.status(200)` and friends. */
        get to() { return expect(this).to },
    }
}

/** `/api/proxy` envelope → script response. Envelope errors (blocked host, timeout, too large) reject. */
export function envelopeToScriptResponse(env: {
    status: number; statusText?: string; headers?: Record<string, string>; body?: string; time?: number; error?: string
}): SandboxResponse {
    if (env.error) throw new Error(env.error)
    return { status: env.status, statusText: env.statusText ?? "", headers: env.headers ?? {}, body: env.body ?? "", time: env.time ?? 0 }
}

/**
 * Network-capable globals a worker exposes. Removed so `pm.sendRequest` (main
 * thread → the audited send proxy) is the only way a script reaches the network.
 * `caches.add()` fetches; nested workers would get a fresh, unlocked global.
 */
export const NETWORK_GLOBALS = [
    "fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport",
    "importScripts", "Worker", "SharedWorker", "caches",
] as const

/**
 * Remove network globals from `g`. Returns the names that are still reachable
 * (should be none).
 *
 * ponytail: dynamic `import()` can't be removed from JS; closing it needs a
 * CSP (`script-src`/`connect-src`) on the webview, which is currently `null`.
 */
export function lockDownNetwork(g: Record<string, unknown>): string[] {
    for (const name of NETWORK_GLOBALS) {
        if (!(name in g)) continue
        try { delete g[name] } catch { /* non-configurable */ }
        if (name in g && g[name] !== undefined) {
            try { Object.defineProperty(g, name, { value: undefined, writable: false, configurable: false }) } catch { /* frozen */ }
        }
    }
    return NETWORK_GLOBALS.filter((n) => g[n] !== undefined)
}
