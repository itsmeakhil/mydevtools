import { apiFetch } from "@/lib/desktop/api-fetch";
/**
 * GraphQL schema introspection helper.
 * Sends the standard introspection query through the existing proxy so it
 * inherits SSRF protection + cookie forwarding.
 */

import { INTROSPECTION_QUERY, type GqlSchema, type GqlType } from "@/lib/api-client/graphql-schema"

interface ProxyResponseShape {
    status: number
    body: string
    error?: string
    headers?: Record<string, string>
}

interface IntrospectionShape {
    data?: {
        __schema?: {
            queryType?: { name?: string }
            mutationType?: { name?: string }
            subscriptionType?: { name?: string }
            types?: GqlType[]
        }
    }
    errors?: Array<{ message: string }>
}

/** Last fetched schema per request URL (as typed, before variable substitution) — session only. */
const schemaCache = new Map<string, GqlSchema>()

export function cachedGraphQLSchema(url: string | undefined): GqlSchema | undefined {
    return url ? schemaCache.get(url) : undefined
}

export function cacheGraphQLSchema(url: string, schema: GqlSchema): void {
    schemaCache.set(url, schema)
}

export async function fetchGraphQLSchema(args: {
    url: string
    headers?: Record<string, string>
}): Promise<GqlSchema> {
    if (!args.url.trim()) throw new Error("GraphQL URL is required")

    const proxyRes = await apiFetch("/api/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: args.url,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                ...(args.headers ?? {}),
            },
            body: JSON.stringify({ query: INTROSPECTION_QUERY }),
        }),
    })

    const data = (await proxyRes.json()) as ProxyResponseShape
    if (data.status >= 400 || data.error) {
        throw new Error(`Introspection failed: ${data.error ?? data.status} ${data.body?.slice(0, 200) ?? ""}`)
    }

    let parsed: IntrospectionShape
    try {
        parsed = JSON.parse(data.body)
    } catch (e) {
        throw new Error(`Introspection response is not JSON: ${(e as Error).message}`)
    }

    if (parsed.errors && parsed.errors.length > 0) {
        throw new Error(`Introspection errors: ${parsed.errors.map((e) => e.message).join("; ")}`)
    }

    const schema = parsed.data?.__schema
    if (!schema) throw new Error("Response missing data.__schema")

    return {
        types: (schema.types ?? []).filter((t) => t.name && !t.name.startsWith("__")),
        queryType: schema.queryType?.name,
        mutationType: schema.mutationType?.name,
        subscriptionType: schema.subscriptionType?.name,
    }
}
