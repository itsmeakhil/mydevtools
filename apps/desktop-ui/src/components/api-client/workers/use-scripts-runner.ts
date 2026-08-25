"use client"
import * as React from "react"
import * as Comlink from "comlink"
import type { ScriptContext, ScriptResult, ScriptsRunnerApi } from "./scripts-runner.worker"

export type { ScriptContext, ScriptResult } from "./scripts-runner.worker"

/**
 * Hard wall-clock budget for one script run. The worker's own in-script check
 * only fires inside `pm.test()`, so a top-level `while (true) {}` would hang
 * the worker forever; this race terminates + respawns it instead.
 */
export const SCRIPT_HARD_TIMEOUT_MS = 5_000

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

        let timer: ReturnType<typeof setTimeout> | undefined
        const timeout = new Promise<ScriptResult>((resolve) => {
            timer = setTimeout(() => {
                // A stuck worker can't be interrupted — kill it and start a fresh one
                // so the next send works.
                spawn()
                resolve(failed(`Script timed out after ${SCRIPT_HARD_TIMEOUT_MS}ms`))
            }, SCRIPT_HARD_TIMEOUT_MS)
        })
        try {
            return await Promise.race([api.run(script, ctx), timeout])
        } finally {
            clearTimeout(timer)
        }
    }, [spawn])

    return { run }
}
