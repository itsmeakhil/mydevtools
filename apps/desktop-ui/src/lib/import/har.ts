/**
 * HAR (HTTP Archive 1.2) import — turns a browser-recorded session into a
 * collection of requests. Auth-header conversion is deliberately minimal:
 * Authorization headers come across as plain headers, not parsed back into
 * RequestAuth, because HAR sees the wire form (no scheme distinction).
 */

import type {
    Collection,
    CollectionRequest,
    KeyValueItem,
    RequestBody,
    RequestMethod,
} from "@/components/api-client/types"

interface HarFile {
    log?: {
        version?: string
        creator?: { name?: string; version?: string }
        entries?: HarEntry[]
    }
}

interface HarEntry {
    request?: HarRequest
    response?: HarResponse
    time?: number
    startedDateTime?: string
}

interface HarRequest {
    method?: string
    url?: string
    headers?: Array<{ name: string; value: string }>
    queryString?: Array<{ name: string; value: string }>
    postData?: {
        mimeType?: string
        text?: string
        params?: Array<{ name: string; value?: string; fileName?: string }>
    }
}

interface HarResponse { status?: number; statusText?: string }

const VALID_METHODS = new Set<RequestMethod>([
    "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS",
])

function id(): string { return crypto.randomUUID() }

function kvFromHarHeaders(items: Array<{ name: string; value: string }> | undefined): KeyValueItem[] {
    return (items ?? []).map((h) => ({
        id: id(),
        key: h.name,
        value: h.value,
        active: true,
    }))
}

function harBody(pd: HarRequest["postData"]): RequestBody {
    if (!pd) return { type: "none", content: "" }
    const mime = (pd.mimeType ?? "").toLowerCase()

    if (mime.includes("application/x-www-form-urlencoded") && pd.params) {
        return {
            type: "x-www-form-urlencoded",
            content: "",
            urlEncoded: pd.params.map((p) => ({
                id: id(),
                key: p.name,
                value: p.value ?? "",
                active: true,
            })),
        }
    }
    if (mime.includes("multipart/form-data") && pd.params) {
        return {
            type: "form-data",
            content: "",
            formData: pd.params.map((p) => ({
                id: id(),
                key: p.name,
                value: p.value ?? "",
                active: true,
                valueType: p.fileName ? "file" : "text",
                fileName: p.fileName,
            })),
        }
    }
    if (mime.includes("json")) {
        return { type: "json", content: pd.text ?? "" }
    }
    return { type: "text", content: pd.text ?? "" }
}

function convertEntry(entry: HarEntry): CollectionRequest | null {
    const r = entry.request
    if (!r || !r.url) return null
    const method = (r.method ?? "GET").toUpperCase() as RequestMethod
    const safeMethod: RequestMethod = VALID_METHODS.has(method) ? method : "GET"
    return {
        id: id(),
        name: `${safeMethod} ${r.url}`,
        method: safeMethod,
        url: r.url,
        params: (r.queryString ?? []).map((q) => ({
            id: id(),
            key: q.name,
            value: q.value,
            active: true,
        })),
        headers: kvFromHarHeaders(r.headers),
        body: harBody(r.postData),
        auth: { type: "none" },
    }
}

export function importHar(raw: string | unknown): Collection {
    const data: HarFile = typeof raw === "string" ? JSON.parse(raw) : (raw as HarFile)
    const entries = data?.log?.entries
    if (!Array.isArray(entries)) {
        throw new Error("Not a HAR file (log.entries missing)")
    }
    const items = entries.map(convertEntry).filter((x): x is CollectionRequest => x !== null)
    const creator = data.log?.creator?.name
    return {
        id: id(),
        name: creator ? `HAR from ${creator}` : "Imported HAR",
        items,
    }
}
