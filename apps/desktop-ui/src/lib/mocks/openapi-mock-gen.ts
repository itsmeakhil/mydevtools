/**
 * OpenAPI → mock-example generator.
 *
 * For each operation in a spec, fabricate a `SavedExample` whose response is
 * a JSON skeleton built from the operation's first `2xx` response schema.
 * Pair it with the imported collection so the existing public-mock route
 * serves realistic-shape responses out of the box.
 */

import yaml from "js-yaml"
import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    SavedExample,
} from "@/components/api-client/types"

interface Schema {
    type?: string
    format?: string
    enum?: unknown[]
    example?: unknown
    default?: unknown
    items?: Schema
    properties?: Record<string, Schema>
    required?: string[]
    $ref?: string
}

interface Response {
    description?: string
    content?: Record<string, { schema?: Schema; example?: unknown }>
}

interface Operation {
    summary?: string
    operationId?: string
    responses?: Record<string, Response>
}

interface Spec {
    openapi?: string
    swagger?: string
    paths?: Record<string, Record<string, Operation>>
    components?: { schemas?: Record<string, Schema> }
}

function parseSpec(raw: string | object): Spec {
    if (typeof raw === "object" && raw !== null) return raw as Spec
    const text = String(raw).trim()
    if (text.startsWith("{")) return JSON.parse(text) as Spec
    const parsed = yaml.load(text)
    return (parsed && typeof parsed === "object") ? (parsed as Spec) : {}
}

function resolveRef<T>(spec: Spec, ref: string): T | null {
    if (!ref.startsWith("#/")) return null
    const parts = ref.slice(2).split("/")
    let cur: unknown = spec
    for (const p of parts) {
        if (!cur || typeof cur !== "object") return null
        cur = (cur as Record<string, unknown>)[p]
    }
    return (cur ?? null) as T | null
}

function exampleFromSchema(spec: Spec, schema: Schema | undefined, seen = new Set<string>()): unknown {
    if (!schema) return null
    if (schema.$ref) {
        if (seen.has(schema.$ref)) return null
        seen.add(schema.$ref)
        return exampleFromSchema(spec, resolveRef<Schema>(spec, schema.$ref) ?? undefined, seen)
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
            return "string"
        case "integer":
        case "number":
            return 0
        case "boolean":
            return true
        case "array":
            return [exampleFromSchema(spec, schema.items, seen)]
        case "object":
        default: {
            if (!schema.properties) return {}
            const out: Record<string, unknown> = {}
            for (const [k, v] of Object.entries(schema.properties)) {
                out[k] = exampleFromSchema(spec, v, seen)
            }
            return out
        }
    }
}

function* walkRequests(items: Array<CollectionFolder | CollectionRequest>): Generator<CollectionRequest> {
    for (const item of items) {
        if ("type" in item && item.type === "folder") yield* walkRequests(item.items)
        else yield item as CollectionRequest
    }
}

function pickSuccessResponse(op: Operation): { status: number; resp: Response } | null {
    if (!op.responses) return null
    for (const [code, resp] of Object.entries(op.responses)) {
        if (/^2\d{2}$/.test(code)) return { status: Number(code), resp }
    }
    if (op.responses["default"]) return { status: 200, resp: op.responses["default"] }
    return null
}

/**
 * Mutates each request inside `collection` in place, attaching a `mock_<status>`
 * example synthesised from the matching OpenAPI operation. Requests already
 * carrying examples are left alone.
 */
export function generateMockExamplesFromOpenApi(collection: Collection, spec: string | object): {
    addedCount: number
    skippedCount: number
} {
    const parsed = parseSpec(spec)
    let added = 0, skipped = 0
    const requests = [...walkRequests(collection.items)]

    if (!parsed.paths) return { addedCount: 0, skippedCount: requests.length }

    for (const req of requests) {
        if (req.examples && req.examples.length > 0) { skipped++; continue }
        let pathname: string
        try { pathname = new URL(req.url).pathname || "/" } catch { pathname = req.url }

        const opEntry = parsed.paths[pathname]?.[req.method.toLowerCase()]
        if (!opEntry) { skipped++; continue }

        const success = pickSuccessResponse(opEntry)
        if (!success || !success.resp.content) { skipped++; continue }

        const firstMedia = Object.values(success.resp.content)[0]
        const body = firstMedia.example !== undefined
            ? firstMedia.example
            : exampleFromSchema(parsed, firstMedia.schema)

        const example: SavedExample = {
            id: crypto.randomUUID(),
            name: `mock_${success.status}`,
            capturedAt: Date.now(),
            request: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: { type: "none", content: "" },
            },
            response: {
                status: success.status,
                statusText: success.resp.description ?? "OK",
                headers: { "content-type": "application/json" },
                body: typeof body === "string" ? body : JSON.stringify(body, null, 2),
                contentType: "application/json",
            },
        }
        req.examples = [example]
        added++
    }

    return { addedCount: added, skippedCount: skipped }
}
