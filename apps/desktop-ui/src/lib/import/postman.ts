/**
 * Postman Collection v2.1 import.
 * Supports the subset used by 95% of public collections: requests + folders
 * + raw/urlencoded/formdata bodies + bearer/basic/apikey/oauth2 auth.
 * Pre-request + test scripts (`event[]`) are also pulled across.
 */

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

interface PostmanCollection {
    info?: { name?: string; schema?: string; description?: string; _postman_id?: string }
    item?: PostmanItem[]
    auth?: PostmanAuth
    event?: PostmanEvent[]
    variable?: Array<{ key: string; value?: string }>
}

interface PostmanItem {
    name?: string
    item?: PostmanItem[]
    request?: PostmanRequest
    event?: PostmanEvent[]
    auth?: PostmanAuth
}

interface PostmanEvent {
    listen?: string  // "prerequest" | "test"
    script?: { exec?: string | string[]; type?: string }
}

interface PostmanRequest {
    method?: string
    url?: string | PostmanUrl
    header?: PostmanHeader[]
    body?: PostmanBody
    auth?: PostmanAuth
}

interface PostmanUrl {
    raw?: string
    host?: string[]
    path?: Array<string | { value?: string }>
    query?: PostmanKV[]
    protocol?: string
}

interface PostmanHeader {
    key?: string
    value?: string
    disabled?: boolean
}

interface PostmanKV {
    key?: string
    value?: string
    disabled?: boolean
    type?: string
    src?: string | string[]
}

interface PostmanBody {
    mode?: "raw" | "urlencoded" | "formdata" | "file" | "graphql" | "none"
    raw?: string
    urlencoded?: PostmanKV[]
    formdata?: PostmanKV[]
    graphql?: { query?: string; variables?: string }
    options?: { raw?: { language?: string } }
}

interface PostmanAuth {
    type?: "noauth" | "bearer" | "basic" | "apikey" | "oauth2"
    bearer?: PostmanKV[]
    basic?: PostmanKV[]
    apikey?: PostmanKV[]
    oauth2?: PostmanKV[]
}

const VALID_METHODS = new Set<RequestMethod>([
    "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS",
])

function id(): string { return crypto.randomUUID() }

function pickScript(events: PostmanEvent[] | undefined, kind: "prerequest" | "test"): string {
    if (!events) return ""
    const evt = events.find((e) => e.listen === kind)
    if (!evt?.script?.exec) return ""
    return Array.isArray(evt.script.exec) ? evt.script.exec.join("\n") : evt.script.exec
}

function readUrl(u: string | PostmanUrl | undefined): { url: string; query: PostmanKV[] } {
    if (!u) return { url: "", query: [] }
    if (typeof u === "string") return { url: u, query: [] }
    const raw = u.raw ?? (u.host ? `${u.protocol ? u.protocol + "://" : ""}${u.host.join(".")}/${(u.path ?? []).map((p) => typeof p === "string" ? p : (p.value ?? "")).join("/")}` : "")
    return { url: raw, query: u.query ?? [] }
}

function kvList(items: PostmanKV[] | undefined): KeyValueItem[] {
    return (items ?? [])
        .filter((kv) => kv && (kv.key || kv.value))
        .map((kv) => ({
            id: id(),
            key: kv.key ?? "",
            value: kv.value ?? "",
            active: !kv.disabled,
        }))
}

function convertBody(b: PostmanBody | undefined): RequestBody {
    if (!b || b.mode === "none") return { type: "none", content: "" }
    if (b.mode === "raw") {
        const lang = b.options?.raw?.language
        return {
            type: lang === "json" ? "json" : "text",
            content: b.raw ?? "",
        }
    }
    if (b.mode === "urlencoded") {
        return {
            type: "x-www-form-urlencoded",
            content: "",
            urlEncoded: kvList(b.urlencoded),
        }
    }
    if (b.mode === "formdata") {
        const items: RequestFormDataItem[] = (b.formdata ?? [])
            .filter((kv) => kv && (kv.key || kv.value))
            .map((kv) => ({
                id: id(),
                key: kv.key ?? "",
                value: kv.value ?? "",
                active: !kv.disabled,
                valueType: kv.type === "file" ? "file" : "text",
            }))
        return { type: "form-data", content: "", formData: items }
    }
    if (b.mode === "graphql") {
        return {
            type: "graphql",
            content: b.graphql?.query ?? "",
            graphqlVariables: b.graphql?.variables || undefined,
        }
    }
    // file / unknown — degrade to text raw body.
    return { type: "text", content: b.raw ?? "" }
}

function lookupKv(items: PostmanKV[] | undefined, key: string): string | undefined {
    return items?.find((x) => x.key === key)?.value
}

function convertAuth(a: PostmanAuth | undefined): RequestAuth {
    if (!a || a.type === "noauth" || a.type === undefined) return { type: "none" }
    if (a.type === "bearer") {
        return { type: "bearer", token: lookupKv(a.bearer, "token") }
    }
    if (a.type === "basic") {
        return {
            type: "basic",
            username: lookupKv(a.basic, "username"),
            password: lookupKv(a.basic, "password"),
        }
    }
    if (a.type === "apikey") {
        const inLoc = lookupKv(a.apikey, "in")
        return {
            type: "api-key",
            apiKeyKey: lookupKv(a.apikey, "key"),
            apiKeyValue: lookupKv(a.apikey, "value"),
            apiKeyLocation: inLoc === "query" ? "query" : "header",
        }
    }
    if (a.type === "oauth2") {
        const grant = lookupKv(a.oauth2, "grant_type") ?? "client_credentials"
        return {
            type: "oauth2",
            oauth2: {
                grantType: grant === "authorization_code_with_pkce" || grant === "authorization_code"
                    ? "authorization_code"
                    : grant === "client_credentials"
                        ? "client_credentials"
                        : "client_credentials",
                tokenUrl: lookupKv(a.oauth2, "accessTokenUrl") ?? "",
                clientId: lookupKv(a.oauth2, "clientId") ?? "",
                clientSecret: lookupKv(a.oauth2, "clientSecret"),
                scope: lookupKv(a.oauth2, "scope"),
                audience: lookupKv(a.oauth2, "audience"),
                authUrl: lookupKv(a.oauth2, "authUrl"),
                redirectUri: lookupKv(a.oauth2, "redirect_uri") ?? lookupKv(a.oauth2, "redirectUri"),
                accessToken: lookupKv(a.oauth2, "accessToken"),
            },
        }
    }
    return { type: "none" }
}

function convertRequest(item: PostmanItem, inheritedAuth?: RequestAuth): CollectionRequest {
    const r = item.request ?? {}
    const { url, query } = readUrl(r.url)
    const method = (r.method ?? "GET").toUpperCase() as RequestMethod
    const safeMethod: RequestMethod = VALID_METHODS.has(method) ? method : "GET"
    const preRequestScript = pickScript(item.event, "prerequest")
    const testScript = pickScript(item.event, "test")

    return {
        id: id(),
        name: item.name ?? safeMethod,
        method: safeMethod,
        url,
        params: kvList(query),
        headers: kvList(r.header),
        body: convertBody(r.body),
        // Postman semantics: no request-level auth → inherit from the nearest
        // ancestor. Folder auth becomes folder defaultAuth (runtime merge);
        // collection auth has no runtime home, so it's baked in here.
        auth: r.auth ? convertAuth(r.auth) : inheritedAuth ?? { type: "none" },
        preRequestScript: preRequestScript || undefined,
        testScript: testScript || undefined,
    }
}

function joinScripts(...parts: Array<string | undefined>): string | undefined {
    const cleaned = parts.map((p) => (p ?? "").trim()).filter(Boolean)
    return cleaned.length ? cleaned.join("\n\n") : undefined
}

function convertItems(
    items: PostmanItem[] | undefined,
    inheritedAuth?: RequestAuth,
): Array<CollectionFolder | CollectionRequest> {
    if (!items) return []
    const out: Array<CollectionFolder | CollectionRequest> = []
    for (const item of items) {
        if (item.request) {
            out.push(convertRequest(item, inheritedAuth))
        } else if (item.item) {
            const folderAuth = item.auth ? convertAuth(item.auth) : undefined
            out.push({
                id: id(),
                name: item.name ?? "Folder",
                type: "folder",
                // Folder auth applies at runtime via defaultAuth, so children stop
                // inheriting the collection-level fallback under such a folder.
                items: convertItems(item.item, folderAuth ? undefined : inheritedAuth),
                isOpen: false,
                defaultAuth: folderAuth,
                preRequestScript: pickScript(item.event, "prerequest") || undefined,
                testScript: pickScript(item.event, "test") || undefined,
            })
        }
        // Items with neither `request` nor `item` are skipped silently — they're either
        // empty placeholders or unsupported types (e.g. data events).
    }
    return out
}

export interface PostmanImportResult {
    collection: Collection
    /** Collection-level `variable[]` — offer these as an api-client environment. */
    variables: Array<{ key: string; value: string }>
}

export function importPostmanCollectionWithMeta(raw: string | unknown): PostmanImportResult {
    const data: PostmanCollection = typeof raw === "string" ? JSON.parse(raw) : (raw as PostmanCollection)
    if (!data || typeof data !== "object") throw new Error("Not a Postman collection")
    if (!data.info?.name && !Array.isArray(data.item)) {
        throw new Error("Not a Postman collection (missing info.name + item[])")
    }
    const collectionAuth = data.auth ? convertAuth(data.auth) : undefined
    const items = convertItems(data.item, collectionAuth?.type === "none" ? undefined : collectionAuth)

    // Collection-level scripts run before everything else. Prepend them at the
    // top level: folders cascade to children at runtime; bare root requests get
    // them baked in. (Both CollectionFolder and CollectionRequest carry the
    // same script fields.)
    const pre = pickScript(data.event, "prerequest")
    const test = pickScript(data.event, "test")
    if (pre || test) {
        for (const item of items) {
            item.preRequestScript = joinScripts(pre, item.preRequestScript)
            item.testScript = joinScripts(test, item.testScript)
        }
    }

    const variables = (data.variable ?? [])
        .filter((v) => v && typeof v.key === "string" && v.key)
        .map((v) => ({ key: v.key, value: v.value ?? "" }))

    return {
        collection: {
            id: id(),
            name: data.info?.name ?? "Imported Postman collection",
            items,
        },
        variables,
    }
}

export function importPostmanCollection(raw: string | unknown): Collection {
    return importPostmanCollectionWithMeta(raw).collection
}
