/**
 * Live-linked Bruno folders: read a `.bru` collection in place and write edits
 * back to the same files.
 *
 * Data safety rules (in priority order):
 *   1. A file whose modeled content didn't change is written back byte-for-byte
 *      (in practice: not written at all — the diff is against the disk snapshot).
 *   2. A changed file is patched one block at a time. A block is regenerated only
 *      when its modeled value changed, and only if regenerating the ORIGINAL value
 *      reproduces the original block exactly (otherwise the file uses syntax we
 *      don't model and we refuse). Blocks we don't model (docs, vars, settings,
 *      params:path, unknown ones, inactive body/auth modes) pass through verbatim.
 *   3. Every rewritten file is parsed back; if that doesn't reproduce what the
 *      user sees, we refuse instead of writing a lossy file.
 * Refusals throw `BrunoWriteError` with a code the UI translates.
 *
 * OpenCollection (YAML) folders open read-only for now.
 */

import type { FileEntry } from "@/lib/api-client/file-store"
import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    KeyValueItem,
    RequestAuth,
    RequestBody,
} from "@/components/api-client/types"
import type { Environment } from "@/components/api-client/use-environments"
import type { Assertion } from "@/lib/api-client/assertions"
import {
    bruDefaults,
    dict,
    importBrunoFolder,
    parseBruBlocks,
    parseBruRequest,
    text as blockBody,
    type BruBlocks,
} from "./bruno"

// ── Errors ─────────────────────────────────────────────────────────────────

export type BrunoWriteCode =
    | "readOnly"        // OpenCollection YAML folder
    | "unsupported"     // `part` can't be represented in a .bru file
    | "lossy"           // the file's `part` uses Bruno syntax we don't model
    | "ambiguousScripts" // both script:post-response and tests exist and the edit can't be split
    | "modeStash"       // switching to a body/auth mode whose (inactive) block already holds content
    | "folderMove"      // moving a folder to another parent

export class BrunoWriteError extends Error {
    constructor(
        readonly code: BrunoWriteCode,
        readonly params: { name?: string; part?: string } = {},
    ) {
        super(`${code}${params.name ? ` (${params.name})` : ""}${params.part ? `: ${params.part}` : ""}`)
        this.name = "BrunoWriteError"
    }
}

// ── Raw file model: exact text, block by block ─────────────────────────────

interface RawBlock {
    name: string
    /** Lines between the previous block (or file start) and this block. */
    gap: string[]
    /** Header, body and closing line exactly as on disk. */
    lines: string[]
}
interface RawFile { blocks: RawBlock[]; trailing: string[]; eol: string }

const HEADER = /^([A-Za-z][\w:-]*)\s*([{[])\s*$/

/** Same block grammar as `parseBruBlocks`, but keeps every line for exact re-assembly. */
function splitBru(text: string): RawFile {
    const eol = text.includes("\r\n") ? "\r\n" : "\n"
    const lines = text.split(/\r?\n/)
    const blocks: RawBlock[] = []
    let gap: string[] = []
    let i = 0
    while (i < lines.length) {
        const m = HEADER.exec(lines[i])
        if (!m) { gap.push(lines[i++]); continue }
        const close = m[2] === "{" ? "}" : "]"
        const start = i++
        while (i < lines.length && lines[i].trimEnd() !== close) i++
        i = Math.min(i + 1, lines.length)
        blocks.push({ name: m[1], gap, lines: lines.slice(start, i) })
        gap = []
    }
    return { blocks, trailing: gap, eol }
}

function joinBru(file: RawFile): string {
    return [...file.blocks.flatMap((b) => [...b.gap, ...b.lines]), ...file.trailing].join(file.eol)
}

/** Canonical Bruno block order — where a block we add goes. */
const ORDER = [
    "meta", "get", "post", "put", "patch", "delete", "head", "options", "auth",
    "params:query", "params:path", "headers",
    "auth:awsv4", "auth:basic", "auth:bearer", "auth:digest", "auth:ntlm", "auth:oauth2", "auth:wsse", "auth:apikey",
    "body:json", "body:text", "body:xml", "body:sparql", "body:form-urlencoded", "body:multipart-form", "body:graphql", "body:graphql:vars",
    "vars:pre-request", "vars:post-response", "assert", "script:pre-request", "script:post-response", "tests", "settings", "docs",
]
const rank = (name: string) => {
    const i = ORDER.indexOf(name)
    return i === -1 ? ORDER.length : i
}

const blockText = (b: RawBlock[]) => b.flatMap((x) => x.lines).map((l) => l.trimEnd()).join("\n")

/** Replace the blocks named `names` with `fresh` (at the first old position, else canonical order). */
function replaceBlocks(file: RawFile, names: string[], fresh: string[][]) {
    const at = file.blocks.findIndex((b) => names.includes(b.name))
    const kept = file.blocks.filter((b) => !names.includes(b.name))
    const made: RawBlock[] = fresh.map((lines, i) => ({ name: HEADER.exec(lines[0])![1], gap: at !== -1 && i === 0 ? file.blocks[at].gap : [""], lines }))
    let insertAt: number
    if (at !== -1) {
        insertAt = file.blocks.slice(0, at).filter((b) => !names.includes(b.name)).length
    } else {
        const r = made.length ? rank(made[0].name) : 0
        insertAt = kept.findIndex((b) => rank(b.name) > r)
        if (insertAt === -1) insertAt = kept.length
    }
    kept.splice(insertAt, 0, ...made)
    if (kept.length && kept[0].gap.every((l) => l.trim() === "")) kept[0] = { ...kept[0], gap: [] }
    file.blocks = kept
}

/** Set `key: value` lines inside block `name` (inserted before the closing line when missing). */
function setKeys(file: RawFile, name: string, values: Record<string, string>) {
    const block = file.blocks.find((b) => b.name === name)
    if (!block) return
    const lines = [...block.lines]
    for (const [key, value] of Object.entries(values)) {
        const line = `  ${key}: ${value}`
        const i = lines.findIndex((l, idx) => idx > 0 && idx < lines.length - 1 && l.trim().startsWith(`${key}:`))
        if (i !== -1) lines[i] = line
        else lines.splice(lines.length - 1, 0, line)
    }
    block.lines = lines
}

const getKey = (blocks: BruBlocks, name: string, key: string) => dict(blocks.get(name)).find((e) => e.key === key)?.value

// ── Block generators (Bruno's own formatting: 2-space indent) ───────────────

const indent = (s: string) => s.split("\n").map((l) => `  ${l}`)

function textBlock(name: string, content: string): string[] {
    return [`${name} {`, ...indent(content), "}"]
}

function dictLine(key: string, value: string, enabled = true): string[] {
    const k = `${enabled ? "" : "~"}${key}`
    if (!value.includes("\n")) return [`  ${k}: ${value}`]
    return [`  ${k}: '''`, ...value.split("\n").map((l) => `    ${l}`), "  '''"]
}

function dictBlock(name: string, rows: Array<[string, string, boolean?]>): string[] {
    return [`${name} {`, ...rows.flatMap(([k, v, on]) => dictLine(k, v, on !== false)), "}"]
}

const filled = (items: KeyValueItem[] | undefined) => (items ?? []).filter((i) => i.key || i.value)

function kvBlock(name: string, items: KeyValueItem[] | undefined): string[][] {
    const rows = filled(items)
    return rows.length ? [dictBlock(name, rows.map((i) => [i.key, i.value, i.active !== false]))] : []
}

/** Our auth → Bruno mode + block, or null when Bruno can't hold it. */
function authToBru(a: RequestAuth | undefined): { mode: string; blocks: string[][] } | null {
    const auth = a ?? { type: "none" as const }
    switch (auth.type) {
        case "none": return { mode: "none", blocks: [] }
        case "inherit": return { mode: "inherit", blocks: [] }
        case "basic": return { mode: "basic", blocks: [dictBlock("auth:basic", [["username", auth.username ?? ""], ["password", auth.password ?? ""]])] }
        case "bearer": return { mode: "bearer", blocks: [dictBlock("auth:bearer", [["token", auth.token ?? ""]])] }
        case "api-key": return {
            mode: "apikey",
            blocks: [dictBlock("auth:apikey", [
                ["key", auth.apiKeyKey ?? ""],
                ["value", auth.apiKeyValue ?? ""],
                ["placement", auth.apiKeyLocation === "query" ? "queryparams" : "header"],
            ])],
        }
        case "oauth2": {
            const o = auth.oauth2
            if (!o) return null
            const rows: Array<[string, string]> = [
                ["grant_type", o.grantType],
                ["access_token_url", o.tokenUrl ?? ""],
                ["client_id", o.clientId ?? ""],
                ["client_secret", o.clientSecret ?? ""],
                ["scope", o.scope ?? ""],
            ]
            if (o.grantType === "authorization_code") rows.push(["authorization_url", o.authUrl ?? ""], ["callback_url", o.redirectUri ?? ""])
            return { mode: "oauth2", blocks: [dictBlock("auth:oauth2", rows)] }
        }
        default: return null
    }
}

const BODY_MODE: Partial<Record<RequestBody["type"], string>> = {
    none: "none", json: "json", text: "text", xml: "xml",
    "x-www-form-urlencoded": "formUrlEncoded", "form-data": "multipartForm", graphql: "graphql",
}
const MODE_BLOCKS: Record<string, string[]> = {
    none: [], json: ["body:json", "body"], text: ["body:text"], xml: ["body:xml"], sparql: ["body:sparql"],
    formUrlEncoded: ["body:form-urlencoded"], multipartForm: ["body:multipart-form"], graphql: ["body:graphql", "body:graphql:vars"],
}

function bodyToBru(b: RequestBody): { mode: string; blocks: string[][] } | null {
    const mode = BODY_MODE[b.type]
    if (!mode) return null
    switch (b.type) {
        case "none": return { mode, blocks: [] }
        case "json": return { mode, blocks: [textBlock("body:json", b.content)] }
        case "text": return { mode, blocks: [textBlock("body:text", b.content)] }
        case "xml": return { mode, blocks: [textBlock("body:xml", b.content)] }
        case "x-www-form-urlencoded": return { mode, blocks: kvBlock("body:form-urlencoded", b.urlEncoded) }
        case "form-data": {
            const rows = (b.formData ?? []).filter((f) => f.key || f.value || f.fileName)
            return {
                mode,
                blocks: rows.length
                    ? [dictBlock("body:multipart-form", rows.map((f) => [f.key, f.valueType === "file" ? `@file(${f.fileName ?? ""})` : f.value, f.active !== false]))]
                    : [],
            }
        }
        case "graphql": return {
            mode,
            blocks: [textBlock("body:graphql", b.content), ...(b.graphqlVariables ? [textBlock("body:graphql:vars", b.graphqlVariables)] : [])],
        }
        default: return null
    }
}

function assertBlock(rows: Assertion[] | undefined): string[][] {
    if (!rows?.length) return []
    return [dictBlock("assert", rows.map((a) => [a.target, `${a.operator} ${a.value}`.trimEnd(), a.enabled]))]
}

// ── Projections: what the user sees, normalized for comparison ─────────────

const kv = (items: KeyValueItem[] | undefined) => filled(items).map((i) => [i.key, i.value, i.active !== false])
const script = (s: string | undefined) => (s ?? "").trim()

function projAuth(a: RequestAuth | undefined): unknown {
    if (!a || a.type === "none") return { type: "none" }
    const drop = (o: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""))
    const out: Record<string, unknown> = drop({ ...a })
    if (a.type === "api-key") out.apiKeyLocation = a.apiKeyLocation ?? "header"
    if (a.oauth2) {
        const { accessToken: _a, refreshToken: _r, tokenType: _t, expiresAt: _e, ...rest } = a.oauth2
        out.oauth2 = drop(rest)
    }
    return out
}

function projBody(b: RequestBody | undefined): unknown {
    if (!b) return { type: "none" }
    switch (b.type) {
        case "json": case "text": case "xml": return { type: b.type, content: b.content }
        case "graphql": return { type: b.type, content: b.content, vars: b.graphqlVariables || undefined }
        case "x-www-form-urlencoded": return { type: b.type, rows: kv(b.urlEncoded) }
        case "form-data": return {
            type: b.type,
            rows: (b.formData ?? []).filter((f) => f.key || f.value || f.fileName)
                .map((f) => [f.key, f.valueType === "file" ? `file:${f.fileName ?? ""}` : f.value, f.active !== false]),
        }
        case "none": return { type: "none" }
        default: return { type: b.type, file: b.binaryFile?.fileName }
    }
}

const projAsserts = (rows: Assertion[] | undefined) => (rows ?? []).map((a) => [a.enabled, a.target, a.operator, a.value.trim()])

/** Fields a request can carry that the writer doesn't model — any non-empty value can't be saved. */
const REQUEST_MODELED = new Set([
    "id", "name", "method", "url", "params", "headers", "body", "auth", "preRequestScript", "testScript", "assertions",
    // runtime / cache only, never saved
    "graphqlSchema", "response", "isLoading", "scriptResults", "source", "savedFingerprint", "isOpen",
])

function extras(item: object): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(item)) {
        if (REQUEST_MODELED.has(k)) continue
        if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue
        // Engine defaults that match Bruno's own behaviour.
        if (k === "kind" && v === "rest") continue
        if ((k === "useCookieJar" || k === "followRedirects" || k === "verifySsl") && v === true) continue
        if ((k === "websocket" || k === "grpc") && !("kind" in item && (item as { kind?: string }).kind === k)) continue
        out[k] = v
    }
    return out
}

function projectRequest(r: CollectionRequest) {
    return {
        name: r.name,
        method: r.method,
        url: r.url,
        params: kv(r.params),
        headers: kv(r.headers),
        body: projBody(r.body),
        auth: projAuth(r.auth),
        preRequestScript: script(r.preRequestScript),
        testScript: script(r.testScript),
        assertions: projAsserts(r.assertions),
        extras: extras(r),
    }
}

type Defaults = Pick<Collection, "defaultHeaders" | "defaultAuth" | "preRequestScript" | "testScript" | "variables">

function projectDefaults(d: Defaults, withVars: boolean) {
    return {
        headers: kv(d.defaultHeaders),
        auth: projAuth(d.defaultAuth),
        preRequestScript: script(d.preRequestScript),
        testScript: script(d.testScript),
        ...(withVars && { variables: kv(d.variables) }),
    }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function firstDiff(a: Record<string, unknown>, b: Record<string, unknown>): string {
    for (const k of Object.keys(b)) {
        if (same(a[k], b[k])) continue
        if (k === "extras") {
            const ea = a.extras as Record<string, unknown>
            const eb = b.extras as Record<string, unknown>
            return Object.keys({ ...ea, ...eb }).find((x) => !same(ea[x], eb[x])) ?? k
        }
        return k
    }
    return "content"
}

// ── Section patching shared by request, folder and collection files ────────

interface Patch { file: RawFile; parsed: BruBlocks; name: string }

/** Rewrite a dict/text section: only when it changed, and only if the original round-trips. */
function patchSection(p: Patch, part: string, names: string[], before: unknown, after: unknown, gen: (v: "before" | "after") => string[][]) {
    if (same(before, after)) return
    const old = p.file.blocks.filter((b) => names.includes(b.name))
    if (blockText(old) !== gen("before").map((l) => l.map((x) => x.trimEnd()).join("\n")).join("\n")) {
        throw new BrunoWriteError("lossy", { name: p.name, part })
    }
    replaceBlocks(p.file, names, gen("after"))
}

/**
 * Auth for a request (mode in the method block) or folder/collection (mode in
 * `auth { mode }`). `modeIn.readFrom` = where the mode sits in the ORIGINAL
 * file (differs from `block` when the method was just renamed).
 */
function patchAuth(p: Patch, modeIn: { block: string; key: string; readFrom?: string }, before: RequestAuth | undefined, after: RequestAuth | undefined) {
    if (same(projAuth(before), projAuth(after))) return
    const was = authToBru(before)
    const now = authToBru(after)
    if (!now) throw new BrunoWriteError("unsupported", { name: p.name, part: "auth" })
    const oldMode = getKey(p.parsed, modeIn.readFrom ?? modeIn.block, modeIn.key)
    const oldNames = oldMode && oldMode !== "none" && oldMode !== "inherit" ? [`auth:${oldMode}`] : []
    const newName = now.blocks[0] ? HEADER.exec(now.blocks[0][0])![1] : undefined
    if (newName && !oldNames.includes(newName) && p.file.blocks.some((b) => b.name === newName)) {
        throw new BrunoWriteError("modeStash", { name: p.name, part: "auth" })
    }
    if (!was || blockText(p.file.blocks.filter((b) => oldNames.includes(b.name))) !== was.blocks.map((l) => l.map((x) => x.trimEnd()).join("\n")).join("\n")) {
        throw new BrunoWriteError("lossy", { name: p.name, part: "auth" })
    }
    // Switching modes leaves the old block as Bruno's inactive stash; same mode replaces it.
    replaceBlocks(p.file, newName && oldNames.includes(newName) ? oldNames : newName ? [newName] : [], now.blocks)
    if (!p.file.blocks.some((b) => b.name === modeIn.block)) replaceBlocks(p.file, [modeIn.block], [[`${modeIn.block} {`, "}"]])
    setKeys(p.file, modeIn.block, { [modeIn.key]: now.mode })
}

/** Scripts: script:pre-request, and our single test script ↔ script:post-response + tests. */
function patchScripts(p: Patch, before: Defaults, after: Defaults) {
    patchSection(p, "preRequestScript", ["script:pre-request"], script(before.preRequestScript), script(after.preRequestScript),
        (v) => { const s = script((v === "before" ? before : after).preRequestScript); return s ? [textBlock("script:pre-request", s)] : [] })

    const next = script(after.testScript)
    if (next === script(before.testScript)) return
    const post = script(blockBody(p.parsed.get("script:post-response")))
    const tests = script(blockBody(p.parsed.get("tests")))
    let nextPost = post
    let nextTests = tests
    if (post && tests) {
        if (next.startsWith(`${post}\n\n`)) nextTests = next.slice(post.length + 2).trim()
        else if (next.endsWith(`\n\n${tests}`)) nextPost = next.slice(0, -tests.length - 2).trim()
        else if (next === post) nextTests = ""
        else if (next === tests) nextPost = ""
        else throw new BrunoWriteError("ambiguousScripts", { name: p.name })
    } else if (post) {
        nextPost = next
    } else {
        nextTests = next
    }
    patchSection(p, "testScript", ["script:post-response"], post, nextPost, (v) => {
        const s = v === "before" ? post : nextPost
        return s ? [textBlock("script:post-response", s)] : []
    })
    patchSection(p, "testScript", ["tests"], tests, nextTests, (v) => {
        const s = v === "before" ? tests : nextTests
        return s ? [textBlock("tests", s)] : []
    })
}

function patchDefaults(p: Patch, modeIn: { block: string; key: string }, before: Defaults, after: Defaults, withVars: boolean) {
    patchSection(p, "headers", ["headers"], kv(before.defaultHeaders), kv(after.defaultHeaders),
        (v) => kvBlock("headers", (v === "before" ? before : after).defaultHeaders))
    patchAuth(p, modeIn, before.defaultAuth, after.defaultAuth)
    if (withVars) {
        patchSection(p, "variables", ["vars:pre-request"], kv(before.variables), kv(after.variables),
            (v) => kvBlock("vars:pre-request", (v === "before" ? before : after).variables))
    }
    patchScripts(p, before, after)
}

// ── Request files ──────────────────────────────────────────────────────────

const METHOD_BLOCKS = ["get", "post", "put", "patch", "delete", "head", "options"]

function skeleton(item: CollectionRequest): string {
    return [
        "meta {", `  name: ${item.name}`, `  type: ${item.body?.type === "graphql" ? "graphql" : "http"}`, "}", "",
        "get {", "  url: ", "  body: none", "  auth: none", "}", "",
    ].join("\n")
}

/**
 * `.bru` text for `item`. `orig` = the file as on disk (undefined for a new
 * request); `seq` = the sibling position to store, or undefined to keep it.
 */
export function writeBruRequest(orig: string | undefined, item: CollectionRequest, seq?: number): string {
    const base = orig ?? skeleton(item)
    const parsed = parseBruBlocks(base)
    const was = parseBruRequest(base)
    const wantProj = projectRequest(item)
    const seqChanged = seq !== undefined && getKey(parsed, "meta", "seq") !== String(seq)
    if (orig !== undefined && !seqChanged && same(projectRequest({ ...was, id: item.id }), wantProj)) return orig

    const file = splitBru(base)
    const p: Patch = { file, parsed, name: item.name }

    const meta: Record<string, string> = {}
    if (was.name !== item.name) meta.name = item.name
    if (seqChanged) meta.seq = String(seq)
    const type = getKey(parsed, "meta", "type")
    const wantType = item.body?.type === "graphql" ? "graphql" : "http"
    if ((type === "http" || type === "graphql" || !type) && type !== wantType) meta.type = wantType
    if (!file.blocks.some((b) => b.name === "meta")) replaceBlocks(file, ["meta"], [["meta {", "}"]])
    setKeys(file, "meta", meta)

    const oldMethod = METHOD_BLOCKS.find((m) => parsed.has(m)) ?? "get"
    const newMethod = item.method.toLowerCase()
    const methodBlock = file.blocks.find((b) => b.name === oldMethod)
    if (newMethod !== oldMethod && METHOD_BLOCKS.includes(newMethod) && methodBlock) {
        methodBlock.name = newMethod
        methodBlock.lines = [methodBlock.lines[0].replace(oldMethod, newMethod), ...methodBlock.lines.slice(1)]
    }
    const mb = METHOD_BLOCKS.includes(newMethod) ? newMethod : oldMethod
    if (was.url !== item.url) setKeys(file, mb, { url: item.url })

    patchSection(p, "params", ["params:query"], kv(was.params), kv(item.params), (v) => kvBlock("params:query", (v === "before" ? was : item).params))
    patchSection(p, "headers", ["headers"], kv(was.headers), kv(item.headers), (v) => kvBlock("headers", (v === "before" ? was : item).headers))
    patchAuth(p, { block: mb, key: "auth", readFrom: oldMethod }, was.auth, item.auth)

    if (!same(projBody(was.body), projBody(item.body))) {
        const oldMode = getKey(parsed, oldMethod, "body") ?? "none"
        const fromWas = bodyToBru(was.body)
        const now = bodyToBru(item.body)
        if (!now) throw new BrunoWriteError("unsupported", { name: item.name, part: "body" })
        const oldNames = (MODE_BLOCKS[oldMode] ?? []).filter((n) => parsed.has(n))
        if (!fromWas || blockText(file.blocks.filter((b) => oldNames.includes(b.name))) !== fromWas.blocks.map((l) => l.join("\n")).join("\n").split("\n").map((l) => l.trimEnd()).join("\n")) {
            throw new BrunoWriteError("lossy", { name: item.name, part: "body" })
        }
        const sameMode = oldMode === now.mode
        const newNames = MODE_BLOCKS[now.mode] ?? []
        if (!sameMode && newNames.some((n) => parsed.has(n))) throw new BrunoWriteError("modeStash", { name: item.name, part: "body" })
        // A mode switch keeps the old mode's block as Bruno's inactive stash.
        replaceBlocks(file, sameMode ? oldNames : newNames, now.blocks)
        setKeys(file, mb, { body: now.mode })
    }

    patchSection(p, "assertions", ["assert"], projAsserts(was.assertions), projAsserts(item.assertions),
        (v) => assertBlock((v === "before" ? was : item).assertions))
    patchScripts(p, was, item)

    const out = joinBru(file)
    const back = projectRequest({ ...parseBruRequest(out), id: item.id })
    if (!same(back, wantProj)) {
        throw new BrunoWriteError("unsupported", { name: item.name, part: firstDiff(back, wantProj) })
    }
    return out
}

// ── folder.bru / collection.bru ────────────────────────────────────────────

function readDefaults(text: string, withVars: boolean): Defaults & { name?: string } {
    const blocks = parseBruBlocks(text)
    const d = bruDefaults(blocks, getKey(blocks, "auth", "mode"))
    const vars = dict(blocks.get("vars:pre-request")).map((e, i) => ({ id: String(i), key: e.key, value: e.value, active: e.enabled }))
    return {
        name: getKey(blocks, "meta", "name") || undefined,
        defaultHeaders: d.headers,
        defaultAuth: d.auth.type === "none" ? undefined : d.auth,
        preRequestScript: d.preRequestScript,
        testScript: d.testScript,
        ...(withVars && { variables: vars }),
    }
}

/**
 * `folder.bru` for `folder` (meta name/seq + defaults). `dirName` is what the
 * folder is called when the file has no `meta.name`. Returns `orig` untouched
 * when nothing changed.
 */
export function writeBruFolder(orig: string | undefined, folder: CollectionFolder, dirName: string, seq?: number): string {
    return writeDefaultsFile(orig, folder, { name: folder.name, fallback: dirName }, seq, false)
}

/** `collection.bru` for the collection's defaults and variables. */
export function writeBruCollection(orig: string | undefined, col: Collection): string {
    return writeDefaultsFile(orig, col, undefined, undefined, true)
}

function writeDefaultsFile(
    orig: string | undefined,
    d: Defaults,
    naming: { name: string; fallback: string } | undefined,
    seq: number | undefined,
    isCollection: boolean,
): string {
    const name = naming?.name
    const base = orig ?? (naming ? `meta {\n  name: ${naming.name}\n}\n` : "")
    const parsed = parseBruBlocks(base)
    const was = readDefaults(base, isCollection)
    const label = name ?? "collection"
    const nameChanged = naming !== undefined && (was.name ?? naming.fallback) !== naming.name
    const seqChanged = seq !== undefined && getKey(parsed, "meta", "seq") !== String(seq)
    const want = projectDefaults(d, isCollection)
    if (orig !== undefined && !nameChanged && !seqChanged && same(projectDefaults(was, isCollection), want)) return orig

    const file = splitBru(base)
    const p: Patch = { file, parsed, name: label }
    if (name !== undefined && (nameChanged || seqChanged)) {
        if (!file.blocks.some((b) => b.name === "meta")) replaceBlocks(file, ["meta"], [["meta {", "}"]])
        setKeys(file, "meta", { ...(nameChanged && { name }), ...(seqChanged && { seq: String(seq) }) })
    }
    patchDefaults(p, { block: "auth", key: "mode" }, was, d, isCollection)

    let out = joinBru(file)
    if (!out.endsWith("\n")) out += "\n"
    const back = readDefaults(out, isCollection)
    if (!same(projectDefaults(back, isCollection), want) || (naming && (back.name ?? naming.fallback) !== naming.name)) {
        throw new BrunoWriteError("unsupported", { name: label, part: firstDiff(projectDefaults(back, isCollection), want) })
    }
    return out
}

// ── Whole collection ───────────────────────────────────────────────────────

/** What a live-linked collection carries: the disk snapshot and where each item lives. */
export interface BrunoLink {
    /** relPath → content, exactly as last read from / written to disk. */
    files: Record<string, string>
    /** item id → "r:<file>" (request) or "f:<dir>" (folder; "f:" = root). */
    pathOf: Record<string, string>
    /** Set when the folder can't be written (OpenCollection YAML). */
    readOnly?: "opencollection"
}

const dirOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "")
const baseOf = (p: string) => p.slice(p.lastIndexOf("/") + 1)
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name)
const isFolder = (i: CollectionFolder | CollectionRequest): i is CollectionFolder => "type" in i && i.type === "folder"

function safeName(name: string, fallback: string): string {
    const s = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/^[.\s]+/, "").trim()
    return s || fallback
}

const seqIn = (text: string | undefined) => {
    const v = text === undefined ? undefined : getKey(parseBruBlocks(text), "meta", "seq")
    return v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined
}

/**
 * The full file set for `col` (relPath → content) plus the updated id → path
 * map. Diff it against `link.files` to get the writes/deletes.
 */
export function serializeBrunoCollection(col: Collection, link: BrunoLink): { files: FileEntry[]; pathOf: Record<string, string> } {
    if (link.readOnly) throw new BrunoWriteError("readOnly")
    const out = new Map(Object.entries(link.files))
    const taken = new Set([...out.keys()].map((p) => p.toLowerCase()))
    const claim = (p: string) => taken.add(p.toLowerCase())
    const unique = (dir: string, stem: string, ext: string) => {
        for (let n = 0; ; n++) {
            const p = join(dir, `${stem}${n ? ` ${n}` : ""}${ext}`)
            const lower = p.toLowerCase()
            const dirTaken = ext === "" && [...taken].some((t) => t.startsWith(`${lower}/`))
            if (!taken.has(lower) && !dirTaken) return p
        }
    }
    const pathOf: Record<string, string> = { [col.id]: "f:" }
    const seen = new Set<string>([col.id])

    const walk = (items: Array<CollectionFolder | CollectionRequest>, dir: string) => {
        // Bruno sorts siblings by seq; items without one come after, in file
        // order. Keep every stored seq while the current order is consistent
        // with them (new items slot in with a free number); otherwise renumber
        // the whole list 1..n — that only happens on a real reorder/insert.
        const stored = items.map((it) => {
            const key = link.pathOf[it.id]
            if (!key) return null // new item
            const s = isFolder(it) ? seqIn(link.files[join(key.slice(2), "folder.bru")]) : seqIn(link.files[key.slice(2)])
            return s ?? Infinity
        })
        const seqs: Array<number | undefined> = []
        let last = 0
        let ok = true
        items.forEach((_, i) => {
            const s = stored[i]
            if (s !== null) {
                if (s < last) ok = false
                last = s
                seqs.push(undefined)
                return
            }
            const next = stored.slice(i + 1).find((x): x is number => x !== null)
            if (!Number.isFinite(last)) {
                // After unseq'd siblings: stay unseq'd too, rather than renumbering them all.
                if (next !== undefined && Number.isFinite(next)) ok = false
                seqs.push(undefined)
                return
            }
            const cand = last + 1
            if (next !== undefined && cand >= next) ok = false
            last = cand
            seqs.push(cand)
        })
        const seqFor = (i: number) => (ok ? seqs[i] : i + 1)

        items.forEach((it, i) => {
            seen.add(it.id)
            const key = link.pathOf[it.id]
            if (isFolder(it)) {
                let folderDir: string
                if (key?.startsWith("f:")) {
                    folderDir = key.slice(2)
                    if (dirOf(folderDir) !== dir) throw new BrunoWriteError("folderMove", { name: it.name })
                } else {
                    folderDir = unique(dir, safeName(it.name, "folder"), "")
                    claim(join(folderDir, "folder.bru"))
                }
                pathOf[it.id] = `f:${folderDir}`
                const fb = join(folderDir, "folder.bru")
                const orig = link.files[fb]
                const needsFile = orig !== undefined || !key || it.name !== baseOf(folderDir) || seqFor(i) !== undefined ||
                    !same(projectDefaults(it, false), projectDefaults({}, false))
                if (needsFile) out.set(fb, writeBruFolder(orig, it, baseOf(folderDir), seqFor(i)))
                walk(it.items, folderDir)
                return
            }
            let path: string
            if (key?.startsWith("r:")) {
                const old = key.slice(2)
                path = join(dir, baseOf(old))
                if (path !== old) {
                    if (taken.has(path.toLowerCase())) path = unique(dir, baseOf(old).replace(/\.bru$/, ""), ".bru")
                    out.delete(old)
                    taken.delete(old.toLowerCase())
                    claim(path)
                }
                out.set(path, writeBruRequest(link.files[old], it, seqFor(i)))
            } else {
                path = unique(dir, safeName(it.name, "request"), ".bru")
                claim(path)
                out.set(path, writeBruRequest(undefined, it, seqFor(i)))
            }
            pathOf[it.id] = `r:${path}`
        })
    }
    walk(col.items, "")

    // Deleted items: drop only the files we model — anything else in a folder stays.
    for (const [id, key] of Object.entries(link.pathOf)) {
        if (seen.has(id)) continue
        if (key.startsWith("r:")) out.delete(key.slice(2))
        else if (key !== "f:") out.delete(join(key.slice(2), "folder.bru"))
    }

    // Collection defaults + name.
    const cb = link.files["collection.bru"]
    if (cb !== undefined || !same(projectDefaults(col, true), projectDefaults({}, true))) out.set("collection.bru", writeBruCollection(cb, col))
    const manifest = link.files["bruno.json"]
    if (manifest !== undefined) {
        const json = JSON.parse(manifest) as Record<string, unknown>
        if (json.name !== col.name) out.set("bruno.json", JSON.stringify({ ...json, name: col.name }, null, 2) + "\n")
    }

    return { files: [...out].map(([relPath, content]) => ({ relPath, content })), pathOf }
}

// ── Reading a linked folder ────────────────────────────────────────────────

/**
 * Parse a Bruno folder (files relative to its root) into a live-linked
 * collection. `prev` = the previous link's `pathOf`, so ids stay stable across
 * reloads (open tabs keep their link to the request).
 */
export function readBrunoLink(root: string, entries: FileEntry[], prev?: Record<string, string>): {
    collection: Collection
    link: BrunoLink
    environments: Environment[]
} {
    const idByPath = new Map(Object.entries(prev ?? {}).map(([id, key]) => [key, id]))
    const pathOf: Record<string, string> = {}
    const idFor = (kind: "request" | "folder", rel: string) => {
        const key = `${kind === "folder" ? "f" : "r"}:${rel}`
        const id = idByPath.get(key) ?? `bru:${root}#${key}`
        pathOf[id] = key
        return id
    }
    const byDepth = [...entries].sort((a, b) => a.relPath.split("/").length - b.relPath.split("/").length)
    const { collection, environments } = importBrunoFolder(byDepth.map((e) => ({ path: e.relPath, text: e.content })), { idFor })
    const link: BrunoLink = {
        files: Object.fromEntries(entries.map((e) => [e.relPath, e.content])),
        pathOf,
        ...(entries.some((e) => e.relPath === "opencollection.yml") && { readOnly: "opencollection" as const }),
    }
    return { collection, link, environments }
}
