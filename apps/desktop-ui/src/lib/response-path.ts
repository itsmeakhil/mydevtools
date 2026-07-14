/**
 * Resolve a `response.*` template path against a previous response.
 *
 * Examples:
 *   response.status                  → "200"
 *   response.statusText              → "OK"
 *   response.headers.Authorization   → "Bearer …"    (case-insensitive)
 *   response.body.users[0].id        → "42"
 *   response.body                    → the raw body string
 *
 * Returns `undefined` on miss; callers leave the original `{{...}}` token in place.
 */

import type { ApiResponse } from "@/components/api-client/types"

/**
 * Parse "body.users[0].name" → ["body", "users", 0, "name"].
 * Indexes are emitted as numbers; everything else as strings. No fancy JSONPath:
 * deliberate ponytail simplicity — covers ~95% of chaining cases.
 */
export function parseResponsePath(s: string): Array<string | number> {
    const out: Array<string | number> = []
    for (const part of s.split(".")) {
        const m = part.match(/^([^[]*)((?:\[\d+\])*)$/)
        if (!m) { out.push(part); continue }
        if (m[1]) out.push(m[1])
        for (const idx of m[2].matchAll(/\[(\d+)\]/g)) out.push(Number(idx[1]))
    }
    return out
}

function tryParseJson(s: string): unknown | undefined {
    try { return JSON.parse(s) } catch { return undefined }
}

function navigate(root: unknown, keys: Array<string | number>): unknown {
    let cur = root
    for (const k of keys) {
        if (cur == null || typeof cur !== "object") return undefined
        cur = (cur as Record<string | number, unknown>)[k as keyof typeof cur]
    }
    return cur
}

function stringifyLeaf(v: unknown): string | undefined {
    if (v == null) return undefined
    if (typeof v === "string") return v
    if (typeof v === "number" || typeof v === "boolean") return String(v)
    return JSON.stringify(v)
}

export function resolveResponsePath(
    path: string,
    response: ApiResponse | null | undefined,
): string | undefined {
    if (!response) return undefined
    const parts = parseResponsePath(path)
    if (parts.length === 0) return undefined

    const head = parts[0]
    if (head === "status") return String(response.status)
    if (head === "statusText") return response.statusText

    if (head === "headers") {
        if (parts.length === 1) return undefined
        const name = String(parts[1]).toLowerCase()
        const hit = Object.entries(response.headers ?? {}).find(([k]) => k.toLowerCase() === name)
        return hit?.[1]
    }

    if (head === "body") {
        if (parts.length === 1) return response.body
        const parsed = tryParseJson(response.body)
        if (parsed === undefined) return undefined
        return stringifyLeaf(navigate(parsed, parts.slice(1)))
    }

    return undefined
}
