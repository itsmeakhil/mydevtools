import * as Comlink from "comlink"
import { expect } from "@/lib/api-client/script-expect"
import { scriptRequire } from "@/lib/api-client/script-libs"
import {
    lockDownNetwork,
    normalizeSendRequest,
    toPmResponse,
    type ScriptHost,
} from "@/lib/api-client/script-sandbox"

/**
 * Sandboxed script runner for Postman-style pre-request and test scripts.
 * Runs inside a Web Worker — no DOM, no parent window, and no network of its
 * own: network globals are removed at startup, so `pm.sendRequest` (relayed to
 * the main thread's send proxy, with the desktop SSRF/body-size rules) is the
 * only way out.
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

if (typeof self !== "undefined" && "WorkerGlobalScope" in self) {
    lockDownNetwork(self as unknown as Record<string, unknown>)
}

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

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
    ...args: string[]
) => (...args: unknown[]) => Promise<unknown>

function safeStringify(v: unknown): string {
    if (typeof v === "string") return v
    try { return JSON.stringify(v) } catch { return String(v) }
}

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
    !!v && typeof (v as { then?: unknown }).then === "function"

async function runScript(script: string, ctx: ScriptContext, host?: ScriptHost): Promise<ScriptResult> {
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
        const runner = new AsyncFunction("pm", "console", "expect", "require", `"use strict";\n${script}`)
        await runner(pm, sandboxConsole, expect, scriptRequire)
        // Callbacks may start further requests — drain until nothing is left.
        while (pending.size > 0) await Promise.all([...pending])
    } catch (err) {
        return result(false, (err as Error)?.message ?? String(err))
    }
    if (asyncErrors.length > 0) return result(false, asyncErrors.join("; "))
    return result(true)
}

const api = {
    async run(script: string, ctx: ScriptContext, host?: ScriptHost): Promise<ScriptResult> {
        try {
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
            return await runScript(script, ctx, host)
        } finally {
            // Close the main-thread proxy's MessageChannel (real Comlink only).
            const release = Comlink.releaseProxy
            if (host && release) (host as unknown as Record<symbol, (() => void) | undefined>)[release]?.()
        }
    },
}

export type ScriptsRunnerApi = typeof api
Comlink.expose(api)
