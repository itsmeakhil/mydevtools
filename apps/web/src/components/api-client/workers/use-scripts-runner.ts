"use client"
import * as React from "react"
import * as Comlink from "comlink"
import type { ScriptContext, ScriptResult, ScriptsRunnerApi } from "./scripts-runner.worker"

export type { ScriptContext, ScriptResult } from "./scripts-runner.worker"

export function useScriptsRunner() {
    const workerRef = React.useRef<Worker | null>(null)
    const apiRef = React.useRef<Comlink.Remote<ScriptsRunnerApi> | null>(null)

    React.useEffect(() => {
        const w = new Worker(
            new URL("./scripts-runner.worker.ts", import.meta.url),
            { type: "module" },
        )
        workerRef.current = w
        apiRef.current = Comlink.wrap<ScriptsRunnerApi>(w)
        return () => {
            w.terminate()
            workerRef.current = null
            apiRef.current = null
        }
    }, [])

    const run = React.useCallback(async (script: string, ctx: ScriptContext): Promise<ScriptResult> => {
        if (!apiRef.current) {
            return {
                ok: false,
                error: "Script runner not ready",
                tests: [],
                logs: [],
                environment: ctx.environment,
                variables: ctx.variables,
                request: ctx.request,
            }
        }
        return apiRef.current.run(script, ctx)
    }, [])

    return { run }
}
