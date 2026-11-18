import { expect } from "@/lib/api-client/script-expect"
import { bruGlobals } from "@/lib/api-client/bru-compat"
import { scriptRequire } from "@/lib/api-client/script-libs"
import { normalizeSendRequest, toPmResponse, type ScriptHost } from "@/lib/api-client/script-sandbox"

/**
 * Sandboxed script runner for Postman-style pre-request and test scripts.
 * Platform-free core. The app runs it in a Web Worker with network globals
 * removed (scripts-runner.worker.ts); the CLI runs it in a bare node:vm
 * context inside a worker thread. Either way `pm.sendRequest` goes through the
 * host's send proxy.
 *
 * Scripts run as async functions: top-level `await` works, and pending
 * `pm.sendRequest` callbacks / async `pm.test` bodies settle before results are
 * returned. The main thread enforces the hard timeout (use-scripts-runner.ts).
 *
 * `require()` serves a few common modules (uuid, crypto-js subset); btoa/atob
 * are worker globals.
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
    /** Read scopes for pm.collectionVariables / pm.globals. Their `set` writes
     *  session variables, which outrank both at substitution time. */
    collectionVariables?: Record<string, string>
    globals?: Record<string, string>
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

type AsyncFn = (...args: unknown[]) => Promise<unknown>

/** Builds the script function. The app compiles in the worker's own realm; the
 *  CLI passes one that compiles into a bare `node:vm` context. */
export type ScriptCompiler = (params: string[], body: string) => AsyncFn

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
) => AsyncFn

const defaultCompile: ScriptCompiler = (params, body) => new AsyncFunction(...params, body)

function safeStringify(v: unknown): string {
    if (typeof v === "string") return v
    try { return JSON.stringify(v) } catch { return String(v) }
}

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
    !!v && typeof (v as { then?: unknown }).then === "function"

export async function runScript(
    script: string,
    ctx: ScriptContext,
    host?: ScriptHost,
    compile: ScriptCompiler = defaultCompile,
): Promise<ScriptResult> {
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

    // Async work the script started but may not await (sendRequest callbacks,
    // async pm.test bodies). Drained before results go back. Never rejects.
    const pending = new Set<Promise<void>>()
    const asyncErrors: string[] = []
    /** Wait for `p` before returning; `onError` decides what a rejection means. */
    const track = (p: Promise<unknown>, onError: (e: unknown) => void) => {
        const settled = p.then(() => {}, onError)
        pending.add(settled)
        void settled.then(() => pending.delete(settled))
    }
    const failScript = (e: unknown) => { asyncErrors.push((e as Error)?.message ?? String(e)) }

    const sendRequest = (arg: unknown, callback?: (err: Error | null, res: unknown) => void) => {
        const req = normalizeSendRequest(arg)
        if (!host) throw new Error("pm.sendRequest is not available here")
        const label = `${req.method} ${req.url}`
        const p = host.sendRequest(req).then(
            (res) => {
                logs.push({ level: "log", args: ["pm.sendRequest", label, "→", String(res.status)] })
                return toPmResponse(res)
            },
            (err) => {
                const message = (err as Error)?.message ?? String(err)
                logs.push({ level: "error", args: ["pm.sendRequest", label, "failed:", message] })
                throw new Error(message)
            },
        )
        if (callback) {
            // Postman style: errors go to the callback; an exception thrown inside
            // the callback fails the script.
            track(p.then((res) => callback(null, res), (err) => callback(err as Error, null)), failScript)
        } else {
            // Awaited by the script, or not — either way we wait for it before
            // returning. An awaited rejection already fails the script; an
            // un-awaited one is in the logs.
            track(p, () => {})
        }
        return p
    }

    const coll = { ...(ctx.collectionVariables ?? {}) }
    const globals = { ...(ctx.globals ?? {}) }
    // Writes land in the read copy (so a later get sees them) and in session
    // variables (so {{key}} resolves to them for the rest of the session).
    const scope = (store: Record<string, string>) => ({
        get(key: string) { return store[key] },
        set(key: string, value: unknown) {
            const v = safeStringify(value)
            store[String(key)] = v
            vars[String(key)] = v
        },
        has(key: string) { return key in store },
        toObject() { return { ...store } },
    })

    const pm = {
        environment: {
            get(key: string) { return env[key] },
            set(key: string, value: unknown) { env[String(key)] = safeStringify(value) },
            unset(key: string) { delete env[String(key)] },
            has(key: string) { return key in env },
            toObject() { return { ...env } },
        },
        variables: {
            // Postman order: local → environment → collection → globals.
            get(key: string) { return vars[key] ?? env[key] ?? coll[key] ?? globals[key] },
            set(key: string, value: unknown) { vars[String(key)] = safeStringify(value) },
            has(key: string) { return key in vars || key in env || key in coll || key in globals },
        },
        collectionVariables: scope(coll),
        globals: scope(globals),
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
                // Postman's own form is add({ key, value }); add(name, value) is ours.
                add(name: string | { key: string; value?: unknown }, value?: unknown) {
                    const [k, v] = typeof name === "object" && name !== null ? [name.key, name.value] : [name, value]
                    request.headers[String(k)] = safeStringify(v)
                },
                upsert(header: { key: string; value?: unknown }) { this.add(header) },
                remove(name: string | { key: string }) {
                    const target = String(typeof name === "object" && name !== null ? name.key : name).toLowerCase()
                    const k = Object.keys(request.headers).find(h => h.toLowerCase() === target)
                    if (k) delete request.headers[k]
                },
                toObject() { return { ...request.headers } },
            },
            get body() { return request.body },
            set body(v: string | undefined) { request.body = v == null ? undefined : String(v) },
        },
        response: ctx.response ? toPmResponse(ctx.response) : undefined,
        test(name: string, fn: () => unknown) {
            // Reserve the slot so results keep script order even when async.
            const entry: ScriptTestResult = { name: String(name), pass: true }
            tests.push(entry)
            const failWith = (err: unknown) => {
                entry.pass = false
                entry.error = (err as Error)?.message ?? String(err)
            }
            try {
                const out = fn()
                if (isThenable(out)) track(Promise.resolve(out), failWith)
            } catch (err) {
                failWith(err)
            }
        },
        expect,
        sendRequest,
    }

    const sandboxConsole = {
        log: (...args: unknown[]) => { logs.push({ level: "log", args: args.map(safeStringify) }) },
        warn: (...args: unknown[]) => { logs.push({ level: "warn", args: args.map(safeStringify) }) },
        error: (...args: unknown[]) => { logs.push({ level: "error", args: args.map(safeStringify) }) },
    }

    const result = (ok: boolean, error?: string): ScriptResult => ({
        ok, error, tests, logs, environment: env, variables: vars, request,
    })

    try {
        // Running the user's own pre/post-request script is the feature; it is
        // confined to this worker with a pm/console surface, no DOM and no network.
        // threatcrush-disable-next-line js-dynamic-code-execution
        const bruno = bruGlobals(pm, (msg) => logs.push({ level: "warn", args: [msg] }))
        // The script runs in a block so its own `const res = …` / `const test = …`
        // shadow the Bruno globals instead of clashing with the parameters.
        const runner = compile(
            ["pm", "console", "expect", "require", "bru", "req", "res", "test"],
            `"use strict";\n{\n${script}\n}`,
        )
        await runner(pm, sandboxConsole, expect, scriptRequire, bruno.bru, bruno.req, bruno.res, bruno.test)
        // Callbacks may start further requests — drain until nothing is left.
        while (pending.size > 0) await Promise.all([...pending])
    } catch (err) {
        return result(false, (err as Error)?.message ?? String(err))
    }
    if (asyncErrors.length > 0) return result(false, asyncErrors.join("; "))
    return result(true)
}
