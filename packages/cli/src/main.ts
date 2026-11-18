import { parseArgs } from "node:util"
import { existsSync } from "node:fs"
import { readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { load } from "js-yaml"
import { MANIFEST_FILE, parseCollection, type FileEntry } from "@/lib/api-client/file-store"
import { importBrunoFolder, parseBrunoEnvironment } from "@/lib/import/bruno"
import { envelopeToScriptResponse } from "@/lib/api-client/script-sandbox"
import { parseDataFile } from "@/lib/runner/csv"
import { requestFailed, runCollection } from "@/lib/runner/runner"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"
import type { Environment } from "@/components/api-client/use-environments"
import { createProxy, installMemoryStorage, installProxyFetch } from "./proxy"
import { createScriptRunner, skippedScripts } from "./scripts"
import { REPORTERS, cliLines, cliSummary, render, summarize, type ReporterName } from "./reporters"

export const USAGE = `Usage: mdt run <collection-dir> [options]

Runs a MyDevTools folder collection (collection.yaml) or a Bruno /
OpenCollection folder, in order, with scripts and assertions.

Options:
  --folder <path>        Run one folder: "Auth/Login" (names) or a folder id
  --env <name|file>      Environment file (.yaml/.json/.bru; Postman env JSON ok)
                         or a name in <collection-dir>/environments/
  --env-var <k=v>        Set/override a variable (repeatable)
  --data <file>          CSV or JSON rows; one iteration per row
  --reporter <name>      cli (default) | json | junit | html
  --output <file>        Write the report to a file (default: stdout)
  --bail                 Stop after the first failed request
  --delay <ms>           Pause between requests
  --timeout <ms>         Default request timeout (requests' own setting wins)
  --insecure             Don't verify TLS certificates
  --no-scripts           Don't run pre-request/test scripts (untrusted collections)
  -h, --help             Show this help

Exit codes: 0 all passed, 1 a request/test/assertion failed, 2 usage or load error.
`

export class UsageError extends Error {}

export interface CliOptions {
    dir: string
    folder?: string
    env?: string
    envVars: Record<string, string>
    data?: string
    reporter: ReporterName
    output?: string
    bail: boolean
    delayMs?: number
    timeoutMs?: number
    insecure: boolean
    scripts: boolean
}

const positiveInt = (name: string, v: string | undefined): number | undefined => {
    if (v === undefined) return undefined
    const n = Number(v)
    if (!Number.isInteger(n) || n < 0) throw new UsageError(`--${name} expects a non-negative integer, got "${v}"`)
    return n
}

/** argv (after `node mdt`) → options, or null for --help. Throws UsageError. */
export function parseCliArgs(argv: string[]): CliOptions | null {
    let parsed
    try {
        parsed = parseArgs({
            args: argv,
            allowPositionals: true,
            options: {
                folder: { type: "string" },
                env: { type: "string" },
                "env-var": { type: "string", multiple: true },
                data: { type: "string" },
                reporter: { type: "string", default: "cli" },
                output: { type: "string" },
                bail: { type: "boolean", default: false },
                delay: { type: "string" },
                timeout: { type: "string" },
                insecure: { type: "boolean", default: false },
                "no-scripts": { type: "boolean", default: false },
                help: { type: "boolean", short: "h", default: false },
            },
        })
    } catch (e) {
        throw new UsageError((e as Error).message)
    }
    const { values, positionals } = parsed
    if (values.help) return null
    const [command, dir, ...extra] = positionals
    if (command !== "run") throw new UsageError(command ? `Unknown command "${command}"` : "Missing command")
    if (!dir) throw new UsageError("Missing <collection-dir>")
    if (extra.length) throw new UsageError(`Unexpected argument "${extra[0]}"`)
    if (!REPORTERS.includes(values.reporter as ReporterName)) {
        throw new UsageError(`--reporter must be one of ${REPORTERS.join(", ")}`)
    }
    const envVars: Record<string, string> = {}
    for (const kv of values["env-var"] ?? []) {
        const i = kv.indexOf("=")
        if (i <= 0) throw new UsageError(`--env-var expects key=value, got "${kv}"`)
        envVars[kv.slice(0, i)] = kv.slice(i + 1)
    }
    return {
        dir,
        folder: values.folder,
        env: values.env,
        envVars,
        data: values.data,
        reporter: values.reporter as ReporterName,
        output: values.output,
        bail: values.bail,
        delayMs: positiveInt("delay", values.delay),
        timeoutMs: positiveInt("timeout", values.timeout),
        insecure: values.insecure,
        scripts: !values["no-scripts"],
    }
}

/** Every file under `dir` (skipping dot-dirs and node_modules), forward-slash relative paths. */
async function readTree(dir: string, rel = ""): Promise<FileEntry[]> {
    const out: FileEntry[] = []
    for (const d of await readdir(path.join(dir, rel), { withFileTypes: true })) {
        if (d.name.startsWith(".") || d.name === "node_modules") continue
        const relPath = rel ? `${rel}/${d.name}` : d.name
        if (d.isDirectory()) out.push(...await readTree(dir, relPath))
        else if (/\.(ya?ml|bru|json)$/i.test(d.name)) out.push({ relPath, content: await readFile(path.join(dir, relPath), "utf8") })
    }
    return out
}

export async function loadCollection(dir: string, warn: (m: string) => void): Promise<{ collection: Collection; environments: Environment[] }> {
    if (!existsSync(dir)) throw new UsageError(`Collection folder not found: ${dir}`)
    const files = await readTree(dir)
    if (files.some((f) => f.relPath === MANIFEST_FILE)) {
        // environments/ holds env files, not requests.
        const { collection, warnings } = parseCollection(files.filter((f) => /\.ya?ml$/i.test(f.relPath) && !f.relPath.startsWith("environments/")))
        warnings.forEach(warn)
        return { collection, environments: [] }
    }
    if (files.some((f) => f.relPath === "bruno.json" || /^opencollection\.ya?ml$/.test(f.relPath))) {
        return importBrunoFolder(files.map((f) => ({ path: f.relPath, text: f.content })))
    }
    throw new UsageError(`${dir} is not a collection folder (no ${MANIFEST_FILE}, bruno.json or opencollection.yml)`)
}

/** Postman env JSON, our `{ variables: [...] }`, a `{ key: value }` map, or a Bruno .bru env. */
export function environmentFromText(text: string, file: string): Record<string, string> {
    const out: Record<string, string> = {}
    if (file.endsWith(".bru")) {
        for (const v of parseBrunoEnvironment(text, path.basename(file, ".bru")).variables) if (v.enabled !== false) out[v.key] = v.value
        return out
    }
    const doc = load(text) as Record<string, unknown> | null
    const list = (doc?.values ?? doc?.variables) as unknown
    if (Array.isArray(list)) {
        for (const v of list as { key?: string; value?: unknown; enabled?: boolean }[]) {
            if (v?.key && v.enabled !== false) out[v.key] = String(v.value ?? "")
        }
    } else if (doc && typeof doc === "object") {
        const map = (list && typeof list === "object" ? list : doc) as Record<string, unknown>
        for (const [k, v] of Object.entries(map)) if (v == null || typeof v !== "object") out[k] = String(v ?? "")
    }
    return out
}

async function resolveEnvironment(spec: string, dir: string, bundled: Environment[]): Promise<Record<string, string>> {
    if (existsSync(spec)) return environmentFromText(await readFile(spec, "utf8"), spec)
    const named = bundled.find((e) => e.name === spec)
    if (named) return Object.fromEntries(named.variables.filter((v) => v.enabled !== false).map((v) => [v.key, v.value]))
    for (const ext of [".yaml", ".yml", ".json", ".bru"]) {
        const file = path.join(dir, "environments", spec + ext)
        if (existsSync(file)) return environmentFromText(await readFile(file, "utf8"), file)
    }
    throw new UsageError(`Environment "${spec}" not found (file, bundled Bruno env, or ${path.join(dir, "environments", spec)}.yaml)`)
}

/** "Auth/Login" by folder names (case-insensitive), or a folder id anywhere. */
export function resolveFolder(collection: Collection, spec: string): string {
    const isFolder = (i: CollectionFolder | CollectionRequest): i is CollectionFolder => (i as CollectionFolder).type === "folder"
    const byId = (items: (CollectionFolder | CollectionRequest)[]): CollectionFolder | undefined => {
        for (const i of items) if (isFolder(i)) { if (i.id === spec) return i; const hit = byId(i.items); if (hit) return hit }
        return undefined
    }
    let items = collection.items
    let found: CollectionFolder | undefined
    for (const part of spec.split("/").filter(Boolean)) {
        found = items.filter(isFolder).find((f) => f.name.toLowerCase() === part.toLowerCase())
        if (!found) break
        items = found.items
    }
    const folder = found ?? byId(collection.items)
    if (!folder) throw new UsageError(`Folder "${spec}" not found in "${collection.name}"`)
    return folder.id
}

export async function main(argv: string[], out = process.stdout, err = process.stderr): Promise<number> {
    let opts: CliOptions | null
    try {
        opts = parseCliArgs(argv)
    } catch (e) {
        err.write(`mdt: ${(e as Error).message}\n\n${USAGE}`)
        return 2
    }
    if (!opts) {
        out.write(USAGE)
        return 0
    }

    let collection: Collection
    let env: Record<string, string>
    let folderId: string | undefined
    let dataRows: Record<string, string>[] | undefined
    try {
        const loaded = await loadCollection(opts.dir, (m) => err.write(`warning: ${m}\n`))
        collection = loaded.collection
        env = { ...(opts.env ? await resolveEnvironment(opts.env, opts.dir, loaded.environments) : {}), ...opts.envVars }
        folderId = opts.folder ? resolveFolder(collection, opts.folder) : undefined
        if (opts.data) {
            dataRows = parseDataFile(await readFile(opts.data, "utf8"))
            if (dataRows.length === 0) throw new UsageError(`--data file ${opts.data} has no rows`)
        }
    } catch (e) {
        err.write(`mdt: ${(e as Error).message}\n`)
        return 2
    }

    const { proxy, close } = createProxy({ insecure: opts.insecure, defaultTimeoutMs: opts.timeoutMs })
    installProxyFetch(proxy)
    installMemoryStorage()
    const scripts = opts.scripts
        ? createScriptRunner(async (req) => envelopeToScriptResponse(await proxy(req)))
        : skippedScripts
    // Live lines on stdout unless a non-cli report is going to stdout.
    const live = opts.reporter === "cli" || !!opts.output ? out : null

    const started = Date.now()
    let results
    try {
        results = await runCollection({
            collection,
            folderId,
            iterations: 1,
            dataRows,
            environmentVariables: env,
            runScript: scripts.run,
            bail: opts.bail,
            delayMs: opts.delayMs,
            onProgress: (e) => { if (e.kind === "request-done") live?.write(cliLines(e.result) + "\n") },
        })
    } finally {
        await scripts.close()
        await close()
    }
    const summary = summarize(results, Date.now() - started)
    if (live) live.write(cliSummary(summary) + "\n")
    if (results.length === 0) err.write("warning: no requests to run\n")

    if (opts.reporter !== "cli" || opts.output) {
        const report = render(opts.reporter, results, collection.name, summary)
        if (opts.output) await writeFile(opts.output, report)
        else out.write(report)
    }
    return results.some(requestFailed) ? 1 : 0
}
