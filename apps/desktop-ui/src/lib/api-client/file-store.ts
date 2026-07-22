/**
 * Git-friendly file-backed collections: serialize a Collection tree to a folder
 * of YAML files and back. Pure functions only — no fs access here (Tauri fs
 * wrappers live in `@/lib/desktop/collection-files`), so everything is unit-testable.
 *
 * Layout:
 *   collection.yaml        manifest {formatVersion, id, name}
 *   001-login.yaml         request (NNN- prefix = sibling order)
 *   002-users/             folder
 *     folder.yaml          folder meta {id, name, defaults, scripts}
 *     001-create.yaml
 *
 * Deterministic output (fixed key order, volatile fields stripped) is the
 * contract: unchanged items must serialize byte-identical so diffs stay minimal
 * and no-op mutations produce zero writes.
 */

import { dump, load } from "js-yaml"
import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    KeyValueItem,
    RequestAuth,
} from "@/components/api-client/types"

export const MANIFEST_FILE = "collection.yaml"
export const FOLDER_META_FILE = "folder.yaml"
export const FORMAT_VERSION = 1

const MANIFEST_HEADER =
    "# MyDevTools API collection — safe to commit.\n" +
    "# Secrets are never stored here: {{vault.*}} / {{env.*}} tokens resolve\n" +
    "# from the local encrypted vault at send time.\n"

export interface FileEntry {
    /** Forward-slash relative path inside the collection folder. */
    relPath: string
    content: string
}

// Fixed top-level key order; nested/unknown keys sort alphabetically after.
const KEY_ORDER = [
    "formatVersion", "id", "name", "kind", "method", "url",
    "params", "headers", "body", "auth",
    "defaultHeaders", "defaultAuth",
    "timeoutMs", "useCookieJar",
    "preRequestScript", "testScript",
    "websocket", "grpc", "examples",
]

function dumpYaml(obj: object): string {
    return dump(obj, {
        noRefs: true,
        lineWidth: -1,
        sortKeys: (a: string, b: string) => {
            const ia = KEY_ORDER.indexOf(a)
            const ib = KEY_ORDER.indexOf(b)
            if (ia !== -1 && ib !== -1) return ia - ib
            if (ia !== -1) return -1
            if (ib !== -1) return 1
            return a.localeCompare(b)
        },
    })
}

function newId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    return `id-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
}

/** Drop undefined/null and empty arrays/objects, recursively. */
function prune<T>(value: T): T | undefined {
    if (value === undefined || value === null) return undefined
    if (Array.isArray(value)) {
        return value.length === 0 ? undefined : (value.map((v) => prune(v)) as unknown as T)
    }
    if (typeof value === "object") {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            const p = prune(v)
            if (p !== undefined) out[k] = p
        }
        return Object.keys(out).length === 0 ? undefined : (out as T)
    }
    return value
}

/** KeyValueItem without the churn-only `id` (regenerated on load). */
function stripKvIds(items: KeyValueItem[] | undefined) {
    if (!items || items.length === 0) return undefined
    return items.map(({ key, value, active }) => ({ key, value, active }))
}

function restoreKvIds(items: Array<Partial<KeyValueItem>> | undefined): KeyValueItem[] {
    if (!Array.isArray(items)) return []
    return items.map((i) => ({
        id: newId(),
        key: typeof i.key === "string" ? i.key : "",
        value: typeof i.value === "string" ? i.value : "",
        active: i.active !== false,
    }))
}

export function slugify(name: string): string {
    const slug = name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
    return slug || "item"
}

function isFolder(item: CollectionFolder | CollectionRequest): item is CollectionFolder {
    return "type" in item && item.type === "folder"
}

// ── Credential redaction ───────────────────────────────────────────────────
// Files in a folder collection are meant for git. A `{{vault.*}}` / `{{env.*}}`
// reference is safe to write (resolved from the encrypted vault at send time);
// a literal credential is a leak. Literal values in the known-sensitive auth
// fields below are therefore never serialized — structural, not advisory.

/** `["awsSigV4", "secretAccessKey"]` = auth.awsSigV4.secretAccessKey. */
export const SENSITIVE_AUTH_FIELDS: string[][] = [
    ["token"],
    ["password"],
    ["apiKeyValue"],
    ["awsSigV4", "secretAccessKey"],
    ["awsSigV4", "sessionToken"],
    ["hawk", "key"],
    ["ntlm", "password"],
    ["jwtBearer", "secret"],
    ["jwtBearer", "privateKeyPem"],
    ["digest", "password"],
    ["spnego", "token"],
    ["oauth2", "clientSecret"],
    ["oauth2", "password"],
]
// OAuth2 token state is both secret and runtime — always stripped.
const OAUTH2_TOKEN_STATE = ["accessToken", "refreshToken", "tokenType", "expiresAt"]

/** A value referencing a vault/env variable is a pointer, not a secret. */
export function isVariableReference(value: unknown): boolean {
    return typeof value === "string" && value.includes("{{")
}

/** Copy of `auth` with literal credentials removed. Second value = how many were dropped. */
function redactAuth(auth: RequestAuth | undefined): { auth: RequestAuth | undefined; redacted: number } {
    if (!auth || auth.type === "none") return { auth, redacted: 0 }
    const copy: Record<string, unknown> = JSON.parse(JSON.stringify(auth))
    let redacted = 0
    for (const path of SENSITIVE_AUTH_FIELDS) {
        let parent = copy
        for (const seg of path.slice(0, -1)) {
            if (typeof parent[seg] !== "object" || parent[seg] === null) { parent = {}; break }
            parent = parent[seg] as Record<string, unknown>
        }
        const leaf = path[path.length - 1]
        const value = parent[leaf]
        if (value !== undefined && value !== "" && !isVariableReference(value)) {
            delete parent[leaf]
            redacted++
        }
    }
    if (typeof copy.oauth2 === "object" && copy.oauth2 !== null) {
        for (const key of OAUTH2_TOKEN_STATE) {
            delete (copy.oauth2 as Record<string, unknown>)[key]
        }
    }
    return { auth: copy as unknown as RequestAuth, redacted }
}

/** Literal (non-`{{…}}`) credentials in the tree — what redaction WILL drop on write. */
export function countLiteralAuthSecrets(col: Collection): number {
    let count = 0
    const visit = (items: (CollectionFolder | CollectionRequest)[]) => {
        for (const item of items) {
            if (isFolder(item)) {
                count += redactAuth(item.defaultAuth).redacted
                visit(item.items)
            } else {
                count += redactAuth(item.auth).redacted
            }
        }
    }
    visit(col.items)
    return count
}

// ── Serialize ──────────────────────────────────────────────────────────────

function serializeRequestObj(req: CollectionRequest): object {
    const body = req.body
        ? {
              ...req.body,
              formData: req.body.formData?.map(({ id: _id, ...rest }) => rest),
              urlEncoded: req.body.urlEncoded
                  ? stripKvIds(req.body.urlEncoded as KeyValueItem[])
                  : undefined,
          }
        : undefined
    const cleaned = {
        id: req.id,
        name: req.name,
        kind: req.kind === "rest" ? undefined : req.kind,
        method: req.method,
        url: req.url,
        params: stripKvIds(req.params),
        headers: stripKvIds(req.headers),
        body: body?.type === "none" ? undefined : body,
        auth: req.auth?.type === "none" ? undefined : redactAuth(req.auth).auth,
        timeoutMs: req.timeoutMs,
        useCookieJar: req.useCookieJar === false ? false : undefined,
        preRequestScript: req.preRequestScript || undefined,
        testScript: req.testScript || undefined,
        // Runtime noise stripped from websocket/grpc; graphqlSchema (introspection
        // cache) and comments (author/timestamps) are omitted entirely in v1.
        websocket: req.websocket
            ? { draft: req.websocket.draft || undefined, protocols: req.websocket.protocols || undefined }
            : undefined,
        grpc: req.grpc
            ? {
                  protoSource: req.grpc.protoSource || undefined,
                  selectedPath: req.grpc.selectedPath,
                  requestJson: req.grpc.requestJson || undefined,
                  useTextFormat: req.grpc.useTextFormat || undefined,
                  transport: req.grpc.transport,
                  extraRequestMessages: req.grpc.extraRequestMessages,
              }
            : undefined,
        examples: req.examples,
    }
    return prune(cleaned) ?? { id: req.id, name: req.name }
}

function serializeFolderMeta(folder: CollectionFolder): object {
    const cleaned = {
        id: folder.id,
        name: folder.name,
        defaultHeaders: stripKvIds(folder.defaultHeaders),
        defaultAuth: folder.defaultAuth?.type === "none" ? undefined : redactAuth(folder.defaultAuth).auth,
        preRequestScript: folder.preRequestScript || undefined,
        testScript: folder.testScript || undefined,
    }
    return prune(cleaned) ?? { id: folder.id, name: folder.name }
}

/** `NNN-slug` — the index prefix alone guarantees sibling uniqueness. */
function childName(index: number, name: string): string {
    return `${String(index + 1).padStart(3, "0")}-${slugify(name)}`
}

/** Full desired file set for a collection (manifest included). */
export function serializeCollection(col: Collection): FileEntry[] {
    const entries: FileEntry[] = [
        {
            relPath: MANIFEST_FILE,
            content:
                MANIFEST_HEADER +
                dumpYaml({ formatVersion: FORMAT_VERSION, id: col.id, name: col.name }),
        },
    ]
    const walk = (items: (CollectionFolder | CollectionRequest)[], dir: string) => {
        items.forEach((item, i) => {
            const name = childName(i, item.name)
            if (isFolder(item)) {
                const folderDir = dir ? `${dir}/${name}` : name
                entries.push({
                    relPath: `${folderDir}/${FOLDER_META_FILE}`,
                    content: dumpYaml(serializeFolderMeta(item)),
                })
                walk(item.items, folderDir)
            } else {
                entries.push({
                    relPath: dir ? `${dir}/${name}.yaml` : `${name}.yaml`,
                    content: dumpYaml(serializeRequestObj(item)),
                })
            }
        })
    }
    walk(col.items, "")
    return entries
}

// ── Parse ──────────────────────────────────────────────────────────────────

function loadYaml(entry: FileEntry, warnings: string[]): Record<string, unknown> | null {
    try {
        const doc = load(entry.content)
        if (doc && typeof doc === "object" && !Array.isArray(doc)) {
            return doc as Record<string, unknown>
        }
        warnings.push(`${entry.relPath}: not a YAML mapping — skipped`)
        return null
    } catch {
        warnings.push(`${entry.relPath}: invalid YAML — skipped`)
        return null
    }
}

/** Strip the NNN- order prefix and .yaml suffix for name fallbacks. */
function nameFromFileName(fileName: string): string {
    return fileName.replace(/\.yaml$/, "").replace(/^\d+-/, "")
}

function parseRequest(
    doc: Record<string, unknown>,
    relPath: string,
): CollectionRequest {
    const body = (doc.body as CollectionRequest["body"] | undefined) ?? {
        type: "none" as const,
        content: "",
    }
    if (body.formData) {
        body.formData = body.formData.map((f) => ({ ...f, id: newId() }))
    }
    if (body.urlEncoded) {
        body.urlEncoded = restoreKvIds(body.urlEncoded)
    }
    return {
        // Path-derived fallback id is deterministic so reloads don't churn React keys.
        id: typeof doc.id === "string" ? doc.id : `path:${relPath}`,
        name: typeof doc.name === "string" ? doc.name : nameFromFileName(relPath.split("/").pop() ?? relPath),
        kind: doc.kind as CollectionRequest["kind"],
        method: (doc.method as CollectionRequest["method"]) ?? "GET",
        url: typeof doc.url === "string" ? doc.url : "",
        params: restoreKvIds(doc.params as KeyValueItem[]),
        headers: restoreKvIds(doc.headers as KeyValueItem[]),
        body,
        auth: (doc.auth as CollectionRequest["auth"]) ?? { type: "none" },
        timeoutMs: doc.timeoutMs as number | undefined,
        useCookieJar: doc.useCookieJar === false ? false : undefined,
        preRequestScript: doc.preRequestScript as string | undefined,
        testScript: doc.testScript as string | undefined,
        websocket: doc.websocket
            ? { status: "idle", messages: [], draft: "", ...(doc.websocket as object) }
            : undefined,
        grpc: doc.grpc
            ? { protoSource: "", requestJson: "", ...(doc.grpc as object) }
            : undefined,
        examples: doc.examples as CollectionRequest["examples"],
    }
}

interface DirNode {
    folder: CollectionFolder
    /** sibling sort key = source file/dir name (NNN- prefix orders it) */
    children: Array<{ sortKey: string; item: CollectionFolder | CollectionRequest }>
    childDirs: Map<string, DirNode>
    hasMeta: boolean
}

export interface ParsedCollection {
    collection: Collection
    warnings: string[]
}

/**
 * Rebuild a Collection from scanned files. Tolerant: garbage files are skipped
 * with a warning, missing folder.yaml gets path-derived identity. Throws only
 * when the manifest is missing/unreadable (not a collection folder).
 */
export function parseCollection(entries: FileEntry[]): ParsedCollection {
    const warnings: string[] = []
    const manifestEntry = entries.find((e) => e.relPath === MANIFEST_FILE)
    if (!manifestEntry) throw new Error("missing-manifest")
    const manifest = loadYaml(manifestEntry, warnings)
    if (!manifest) throw new Error("missing-manifest")

    const root: DirNode = {
        folder: { id: "root", name: "", type: "folder", items: [] },
        children: [],
        childDirs: new Map(),
        hasMeta: true,
    }

    const dirNode = (segments: string[]): DirNode => {
        let node = root
        let path = ""
        for (const seg of segments) {
            path = path ? `${path}/${seg}` : seg
            let child = node.childDirs.get(seg)
            if (!child) {
                child = {
                    folder: {
                        id: `path:${path}`,
                        name: nameFromFileName(seg),
                        type: "folder",
                        items: [],
                        isOpen: false,
                    },
                    children: [],
                    childDirs: new Map(),
                    hasMeta: false,
                }
                node.childDirs.set(seg, child)
                node.children.push({ sortKey: seg, item: child.folder })
            }
            node = child
        }
        return node
    }

    for (const entry of entries) {
        if (entry.relPath === MANIFEST_FILE) continue
        if (!entry.relPath.endsWith(".yaml")) continue
        const segments = entry.relPath.split("/")
        const fileName = segments.pop() as string
        const node = dirNode(segments)
        if (fileName === FOLDER_META_FILE) {
            const doc = loadYaml(entry, warnings)
            if (doc) {
                node.hasMeta = true
                const f = node.folder
                if (typeof doc.id === "string") f.id = doc.id
                if (typeof doc.name === "string") f.name = doc.name
                if (Array.isArray(doc.defaultHeaders)) f.defaultHeaders = restoreKvIds(doc.defaultHeaders)
                if (doc.defaultAuth) f.defaultAuth = doc.defaultAuth as CollectionFolder["defaultAuth"]
                if (typeof doc.preRequestScript === "string") f.preRequestScript = doc.preRequestScript
                if (typeof doc.testScript === "string") f.testScript = doc.testScript
            }
            continue
        }
        const doc = loadYaml(entry, warnings)
        if (!doc) continue
        node.children.push({
            sortKey: fileName,
            item: parseRequest(doc, entry.relPath),
        })
    }

    const finalize = (node: DirNode): (CollectionFolder | CollectionRequest)[] => {
        node.children.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "en", { numeric: true }))
        for (const dir of node.childDirs.values()) {
            dir.folder.items = finalize(dir)
        }
        return node.children.map((c) => c.item)
    }

    return {
        collection: {
            id: typeof manifest.id === "string" ? manifest.id : `path:${MANIFEST_FILE}`,
            name: typeof manifest.name === "string" ? manifest.name : "Untitled",
            items: finalize(root),
        },
        warnings,
    }
}

// ── Diff ───────────────────────────────────────────────────────────────────

export interface FileDiff {
    writes: FileEntry[]
    deletes: string[]
}

/** Changed/new files to write, vanished paths to delete. */
export function diffFiles(prev: FileEntry[], next: FileEntry[]): FileDiff {
    const prevByPath = new Map(prev.map((e) => [e.relPath, e.content]))
    const nextPaths = new Set(next.map((e) => e.relPath))
    return {
        writes: next.filter((e) => prevByPath.get(e.relPath) !== e.content),
        deletes: prev.filter((e) => !nextPaths.has(e.relPath)).map((e) => e.relPath),
    }
}

/** Manifest for a brand-new collection folder. */
export function newManifest(name: string): { id: string; content: string } {
    const id = newId()
    return {
        id,
        content: MANIFEST_HEADER + dumpYaml({ formatVersion: FORMAT_VERSION, id, name }),
    }
}
