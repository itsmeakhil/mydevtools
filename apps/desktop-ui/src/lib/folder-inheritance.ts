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

/** A default header a request receives from its collection or a folder. */
export interface InheritedHeader {
    key: string
    value: string
    /** Name of the collection/folder it comes from. */
    from: string
    omitted: boolean
}

/**
 * The active default headers a request inherits — nearest ancestor wins on a
 * key clash, keys the request sets itself are left out. `omitted` marks the
 * ones the request opted out of (Bruno-style per-request omit).
 */
export function listInheritedHeaders(
    ancestorChain: Array<InheritedDefaults & { name?: string }>,
    requestHeaders: KeyValueItem[],
    omitHeaders: string[] = [],
): InheritedHeader[] {
    const seen = new Set(requestHeaders.filter((h) => h.key).map((h) => h.key.toLowerCase()))
    const omit = new Set(omitHeaders.map((k) => k.toLowerCase()))
    const out: InheritedHeader[] = []
    for (const ancestor of [...ancestorChain].reverse()) {
        for (const h of ancestor.defaultHeaders ?? []) {
            const lower = h.key?.toLowerCase()
            if (!lower || h.active === false || seen.has(lower)) continue
            seen.add(lower)
            out.push({ key: h.key, value: h.value, from: ancestor.name ?? "", omitted: omit.has(lower) })
        }
    }
    return out
}

function mergeHeaders(
    ancestorChain: InheritedDefaults[],
    requestHeaders: KeyValueItem[],
    omitHeaders?: string[],
): KeyValueItem[] {
    // Request headers first so their keys shadow ancestors; nearest ancestor
    // first after that, so an inner folder's header beats the collection's.
    const inherited = listInheritedHeaders(ancestorChain, requestHeaders, omitHeaders)
        .filter((h) => !h.omitted)
        .map(({ key, value }) => ({ id: crypto.randomUUID(), key, value, active: true }))
    return [...requestHeaders, ...inherited]
}

function concatScripts(parts: Array<string | undefined>): string {
    const cleaned = parts.map((p) => (p ?? "").trim()).filter(Boolean)
    return cleaned.join("\n\n")
}

export function applyFolderInheritance<R extends Pick<CollectionRequest, "headers" | "auth" | "preRequestScript" | "testScript" | "omitHeaders">>(
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
        headers: mergeHeaders(ancestors, request.headers, request.omitHeaders),
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
export function withFolderDefaults<T extends Pick<CollectionRequest, "headers" | "auth" | "preRequestScript" | "testScript" | "omitHeaders"> & { source?: { requestId: string } }>(
    tab: T,
    collections: Collection[],
): T {
    const ctx = tab.source ? findRequestContext(collections, tab.source.requestId) : null
    return applyFolderInheritance(tab, ctx ? [ctx.collection, ...ctx.folders] : [])
}
