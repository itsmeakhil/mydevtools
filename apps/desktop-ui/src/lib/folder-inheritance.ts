/**
 * Merge collection + folder defaults (headers / auth / pre-request + test
 * scripts) down into a request along its ancestor chain — collection → folders
 * → request. Resolved live at send/run time; never written into requests.
 *
 * Behaviour matches Postman:
 *   - Headers from ancestors are PREPENDED; request-level headers override on key collision.
 *   - Auth: request-level wins; `inherit` (and legacy `none`) take the nearest
 *     ancestor's auth; an `inherit` with nothing to inherit sends no auth.
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

/** What a collection or folder contributes to the requests below it. */
export type InheritedDefaults = Pick<CollectionFolder, "defaultHeaders" | "defaultAuth" | "preRequestScript" | "testScript">

function mergeHeaders(
    ancestorChain: InheritedDefaults[],
    requestHeaders: KeyValueItem[],
): KeyValueItem[] {
    const out: KeyValueItem[] = []
    const seen = new Set<string>()
    // Request headers first so their keys shadow ancestors.
    for (const h of requestHeaders) {
        if (h.key) seen.add(h.key.toLowerCase())
        out.push(h)
    }
    // Nearest ancestor first, so an inner folder's header beats the collection's.
    for (const folder of [...ancestorChain].reverse()) {
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
    ancestors: InheritedDefaults[],
): R {
    // Nearest-ancestor-first auth: request wins; `inherit`/`none` look outward.
    let resolvedAuth = request.auth
    if (resolvedAuth.type === "none" || resolvedAuth.type === "inherit") {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const a = ancestors[i].defaultAuth
            if (a && a.type !== "none" && a.type !== "inherit") { resolvedAuth = a; break }
        }
        if (resolvedAuth.type === "inherit") resolvedAuth = { type: "none" }
    }
    if (ancestors.length === 0) return resolvedAuth === request.auth ? request : { ...request, auth: resolvedAuth }

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

/** The collection holding `requestId` and its folder chain (outermost first). */
export function findRequestContext(
    collections: Collection[],
    requestId: string,
): { collection: Collection; folders: CollectionFolder[] } | null {
    for (const collection of collections) {
        const folders = findRequestAncestors(collection.items, requestId)
        if (folders !== null) return { collection, folders }
    }
    return null
}

/**
 * A tab opened from a collection holds the request exactly as saved; its
 * collection's and folders' defaults are merged in here, at send/codegen time,
 * so ⌘S never writes inherited headers or scripts back into the request.
 */
export function withFolderDefaults<T extends Pick<CollectionRequest, "headers" | "auth" | "preRequestScript" | "testScript"> & { source?: { requestId: string } }>(
    tab: T,
    collections: Collection[],
): T {
    const ctx = tab.source ? findRequestContext(collections, tab.source.requestId) : null
    return applyFolderInheritance(tab, ctx ? [ctx.collection, ...ctx.folders] : [])
}
