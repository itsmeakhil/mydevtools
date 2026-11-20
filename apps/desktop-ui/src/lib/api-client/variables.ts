/**
 * The one variable-precedence rule for the API client. Send, the collection
 * runner and the URL highlighter all resolve `{{key}}` through here.
 *
 * Highest wins:
 *   response.* (previous response) → data row (runner) → script env changes
 *   (unset hides the key) → session/pm.variables → environment → collection
 *   variables → globals → {{vault.*}}/{{env.*}} secrets → dynamic ($guid…)
 */

import type { ApiResponse, KeyValueItem } from "@/components/api-client/types"
import { resolveResponsePath } from "@/lib/response-path"
import { resolveDynamicVar } from "@/lib/api-client/dynamic-vars"

export interface VariableScopes {
    globals?: Record<string, string>
    collection?: Record<string, string>
    environment?: Record<string, string>
    session?: Record<string, string>
    /** Environment changes made by scripts during this send/run. */
    overlay?: Record<string, string>
    /** Keys scripts unset during this send/run — they resolve to nothing. */
    unsets?: ReadonlySet<string>
    /** Runner data-file row. */
    row?: Record<string, string>
    secrets?: Record<string, string>
    previousResponse?: ApiResponse | null
}

/** What a secret value shows as anywhere it would otherwise be displayed. */
export const SECRET_MASK = "••••••"

const own = (rec: Record<string, string> | undefined, key: string): string | undefined =>
    rec && Object.hasOwn(rec, key) ? rec[key] : undefined

/** Value `{{key}}` resolves to, or undefined (the token is then left as typed). */
export function resolveVariable(key: string, s: VariableScopes): string | undefined {
    if (key.startsWith("response.")) {
        return s.previousResponse ? resolveResponsePath(key.slice("response.".length), s.previousResponse) : undefined
    }
    const row = own(s.row, key)
    if (row !== undefined) return row
    if (s.unsets?.has(key)) return undefined
    return own(s.overlay, key)
        ?? own(s.session, key)
        ?? own(s.environment, key)
        ?? own(s.collection, key)
        ?? own(s.globals, key)
        ?? own(s.secrets, key)
        ?? resolveDynamicVar(key)
}

export function substituteVariables(text: string, s: VariableScopes): string {
    if (!text) return text
    return text.replace(/\{\{(.+?)\}\}/g, (m, k) => resolveVariable((k as string).trim(), s) ?? m)
}

/**
 * Values known before sending (globals < collection < environment) — what the
 * editor can show. Runtime scopes (scripts, rows, responses) are not included.
 */
export function staticVariables(s: Pick<VariableScopes, "globals" | "collection" | "environment">): Record<string, string> {
    return { ...s.globals, ...s.collection, ...s.environment }
}

/** Enabled, keyed rows as a lookup map (env variables, collection variables, globals). */
export function variablesToRecord(
    rows: ReadonlyArray<Pick<KeyValueItem, "key" | "value"> & { active?: boolean; enabled?: boolean }> | undefined,
): Record<string, string> {
    const out: Record<string, string> = {}
    for (const r of rows ?? []) {
        if (r.key && r.active !== false && r.enabled !== false) out[r.key] = r.value
    }
    return out
}
