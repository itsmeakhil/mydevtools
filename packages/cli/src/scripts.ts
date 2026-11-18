/**
 * Main-thread side of script execution. Same budget as the app
 * (use-scripts-runner.ts): 5 s of script time — time spent waiting on
 * pm.sendRequest doesn't count — and 60 s overall. A script over budget gets
 * its worker thread terminated (the only way to stop `while (true) {}`), and
 * the next script starts a fresh one.
 */
import { Worker } from "node:worker_threads"
import type { ScriptContext, ScriptResult } from "@/lib/api-client/script-run"
import type { SandboxRequest, SandboxResponse } from "@/lib/api-client/script-sandbox"

export const SCRIPT_TIMEOUT_MS = 5_000
export const SCRIPT_TOTAL_TIMEOUT_MS = 60_000

export interface ScriptRunner {
    run(script: string, ctx: ScriptContext): Promise<ScriptResult>
    close(): Promise<void>
}

const passthrough = (ctx: ScriptContext, extra: Partial<ScriptResult> = {}): ScriptResult => ({
    ok: true, tests: [], logs: [], environment: ctx.environment, variables: ctx.variables, request: ctx.request, ...extra,
})

/** --no-scripts: nothing runs; one warning per skipped script. */
export const skippedScripts: ScriptRunner = {
    run: async (script, ctx) => passthrough(ctx, script.trim() ? { logs: [{ level: "warn", args: ["script skipped (--no-scripts)"] }] } : {}),
    close: async () => {},
}

export function createScriptRunner(
    sendRequest: (req: SandboxRequest) => Promise<SandboxResponse>,
    budget = { scriptMs: SCRIPT_TIMEOUT_MS, totalMs: SCRIPT_TOTAL_TIMEOUT_MS },
): ScriptRunner {
    let worker: { w: Worker; ready: Promise<void> } | null = null

    // The worker transpiles the app sources on start; that boot time must not
    // count against the script's budget (on a slow CI box it can exceed it).
    const spawn = () => {
        const w = new Worker(new URL("./script-worker.mjs", import.meta.url))
        const ready = new Promise<void>((resolve, reject) => {
            const onReady = (m: { type?: string }) => {
                if (m?.type !== "ready") return
                w.off("message", onReady)
                w.off("error", reject)
                resolve()
            }
            w.on("message", onReady)
            w.once("error", reject)
        })
        return { w, ready }
    }

    const run = async (script: string, ctx: ScriptContext): Promise<ScriptResult> => {
        if (!script.trim()) return passthrough(ctx)
        const current = worker ??= spawn()
        try {
            await current.ready
        } catch (e) {
            worker = null
            return { ...passthrough(ctx), ok: false, error: (e as Error).message }
        }
        return runOn(current.w, script, ctx)
    }

    const runOn = (w: Worker, script: string, ctx: ScriptContext) => new Promise<ScriptResult>((resolve) => {
        const started = Date.now()
        let inFlight = 0
        let waitStart = 0
        let waited = 0

        const finish = (r: ScriptResult) => {
            clearInterval(timer)
            w.off("message", onMessage)
            w.off("error", onError)
            resolve(r)
        }
        const failed = (error: string) => finish({ ...passthrough(ctx), ok: false, error })
        const kill = (error: string) => {
            worker = null
            void w.terminate()
            failed(error)
        }
        const onMessage = async (m: { type: string; id?: number; req?: SandboxRequest; result?: ScriptResult }) => {
            if (m.type === "done") return finish(m.result!)
            if (m.type !== "send") return
            if (inFlight++ === 0) waitStart = Date.now()
            try {
                w.postMessage({ type: "sendResult", id: m.id, res: await sendRequest(m.req!) })
            } catch (e) {
                w.postMessage({ type: "sendResult", id: m.id, error: (e as Error).message })
            } finally {
                if (--inFlight === 0) waited += Date.now() - waitStart
            }
        }
        const onError = (e: Error) => kill(e.message)
        const timer = setInterval(() => {
            const now = Date.now()
            const busy = now - started - waited - (inFlight > 0 ? now - waitStart : 0)
            if (busy >= budget.scriptMs) kill(`Script timed out after ${budget.scriptMs}ms`)
            else if (now - started >= budget.totalMs) kill(`Script timed out after ${budget.totalMs}ms (including requests)`)
        }, 50)

        w.on("message", onMessage)
        w.on("error", onError)
        w.postMessage({ type: "run", script, ctx })
    })

    return {
        run,
        close: async () => { await worker?.w.terminate(); worker = null },
    }
}
