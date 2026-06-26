/**
 * Headless pre-request / test script runner. Same `pm.*` surface as the web
 * worker, executed inside `node:vm.runInContext` with a wall-clock timeout.
 * The sandbox has no fetch, no fs, no process — just `pm` + `console`.
 */

import { Script, createContext } from "node:vm"

export interface ScriptContext {
    request: { url: string; method: string; headers: Record<string, string>; body?: string }
    response?: {
        status: number
        statusText: string
        headers: Record<string, string>
        body: string
        time: number
    }
    environment: Record<string, string>
    variables: Record<string, string>
}

export interface ScriptResult {
    ok: boolean
    error?: string
    tests: { name: string; pass: boolean; error?: string }[]
    logs: { level: "log" | "warn" | "error"; args: string[] }[]
    environment: Record<string, string>
    variables: Record<string, string>
    request: ScriptContext["request"]
}

const SCRIPT_TIMEOUT_MS = 3_000

function safeStringify(v: unknown): string {
    if (typeof v === "string") return v
    try { return JSON.stringify(v) } catch { return String(v) }
}

function makeExpect(actual: unknown) {
    const fail = (m: string) => { throw new Error(m) }
    return {
        toBe(e: unknown) { if (actual !== e) fail(`expected ${safeStringify(actual)} to be ${safeStringify(e)}`) },
        toEqual(e: unknown) { if (JSON.stringify(actual) !== JSON.stringify(e)) fail(`expected ${safeStringify(actual)} to equal ${safeStringify(e)}`) },
        toMatch(r: unknown) {
            const ok = r instanceof RegExp ? r.test(String(actual)) : String(actual).includes(String(r))
            if (!ok) fail(`expected ${safeStringify(actual)} to match ${safeStringify(r)}`)
        },
        toContain(s: unknown) {
            const ok = Array.isArray(actual)
                ? (actual as unknown[]).includes(s)
                : String(actual).includes(String(s))
            if (!ok) fail(`expected ${safeStringify(actual)} to contain ${safeStringify(s)}`)
        },
        toBeGreaterThan(n: number) { if (!(Number(actual) > n)) fail(`expected ${safeStringify(actual)} > ${n}`) },
        toBeLessThan(n: number) { if (!(Number(actual) < n)) fail(`expected ${safeStringify(actual)} < ${n}`) },
        toHaveProperty(k: string) {
            if (!actual || typeof actual !== "object" || !(k in (actual as object))) fail(`expected object to have property "${k}"`)
        },
        toBeTruthy() { if (!actual) fail(`expected ${safeStringify(actual)} to be truthy`) },
        toBeFalsy() { if (actual) fail(`expected ${safeStringify(actual)} to be falsy`) },
    }
}

export function runScript(script: string, ctx: ScriptContext): ScriptResult {
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

    const env = { ...ctx.environment }
    const vars = { ...ctx.variables }
    const tests: ScriptResult["tests"] = []
    const logs: ScriptResult["logs"] = []
    const request = {
        url: ctx.request.url,
        method: ctx.request.method,
        headers: { ...ctx.request.headers },
        body: ctx.request.body,
    }

    const pm = {
        environment: {
            get(k: string) { return env[k] },
            set(k: string, v: unknown) { env[String(k)] = safeStringify(v) },
            unset(k: string) { delete env[String(k)] },
            has(k: string) { return k in env },
            toObject() { return { ...env } },
        },
        variables: {
            get(k: string) { return vars[k] ?? env[k] },
            set(k: string, v: unknown) { vars[String(k)] = safeStringify(v) },
            has(k: string) { return k in vars || k in env },
        },
        request: {
            get url() { return request.url },
            set url(v: string) { request.url = String(v) },
            get method() { return request.method },
            set method(v: string) { request.method = String(v).toUpperCase() },
            headers: {
                get(name: string) {
                    const k = Object.keys(request.headers).find((h) => h.toLowerCase() === String(name).toLowerCase())
                    return k ? request.headers[k] : undefined
                },
                add(name: string, v: unknown) { request.headers[String(name)] = safeStringify(v) },
                remove(name: string) {
                    const k = Object.keys(request.headers).find((h) => h.toLowerCase() === String(name).toLowerCase())
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
                        const k = Object.keys(ctx.response!.headers).find((h) => h.toLowerCase() === lower)
                        return k ? ctx.response!.headers[k] : undefined
                    },
                    toObject() { return { ...ctx.response!.headers } },
                },
                text: () => ctx.response!.body,
                json: () => {
                    try { return JSON.parse(ctx.response!.body) }
                    catch (e) { throw new Error(`Response body is not valid JSON: ${(e as Error).message}`) }
                },
            }
            : undefined,
        test(name: string, fn: () => void) {
            try { fn(); tests.push({ name: String(name), pass: true }) }
            catch (e) { tests.push({ name: String(name), pass: false, error: (e as Error).message }) }
        },
        expect: makeExpect,
        sendRequest() { throw new Error("pm.sendRequest is not supported in the CLI yet") },
    }

    const sandboxConsole = {
        log: (...args: unknown[]) => { logs.push({ level: "log", args: args.map(safeStringify) }) },
        warn: (...args: unknown[]) => { logs.push({ level: "warn", args: args.map(safeStringify) }) },
        error: (...args: unknown[]) => { logs.push({ level: "error", args: args.map(safeStringify) }) },
    }

    const sandbox = createContext({ pm, console: sandboxConsole })
    try {
        new Script(`"use strict";\n${script}`).runInContext(sandbox, { timeout: SCRIPT_TIMEOUT_MS })
    } catch (e) {
        return { ok: false, error: (e as Error).message, tests, logs, environment: env, variables: vars, request }
    }
    return { ok: true, tests, logs, environment: env, variables: vars, request }
}
