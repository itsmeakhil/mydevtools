/**
 * Performance runner — fires the same request N times through `/api/proxy`
 * with a configurable concurrency, returning latency samples for stats.
 *
 * Pre-request + test scripts are deliberately NOT invoked: the goal is to
 * measure transport latency, not script overhead. OAuth / cookie / auth-sign
 * also bypass — perf mode assumes a single pre-substituted request.
 */

import type { ApiRequestState, RequestMethod } from "@/components/api-client/types"
import { encodeBasicCredentials } from "@/lib/basic-auth"
import { ensureHttpScheme } from "@/lib/url-normalize"
import type { LatencySample } from "./stats"

export interface PerfRunOptions {
    tab: ApiRequestState
    iterations: number
    concurrency: number
    envVariables: Record<string, string>
    /** Discarded warmup hits before measurement starts (excluded from stats + progress). */
    warmupIterations?: number
    /** Linear concurrency ramp from 1 → target over this window in ms. 0 = no ramp. */
    rampUpMs?: number
    /** Pre-defined load profile (overrides plain rampUpMs when set). */
    loadShape?: "constant" | "ramp" | "spike" | "stair"
    /** spike: total ms for 1 → target → 1 envelope. */
    spikeWindowMs?: number
    /** stair: how many plateau steps between 1 and target. */
    stairSteps?: number
    onProgress?: (sample: LatencySample) => void
    abortSignal?: AbortSignal
}

function substitute(text: string, env: Record<string, string>): string {
    if (!text) return text
    return text.replace(/\{\{(.+?)\}\}/g, (m, k) => env[(k as string).trim()] ?? m)
}

function buildRequestUrlSafe(raw: string): URL {
    try { return new URL(raw) } catch { return new URL(ensureHttpScheme(raw)) }
}

/** Build a single proxy payload once; reuse across iterations. */
function buildProxyPayload(tab: ApiRequestState, env: Record<string, string>): unknown {
    const urlObj = buildRequestUrlSafe(substitute(tab.url, env))
    tab.params.forEach((p) => {
        if (p.active && p.key) urlObj.searchParams.append(substitute(p.key, env), substitute(p.value, env))
    })

    const headersObj: Record<string, string> = {}
    tab.headers.forEach((h) => {
        if (h.active && h.key) headersObj[substitute(h.key, env)] = substitute(h.value, env)
    })

    if (tab.auth.type === "bearer" && tab.auth.token) {
        headersObj["Authorization"] = `Bearer ${substitute(tab.auth.token, env).trim()}`
    } else if (tab.auth.type === "basic" && tab.auth.username && tab.auth.password) {
        headersObj["Authorization"] = `Basic ${encodeBasicCredentials(
            substitute(tab.auth.username, env).trim(),
            substitute(tab.auth.password, env),
        )}`
    } else if (tab.auth.type === "api-key" && tab.auth.apiKeyKey && tab.auth.apiKeyValue) {
        const key = substitute(tab.auth.apiKeyKey, env).trim()
        const val = substitute(tab.auth.apiKeyValue, env).trim()
        if (tab.auth.apiKeyLocation === "query") urlObj.searchParams.append(key, val)
        else headersObj[key] = val
    }

    let bodyContent: string | undefined
    let bodyPayload: unknown
    const noBody = tab.method === "GET" || tab.method === "HEAD" || tab.body.type === "none"
    if (!noBody) {
        if (tab.body.type === "json") {
            const sub = substitute(tab.body.content, env)
            bodyContent = sub
            bodyPayload = sub
            headersObj["Content-Type"] = "application/json"
        } else if (tab.body.type === "x-www-form-urlencoded") {
            const sp = new URLSearchParams()
            ;(tab.body.urlEncoded ?? []).forEach((it) => {
                if (it.active && it.key) sp.append(substitute(it.key, env), substitute(it.value, env))
            })
            bodyContent = sp.toString()
            bodyPayload = bodyContent
            if (!Object.keys(headersObj).some((k) => k.toLowerCase() === "content-type")) {
                headersObj["Content-Type"] = "application/x-www-form-urlencoded"
            }
        } else if (tab.body.type === "form-data") {
            const entries = (tab.body.formData ?? [])
                .filter((it) => it.active && it.key)
                .map((it) => it.valueType === "file"
                    ? {
                        key: substitute(it.key, env),
                        type: "file" as const,
                        fileName: it.fileName || "upload.bin",
                        fileType: it.fileType || "application/octet-stream",
                        fileContentBase64: it.fileContentBase64 || "",
                    }
                    : { key: substitute(it.key, env), type: "text" as const, value: substitute(it.value, env) })
            bodyPayload = { mode: "form-data", entries }
            delete headersObj["Content-Type"]
        } else {
            bodyContent = substitute(tab.body.content, env)
            bodyPayload = bodyContent
            if (!headersObj["Content-Type"]) headersObj["Content-Type"] = "text/plain"
        }
    }

    return {
        url: urlObj.toString(),
        method: tab.method as RequestMethod,
        headers: headersObj,
        body: bodyPayload ?? bodyContent,
        timeoutMs: tab.timeoutMs,
    }
}

/**
 * Fire one request, return a LatencySample. The proxy's `time` field is the
 * upstream latency it measured; we surface that as `durationMs` so the numbers
 * match what the Send button shows. `t0`/`t1` are this client's wall clock.
 */
async function fireOne(i: number, payload: unknown, signal?: AbortSignal): Promise<LatencySample> {
    const t0 = performance.now()
    try {
        const res = await fetch("/api/proxy", {
            method: "POST",
            credentials: "include",
            signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        const t1 = performance.now()
        const data = await res.json().catch(() => ({}))
        return {
            i,
            t0,
            t1,
            durationMs: typeof data.time === "number" ? data.time : t1 - t0,
            status: typeof data.status === "number" ? data.status : 0,
            error: data.error,
        }
    } catch (e) {
        const t1 = performance.now()
        return { i, t0, t1, durationMs: t1 - t0, error: (e as Error).message }
    }
}

/** Bounded async pool — each worker drains the shared index. */
async function runPool(
    total: number,
    concurrency: number,
    work: (i: number) => Promise<LatencySample>,
    onResult?: (s: LatencySample) => void,
    abortSignal?: AbortSignal,
): Promise<LatencySample[]> {
    const results: LatencySample[] = new Array(total)
    let next = 0
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
        while (true) {
            if (abortSignal?.aborted) return
            const i = next++
            if (i >= total) return
            const s = await work(i)
            results[i] = s
            onResult?.(s)
        }
    })
    await Promise.all(workers)
    return results.filter(Boolean)  // guard against early abort gaps
}

/** Pool variant that staggers worker activation across a linear ramp window. */
async function runPoolRamped(
    total: number,
    targetConcurrency: number,
    rampMs: number,
    work: (i: number) => Promise<LatencySample>,
    onResult?: (s: LatencySample) => void,
    abortSignal?: AbortSignal,
): Promise<LatencySample[]> {
    const results: LatencySample[] = new Array(total)
    let next = 0
    const startedAt = performance.now()
    const workers = Array.from({ length: Math.max(1, targetConcurrency) }, async (_, workerIdx) => {
        if (workerIdx > 0) {
            const stagger = rampMs * (workerIdx / targetConcurrency)
            await new Promise((r) => setTimeout(r, stagger))
        }
        while (true) {
            if (abortSignal?.aborted) return
            const i = next++
            if (i >= total) return
            const s = await work(i)
            results[i] = s
            onResult?.(s)
        }
    })
    await Promise.all(workers)
    void startedAt  // retained for telemetry hooks if added later
    return results.filter(Boolean)
}

export async function runPerf(opts: PerfRunOptions): Promise<LatencySample[]> {
    const payload = buildProxyPayload(opts.tab, opts.envVariables)
    const warmup = Math.max(0, opts.warmupIterations ?? 0)

    // Warmup phase: discard results, no onProgress, single-threaded so each
    // warmup hit fully completes before the next starts.
    if (warmup > 0) {
        for (let i = 0; i < warmup; i++) {
            if (opts.abortSignal?.aborted) return []
            await fireOne(-1, payload, opts.abortSignal)
        }
    }

    // Spike + stair share the ramped pool; we just compute a per-worker start delay
    // up front so existing runPoolRamped semantics work.
    let rampMs = Math.max(0, opts.rampUpMs ?? 0)
    if (opts.loadShape === "spike") {
        rampMs = Math.max(rampMs, opts.spikeWindowMs ?? 1_000)
    } else if (opts.loadShape === "stair") {
        rampMs = Math.max(rampMs, 500 * Math.max(1, opts.stairSteps ?? 4))
    } else if (opts.loadShape === "constant") {
        rampMs = 0
    }
    if (rampMs > 0) {
        return runPoolRamped(
            opts.iterations,
            opts.concurrency,
            rampMs,
            (i) => fireOne(i, payload, opts.abortSignal),
            opts.onProgress,
            opts.abortSignal,
        )
    }
    return runPool(
        opts.iterations,
        opts.concurrency,
        (i) => fireOne(i, payload, opts.abortSignal),
        opts.onProgress,
        opts.abortSignal,
    )
}
