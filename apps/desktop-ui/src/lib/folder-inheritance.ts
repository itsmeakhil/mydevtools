/**
 * Merge folder-level defaults (headers / auth / pre-request + test scripts)
 * down into a request along its ancestor chain — root → leaf → request.
 *
 * Behaviour matches Postman:
 *   - Headers from ancestors are PREPENDED; request-level headers override on key collision.
 *   - Auth: request-level wins; if `auth.type === "none"`, the nearest ancestor's auth applies.
 *   - Scripts: ancestor scripts run BEFORE the request's own (concatenated with newlines),
 *               so chaining envOverlay mutations cascades naturally.
 */

import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    KeyValueItem,
} from "@/components/api-client/types"

export function findRequestAncestors(
    items: Array<CollectionFolder | CollectionRequest>,
    requestId: string,
    trail: CollectionFolder[] = [],
): CollectionFolder[] | null {
    for (const item of items) {
        if (item.id === requestId) return trail
        if ("type" in item && item.type === "folder") {
            const hit = findRequestAncestors(item.items, requestId, [...trail, item])
            if (hit) return hit
        }
    }
    return null
}

function mergeHeaders(
    ancestorChain: CollectionFolder[],
    requestHeaders: KeyValueItem[],
): KeyValueItem[] {
    const out: KeyValueItem[] = []
    const seen = new Set<string>()
    // Request headers first so their keys shadow ancestors.
    for (const h of requestHeaders) {
        if (h.key) seen.add(h.key.toLowerCase())
        out.push(h)
    }
    for (const folder of ancestorChain) {
        for (const h of folder.defaultHeaders ?? []) {
            if (h.key && seen.has(h.key.toLowerCase())) continue
            if (h.key) seen.add(h.key.toLowerCase())
            out.push({ ...h, id: crypto.randomUUID() })
        }
    }
    return out
}

function concatScripts(parts: Array<string | undefined>): string {
    const cleaned = parts.map((p) => (p ?? "").trim()).filter(Boolean)
    return cleaned.join("\n\n")
}

export function applyFolderInheritance<R extends Pick<CollectionRequest, "headers" | "auth" | "preRequestScript" | "testScript">>(
    request: R,
    ancestors: CollectionFolder[],
): R {
    if (ancestors.length === 0) return request

    // Nearest-ancestor-first auth: request wins; if request is `none`, look outward.
    let resolvedAuth = request.auth
    if (resolvedAuth.type === "none") {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const a = ancestors[i].defaultAuth
            if (a && a.type !== "none") { resolvedAuth = a; break }
        }
    }

    const preChain = [
        ...ancestors.map((f) => f.preRequestScript),
        request.preRequestScript,
    ]
    const testChain = [
        ...ancestors.map((f) => f.testScript),
        request.testScript,
    ]

    return {
        ...request,
        headers: mergeHeaders(ancestors, request.headers),
        auth: resolvedAuth,
        preRequestScript: concatScripts(preChain),
        testScript: concatScripts(testChain),
    }
}

/**
 * A tab opened from a collection holds the request exactly as saved; its
 * folders' defaults are merged in here, at send/codegen time, so ⌘S never
 * writes inherited headers or scripts back into the request.
 */
export function withFolderDefaults<T extends Pick<CollectionRequest, "headers" | "auth" | "preRequestScript" | "testScript"> & { source?: { requestId: string } }>(
    tab: T,
    collections: Collection[],
): T {
    if (!tab.source) return tab
    for (const col of collections) {
        const ancestors = findRequestAncestors(col.items, tab.source.requestId)
        if (ancestors !== null) return applyFolderInheritance(tab, ancestors)
    }
    return tab
}
