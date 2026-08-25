/**
 * Bruno import — both on-disk formats:
 *   - legacy `.bru` language (`meta { … }`, `post { … }`, `body:json { … }` …),
 *   - v4 OpenCollection YAML (`opencollection.yml` + one `request.yml` per request).
 *
 * Pure functions, no fs: the UI hands us a flat `{ path, text }[]` of the opened
 * folder. `{{var}}` syntax is identical to ours so values pass through untouched.
 *
 * OpenCollection shape (from bruno-filestore `formats/yml`, docs 404 at time of
 * writing): `info.{name,type,seq}`, `http.{method,url,params,headers,body,auth}`
 * (`graphql.*` for graphql requests), `runtime.scripts[{type,code}]`. A flatter
 * `{ name, type, http, params, headers, body, auth, scripts, tests }` is accepted
 * too since the spec is still moving.
 */

import { load } from "js-yaml"
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
import type { OAuth2GrantType } from "@/lib/oauth2"

const METHODS: RequestMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

function id(): string { return crypto.randomUUID() }

// ── .bru block parser ──────────────────────────────────────────────────────
// A file is a sequence of `name {` … `}` (dict or raw text) and `name [` … `]`
// (array) blocks. Closing brackets sit at column 0; inner lines are indented 2.

interface BruBlock { lines: string[] }
type BruBlocks = Map<string, BruBlock>
interface Entry { key: string; value: string; enabled: boolean }

export function parseBruBlocks(text: string): BruBlocks {
    const out: BruBlocks = new Map()
    const lines = text.split(/\r?\n/)
    let i = 0
    while (i < lines.length) {
        const m = /^([A-Za-z][\w:-]*)\s*([{[])\s*$/.exec(lines[i])
        if (!m) { i++; continue }
        const close = m[2] === "{" ? "}" : "]"
        const body: string[] = []
        i++
        while (i < lines.length && lines[i].trimEnd() !== close) body.push(lines[i++])
        i++
        out.set(m[1], { lines: body })
    }
    return out
}

/** `key: value` lines; `~key` = disabled; `'''` opens a multi-line value. */
function dict(block: BruBlock | undefined): Entry[] {
    if (!block) return []
    const out: Entry[] = []
    const ls = block.lines
    for (let i = 0; i < ls.length; i++) {
        const line = ls[i].trim()
        const idx = line.indexOf(":")
        if (!line || idx < 0) continue
        let key = line.slice(0, idx).trim()
        let value = line.slice(idx + 1).trim()
        if (value === "[") { // nested array (meta.tags) — skip
            while (i < ls.length && ls[i].trim() !== "]") i++
            continue
        }
        if (value === "'''") {
            const acc: string[] = []
            i++
            while (i < ls.length && ls[i].trim() !== "'''") acc.push(ls[i++].replace(/^ {4}/, ""))
            value = acc.join("\n")
        }
        const enabled = !key.startsWith("~")
        if (!enabled) key = key.slice(1)
        out.push({ key, value, enabled })
    }
    return out
}

function text(block: BruBlock | undefined): string {
    return block ? block.lines.map((l) => l.replace(/^ {2}/, "")).join("\n") : ""
}

function array(block: BruBlock | undefined): Entry[] {
    if (!block) return []
    return block.lines
        .map((l) => l.trim().replace(/,$/, "").trim())
        .filter(Boolean)
        .map((k) => ({ key: k.replace(/^~/, ""), value: "", enabled: !k.startsWith("~") }))
}

function get(entries: Entry[], key: string): string | undefined {
    return entries.find((e) => e.key === key)?.value
}

function toKv(entries: Entry[]): KeyValueItem[] {
    return entries.map((e) => ({ id: id(), key: e.key, value: e.value, active: e.enabled }))
}

function joinScripts(...parts: Array<string | undefined>): string | undefined {
    const cleaned = parts.map((p) => (p ?? "").trim()).filter(Boolean)
    return cleaned.length ? cleaned.join("\n\n") : undefined
}

// ── Shared converters (used by both formats) ───────────────────────────────

function formItem(key: string, value: string, enabled: boolean): RequestFormDataItem {
    const file = /^@file\(([^)]*)\)/.exec(value)
    return file
        ? { id: id(), key, value: "", active: enabled, valueType: "file", fileName: file[1].split("|")[0] }
        : { id: id(), key, value: value.replace(/\s*@contentType\([^)]*\)\s*$/, ""), active: enabled, valueType: "text" }
}

function grantType(raw: string | undefined): OAuth2GrantType {
    return raw === "authorization_code" || raw === "password" ? raw : "client_credentials"
}

function bruAuth(mode: string | undefined, blocks: BruBlocks): RequestAuth {
    const block = (name: string) => dict(blocks.get(`auth:${name}`))
    if (mode === "basic" || (!mode && blocks.has("auth:basic"))) {
        const a = block("basic")
        return { type: "basic", username: get(a, "username"), password: get(a, "password") }
    }
    if (mode === "bearer" || (!mode && blocks.has("auth:bearer"))) {
        return { type: "bearer", token: get(block("bearer"), "token") }
    }
    if (mode === "apikey" || (!mode && blocks.has("auth:apikey"))) {
        const a = block("apikey")
        return {
            type: "api-key",
            apiKeyKey: get(a, "key"),
            apiKeyValue: get(a, "value"),
            apiKeyLocation: get(a, "placement") === "queryparams" || get(a, "placement") === "query" ? "query" : "header",
        }
    }
    if (mode === "oauth2" || (!mode && blocks.has("auth:oauth2"))) {
        const a = block("oauth2")
        return {
            type: "oauth2",
            oauth2: {
                grantType: grantType(get(a, "grant_type")),
                tokenUrl: get(a, "access_token_url") ?? "",
                clientId: get(a, "client_id") ?? "",
                clientSecret: get(a, "client_secret"),
                scope: get(a, "scope"),
                authUrl: get(a, "authorization_url"),
                redirectUri: get(a, "callback_url"),
            },
        }
    }
    return { type: "none" }
}

function bruBody(mode: string | undefined, blocks: BruBlocks): RequestBody {
    const has = (n: string) => blocks.has(n)
    if (mode === "json" || (!mode && (has("body:json") || has("body")))) {
        return { type: "json", content: text(blocks.get("body:json") ?? blocks.get("body")) }
    }
    if (mode === "text" || mode === "xml" || mode === "sparql" || (!mode && (has("body:text") || has("body:xml")))) {
        return { type: "text", content: text(blocks.get(`body:${mode ?? (has("body:text") ? "text" : "xml")}`)) }
    }
    if (mode === "formUrlEncoded" || (!mode && has("body:form-urlencoded"))) {
        return { type: "x-www-form-urlencoded", content: "", urlEncoded: toKv(dict(blocks.get("body:form-urlencoded"))) }
    }
    if (mode === "multipartForm" || (!mode && has("body:multipart-form"))) {
        return {
            type: "form-data",
            content: "",
            formData: dict(blocks.get("body:multipart-form")).map((e) => formItem(e.key, e.value, e.enabled)),
        }
    }
    if (mode === "graphql" || (!mode && has("body:graphql"))) {
        return {
            type: "graphql",
            content: text(blocks.get("body:graphql")),
            graphqlVariables: text(blocks.get("body:graphql:vars")) || undefined,
        }
    }
    return { type: "none", content: "" }
}

/** Folder-level defaults shared by `folder.bru` and request files. */
function bruDefaults(blocks: BruBlocks, authMode: string | undefined) {
    return {
        headers: toKv(dict(blocks.get("headers"))),
        auth: bruAuth(authMode, blocks),
        preRequestScript: joinScripts(text(blocks.get("script:pre-request"))),
        testScript: joinScripts(text(blocks.get("script:post-response")), text(blocks.get("tests"))),
    }
}

// ── .bru request ───────────────────────────────────────────────────────────

export function looksLikeBrunoBru(text: string): boolean {
    return /^(meta|get|post|put|patch|delete|head|options|headers|params:(query|path)|body(:[\w-]+)*|auth:\w+|vars:[\w-]+|script:[\w-]+|tests|docs)\s*[{[]\s*$/m.test(text)
}

export function parseBruRequest(text: string): CollectionRequest {
    const blocks = parseBruBlocks(text)
    const meta = dict(blocks.get("meta"))
    const methodName = METHODS.find((m) => blocks.has(m.toLowerCase()))
    const req = dict(methodName ? blocks.get(methodName.toLowerCase()) : undefined)
    const authMode = get(req, "auth") ?? get(dict(blocks.get("auth")), "mode")
    const d = bruDefaults(blocks, authMode)
    // ponytail: `params:path` values are dropped — our model has no path params;
    // the `:id` placeholders stay in the URL for the user to fill.
    return {
        id: id(),
        name: get(meta, "name") || methodName || "Request",
        method: methodName ?? "GET",
        url: get(req, "url") ?? "",
        params: toKv(dict(blocks.get("params:query") ?? blocks.get("query"))),
        headers: d.headers,
        body: bruBody(get(req, "body"), blocks),
        auth: d.auth,
        preRequestScript: d.preRequestScript,
        testScript: d.testScript,
    }
}

export function parseBrunoEnvironment(text: string, name: string): Environment {
    const blocks = parseBruBlocks(text)
    const toVar = (e: Entry): EnvironmentVariable => ({ id: id(), key: e.key, value: e.value, enabled: e.enabled })
    return {
        id: id(),
        name,
        variables: [...dict(blocks.get("vars")), ...array(blocks.get("vars:secret"))].map(toVar),
    }
}

// ── OpenCollection YAML ────────────────────────────────────────────────────

type Yaml = Record<string, unknown>
const obj = (v: unknown): Yaml => (v && typeof v === "object" && !Array.isArray(v) ? (v as Yaml) : {})
const str = (v: unknown): string => (v == null ? "" : typeof v === "string" ? v : typeof v === "object" ? str(obj(v).data) : String(v))
const list = (v: unknown): Yaml[] => (Array.isArray(v) ? v.map(obj) : [])

export function looksLikeOpenCollectionYaml(text: string): boolean {
    return /^(http|graphql):\s*$/m.test(text) && /^\s+(method|url):/m.test(text)
}

function ocKv(items: unknown): KeyValueItem[] {
    return list(items).map((e) => ({ id: id(), key: str(e.name), value: str(e.value), active: e.disabled !== true }))
}

function ocAuth(a: unknown): RequestAuth {
    const y = obj(a)
    const type = str(y.type)
    if (type === "basic") return { type: "basic", username: str(y.username), password: str(y.password) }
    if (type === "bearer") return { type: "bearer", token: str(y.token) }
    if (type === "apikey") {
        return {
            type: "api-key",
            apiKeyKey: str(y.key),
            apiKeyValue: str(y.value),
            apiKeyLocation: str(y.placement) === "query" ? "query" : "header",
        }
    }
    if (type === "oauth2") {
        return {
            type: "oauth2",
            oauth2: {
                grantType: grantType(str(y.grantType)),
                tokenUrl: str(y.accessTokenUrl),
                clientId: str(y.clientId),
                clientSecret: str(y.clientSecret) || undefined,
                scope: str(y.scope) || undefined,
                authUrl: str(y.authorizationUrl) || undefined,
                redirectUri: str(y.callbackUrl) || undefined,
            },
        }
    }
    return { type: "none" }
}

function ocBody(b: unknown): RequestBody {
    const y = obj(b)
    if (y.query != null) return { type: "graphql", content: str(y.query), graphqlVariables: str(y.variables) || undefined }
    const type = str(y.type).toLowerCase().replace(/[^a-z]/g, "")
    if (type === "json") return { type: "json", content: str(y.data) }
    if (type === "text" || type === "xml" || type === "sparql") return { type: "text", content: str(y.data) }
    if (type === "formurlencoded") return { type: "x-www-form-urlencoded", content: "", urlEncoded: ocKv(y.data) }
    if (type === "multipartform") {
        return {
            type: "form-data",
            content: "",
            formData: list(y.data).map((e) =>
                str(e.type) === "file" || Array.isArray(e.value)
                    ? formItem(str(e.name), `@file(${Array.isArray(e.value) ? str(e.value[0]) : str(e.value)})`, e.disabled !== true)
                    : formItem(str(e.name), str(e.value), e.disabled !== true)),
        }
    }
    return { type: "none", content: "" }
}

function ocScripts(scripts: unknown, tests: unknown): { pre?: string; test?: string } {
    const y = obj(scripts)
    const byType = (t: string) => list(scripts).find((s) => str(s.type) === t)?.code
    return {
        pre: joinScripts(str(byType("before-request") ?? y.preRequest)),
        test: joinScripts(str(byType("after-response") ?? y.postResponse), str(byType("tests") ?? y.tests ?? tests)),
    }
}

/** Shared by request.yml and folder.yml: the `http`/`graphql` block (or root) carries headers + auth. */
function ocDefaults(doc: Yaml) {
    const block = obj(doc.http ?? doc.graphql ?? doc.request)
    const runtime = obj(doc.runtime)
    const s = ocScripts(runtime.scripts ?? doc.scripts, doc.tests)
    return {
        block,
        headers: ocKv(block.headers ?? doc.headers),
        auth: ocAuth(block.auth ?? doc.auth),
        preRequestScript: s.pre,
        testScript: s.test,
    }
}

export function parseOpenCollectionRequestYaml(text: string): CollectionRequest {
    const doc = obj(load(text))
    const info = obj(doc.info)
    const d = ocDefaults(doc)
    const method = str(d.block.method ?? doc.method).toUpperCase() as RequestMethod
    return {
        id: id(),
        name: str(info.name ?? doc.name) || "Request",
        method: METHODS.includes(method) ? method : "GET",
        url: str(d.block.url ?? doc.url),
        params: ocKv(d.block.params ?? doc.params).filter((_, i) => str(list(d.block.params ?? doc.params)[i].type) !== "path"),
        headers: d.headers,
        body: ocBody(d.block.body ?? doc.body),
        auth: d.auth,
        preRequestScript: d.preRequestScript,
        testScript: d.testScript,
    }
}

function parseOpenCollectionEnvironment(text: string, fallbackName: string): Environment {
    const doc = obj(load(text))
    return {
        id: id(),
        name: str(doc.name) || fallbackName,
        variables: list(doc.variables).map((v) => ({
            id: id(),
            key: str(v.name),
            value: v.secret === true ? "" : str(v.value),
            enabled: v.disabled !== true,
        })),
    }
}

// ── Folder import ──────────────────────────────────────────────────────────

export interface BrunoFile { path: string; text: string }
export interface BrunoImportResult { collection: Collection; environments: Environment[] }

interface Node {
    name: string
    seq?: number
    order: number
    item: CollectionFolder | CollectionRequest
}

const basename = (p: string) => p.slice(p.lastIndexOf("/") + 1)
const dirname = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "")
const stripExt = (p: string) => p.replace(/\.(bru|ya?ml)$/, "")

export function importBrunoFolder(input: BrunoFile[]): BrunoImportResult {
    const files = input.map((f) => ({ ...f, path: f.path.replace(/\\/g, "/").replace(/^\.?\//, "") }))
    // Root = wherever the manifest lives (tolerates a zip with a wrapping directory).
    const manifest = files.find((f) => /(^|\/)(bruno\.json|opencollection\.yml)$/.test(f.path))
    const root = manifest ? dirname(manifest.path) : ""
    const rel = (p: string) => (root ? p.slice(root.length + 1) : p)
    const inRoot = files.filter((f) => !root || f.path.startsWith(root + "/"))

    let name = "Bruno collection"
    if (manifest?.path.endsWith(".json")) {
        try { name = str(obj(JSON.parse(manifest.text)).name) || name } catch { /* keep default */ }
    } else if (manifest) {
        const doc = obj(load(manifest.text))
        name = str(obj(doc.info).name ?? doc.name) || name
    }

    const environments: Environment[] = []
    const folders = new Map<string, Node>()   // dir path → folder node
    const children = new Map<string, Node[]>() // dir path → nodes
    const push = (dir: string, node: Node) => {
        if (!children.has(dir)) children.set(dir, [])
        children.get(dir)!.push(node)
    }
    const folderNode = (dir: string): Node => {
        let node = folders.get(dir)
        if (!node) {
            node = {
                name: basename(dir),
                order: Number.MAX_SAFE_INTEGER, // folders without seq sort after seq'd siblings, by path
                item: { id: id(), name: basename(dir), type: "folder", items: [], isOpen: false },
            }
            folders.set(dir, node)
            if (dir) push(dirname(dir), node)
        }
        return node
    }

    inRoot.forEach((file, order) => {
        const p = rel(file.path)
        const base = basename(p)
        const dir = dirname(p)
        if (p.startsWith("environments/")) {
            if (base.endsWith(".bru")) environments.push(parseBrunoEnvironment(file.text, stripExt(base)))
            else if (/\.ya?ml$/.test(base)) environments.push(parseOpenCollectionEnvironment(file.text, stripExt(base)))
            return
        }
        if (base === "folder.bru" || base === "folder.yml") {
            const node = folderNode(dir)
            const folder = node.item as CollectionFolder
            let d: ReturnType<typeof bruDefaults> | ReturnType<typeof ocDefaults>
            let meta: Yaml
            if (base === "folder.bru") {
                const blocks = parseBruBlocks(file.text)
                meta = Object.fromEntries(dict(blocks.get("meta")).map((e) => [e.key, e.value]))
                d = bruDefaults(blocks, get(dict(blocks.get("auth")), "mode"))
            } else {
                const doc = obj(load(file.text))
                meta = obj(doc.info ?? doc)
                d = ocDefaults(doc)
            }
            node.name = folder.name = str(meta.name) || folder.name
            if (meta.seq != null && meta.seq !== "") node.seq = Number(meta.seq)
            if (d.headers.length) folder.defaultHeaders = d.headers
            if (d.auth.type !== "none") folder.defaultAuth = d.auth
            folder.preRequestScript = d.preRequestScript
            folder.testScript = d.testScript
            return
        }
        if (base === "bruno.json" || base === "collection.bru" || base === "opencollection.yml") return
        let request: CollectionRequest
        let seq: string | undefined
        if (base.endsWith(".bru")) {
            const blocks = parseBruBlocks(file.text)
            const meta = dict(blocks.get("meta"))
            const type = get(meta, "type")
            if (type && type !== "http" && type !== "graphql") return
            request = parseBruRequest(file.text)
            seq = get(meta, "seq")
        } else if (/\.ya?ml$/.test(base) && looksLikeOpenCollectionYaml(file.text)) {
            request = parseOpenCollectionRequestYaml(file.text)
            seq = str(obj(obj(load(file.text)).info).seq) || undefined
        } else {
            return
        }
        folderNode(dir)
        push(dir, { name: request.name, seq: seq ? Number(seq) : undefined, order, item: request })
    })

    const build = (dir: string): Array<CollectionFolder | CollectionRequest> =>
        (children.get(dir) ?? [])
            .sort((a, b) => (a.seq ?? Infinity) - (b.seq ?? Infinity) || a.order - b.order)
            .map((n) => {
                if ("type" in n.item && n.item.type === "folder") n.item.items = build([...folders].find(([, v]) => v === n)![0])
                return n.item
            })

    return { collection: { id: id(), name, items: build("") }, environments }
}
