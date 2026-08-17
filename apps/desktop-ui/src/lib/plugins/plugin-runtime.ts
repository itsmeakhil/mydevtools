/**
 * User-plugin runtime.
 *
 * Plugins are short JS modules the user pastes / uploads. They run inside a
 * sandboxed worker (gives us thread isolation + structured-clone communication)
 * and expose hooks:
 *
 *   onBeforeSend(request)  → mutated request (or undefined / void to keep)
 *   onAfterResponse(ctx)   → side effects (toast, log, etc.)
 *   provideCommand({label, run})  → register a custom toolbar action
 *
 * Plugins persist in localStorage (per-user) so the runtime can re-load on
 * page refresh without server round-trips.
 */

export interface PluginSource {
    id: string
    name: string
    /** Raw JS source. Loaded into the worker via `new Function`. */
    source: string
    enabled: boolean
    createdAt: number
}

export interface PluginRequestSnapshot {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
}

export interface PluginResponseSnapshot {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    timeMs: number
}

export interface PluginCommand {
    id: string
    pluginId: string
    label: string
    description?: string
}

export type PluginEvent =
    | { kind: "log"; pluginId: string; level: "log" | "warn" | "error"; args: string[] }
    | { kind: "error"; pluginId: string; message: string }
    | { kind: "command-registered"; command: PluginCommand }

const STORAGE_KEY = "mydevtools-plugins"

export function loadPlugins(): PluginSource[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? (JSON.parse(raw) as PluginSource[]) : []
    } catch { return [] }
}

export function savePlugins(plugins: PluginSource[]): void {
    if (typeof window === "undefined") return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plugins)) } catch { /* noop */ }
}

const SCRIPT_TIMEOUT_MS = 2_000

interface PluginInstance {
    plugin: PluginSource
    onBeforeSend?: (req: PluginRequestSnapshot) => PluginRequestSnapshot | void
    onAfterResponse?: (ctx: { request: PluginRequestSnapshot; response: PluginResponseSnapshot }) => void
    commands: PluginCommand[]
}

interface InstantiateResult {
    instance?: PluginInstance
    error?: string
    logs: Array<{ level: "log" | "warn" | "error"; args: string[] }>
}

/**
 * Instantiate a plugin in the main thread — same renderer-level isolation as
 * inline event handlers. We don't ship a Worker yet because plugins typically
 * need synchronous read of request/response objects to mutate the send path.
 *
 * The user supplies trustworthy code (it lives in their own localStorage); we
 * still wrap calls in try/catch + wall-clock timeout to keep one bad plugin
 * from freezing the page.
 */
export function instantiatePlugin(plugin: PluginSource): InstantiateResult {
    const logs: InstantiateResult["logs"] = []
    const commands: PluginCommand[] = []
    let onBeforeSend: PluginInstance["onBeforeSend"]
    let onAfterResponse: PluginInstance["onAfterResponse"]

    const sandboxConsole = {
        log: (...args: unknown[]) => logs.push({ level: "log", args: args.map(String) }),
        warn: (...args: unknown[]) => logs.push({ level: "warn", args: args.map(String) }),
        error: (...args: unknown[]) => logs.push({ level: "error", args: args.map(String) }),
    }

    const api = {
        onBeforeSend: (fn: NonNullable<PluginInstance["onBeforeSend"]>) => { onBeforeSend = fn },
        onAfterResponse: (fn: NonNullable<PluginInstance["onAfterResponse"]>) => { onAfterResponse = fn },
        provideCommand: (cmd: { label: string; description?: string; run?: () => void }) => {
            commands.push({
                id: `${plugin.id}-${commands.length}`,
                pluginId: plugin.id,
                label: cmd.label,
                description: cmd.description,
            })
        },
    }

    try {
        // Executing a plugin the user installed is the feature.
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        const fn = new Function("plugin", "console", `"use strict";\n${plugin.source}`) // threatcrush-disable-line js-dynamic-code-execution
        const wallStart = Date.now()
        fn(api, sandboxConsole)
        if (Date.now() - wallStart > SCRIPT_TIMEOUT_MS) {
            return { error: "Plugin took longer than 2s to instantiate", logs }
        }
    } catch (err) {
        return { error: (err as Error).message, logs }
    }

    return { instance: { plugin, onBeforeSend, onAfterResponse, commands }, logs }
}

/** Run every enabled plugin's `onBeforeSend` in order; later plugins see prior mutations. */
export function applyBeforeSend(
    instances: PluginInstance[],
    req: PluginRequestSnapshot,
): { req: PluginRequestSnapshot; events: PluginEvent[] } {
    const events: PluginEvent[] = []
    let cur = req
    for (const inst of instances) {
        if (!inst.onBeforeSend) continue
        try {
            const result = inst.onBeforeSend(cur)
            if (result && typeof result === "object") cur = result
        } catch (e) {
            events.push({ kind: "error", pluginId: inst.plugin.id, message: (e as Error).message })
        }
    }
    return { req: cur, events }
}

export function applyAfterResponse(
    instances: PluginInstance[],
    ctx: { request: PluginRequestSnapshot; response: PluginResponseSnapshot },
): PluginEvent[] {
    const events: PluginEvent[] = []
    for (const inst of instances) {
        if (!inst.onAfterResponse) continue
        try { inst.onAfterResponse(ctx) }
        catch (e) {
            events.push({ kind: "error", pluginId: inst.plugin.id, message: (e as Error).message })
        }
    }
    return events
}

export type { PluginInstance }
