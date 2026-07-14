/**
 * Postman Environment v2 import.
 *
 * Format:
 *   {
 *     "id": "...",
 *     "name": "Prod",
 *     "values": [
 *       { "key": "host", "value": "https://api.example.com", "enabled": true, "type": "default" },
 *       { "key": "token", "value": "secret", "enabled": true, "type": "secret" }
 *     ]
 *   }
 */

import type { Environment, EnvironmentVariable } from "@/components/api-client/use-environments"

interface PostmanEnvDoc {
    id?: string
    name?: string
    values?: Array<{
        key?: string
        value?: string
        enabled?: boolean
        type?: string
    }>
}

export interface ImportedPostmanEnv {
    name: string
    variables: EnvironmentVariable[]
    /** Keys flagged as `type: "secret"` so the caller can route them into the vault. */
    secretKeys: string[]
}

export function importPostmanEnvironment(raw: string | object): ImportedPostmanEnv {
    const doc: PostmanEnvDoc = typeof raw === "string" ? JSON.parse(raw) : (raw as PostmanEnvDoc)
    if (!doc || typeof doc !== "object") throw new Error("Empty environment")
    if (!Array.isArray(doc.values)) throw new Error("Not a Postman environment (missing values[])")

    const variables: EnvironmentVariable[] = []
    const secretKeys: string[] = []

    for (const v of doc.values) {
        if (!v?.key) continue
        variables.push({
            id: crypto.randomUUID(),
            key: v.key,
            value: String(v.value ?? ""),
            enabled: v.enabled !== false,
        })
        if (v.type === "secret") secretKeys.push(v.key)
    }

    return {
        name: doc.name?.trim() || "Imported Postman environment",
        variables,
        secretKeys,
    }
}

/** Detect a Postman environment payload by shape: `{ name, values: [...] }`. */
export function looksLikePostmanEnvironment(raw: string): boolean {
    try {
        const data = JSON.parse(raw)
        return !!data &&
            typeof data === "object" &&
            !data.info &&  // distinguishes from a Postman collection
            Array.isArray(data.values) &&
            data.values.every((v: unknown) => v && typeof v === "object" && "key" in (v as object))
    } catch { return false }
}
