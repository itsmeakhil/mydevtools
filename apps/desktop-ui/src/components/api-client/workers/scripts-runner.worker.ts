import * as Comlink from "comlink"

/**
 * Sandboxed script runner for Postman-style pre-request and test scripts.
 * Runs inside a Web Worker — there's no DOM, no parent window, no fetch (we
 * deliberately leave global `fetch` available; the worker has no cookies of
 * its own and runs under the same origin, so the blast radius is the user's
 * own session against their own listed targets).
 *
 * The `pm` API is intentionally small. Compatibility with Postman's full SDK
 * is NOT a goal here — we cover the calls used in 95% of public collections
 * and explicitly fail loudly on the rest.
 */

export interface ScriptRequest {
    url: string
    method: string
    headers: Record<string, string>
    body?: string
}

export interface ScriptResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    time: number
}

export interface ScriptContext {
    request: ScriptRequest
    response?: ScriptResponse
    environment: Record<string, string>
    variables: Record<string, string>
}

export interface ScriptTestResult {
    name: string
    pass: boolean
    error?: string
}

export interface ScriptLog {
    level: "log" | "warn" | "error"
    args: string[]
}

export interface ScriptResult {
    ok: boolean
    error?: string
    tests: ScriptTestResult[]
    logs: ScriptLog[]
    environment: Record<string, string>
    variables: Record<string, string>
    request: ScriptRequest
}

const SCRIPT_TIMEOUT_MS = 3_000

function safeStringify(v: unknown): string {
    if (typeof v === "string") return v
    try { return JSON.stringify(v) } catch { return String(v) }
}

function makeExpect(actual: unknown) {
    const fail = (msg: string) => { throw new Error(msg) }
    return {
        toBe(expected: unknown) {
            if (actual !== expected) fail(`expected ${safeStringify(actual)} to be ${safeStringify(expected)}`)
        },
        toEqual(expected: unknown) {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                fail(`expected ${safeStringify(actual)} to equal ${safeStringify(expected)}`)
            }
        },
        toMatch(re: unknown) {
            const ok = re instanceof RegExp
                ? re.test(String(actual))
                : String(actual).includes(String(re))
            if (!ok) fail(`expected ${safeStringify(actual)} to match ${safeStringify(re)}`)
        },
        toContain(sub: unknown) {
            const ok = Array.isArray(actual)
                ? (actual as unknown[]).includes(sub)
                : String(actual).includes(String(sub))
            if (!ok) fail(`expected ${safeStringify(actual)} to contain ${safeStringify(sub)}`)
        },
        toBeGreaterThan(n: number) {
            if (!(Number(actual) > n)) fail(`expected ${safeStringify(actual)} > ${n}`)
        },
        toBeLessThan(n: number) {
            if (!(Number(actual) < n)) fail(`expected ${safeStringify(actual)} < ${n}`)
        },
        toHaveProperty(k: string) {
            if (!actual || typeof actual !== "object" || !(k in (actual as object))) {
                fail(`expected object to have property "${k}"`)
            }
        },
        toBeTruthy() { if (!actual) fail(`expected ${safeStringify(actual)} to be truthy`) },
        toBeFalsy() { if (actual) fail(`expected ${safeStringify(actual)} to be falsy`) },
    }
}

function runScriptSync(script: string, ctx: ScriptContext): ScriptResult {
    const env = { ...ctx.environment }
    const vars = { ...ctx.variables }
    const tests: ScriptTestResult[] = []
    const logs: ScriptLog[] = []
    const request = {
        url: ctx.request.url,
        method: ctx.request.method,
        headers: { ...ctx.request.headers },
        body: ctx.request.body,
    }

    const wallStart = Date.now()
    const checkTimeout = () => {
        if (Date.now() - wallStart > SCRIPT_TIMEOUT_MS) {
            throw new Error(`Script timed out after ${SCRIPT_TIMEOUT_MS}ms`)
        }
    }

    /** Build a JSON view of the response body — Postman's `pm.response.json()`. */
    const responseJson = () => {
        if (!ctx.response) throw new Error("pm.response.json() called in pre-request script")
        try { return JSON.parse(ctx.response.body) } catch (e) {
            throw new Error(`Response body is not valid JSON: ${(e as Error).message}`)
        }
    }

    const pm = {
        environment: {
            get(key: string) { return env[key] },
            set(key: string, value: unknown) { env[String(key)] = safeStringify(value) },
            unset(key: string) { delete env[String(key)] },
            has(key: string) { return key in env },
            toObject() { return { ...env } },
        },
        variables: {
            get(key: string) { return vars[key] ?? env[key] },
            set(key: string, value: unknown) { vars[String(key)] = safeStringify(value) },
            has(key: string) { return key in vars || key in env },
        },
        request: {
            get url() { return request.url },
            set url(v: string) { request.url = String(v) },
            get method() { return request.method },
            set method(v: string) { request.method = String(v).toUpperCase() },
            headers: {
                get(name: string) {
                    const k = Object.keys(request.headers).find(h => h.toLowerCase() === String(name).toLowerCase())
                    return k ? request.headers[k] : undefined
                },
                add(name: string, value: unknown) {
                    request.headers[String(name)] = safeStringify(value)
                },
                remove(name: string) {
                    const k = Object.keys(request.headers).find(h => h.toLowerCase() === String(name).toLowerCase())
                    if (k) delete request.headers[k]
                },
                toObject() { return { ...request.headers } },
            },
            get body() { return request.body },
            set body(v: string | undefined) { request.body = v == null ? undefined : String(v) },
        },
        response: ctx.response
            ? {
                code: ctx.response.status,
                status: ctx.response.statusText,
                responseTime: ctx.response.time,
                headers: {
                    get(name: string) {
                        const lower = String(name).toLowerCase()
                        const k = Object.keys(ctx.response!.headers).find(h => h.toLowerCase() === lower)
                        return k ? ctx.response!.headers[k] : undefined
                    },
                    toObject() { return { ...ctx.response!.headers } },
                },
                text: () => ctx.response!.body,
                json: responseJson,
            }
            : undefined,
        test(name: string, fn: () => void) {
            checkTimeout()
            try {
                fn()
                tests.push({ name: String(name), pass: true })
            } catch (err) {
                tests.push({ name: String(name), pass: false, error: (err as Error).message })
            }
        },
        expect: makeExpect,
        sendRequest() {
            throw new Error("pm.sendRequest is not supported in this sandbox yet")
        },
    }

    const sandboxConsole = {
        log: (...args: unknown[]) => { logs.push({ level: "log", args: args.map(safeStringify) }) },
        warn: (...args: unknown[]) => { logs.push({ level: "warn", args: args.map(safeStringify) }) },
        error: (...args: unknown[]) => { logs.push({ level: "error", args: args.map(safeStringify) }) },
    }

    try {
        const runner = new Function("pm", "console", `"use strict";\n${script}`)
        runner(pm, sandboxConsole)
    } catch (err) {
        return {
            ok: false,
            error: (err as Error).message,
            tests,
            logs,
            environment: env,
            variables: vars,
            request,
        }
    }

    return {
        ok: true,
        tests,
        logs,
        environment: env,
        variables: vars,
        request,
    }
}

const api = {
    run(script: string, ctx: ScriptContext): ScriptResult {
        if (!script || !script.trim()) {
            return {
                ok: true,
                tests: [],
                logs: [],
                environment: ctx.environment,
                variables: ctx.variables,
                request: ctx.request,
            }
        }
        return runScriptSync(script, ctx)
    },
}

export type ScriptsRunnerApi = typeof api
Comlink.expose(api)
