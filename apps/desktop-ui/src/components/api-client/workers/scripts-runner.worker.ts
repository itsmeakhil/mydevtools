import * as Comlink from "comlink"
import { lockDownNetwork, type ScriptHost } from "@/lib/api-client/script-sandbox"
import { runScript, type ScriptContext, type ScriptResult } from "@/lib/api-client/script-run"

export type {
    ScriptRequest,
    ScriptResponse,
    ScriptContext,
    ScriptTestResult,
    ScriptLog,
    ScriptResult,
} from "@/lib/api-client/script-run"

// The script core lives in lib/api-client/script-run.ts (shared with the CLI).
// This worker adds the browser-side isolation: network globals are removed, so
// pm.sendRequest (relayed to the main thread's send proxy) is the only way out.
// The main thread enforces the hard timeout (use-scripts-runner.ts).
if (typeof self !== "undefined" && "WorkerGlobalScope" in self) {
    lockDownNetwork(self as unknown as Record<string, unknown>)
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
