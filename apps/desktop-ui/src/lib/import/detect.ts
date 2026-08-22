export type ImportFormat = "postman" | "postman-env" | "har" | "openapi" | "curl" | "unknown"

interface ParsedRoot {
    info?: { schema?: string }
    item?: unknown
    log?: { entries?: unknown }
    openapi?: string
    swagger?: string
    values?: unknown
}

/**
 * Best-effort format sniffing. Cheap — we just JSON.parse once and look at root keys.
 * cURL is detected by a leading `curl `; YAML OpenAPI (no JSON parse) is reported as `openapi`
 * if the first non-blank line starts with `openapi:` or `swagger:`.
 */
export function detectImportFormat(raw: string): ImportFormat {
    const t = raw.trim()
    if (!t) return "unknown"
    if (/^curl\b/i.test(t)) return "curl"

    if (t.startsWith("{") || t.startsWith("[")) {
        try {
            const data = JSON.parse(t) as ParsedRoot
            if (data?.info?.schema?.includes("schema.getpostman.com")) return "postman"
            if (data?.info && Array.isArray(data.item)) return "postman"
            // Postman environment: `{ name, values: [{ key, value }] }`, no `info`.
            if (!data?.info && Array.isArray(data?.values) &&
                data.values.every((v) => !!v && typeof v === "object" && "key" in (v as object))) return "postman-env"
            if (data?.log && data.log.entries !== undefined) return "har"
            if (typeof data?.openapi === "string") return "openapi"
            if (typeof data?.swagger === "string") return "openapi"
        } catch {
            return "unknown"
        }
    }

    // Bare YAML for OpenAPI.
    const head = t.split(/\r?\n/, 5).join("\n")
    if (/^openapi\s*:/m.test(head)) return "openapi"
    if (/^swagger\s*:/m.test(head)) return "openapi"

    return "unknown"
}
