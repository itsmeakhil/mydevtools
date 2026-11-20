/**
 * Bruno script globals (`bru`, `req`, `res`, `test`) mapped onto our `pm`
 * sandbox, so scripts in imported Bruno collections run unchanged.
 *
 * ponytail: the common surface only — no `bru.setNextRequest` (runner order is
 * fixed; it logs a warning), no `bru.runRequest`, no `res(...)` query call.
 */

/** The slice of the sandbox `pm` object this layer needs. */
export interface PmLike {
    environment: {
        get(key: string): string | undefined
        set(key: string, value: unknown): void
        unset(key: string): void
        has(key: string): boolean
    }
    variables: {
        get(key: string): string | undefined
        set(key: string, value: unknown): void
        has(key: string): boolean
    }
    request: {
        url: string
        method: string
        body: string | undefined
        headers: {
            get(name: string): string | undefined
            add(name: string, value: unknown): void
            remove(name: string): void
            toObject(): Record<string, string>
        }
    }
    response?: {
        code: number
        responseTime: number
        headers: { get(name: string): string | undefined; toObject(): Record<string, string> }
        text(): string
    }
    test(name: string, fn: () => unknown): void
    sendRequest(req: unknown, cb?: unknown): Promise<unknown>
}

/** JSON bodies come back parsed, like Bruno; anything else as text. */
function parseBody(text: string | undefined): unknown {
    if (text == null || text === "") return text
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

const toText = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v))

export function bruGlobals(pm: PmLike, warn: (msg: string) => void) {
    const bru = {
        getEnvVar: (k: string) => pm.environment.get(k),
        setEnvVar: (k: string, v: unknown) => pm.environment.set(k, v),
        hasEnvVar: (k: string) => pm.environment.has(k),
        deleteEnvVar: (k: string) => pm.environment.unset(k),
        getVar: (k: string) => pm.variables.get(k),
        setVar: (k: string, v: unknown) => pm.variables.set(k, v),
        hasVar: (k: string) => pm.variables.has(k),
        getProcessEnv: (_k: string) => undefined,
        sleep: (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, Number(ms) || 0))),
        sendRequest: (req: unknown, cb?: unknown) => pm.sendRequest(req, cb),
        setNextRequest: (name: string) => warn(`bru.setNextRequest("${name}") is not supported; runner order is unchanged`),
    }

    const req = {
        getUrl: () => pm.request.url,
        setUrl: (u: string) => { pm.request.url = String(u) },
        getMethod: () => pm.request.method,
        setMethod: (m: string) => { pm.request.method = String(m) },
        getHeader: (n: string) => pm.request.headers.get(n),
        setHeader: (n: string, v: unknown) => pm.request.headers.add(n, v),
        deleteHeader: (n: string) => pm.request.headers.remove(n),
        getHeaders: () => pm.request.headers.toObject(),
        setHeaders: (h: Record<string, unknown>) => {
            for (const k of Object.keys(pm.request.headers.toObject())) pm.request.headers.remove(k)
            for (const [k, v] of Object.entries(h ?? {})) pm.request.headers.add(k, v)
        },
        getBody: () => parseBody(pm.request.body),
        setBody: (b: unknown) => { pm.request.body = b == null ? undefined : toText(b) },
    }

    const r = pm.response
    const res = r && {
        status: r.code,
        headers: r.headers.toObject(),
        body: parseBody(r.text()),
        responseTime: r.responseTime,
        getStatus: () => r.code,
        getHeader: (n: string) => r.headers.get(n),
        getHeaders: () => r.headers.toObject(),
        getBody: () => parseBody(r.text()),
        getResponseTime: () => r.responseTime,
    }

    return { bru, req, res, test: (name: string, fn: () => unknown) => pm.test(name, fn) }
}
