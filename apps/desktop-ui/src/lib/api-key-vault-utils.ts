import type { ApiKeyEntry, ApiKeyEnv } from "@/store/api-key-vault-store"

/** Parse a decrypted API-key envelope payload; null on malformed JSON. */
export function parseApiKeyPayload(plain: string): Omit<ApiKeyEntry, "id" | "createdAt" | "updatedAt"> | null {
    try {
        const o = JSON.parse(plain)
        if (typeof o !== "object" || o === null) return null
        const env: ApiKeyEnv =
            o.env === "staging" || o.env === "production" ? o.env : "development"
        return {
            name: typeof o.name === "string" ? o.name : "",
            apiKey: typeof o.apiKey === "string" ? o.apiKey : "",
            secret: typeof o.secret === "string" ? o.secret : "",
            env,
            notes: typeof o.notes === "string" ? o.notes : "",
        }
    } catch {
        return null
    }
}
