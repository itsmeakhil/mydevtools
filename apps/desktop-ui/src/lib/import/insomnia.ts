/**
 * Insomnia import — v4 JSON (`_type: "export"`, `resources[]`) and v5 YAML
 * (`type: collection.insomnia.rest/5.0` / `environment.insomnia.rest/5.0`).
 * Round-trips `lib/export/insomnia.ts`. Template tags `{{ _.VAR }}` become
 * our `{{VAR}}`; `insomnia.*` scripts are copied verbatim (no translation).
 */

import yaml from "js-yaml"

import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    KeyValueItem,
    RequestAuth,
    RequestBody,
    RequestFormDataItem,
    RequestMethod,
} from "@/components/api-client/types"
import type { Environment, EnvironmentVariable } from "@/components/api-client/use-environments"

interface InsKV { name?: string; value?: string; disabled?: boolean; type?: string; fileName?: string }
interface InsBody { mimeType?: string; text?: string; params?: InsKV[] }
interface InsAuth { type?: string; disabled?: boolean; [k: string]: unknown }

/** Fields shared by v4 `request`/`request_group` resources and v5 tree items. */
interface InsNode {
    name?: string
    method?: string
    url?: string
    parameters?: InsKV[]
    headers?: InsKV[]
    body?: InsBody
    authentication?: InsAuth
    preRequestScript?: string   // v4
    afterResponseScript?: string
    scripts?: { preRequest?: string; afterResponse?: string } // v5
}

interface InsV4Resource extends InsNode {
    _id: string
    _type: string
    parentId?: string | null
    metaSortKey?: number
    data?: Record<string, unknown>
}

interface InsV5Item extends InsNode {
    children?: InsV5Item[]
    meta?: { sortKey?: number }
}

interface InsV5Env { name?: string; data?: Record<string, unknown>; subEnvironments?: InsV5Env[] }

interface InsV5Doc {
    type?: string
    name?: string
    collection?: InsV5Item[]
    environments?: InsV5Env | InsV5Env[]
    /** `environment.insomnia.rest/5.0` files carry the variables at the root. */
    data?: Record<string, unknown>
}

export interface InsomniaImportResult {
    collection: Collection
    environments: Environment[]
}

const VALID_METHODS = new Set<RequestMethod>([
    "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS",
])

function id(): string { return crypto.randomUUID() }

/** `{{ _.base_url }}` / `{{ base_url }}` → `{{base_url}}`. `{% tags %}` are left alone. */
function tpl(v: unknown): string {
    return typeof v === "string" ? v.replace(/\{\{\s*(?:_\.)?([^{}\s]+)\s*\}\}/g, "{{$1}}") : ""
}

function opt(v: unknown): string | undefined {
    return typeof v === "string" ? tpl(v) : undefined
}

function kvList(items: InsKV[] | undefined): KeyValueItem[] {
    return (items ?? [])
        .filter((kv) => kv && (kv.name || kv.value))
        .map((kv) => ({ id: id(), key: tpl(kv.name), value: tpl(kv.value), active: !kv.disabled }))
}

function convertBody(b: InsBody | undefined): RequestBody {
    const mime = (b?.mimeType ?? "").toLowerCase()
    const text = tpl(b?.text)
    if (mime === "application/x-www-form-urlencoded") {
        // Our exporter writes the encoded string; Insomnia writes params[].
        const urlEncoded = b?.params
            ? kvList(b.params)
            : [...new URLSearchParams(text)].map(([key, value]) => ({ id: id(), key, value, active: true }))
        return { type: "x-www-form-urlencoded", content: "", urlEncoded }
    }
    if (mime === "multipart/form-data") {
        const formData: RequestFormDataItem[] = (b?.params ?? [])
            .filter((p) => p && (p.name || p.value || p.fileName))
            .map((p) => p.type === "file"
                ? { id: id(), key: tpl(p.name), value: "", active: !p.disabled, valueType: "file", fileName: p.fileName?.split(/[\\/]/).pop() || undefined }
                : { id: id(), key: tpl(p.name), value: tpl(p.value), active: !p.disabled, valueType: "text" })
        return { type: "form-data", content: "", formData }
    }
    if (mime === "application/graphql") {
        try {
            const g = JSON.parse(b?.text ?? "") as { query?: unknown; variables?: unknown }
            const vars = g.variables
            return {
                type: "graphql",
                content: tpl(g.query),
                graphqlVariables: vars == null || vars === ""
                    ? undefined
                    : typeof vars === "string" ? tpl(vars) : JSON.stringify(vars, null, 2),
            }
        } catch {
            return { type: "graphql", content: text }
        }
    }
    if (mime === "application/json") return { type: "json", content: text }
    if (!mime && !text) return { type: "none", content: "" }
    // text/plain, application/xml, anything else → raw text.
    return { type: "text", content: text }
}

function convertAuth(a: InsAuth | undefined): RequestAuth {
    if (!a || a.disabled || !a.type) return { type: "none" }
    switch (a.type) {
        case "basic":
            return { type: "basic", username: opt(a.username), password: opt(a.password) }
        case "bearer":
            // ponytail: Insomnia's custom `prefix` is dropped — we always send "Bearer".
            return { type: "bearer", token: opt(a.token) }
        case "apikey":
            return {
                type: "api-key",
                apiKeyKey: opt(a.key),
                apiKeyValue: opt(a.value),
                apiKeyLocation: a.addTo === "queryParams" ? "query" : "header",
            }
        case "oauth2":
            return {
                type: "oauth2",
                oauth2: {
                    grantType: a.grantType === "authorization_code" ? "authorization_code" : "client_credentials",
                    tokenUrl: opt(a.accessTokenUrl) ?? "",
                    clientId: opt(a.clientId) ?? "",
                    clientSecret: opt(a.clientSecret),
                    scope: opt(a.scope),
                    audience: opt(a.audience),
                    authUrl: opt(a.authorizationUrl),
                    redirectUri: opt(a.redirectUrl),
                },
            }
        default:
            return { type: "none" }
    }
}

function scripts(n: InsNode): { preRequestScript?: string; testScript?: string } {
    return {
        preRequestScript: (n.preRequestScript ?? n.scripts?.preRequest) || undefined,
        testScript: (n.afterResponseScript ?? n.scripts?.afterResponse) || undefined,
    }
}

function convertRequest(r: InsNode): CollectionRequest {
    const m = (r.method ?? "GET").toUpperCase() as RequestMethod
    const method = VALID_METHODS.has(m) ? m : "GET"
    return {
        id: id(),
        name: r.name || method,
        method,
        url: tpl(r.url),
        params: kvList(r.parameters),
        headers: kvList(r.headers),
        body: convertBody(r.body),
        auth: convertAuth(r.authentication),
        ...scripts(r),
    }
}

function convertFolder(n: InsNode, items: CollectionFolder["items"]): CollectionFolder {
    const defaultAuth = convertAuth(n.authentication)
    const defaultHeaders = kvList(n.headers)
    return {
        id: id(),
        name: n.name || "Folder",
        type: "folder",
        items,
        isOpen: false,
        defaultAuth: defaultAuth.type === "none" ? undefined : defaultAuth,
        defaultHeaders: defaultHeaders.length ? defaultHeaders : undefined,
        ...scripts(n),
    }
}

/** Nested env objects become dotted keys; non-string leaves are JSON-encoded. */
function flatten(data: unknown, prefix: string, out: EnvironmentVariable[]): void {
    if (!data || typeof data !== "object" || Array.isArray(data)) return
    for (const [k, v] of Object.entries(data)) {
        const key = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out)
        else out.push({ id: id(), key, value: typeof v === "string" ? tpl(v) : v == null ? "" : JSON.stringify(v), enabled: true })
    }
}

function toEnvironment(name: string | undefined, data: unknown): Environment | null {
    const variables: EnvironmentVariable[] = []
    flatten(data, "", variables)
    return variables.length ? { id: id(), name: name || "Insomnia environment", variables } : null
}

function importV4(resources: InsV4Resource[]): InsomniaImportResult {
    const res = resources.filter((r) => r && typeof r === "object")
    const bySort = (a: InsV4Resource, b: InsV4Resource) => (a.metaSortKey ?? 0) - (b.metaSortKey ?? 0)
    const ROOT = "__root__"
    const groupIds = new Set(res.filter((r) => r._type === "request_group").map((r) => r._id))
    const children = new Map<string, InsV4Resource[]>()
    for (const r of res) {
        if (r._type !== "request" && r._type !== "request_group") continue
        // ponytail: everything not under a known group (workspace children, orphans,
        // extra workspaces) lands at the root.
        const parent = r.parentId && groupIds.has(r.parentId) ? r.parentId : ROOT
        children.set(parent, [...(children.get(parent) ?? []), r])
    }
    const walk = (parent: string): CollectionFolder["items"] =>
        (children.get(parent) ?? []).sort(bySort).map((r) =>
            r._type === "request_group" ? convertFolder(r, walk(r._id)) : convertRequest(r))

    const workspace = res.find((r) => r._type === "workspace")
    const environments = res
        .filter((r) => r._type === "environment")
        .sort(bySort)
        .map((r) => toEnvironment(r.name, r.data))
        .filter((e): e is Environment => e !== null)

    return {
        collection: { id: id(), name: workspace?.name || "Imported Insomnia collection", items: walk(ROOT) },
        environments,
    }
}

function importV5(doc: InsV5Doc): InsomniaImportResult {
    const walk = (items: InsV5Item[] | undefined): CollectionFolder["items"] =>
        (items ?? [])
            .filter((it) => it && typeof it === "object")
            .sort((a, b) => (a.meta?.sortKey ?? 0) - (b.meta?.sortKey ?? 0))
            .map((it) => it.children || (!it.url && !it.method)
                ? convertFolder(it, walk(it.children))
                : convertRequest(it))

    const environments: Environment[] = []
    const collect = (e: InsV5Env | undefined): void => {
        if (!e || typeof e !== "object") return
        const env = toEnvironment(e.name, e.data)
        if (env) environments.push(env)
        for (const sub of e.subEnvironments ?? []) collect(sub)
    }
    if (Array.isArray(doc.environments)) doc.environments.forEach(collect)
    else collect(doc.environments)
    if (doc.data) collect({ name: doc.name, data: doc.data })

    return {
        collection: { id: id(), name: doc.name || "Imported Insomnia collection", items: walk(doc.collection) },
        environments,
    }
}

export function looksLikeInsomniaExport(text: string): boolean {
    const t = text.trim()
    if (t.startsWith("{")) {
        try {
            const d = JSON.parse(t) as { _type?: unknown; resources?: unknown }
            return d?._type === "export" && Array.isArray(d.resources)
        } catch {
            return false
        }
    }
    return /^type:\s*["']?(collection|environment)\.insomnia\.rest\/5\.0/m.test(t)
        || /^_type:\s*["']?export\b/m.test(t)
}

export function importInsomniaWithMeta(text: string): InsomniaImportResult {
    const t = text.trim()
    // yaml.load also parses JSON, so v4 YAML exports come for free.
    const doc = (t.startsWith("{") ? JSON.parse(t) : yaml.load(t)) as
        { _type?: string; resources?: InsV4Resource[] } & InsV5Doc
    if (!doc || typeof doc !== "object") throw new Error("Not an Insomnia export")
    if (doc._type === "export" && Array.isArray(doc.resources)) return importV4(doc.resources)
    if (/insomnia\.rest\/5\.0$/.test(String(doc.type))) return importV5(doc)
    throw new Error("Not an Insomnia export (expected v4 `_type: export` or v5 `type: *.insomnia.rest/5.0`)")
}

export function importInsomnia(text: string): Collection {
    return importInsomniaWithMeta(text).collection
}
