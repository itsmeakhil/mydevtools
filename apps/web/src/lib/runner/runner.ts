/**
 * Collection runner — sequential, single-iteration-or-data-driven, with the
 * same pre-request + test script lifecycle as a normal send. Intentionally
 * NOT calling the React `handleSend` so it can run headlessly (no toasts,
 * no UI updates) and so a long run doesn't keep refs onto a single tab.
 *
 * Concurrency is deliberately one-at-a-time — Postman's Newman behaves the
 * same way and chaining via env mutations only works in series.
 */

import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
} from "@/components/api-client/types"
import type { ScriptContext, ScriptResult } from "@/components/api-client/workers/scripts-runner.worker"
import { encodeBasicCredentials } from "@/lib/basic-auth"
import { cookieHeaderForUrl, storeCookiesFromResponse } from "@/lib/cookie-jar"
import { ensureFreshToken } from "@/lib/oauth2"
import { ensureHttpScheme } from "@/lib/url-normalize"
import { applyFolderInheritance, findRequestAncestors } from "@/lib/folder-inheritance"
import { resolveResponsePath } from "@/lib/response-path"
import type { ApiResponse } from "@/components/api-client/types"
import type { RequestRunResult, RunnerProgressEvent } from "./types"

interface RunnerInput {
    collection: Collection
    /** Optional: limit run to one folder within the collection. */
    folderId?: string
    iterations: number
    /** When present, runs `dataRows.length` iterations; each row's keys become the highest-priority vars. */
    dataRows?: Record<string, string>[]
    environmentVariables: Record<string, string>
    runScript: (script: string, ctx: ScriptContext) => Promise<ScriptResult>
    onProgress?: (event: RunnerProgressEvent) => void
    abortSignal?: AbortSignal
}

/** Flatten a (possibly nested) collection into request order, optionally rooted at a folder. */
function walkRequests(items: Array<CollectionFolder | CollectionRequest>, out: CollectionRequest[]): void {
    for (const item of items) {
        if ("type" in item && item.type === "folder") {
            walkRequests(item.items, out)
        } else {
            out.push(item as CollectionRequest)
        }
    }
}

function findFolderItems(
    items: Array<CollectionFolder | CollectionRequest>,
    folderId: string,
): Array<CollectionFolder | CollectionRequest> | null {
    for (const item of items) {
        if (item.id === folderId && "type" in item && item.type === "folder") return item.items
        if ("type" in item && item.type === "folder") {
            const inner = findFolderItems(item.items, folderId)
            if (inner) return inner
        }
    }
    return null
}

function buildRequestUrlSafe(raw: string): URL {
    try { return new URL(raw) } catch { return new URL(ensureHttpScheme(raw)) }
}

/** Substitution layer that mirrors `handleSend` plus iteration-row + response-chain support. */
function makeSubstitute(args: {
    env: Record<string, string>
    sessionVars: Record<string, string>
    envOverlay: Record<string, string>
    envUnsets: Set<string>
    row: Record<string, string>
    previousResponse: ApiResponse | null
}) {
    return (text: string): string => {
        if (!text) return text
        return text.replace(/\{\{(.+?)\}\}/g, (m, k) => {
            const key = (k as string).trim()
            if (key.startsWith("response.")) {
                const resolved = resolveResponsePath(key.slice("response.".length), args.previousResponse)
                return resolved ?? m
            }
            if (key in args.row) return args.row[key]
            if (args.envUnsets.has(key)) return m
            if (key in args.envOverlay) return args.envOverlay[key]
            if (key in args.sessionVars) return args.sessionVars[key]
            return args.env[key] ?? m
        })
    }
}

async function executeRequest(args: {
    req: CollectionRequest
    iteration: number
    row: Record<string, string>
    env: Record<string, string>
    sessionVars: Record<string, string>
    envOverlay: Record<string, string>
    envUnsets: Set<string>
    runScript: RunnerInput["runScript"]
    previousResponse: ApiResponse | null
    /** Mutated to carry the live proxy response back to the caller for `{{response.*}}` chaining. */
    responseSink: { response: ApiResponse | null }
    signal?: AbortSignal
}): Promise<RequestRunResult> {
    const { req, iteration } = args
    const result: RequestRunResult = {
        iteration,
        requestId: req.id,
        requestName: req.name,
        method: req.method,
        url: req.url,
        tests: [],
        logs: [],
        errors: [],
    }

    const substitute = makeSubstitute({
        env: args.env,
        sessionVars: args.sessionVars,
        envOverlay: args.envOverlay,
        envUnsets: args.envUnsets,
        row: args.row,
        previousResponse: args.previousResponse,
    })

    let workMethod: string = req.method
    let workUrl: string = req.url
    let workHeaders: Record<string, string> = {}
    req.headers.forEach((h) => { if (h.active && h.key) workHeaders[h.key] = h.value })

    // Pre-request script.
    if (req.preRequestScript && req.preRequestScript.trim()) {
        const ctx: ScriptContext = {
            request: {
                url: workUrl,
                method: workMethod,
                headers: workHeaders,
                body: req.body.type === "json" || req.body.type === "text" || req.body.type === "graphql"
                    ? req.body.content
                    : undefined,
            },
            environment: { ...args.env, ...args.envOverlay },
            variables: { ...args.sessionVars, ...args.row },
        }
        const r = await args.runScript(req.preRequestScript, ctx)
        result.tests.push(...r.tests)
        result.logs.push(...r.logs)
        if (!r.ok && r.error) result.errors.push(`pre-request: ${r.error}`)
        // Diff env: anything new/changed goes into overlay; anything dropped goes into unsets.
        for (const k of Object.keys(r.environment)) {
            if (r.environment[k] !== args.env[k]) args.envOverlay[k] = r.environment[k]
        }
        for (const k of Object.keys(args.env)) {
            if (!(k in r.environment)) args.envUnsets.add(k)
        }
        Object.assign(args.sessionVars, r.variables)
        workUrl = r.request.url
        workMethod = (r.request.method || workMethod).toUpperCase()
        workHeaders = r.request.headers
    }

    let urlObj: URL
    try { urlObj = buildRequestUrlSafe(substitute(workUrl)) } catch (e) {
        result.networkError = `Invalid URL: ${(e as Error).message}`
        return result
    }
    req.params.forEach((p) => {
        if (p.active && p.key) urlObj.searchParams.append(substitute(p.key), substitute(p.value))
    })

    const headersObj: Record<string, string> = {}
    for (const [k, v] of Object.entries(workHeaders)) {
        headersObj[substitute(k)] = substitute(v)
    }

    // Auth.
    if (req.auth.type === "bearer" && req.auth.token) {
        headersObj["Authorization"] = `Bearer ${substitute(req.auth.token).trim()}`
    } else if (req.auth.type === "basic" && req.auth.username && req.auth.password) {
        headersObj["Authorization"] = `Basic ${encodeBasicCredentials(
            substitute(req.auth.username).trim(),
            substitute(req.auth.password),
        )}`
    } else if (req.auth.type === "api-key" && req.auth.apiKeyKey && req.auth.apiKeyValue) {
        const key = substitute(req.auth.apiKeyKey).trim()
        const val = substitute(req.auth.apiKeyValue).trim()
        if (req.auth.apiKeyLocation === "query") urlObj.searchParams.append(key, val)
        else headersObj[key] = val
    } else if (req.auth.type === "oauth2" && req.auth.oauth2) {
        try {
            const fresh = await ensureFreshToken(req.auth.oauth2)
            if (fresh.accessToken) {
                headersObj["Authorization"] = `${fresh.tokenType || "Bearer"} ${fresh.accessToken}`
            }
        } catch (e) {
            result.networkError = `OAuth refresh failed: ${(e as Error).message}`
            return result
        }
    }

    // Cookie jar.
    const jarHeader = cookieHeaderForUrl(urlObj.toString())
    if (jarHeader) {
        const existingKey = Object.keys(headersObj).find((k) => k.toLowerCase() === "cookie")
        headersObj[existingKey ?? "Cookie"] = existingKey
            ? `${jarHeader}; ${headersObj[existingKey]}`
            : jarHeader
    }

    // Body.
    let bodyContent: string | null = null
    let bodyPayload: unknown = null
    const noBody = workMethod === "GET" || workMethod === "HEAD" || req.body.type === "none"
    if (!noBody) {
        if (req.body.type === "json") {
            const sub = substitute(req.body.content)
            try { JSON.parse(sub) } catch (e) {
                result.networkError = `Invalid JSON body: ${(e as Error).message}`
                return result
            }
            bodyContent = sub
            bodyPayload = sub
            headersObj["Content-Type"] = "application/json"
        } else if (req.body.type === "x-www-form-urlencoded") {
            const sp = new URLSearchParams()
            ;(req.body.urlEncoded ?? []).forEach((it) => {
                if (it.active && it.key) sp.append(substitute(it.key), substitute(it.value))
            })
            bodyContent = sp.toString()
            bodyPayload = bodyContent
            if (!Object.keys(headersObj).some((k) => k.toLowerCase() === "content-type")) {
                headersObj["Content-Type"] = "application/x-www-form-urlencoded"
            }
        } else if (req.body.type === "form-data") {
            const entries = (req.body.formData ?? [])
                .filter((it) => it.active && it.key)
                .map((it) => it.valueType === "file"
                    ? {
                        key: substitute(it.key),
                        type: "file" as const,
                        fileName: it.fileName || "upload.bin",
                        fileType: it.fileType || "application/octet-stream",
                        fileContentBase64: it.fileContentBase64 || "",
                    }
                    : { key: substitute(it.key), type: "text" as const, value: substitute(it.value) })
            bodyPayload = { mode: "form-data", entries }
            delete headersObj["Content-Type"]
        } else if (req.body.type === "graphql") {
            const query = substitute(req.body.content)
            let variables: unknown = undefined
            const rawVars = (req.body.graphqlVariables ?? "").trim()
            if (rawVars) {
                try { variables = JSON.parse(substitute(rawVars)) } catch (e) {
                    result.networkError = `Invalid GraphQL variables JSON: ${(e as Error).message}`
                    return result
                }
            }
            bodyContent = JSON.stringify(variables !== undefined ? { query, variables } : { query })
            bodyPayload = bodyContent
            headersObj["Content-Type"] = "application/json"
        } else {
            bodyContent = substitute(req.body.content)
            bodyPayload = bodyContent
            if (!headersObj["Content-Type"]) headersObj["Content-Type"] = "text/plain"
        }
    }

    // Send.
    let proxyData: {
        status: number
        statusText: string
        headers: Record<string, string>
        body: string
        time: number
        size: number
        setCookies?: string[]
        error?: string
    }
    try {
        const res = await fetch("/api/proxy", {
            method: "POST",
            credentials: "include",
            signal: args.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: urlObj.toString(),
                method: workMethod,
                headers: headersObj,
                body: bodyPayload ?? bodyContent,
                timeoutMs: req.timeoutMs,
            }),
        })
        proxyData = await res.json()
    } catch (e) {
        result.networkError = (e as Error).message
        return result
    }

    result.status = proxyData.status
    result.statusText = proxyData.statusText
    result.time = proxyData.time
    result.size = proxyData.size

    args.responseSink.response = {
        status: proxyData.status,
        statusText: proxyData.statusText,
        headers: proxyData.headers ?? {},
        body: proxyData.body ?? "",
        time: proxyData.time,
        size: proxyData.size,
    }

    if (req.useCookieJar !== false && Array.isArray(proxyData.setCookies)) {
        storeCookiesFromResponse(urlObj.toString(), proxyData.setCookies)
    }

    // Test script.
    if (req.testScript && req.testScript.trim()) {
        const ctx: ScriptContext = {
            request: { url: urlObj.toString(), method: workMethod, headers: { ...headersObj }, body: bodyContent ?? undefined },
            response: {
                status: proxyData.status,
                statusText: proxyData.statusText,
                headers: proxyData.headers,
                body: proxyData.body,
                time: proxyData.time,
            },
            environment: { ...args.env, ...args.envOverlay },
            variables: { ...args.sessionVars, ...args.row },
        }
        const r = await args.runScript(req.testScript, ctx)
        result.tests.push(...r.tests)
        result.logs.push(...r.logs)
        if (!r.ok && r.error) result.errors.push(`test: ${r.error}`)
        for (const k of Object.keys(r.environment)) {
            if (r.environment[k] !== args.env[k]) args.envOverlay[k] = r.environment[k]
        }
        Object.assign(args.sessionVars, r.variables)
    }

    return result
}

export async function runCollection(opts: RunnerInput): Promise<RequestRunResult[]> {
    const rootItems = opts.folderId
        ? findFolderItems(opts.collection.items, opts.folderId)
        : opts.collection.items
    if (!rootItems) return []

    const requests: CollectionRequest[] = []
    walkRequests(rootItems, requests)
    const iterations = opts.dataRows && opts.dataRows.length > 0
        ? opts.dataRows.length
        : Math.max(1, opts.iterations || 1)

    const total = requests.length * iterations
    opts.onProgress?.({ kind: "started", total })

    const sessionVars: Record<string, string> = {}
    const envOverlay: Record<string, string> = {}
    const envUnsets = new Set<string>()
    const out: RequestRunResult[] = []

    let idx = 0
    let previousResponse: ApiResponse | null = null
    for (let it = 0; it < iterations; it++) {
        const row = opts.dataRows?.[it] ?? {}
        for (const req of requests) {
            if (opts.abortSignal?.aborted) {
                opts.onProgress?.({ kind: "aborted" })
                return out
            }
            // Materialise folder defaults (headers / auth / scripts) for this request.
            const ancestors = findRequestAncestors(rootItems, req.id) ?? []
            const inherited = ancestors.length > 0 ? applyFolderInheritance(req, ancestors) : req

            const sink: { response: ApiResponse | null } = { response: null }
            const result = await executeRequest({
                req: inherited,
                iteration: it,
                row,
                env: opts.environmentVariables,
                sessionVars,
                envOverlay,
                envUnsets,
                runScript: opts.runScript,
                previousResponse,
                responseSink: sink,
                signal: opts.abortSignal,
            })
            out.push(result)
            // Chain via `{{response.body.x}}` for the next request.
            if (sink.response) previousResponse = sink.response
            opts.onProgress?.({ kind: "request-done", result, index: idx })
            idx++
        }
    }

    opts.onProgress?.({ kind: "finished", results: out })
    return out
}
