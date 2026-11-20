"use client"
import * as React from "react"
import * as Comlink from "comlink"
import type { ScriptContext, ScriptResult, ScriptsRunnerApi } from "./scripts-runner.worker"
import { envelopeToScriptResponse, type SandboxRequest, type ScriptHost } from "@/lib/api-client/script-sandbox"
import { sendProxyRequest } from "@/lib/desktop/api-fetch"

export type { ScriptContext, ScriptResult } from "./scripts-runner.worker"

/**
 * Hard budget for the script's own work (time not spent waiting on
 * `pm.sendRequest`). A top-level `while (true) {}` can't be interrupted inside
 * the worker, so this race terminates + respawns it instead.
 */
export const SCRIPT_HARD_TIMEOUT_MS = 5_000
/** Wall-clock ceiling including `pm.sendRequest` waits. */
export const SCRIPT_TOTAL_TIMEOUT_MS = 60_000

export function useScriptsRunner() {
    const workerRef = React.useRef<Worker | null>(null)
    const apiRef = React.useRef<Comlink.Remote<ScriptsRunnerApi> | null>(null)

    const spawn = React.useCallback(() => {
        workerRef.current?.terminate()
        const w = new Worker(
            new URL("./scripts-runner.worker.ts", import.meta.url),
            { type: "module" },
        )
        workerRef.current = w
        apiRef.current = Comlink.wrap<ScriptsRunnerApi>(w)
    }, [])

    React.useEffect(() => {
        spawn()
        return () => {
            workerRef.current?.terminate()
            workerRef.current = null
            apiRef.current = null
        }
    }, [spawn])

    const run = React.useCallback(async (script: string, ctx: ScriptContext): Promise<ScriptResult> => {
        const api = apiRef.current
        const failed = (error: string): ScriptResult => ({
            ok: false,
            error,
            tests: [],
            logs: [],
            environment: ctx.environment,
            variables: ctx.variables,
            request: ctx.request,
        })
        if (!api) return failed("Script runner not ready")

        // Time spent waiting on pm.sendRequest doesn't count against the script.
        const started = Date.now()
        let inFlight = 0
        let waitStart = 0
        let waited = 0
        const host: ScriptHost = {
            async sendRequest(req: SandboxRequest) {
                if (inFlight++ === 0) waitStart = Date.now()
                try {
                    // Same path as a normal send: desktop → Rust http_request.
                    return envelopeToScriptResponse(await sendProxyRequest(req))
                } finally {
                    if (--inFlight === 0) waited += Date.now() - waitStart
                }
            },
        }

        let timer: ReturnType<typeof setTimeout> | undefined
        const timeout = new Promise<ScriptResult>((resolve) => {
            const check = () => {
                const now = Date.now()
                const busy = now - started - waited - (inFlight > 0 ? now - waitStart : 0)
                if (busy < SCRIPT_HARD_TIMEOUT_MS && now - started < SCRIPT_TOTAL_TIMEOUT_MS) {
                    timer = setTimeout(check, 250)
                    return
                }
                // A stuck worker can't be interrupted — kill it and start a fresh one
                // so the next send works.
                spawn()
                resolve(failed(busy >= SCRIPT_HARD_TIMEOUT_MS
                    ? `Script timed out after ${SCRIPT_HARD_TIMEOUT_MS}ms`
                    : `Script timed out after ${SCRIPT_TOTAL_TIMEOUT_MS}ms (including requests)`))
            }
            timer = setTimeout(check, SCRIPT_HARD_TIMEOUT_MS)
        })
        try {
            return await Promise.race([api.run(script, ctx, Comlink.proxy(host)), timeout])
        } finally {
            clearTimeout(timer)
        }
    }, [spawn])

    return { run }
}
