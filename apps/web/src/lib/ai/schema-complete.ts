/**
 * Schema-driven body completion.
 *
 * Given a JSON Schema (typically from an OpenAPI requestBody) and a partial
 * user-typed JSON object, fill in any missing required fields with sane
 * defaults. Pure local logic — no LLM hop unless `--ai` is wired separately.
 */

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

function defaultFor(schema: Schema | undefined): unknown {
    if (!schema) return null
    if (schema.example !== undefined) return schema.example
    if (schema.default !== undefined) return schema.default
    if (schema.enum && schema.enum.length > 0) return schema.enum[0]
    switch (schema.type) {
        case "string":
            if (schema.format === "date-time") return new Date().toISOString()
            if (schema.format === "date") return new Date().toISOString().slice(0, 10)
            if (schema.format === "uuid") return crypto.randomUUID()
            if (schema.format === "email") return "user@example.com"
            return ""
        case "integer":
        case "number": return 0
        case "boolean": return false
        case "array": return []
        case "object":
        default:
            return buildFromSchema(schema)
    }
}

function buildFromSchema(schema: Schema): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    if (schema.properties && schema.required) {
        for (const field of schema.required) {
            out[field] = defaultFor(schema.properties[field])
        }
    } else if (schema.properties) {
        for (const [k, v] of Object.entries(schema.properties)) out[k] = defaultFor(v)
    }
    return out
}

/**
 * Merge user-typed JSON (`partial`) over a generated skeleton — keeps every
 * value the user already wrote, but adds any required fields they missed.
 */
export function completeBody(schema: Schema | undefined, partial: unknown): unknown {
    if (!schema) return partial
    if (schema.type === "object" || schema.properties) {
        const out = buildFromSchema(schema)
        if (partial && typeof partial === "object" && !Array.isArray(partial)) {
            for (const [k, v] of Object.entries(partial as Record<string, unknown>)) {
                const childSchema = schema.properties?.[k]
                out[k] = childSchema ? completeBody(childSchema, v) : v
            }
        }
        return out
    }
    if (schema.type === "array") {
        if (Array.isArray(partial)) {
            return partial.map((item) => completeBody(schema.items, item))
        }
        return partial ?? []
    }
    return partial !== undefined && partial !== null ? partial : defaultFor(schema)
}
