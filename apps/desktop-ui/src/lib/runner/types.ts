import type { ScriptLog, ScriptTestResult } from "@/components/api-client/types"

export interface RequestRunResult {
    iteration: number
    requestId: string
    requestName: string
    method: string
    url: string
    status?: number
    statusText?: string
    time?: number
    size?: number
    tests: ScriptTestResult[]
    logs: ScriptLog[]
    errors: string[]
    /** Non-empty when the proxy / fetch itself failed (DNS, SSRF, timeout, …). */
    networkError?: string
}

export type RunnerProgressEvent =
    | { kind: "started"; total: number }
    | { kind: "request-done"; result: RequestRunResult; index: number }
    | { kind: "finished"; results: RequestRunResult[] }
    | { kind: "aborted" }
