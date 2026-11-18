import type { ApiRequestState, CollectionRequest } from "@/components/api-client/types"
import { withoutFileBytes } from "./body-files"

/**
 * The tab fields ⌘S writes back to a collection request.
 *
 * Deliberately excluded: `examples` and `comments` (tabs can hold
 * quota-stripped copies of example bodies — writing them back would destroy
 * the stored ones; both keep their stored values because the update patch is
 * shallow), plus runtime-only state (response, loading, script results).
 */
export function requestFromTab(tab: ApiRequestState): Omit<CollectionRequest, "id"> {
    return {
        name: tab.name,
        method: tab.method,
        url: tab.url,
        params: tab.params,
        headers: tab.headers,
        body: tab.body,
        auth: tab.auth,
        preRequestScript: tab.preRequestScript,
        testScript: tab.testScript,
        timeoutMs: tab.timeoutMs,
        useCookieJar: tab.useCookieJar,
        omitHeaders: tab.omitHeaders?.length ? tab.omitHeaders : undefined,
        followRedirects: tab.followRedirects,
        maxRedirects: tab.maxRedirects,
        verifySsl: tab.verifySsl,
        assertions: tab.assertions,
    }
}

const cache = new WeakMap<ApiRequestState, string>()

/**
 * Compact identity of what ⌘S would save. Cached per tab object, so only the
 * tab being edited is re-serialised on a keystroke.
 *
 * Ignores values that change without the user editing the request: OAuth2
 * tokens refreshed on send, and file bytes (which the quota fallback may strip
 * from localStorage) — the file's name stands in for them.
 */
export function requestFingerprint(tab: ApiRequestState): string {
    const hit = cache.get(tab)
    if (hit !== undefined) return hit
    const r = requestFromTab(tab)
    const oauth2 = r.auth.oauth2
    const fp = JSON.stringify({
        ...r,
        auth: oauth2
            ? { ...r.auth, oauth2: { ...oauth2, accessToken: undefined, refreshToken: undefined, tokenType: undefined, expiresAt: undefined } }
            : r.auth,
        body: withoutFileBytes(r.body, undefined),
    })
    cache.set(tab, fp)
    return fp
}

/** True when a tab linked to a saved request has edits ⌘S hasn't written yet. */
export function isTabDirty(tab: ApiRequestState): boolean {
    return tab.savedFingerprint !== undefined && requestFingerprint(tab) !== tab.savedFingerprint
}

/** Binary-body twin of the form-data restore below: same file name, bytes lost → keep stored bytes. */
function restoreBinaryBytes<T extends Pick<CollectionRequest, "body">>(r: T, stored: CollectionRequest | undefined): T {
    const file = r.body.binaryFile
    const kept = stored?.body.binaryFile
    if (!file || file.fileContentBase64 || !kept?.fileContentBase64 || kept.fileName !== file.fileName) return r
    return { ...r, body: { ...r.body, binaryFile: { ...file, fileContentBase64: kept.fileContentBase64 } } }
}

/**
 * Patch for overwriting `stored` with `tab`. File bytes the tab no longer
 * holds (quota fallback) are taken from the stored request, never blanked.
 */
export function savePatch(tab: ApiRequestState, stored: CollectionRequest | undefined): Omit<CollectionRequest, "id"> {
    const r = restoreBinaryBytes(requestFromTab(tab), stored)
    const storedFiles = new Map(
        (stored?.body.formData ?? []).map((f) => [f.id, f.fileContentBase64] as const),
    )
    if (!r.body.formData?.some((f) => f.valueType === "file" && !f.fileContentBase64 && storedFiles.get(f.id))) return r
    return {
        ...r,
        body: {
            ...r.body,
            formData: r.body.formData.map((f) =>
                f.valueType === "file" && !f.fileContentBase64 && storedFiles.get(f.id)
                    ? { ...f, fileContentBase64: storedFiles.get(f.id) }
                    : f,
            ),
        },
    }
}
