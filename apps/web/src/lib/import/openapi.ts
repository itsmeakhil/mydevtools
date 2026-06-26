/**
 * OpenAPI 3.x (and Swagger 2.0) → internal Collection.
 *
 * Scope is "make every operation runnable, with hints for the bits the user
 * has to fill in" — not a full spec validator. We resolve `$ref` for local
 * components.parameters; schemas are left as JSON skeletons synthesised from
 * required + properties.
 *
 * Operations are grouped into folders by their first `tag`; untagged ops live
 * at the root.
 */

import yaml from "js-yaml"
import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    KeyValueItem,
    RequestAuth,
    RequestBody,
    RequestMethod,
} from "@/components/api-client/types"

interface OpenAPISpec {
    openapi?: string
    swagger?: string
    info?: { title?: string; version?: string }
    servers?: Array<{ url: string; variables?: Record<string, { default?: string }> }>
    host?: string
    basePath?: string
    schemes?: string[]
    paths?: Record<string, PathItem>
    components?: { parameters?: Record<string, Parameter>; securitySchemes?: Record<string, SecurityScheme> }
    securityDefinitions?: Record<string, SecurityScheme>
    security?: Array<Record<string, string[]>>
}

interface PathItem {
    parameters?: Array<Parameter | Ref>
    get?: Operation
    put?: Operation
    post?: Operation
    delete?: Operation
    patch?: Operation
    head?: Operation
    options?: Operation
}

interface Operation {
    operationId?: string
    summary?: string
    description?: string
    tags?: string[]
    parameters?: Array<Parameter | Ref>
    requestBody?: RequestBodyOAS | Ref
    security?: Array<Record<string, string[]>>
}

interface Parameter {
    name: string
    in: "query" | "header" | "path" | "cookie"
    required?: boolean
    schema?: Schema
    example?: unknown
    examples?: Record<string, { value?: unknown }>
    description?: string
}

interface Ref { $ref: string }

interface RequestBodyOAS {
    required?: boolean
    content?: Record<string, MediaType>
}

interface MediaType {
    schema?: Schema
    example?: unknown
    examples?: Record<string, { value?: unknown }>
}

interface Schema {
    type?: string
    properties?: Record<string, Schema>
    required?: string[]
    items?: Schema
    enum?: unknown[]
    example?: unknown
    default?: unknown
    format?: string
}

interface SecurityScheme {
    type: "apiKey" | "http" | "oauth2" | "openIdConnect"
    scheme?: "basic" | "bearer"
    in?: "header" | "query" | "cookie"
    name?: string
    flows?: { clientCredentials?: { tokenUrl?: string; scopes?: Record<string, string> }; authorizationCode?: { authorizationUrl?: string; tokenUrl?: string; scopes?: Record<string, string> } }
}

const HTTP_METHODS: Array<keyof PathItem & RequestMethod | string> = [
    "get", "post", "put", "delete", "patch", "head", "options",
]

function id(): string { return crypto.randomUUID() }

function isRef(x: unknown): x is Ref {
    return !!x && typeof x === "object" && typeof (x as Ref).$ref === "string"
}

function resolveRef<T>(spec: OpenAPISpec, ref: string): T | null {
    // Only local refs handled — external refs are out of scope for batch 5.
    if (!ref.startsWith("#/")) return null
    const parts = ref.slice(2).split("/")
    let cur: unknown = spec
    for (const p of parts) {
        const decoded = p.replace(/~1/g, "/").replace(/~0/g, "~")
        if (!cur || typeof cur !== "object") return null
        cur = (cur as Record<string, unknown>)[decoded]
    }
    return (cur ?? null) as T | null
}

/**
 * Build a JSON skeleton from a schema. Prefers `example`, then `default`, then
 * a placeholder appropriate for the type. Recurses into objects/arrays.
 */
function exampleFromSchema(spec: OpenAPISpec, schema: Schema | undefined): unknown {
    if (!schema) return null
    if (isRef(schema)) {
        const resolved = resolveRef<Schema>(spec, (schema as unknown as Ref).$ref)
        return exampleFromSchema(spec, resolved ?? undefined)
    }
    if (schema.example !== undefined) return schema.example
    if (schema.default !== undefined) return schema.default
    if (schema.enum && schema.enum.length > 0) return schema.enum[0]
    switch (schema.type) {
        case "string":
            if (schema.format === "date-time") return new Date().toISOString()
            if (schema.format === "date") return new Date().toISOString().slice(0, 10)
            if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000"
            if (schema.format === "email") return "user@example.com"
            return ""
        case "integer":
        case "number":
            return 0
        case "boolean":
            return false
        case "array":
            return [exampleFromSchema(spec, schema.items)]
        case "object":
        default: {
            if (!schema.properties) return {}
            const out: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(schema.properties)) {
                out[k] = exampleFromSchema(spec, v)
            }
            return out
        }
    }
}

function resolveParameter(spec: OpenAPISpec, p: Parameter | Ref): Parameter | null {
    if (isRef(p)) {
        const r = resolveRef<Parameter>(spec, p.$ref)
        return r ?? null
    }
    return p
}

function exampleString(spec: OpenAPISpec, p: Parameter): string {
    if (p.example !== undefined) return String(p.example)
    if (p.examples) {
        const first = Object.values(p.examples)[0]
        if (first?.value !== undefined) return String(first.value)
    }
    if (p.schema) {
        const v = exampleFromSchema(spec, p.schema)
        if (v == null) return ""
        if (typeof v === "object") return JSON.stringify(v)
        return String(v)
    }
    return ""
}

function methodFromKey(k: string): RequestMethod {
    return k.toUpperCase() as RequestMethod
}

/** Substitute Swagger 2.0 / OpenAPI 3 server-variable placeholders with defaults. */
function applyServerVariables(template: string, variables?: Record<string, { default?: string }>): string {
    if (!variables) return template
    return template.replace(/\{(\w+)\}/g, (m, k) => variables[k]?.default ?? m)
}

function pickBaseUrl(spec: OpenAPISpec): string {
    // OpenAPI 3
    if (spec.servers && spec.servers.length > 0) {
        const first = spec.servers[0]
        return applyServerVariables(first.url, first.variables).replace(/\/$/, "")
    }
    // Swagger 2.0
    if (spec.host) {
        const scheme = spec.schemes?.[0] ?? "https"
        return `${scheme}://${spec.host}${spec.basePath ?? ""}`.replace(/\/$/, "")
    }
    return ""
}

function convertRequestBody(spec: OpenAPISpec, rb: RequestBodyOAS | Ref | undefined): RequestBody {
    if (!rb) return { type: "none", content: "" }
    const resolved: RequestBodyOAS | null = isRef(rb)
        ? resolveRef<RequestBodyOAS>(spec, rb.$ref)
        : rb
    if (!resolved?.content) return { type: "none", content: "" }
    const entries = Object.entries(resolved.content)
    if (entries.length === 0) return { type: "none", content: "" }

    // Prefer JSON, then form-urlencoded, then multipart, then first available.
    const jsonEntry = entries.find(([m]) => m.toLowerCase().includes("json"))
        ?? entries.find(([m]) => m.toLowerCase().includes("urlencoded"))
        ?? entries.find(([m]) => m.toLowerCase().includes("form-data"))
        ?? entries[0]

    const [mime, media] = jsonEntry
    const lower = mime.toLowerCase()

    if (lower.includes("json")) {
        const value = media.example
            ?? Object.values(media.examples ?? {})[0]?.value
            ?? exampleFromSchema(spec, media.schema)
        return { type: "json", content: JSON.stringify(value ?? {}, null, 2) }
    }
    if (lower.includes("urlencoded")) {
        const props = media.schema?.properties ?? {}
        return {
            type: "x-www-form-urlencoded",
            content: "",
            urlEncoded: Object.entries(props).map(([k]) => ({
                id: id(), key: k, value: "", active: true,
            })),
        }
    }
    if (lower.includes("form-data")) {
        const props = media.schema?.properties ?? {}
        return {
            type: "form-data",
            content: "",
            formData: Object.entries(props).map(([k, v]) => ({
                id: id(),
                key: k,
                value: "",
                active: true,
                valueType: v.format === "binary" ? "file" : "text",
            })),
        }
    }
    // Plain text fallback.
    const text = media.example !== undefined ? String(media.example) : ""
    return { type: "text", content: text }
}

function authFromSpec(spec: OpenAPISpec, op: Operation): RequestAuth {
    const securityList = op.security ?? spec.security
    if (!securityList || securityList.length === 0) return { type: "none" }
    const schemes = spec.components?.securitySchemes ?? spec.securityDefinitions
    if (!schemes) return { type: "none" }
    // Pick the first scheme of the first requirement.
    const first = securityList[0]
    const schemeName = Object.keys(first)[0]
    if (!schemeName) return { type: "none" }
    const scheme = schemes[schemeName]
    if (!scheme) return { type: "none" }

    if (scheme.type === "http" && scheme.scheme === "bearer") {
        return { type: "bearer", token: "" }
    }
    if (scheme.type === "http" && scheme.scheme === "basic") {
        return { type: "basic", username: "", password: "" }
    }
    if (scheme.type === "apiKey") {
        return {
            type: "api-key",
            apiKeyKey: scheme.name ?? "X-API-Key",
            apiKeyValue: "",
            apiKeyLocation: scheme.in === "query" ? "query" : "header",
        }
    }
    if (scheme.type === "oauth2") {
        const flows = scheme.flows
        if (flows?.authorizationCode) {
            return {
                type: "oauth2",
                oauth2: {
                    grantType: "authorization_code",
                    authUrl: flows.authorizationCode.authorizationUrl ?? "",
                    tokenUrl: flows.authorizationCode.tokenUrl ?? "",
                    clientId: "",
                    scope: Object.keys(flows.authorizationCode.scopes ?? {}).join(" "),
                },
            }
        }
        if (flows?.clientCredentials) {
            return {
                type: "oauth2",
                oauth2: {
                    grantType: "client_credentials",
                    tokenUrl: flows.clientCredentials.tokenUrl ?? "",
                    clientId: "",
                    scope: Object.keys(flows.clientCredentials.scopes ?? {}).join(" "),
                },
            }
        }
    }
    return { type: "none" }
}

function buildRequest(
    spec: OpenAPISpec,
    baseUrl: string,
    path: string,
    method: RequestMethod,
    op: Operation,
    pathLevelParams: Array<Parameter | Ref>,
): CollectionRequest {
    const allParams = [...pathLevelParams, ...(op.parameters ?? [])]
        .map((p) => resolveParameter(spec, p))
        .filter((p): p is Parameter => !!p)

    const query: KeyValueItem[] = []
    const headers: KeyValueItem[] = []
    for (const p of allParams) {
        const example = exampleString(spec, p)
        const item: KeyValueItem = { id: id(), key: p.name, value: example, active: !!p.required }
        if (p.in === "query") query.push(item)
        else if (p.in === "header") headers.push(item)
        // path/cookie: left as-is in URL / not directly handled
    }

    return {
        id: id(),
        name: op.summary ?? op.operationId ?? `${method} ${path}`,
        method,
        url: baseUrl + path,
        params: query,
        headers,
        body: convertRequestBody(spec, op.requestBody),
        auth: authFromSpec(spec, op),
    }
}

function parseSpec(raw: string | object): OpenAPISpec {
    if (typeof raw === "object" && raw !== null) return raw as OpenAPISpec
    const text = String(raw).trim()
    if (text.startsWith("{") || text.startsWith("[")) {
        return JSON.parse(text) as OpenAPISpec
    }
    const parsed = yaml.load(text)
    if (!parsed || typeof parsed !== "object") {
        throw new Error("Could not parse OpenAPI document (not JSON or YAML)")
    }
    return parsed as OpenAPISpec
}

export function importOpenApiSpec(raw: string | object): Collection {
    const spec = parseSpec(raw)
    if (!spec.openapi && !spec.swagger) {
        throw new Error("Not an OpenAPI/Swagger spec (missing openapi/swagger key)")
    }
    if (!spec.paths || typeof spec.paths !== "object") {
        throw new Error("OpenAPI spec has no paths")
    }
    const baseUrl = pickBaseUrl(spec)
    const folders = new Map<string, Array<CollectionFolder | CollectionRequest>>()
    const rootless: Array<CollectionFolder | CollectionRequest> = []

    for (const [path, pathItem] of Object.entries(spec.paths)) {
        if (!pathItem) continue
        const pathLevelParams = pathItem.parameters ?? []
        for (const m of HTTP_METHODS) {
            const op = (pathItem as Record<string, Operation | undefined>)[m]
            if (!op) continue
            const req = buildRequest(spec, baseUrl, path, methodFromKey(m), op, pathLevelParams)
            const tag = op.tags?.[0]
            if (tag) {
                const list = folders.get(tag) ?? []
                list.push(req)
                folders.set(tag, list)
            } else {
                rootless.push(req)
            }
        }
    }

    const folderItems: CollectionFolder[] = Array.from(folders.entries()).map(([tag, items]) => ({
        id: id(),
        name: tag,
        type: "folder" as const,
        items,
        isOpen: false,
    }))

    return {
        id: id(),
        name: spec.info?.title ?? "Imported OpenAPI",
        items: [...folderItems, ...rootless],
    }
}
