/**
 * Script worker thread: runs the app's script core (lib/api-client/script-run)
 * with each script compiled into a fresh `node:vm` context — JavaScript
 * builtins plus a few web globals, no `process`, `require`, `import`ed modules,
 * `fetch` or `fs`. `pm.sendRequest` is relayed to the main thread's proxy.
 *
 * node:vm is NOT a security boundary (a script can climb out through host
 * objects); it keeps honest scripts from touching the machine by accident.
 * Untrusted collections: run with --no-scripts.
 */
import { parentPort } from "node:worker_threads"
import vm from "node:vm"
import { runScript, type ScriptCompiler, type ScriptContext } from "@/lib/api-client/script-run"
import type { SandboxRequest, SandboxResponse } from "@/lib/api-client/script-sandbox"

const port = parentPort!
const pendingSends = new Map<number, { resolve: (r: SandboxResponse) => void; reject: (e: Error) => void }>()
let nextId = 1

const compile: ScriptCompiler = (params, body) => {
    const context = vm.createContext({ btoa, atob, setTimeout, clearTimeout, URL, URLSearchParams, TextEncoder, TextDecoder })
    return vm.runInContext(`(async function (${params.join(", ")}) {\n${body}\n})`, context)
}

const host = {
    sendRequest: (req: SandboxRequest) => new Promise<SandboxResponse>((resolve, reject) => {
        const id = nextId++
        pendingSends.set(id, { resolve, reject })
        port.postMessage({ type: "send", id, req })
    }),
}

port.on("message", async (m: { type: string; id?: number; res?: SandboxResponse; error?: string; script?: string; ctx?: ScriptContext }) => {
    if (m.type === "sendResult") {
        const p = pendingSends.get(m.id!)
        pendingSends.delete(m.id!)
        if (m.error) p?.reject(new Error(m.error))
        else p?.resolve(m.res!)
    } else if (m.type === "run") {
        port.postMessage({ type: "done", result: await runScript(m.script!, m.ctx!, host, compile) })
    }
})

// Sources are loaded — the parent starts the script clock from here.
port.postMessage({ type: "ready" })
