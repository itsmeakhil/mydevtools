/**
 * "Sync from spec": diff a collection against a (new version of an) OpenAPI
 * spec and apply the changes the user accepts.
 *
 * Requests are matched by method + path (base URL, `{{var}}` prefix and path
 * param names ignored). Only spec-owned shape is compared — query params,
 * headers and body fields the spec adds, body type — so values the user typed,
 * auth, scripts, tests, docs and examples are never part of the diff and are
 * kept on apply. Nothing the user added is removed by a "changed" item; whole
 * requests missing from the spec are reported separately and only deleted
 * when the user ticks them.
 */
import type { Collection, CollectionFolder, CollectionRequest, RequestBody } from "@/components/api-client/types"
import { importOpenApiSpec, openApiBaseUrl, parseOpenApiSpec } from "@/lib/import/openapi"
import { insertAt, isFolder, removeItem, type TreeItem } from "./collection-tree"

export interface ChangeDetails {
    paramsAdded: string[]
    headersAdded: string[]
    /** "type": body type differs; "fields": the spec has body fields the request lacks. */
    body: "type" | "fields" | null
}

export type SyncChange =
    | { kind: "added"; key: string; request: CollectionRequest; folder: string | null }
    | { kind: "removed"; key: string; requestId: string; name: string }
    | { kind: "changed"; key: string; requestId: string; name: string; details: ChangeDetails; patch: Partial<CollectionRequest> }

/** `GET /pets/{}` — origin, `{{var}}` prefix, spec base path, query and param names dropped. */
export function endpointKey(method: string, url: string, basePath = ""): string {
    let p = url.trim().replace(/^\{\{[^}]+\}\}/, "").replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "")
    p = p.split(/[?#]/)[0].replace(/%7B/gi, "{").replace(/%7D/gi, "}")
    if (basePath && (p === basePath || p.startsWith(basePath + "/"))) p = p.slice(basePath.length)
    p = p.replace(/\{\{[^}]*\}\}|\{[^}]*\}|:[A-Za-z_]\w*/g, "{}").replace(/\/+$/, "")
    return `${method.toUpperCase()} ${p || "/"}`
}

function walkRequests(items: TreeItem[], folder: string | null, out: Array<{ req: CollectionRequest; folder: string | null }>) {
    for (const it of items) {
        if (isFolder(it)) walkRequests(it.items, folder ?? it.name, out)
        else out.push({ req: it, folder })
    }
    return out
}

/** Sorted key paths of a JSON value (`a`, `a.b`, `list[].id`); null when not JSON. */
function jsonPaths(text: string): Set<string> | null {
    let v: unknown
    try { v = JSON.parse(text) } catch { return null }
    const out = new Set<string>()
    const walk = (x: unknown, at: string) => {
        if (Array.isArray(x)) { if (x.length) walk(x[0], `${at}[]`) }
        else if (x && typeof x === "object") {
            for (const [k, val] of Object.entries(x)) {
                const p = at ? `${at}.${k}` : k
                out.add(p)
                walk(val, p)
            }
        }
    }
    walk(v, "")
    return out
}

/** New spec skeleton, with the user's values wherever the same field still exists. */
export function mergeJson(spec: unknown, mine: unknown): unknown {
    if (Array.isArray(spec) && Array.isArray(mine)) {
        return mine.length ? mine.map((m) => mergeJson(spec[0], m)) : spec
    }
    if (spec && mine && typeof spec === "object" && typeof mine === "object" && !Array.isArray(spec) && !Array.isArray(mine)) {
        const out: Record<string, unknown> = { ...(mine as Record<string, unknown>) }
        for (const [k, v] of Object.entries(spec)) out[k] = k in out ? mergeJson(v, out[k]) : v
        return out
    }
    return mine === undefined ? spec : mine
}

const missing = <T extends { key: string }>(have: { key: string }[] | undefined, want: T[] | undefined, ci = false): T[] => {
    const norm = (k: string) => (ci ? k.toLowerCase() : k)
    const seen = new Set((have ?? []).map((i) => norm(i.key)))
    return (want ?? []).filter((i) => i.key && !seen.has(norm(i.key)))
}

function compare(old: CollectionRequest, next: CollectionRequest): { details: ChangeDetails; patch: Partial<CollectionRequest> } {
    const patch: Partial<CollectionRequest> = {}
    const newParams = missing(old.params, next.params)
    if (newParams.length) patch.params = [...(old.params ?? []), ...newParams]
    const newHeaders = missing(old.headers, next.headers, true)
    if (newHeaders.length) patch.headers = [...(old.headers ?? []), ...newHeaders]

    let body: ChangeDetails["body"] = null
    const ob: RequestBody = old.body ?? { type: "none", content: "" }
    const nb: RequestBody = next.body ?? { type: "none", content: "" }
    if (ob.type !== nb.type) {
        // Spec has no body but the user added one: theirs, not drift.
        if (nb.type !== "none") { body = "type"; patch.body = nb }
    } else if (nb.type === "json") {
        const have = jsonPaths(ob.content)
        const want = jsonPaths(nb.content)
        // Unparseable (e.g. unquoted `{{var}}`) ⇒ can't compare safely, leave it.
        if (have && want && [...want].some((p) => !have.has(p))) {
            body = "fields"
            patch.body = { ...ob, content: JSON.stringify(mergeJson(JSON.parse(nb.content), JSON.parse(ob.content)), null, 2) }
        }
    } else if (nb.type === "form-data") {
        const add = missing(ob.formData, nb.formData)
        if (add.length) { body = "fields"; patch.body = { ...ob, formData: [...(ob.formData ?? []), ...add] } }
    } else if (nb.type === "x-www-form-urlencoded") {
        const add = missing(ob.urlEncoded, nb.urlEncoded)
        if (add.length) { body = "fields"; patch.body = { ...ob, urlEncoded: [...(ob.urlEncoded ?? []), ...add] } }
    }
    return {
        details: { paramsAdded: newParams.map((p) => p.key), headersAdded: newHeaders.map((h) => h.key), body },
        patch,
    }
}

export function diffOpenApiSync(existing: Collection, specSource: string | object): SyncChange[] {
    const spec = parseOpenApiSpec(specSource)
    const incoming = importOpenApiSpec(spec)
    const baseUrl = openApiBaseUrl(spec)
    const basePath = baseUrl.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "")

    const mine = new Map<string, CollectionRequest>()
    for (const { req } of walkRequests(existing.items, null, [])) {
        const k = endpointKey(req.method, req.url, basePath)
        if (!mine.has(k)) mine.set(k, req)
    }
    // Keep new requests on the user's base-URL variable if they switched to one.
    const varPrefix = [...mine.values()].map((r) => /^\{\{[^}]+\}\}/.exec(r.url.trim())?.[0]).find(Boolean)

    const changes: SyncChange[] = []
    const specKeys = new Set<string>()
    for (const { req, folder } of walkRequests(incoming.items, null, [])) {
        const k = endpointKey(req.method, req.url, basePath)
        if (specKeys.has(k)) continue
        specKeys.add(k)
        const old = mine.get(k)
        if (!old) {
            const request = varPrefix && baseUrl && req.url.startsWith(baseUrl)
                ? { ...req, url: varPrefix + req.url.slice(baseUrl.length) }
                : req
            changes.push({ kind: "added", key: k, request, folder })
            continue
        }
        const { details, patch } = compare(old, req)
        if (Object.keys(patch).length) changes.push({ kind: "changed", key: k, requestId: old.id, name: old.name, details, patch })
    }
    for (const [k, req] of mine) {
        if (!specKeys.has(k)) changes.push({ kind: "removed", key: k, requestId: req.id, name: req.name })
    }
    return changes
}

/**
 * Accepted changes → the next item tree plus the backend delta ops that
 * produce it (`add` / `update` / `delete`, collection id = root parent).
 */
export function applyOpenApiSync(existing: Collection, accepted: SyncChange[]): { items: TreeItem[]; ops: object[] } {
    let items: TreeItem[] = existing.items
    const ops: object[] = []
    const newFolders = new Map<string, CollectionFolder>()

    for (const c of accepted) {
        if (c.kind === "changed") {
            const patchTree = (list: TreeItem[]): TreeItem[] =>
                list.map((it) => (isFolder(it) ? { ...it, items: patchTree(it.items) } : it.id === c.requestId ? { ...it, ...c.patch } : it))
            items = patchTree(items)
            ops.push({ type: "update", item_id: c.requestId, patch: c.patch })
        } else if (c.kind === "removed") {
            items = removeItem(items, c.requestId)
            ops.push({ type: "delete", item_id: c.requestId })
        } else if (c.folder === null) {
            items = insertAt(items, null, items.length, c.request)
            ops.push({ type: "add", parent_id: existing.id, item: c.request })
        } else {
            const folder = items.find((it): it is CollectionFolder => isFolder(it) && it.name === c.folder)
            if (folder) {
                items = insertAt(items, folder.id, folder.items.length, c.request)
                ops.push({ type: "add", parent_id: folder.id, item: c.request })
            } else {
                const f = newFolders.get(c.folder) ?? { id: crypto.randomUUID(), name: c.folder, type: "folder" as const, items: [], isOpen: true }
                f.items.push(c.request)
                newFolders.set(c.folder, f)
            }
        }
    }
    for (const f of newFolders.values()) {
        items = insertAt(items, null, items.length, f)
        ops.push({ type: "add", parent_id: existing.id, item: f })
    }
    return { items, ops }
}

