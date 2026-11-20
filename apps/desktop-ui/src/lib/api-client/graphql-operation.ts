/**
 * True when the document's first operation is a `subscription` — those go over
 * graphql-ws instead of a one-shot POST. Comments, strings and fragment
 * definitions are skipped; a bare `{ … }` is a shorthand query.
 */
export function isSubscriptionOperation(query: string): boolean {
    const src = query
        .replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"/g, '""')
        .replace(/#[^\n]*/g, "")
    let depth = 0
    let inFragment = false
    for (const [tok] of src.matchAll(/[{}]|\b(?:query|mutation|subscription|fragment)\b/g)) {
        if (tok === "{") {
            if (depth === 0 && !inFragment) return false
            depth++
        } else if (tok === "}") {
            depth--
            if (depth === 0) inFragment = false
        } else if (depth === 0) {
            if (tok === "fragment") inFragment = true
            else if (!inFragment) return tok === "subscription"
        }
    }
    return false
}

/** `http(s)://` → `ws(s)://`; any other scheme is left alone. */
export function toWebSocketUrl(url: string): string {
    return url.replace(/^http(s?):\/\//i, "ws$1://")
}
