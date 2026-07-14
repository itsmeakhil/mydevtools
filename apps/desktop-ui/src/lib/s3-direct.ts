/**
 * Direct-to-bucket S3 operations for the desktop app.
 *
 * Requests are SigV4-signed client-side with aws4fetch (query-signed URLs use
 * UNSIGNED-PAYLOAD, so bodies never need hashing) and executed through the
 * Rust `http_request` command — no CORS, no backend proxy.
 */
import { AwsClient } from "aws4fetch"
import { XMLParser } from "fast-xml-parser"
import type {
    BucketInfo,
    ListObjectsResponse,
    PresignedBatchItem,
    PresignedBatchResponse,
    PresignedUrlResponse,
    S3Credentials,
    S3ObjectItem,
} from "./s3-drive-api"

// ── Plumbing ──────────────────────────────────────────────────────────────────

const parser = new XMLParser({ parseTagValue: false })

type Envelope = {
    status: number
    statusText?: string
    headers?: Record<string, string>
    body?: string
    isBase64?: boolean
    error?: string
}

async function proxyRequest(input: {
    url: string
    method: string
    headers?: Record<string, string>
    body?: string | { mode: "base64"; data: string }
    timeoutMs?: number
}): Promise<Envelope> {
    const { invoke } = await import("@tauri-apps/api/core")
    const env = (await invoke("http_request", { input })) as Envelope
    if (env.error) throw new Error(env.error)
    return env
}

function b64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
}

function envText(env: Envelope): string {
    if (!env.body) return ""
    return env.isBase64 ? new TextDecoder().decode(b64ToBytes(env.body)) : env.body
}

function envHeader(env: Envelope, name: string): string {
    return env.headers?.[name] || env.headers?.[name.toLowerCase()] || ""
}

function s3ErrorFrom(env: Envelope): Error {
    let msg = `S3 request failed (HTTP ${env.status})`
    try {
        const err = parser.parse(envText(env))?.Error
        if (err?.Message) msg = err.Code ? `${err.Code}: ${err.Message}` : String(err.Message)
    } catch {
        /* keep default message */
    }
    return new Error(msg)
}

/** Execute a request through the Rust proxy, throwing on non-2xx. */
async function s3Request(input: Parameters<typeof proxyRequest>[0]): Promise<Envelope> {
    const env = await proxyRequest(input)
    if (env.status < 200 || env.status >= 300) throw s3ErrorFrom(env)
    return env
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
    return v == null ? [] : Array.isArray(v) ? v : [v]
}

// ── URL building / signing ────────────────────────────────────────────────────

function client(c: S3Credentials): AwsClient {
    return new AwsClient({
        accessKeyId: c.accessKey,
        secretAccessKey: c.secretKey,
        region: c.region,
        service: "s3",
    })
}

function normalizedEndpoint(endpoint: string): string {
    const e = endpoint.replace(/\/+$/, "")
    return /^https?:\/\//i.test(e) ? e : `https://${e}`
}

/** Encode an object key per path segment, preserving "/" separators. */
function encodeKey(key: string): string {
    return key.split("/").map(encodeURIComponent).join("/")
}

/** Service root: custom endpoint as-is, or the regional AWS S3 endpoint. */
function serviceUrl(c: S3Credentials): string {
    return c.endpoint ? normalizedEndpoint(c.endpoint) : `https://s3.${c.region}.amazonaws.com`
}

/** Object URL: virtual-host style for AWS, path-style for custom endpoints. */
function objectUrl(c: S3Credentials, key = ""): URL {
    const base = c.endpoint
        ? `${normalizedEndpoint(c.endpoint)}/${c.bucket}`
        : `https://${c.bucket}.s3.${c.region}.amazonaws.com`
    return new URL(`${base}/${encodeKey(key)}`)
}

/** SigV4 query-signed URL (UNSIGNED-PAYLOAD) — usable as a plain URL. */
async function presign(c: S3Credentials, method: string, url: URL, expiresIn = 3600): Promise<string> {
    url.searchParams.set("X-Amz-Expires", String(expiresIn))
    const signed = await client(c).sign(url.toString(), { method, aws: { signQuery: true } })
    return signed.url
}

// ── Operations ────────────────────────────────────────────────────────────────

export async function listBuckets(credentials: S3Credentials): Promise<BucketInfo[]> {
    const url = await presign(credentials, "GET", new URL(`${serviceUrl(credentials)}/`))
    const env = await s3Request({ url, method: "GET" })
    const result = parser.parse(envText(env))?.ListAllMyBucketsResult
    return toArray<{ Name?: string; CreationDate?: string }>(result?.Buckets?.Bucket).map((b) => ({
        name: String(b.Name ?? ""),
        creationDate: b.CreationDate ? String(b.CreationDate) : undefined,
    }))
}

export async function listObjects(
    credentials: S3Credentials,
    prefix = "",
    continuationToken?: string,
    delimiter = "/",
): Promise<ListObjectsResponse> {
    const url = objectUrl(credentials)
    url.searchParams.set("list-type", "2")
    if (prefix) url.searchParams.set("prefix", prefix)
    if (delimiter) url.searchParams.set("delimiter", delimiter)
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken)

    const env = await s3Request({ url: await presign(credentials, "GET", url), method: "GET" })
    const r = parser.parse(envText(env))?.ListBucketResult ?? {}

    type Contents = { Key?: string; Size?: string; LastModified?: string; ETag?: string }
    const objects: S3ObjectItem[] = toArray<Contents>(r.Contents).map((c) => {
        const key = String(c.Key ?? "")
        return {
            key,
            size: c.Size != null ? Number(c.Size) : undefined,
            lastModified: c.LastModified ? String(c.LastModified) : undefined,
            etag: c.ETag ? String(c.ETag).replace(/"/g, "") : undefined,
            isFolder: key.endsWith("/"),
        }
    })
    return {
        objects,
        prefixes: toArray<{ Prefix?: string }>(r.CommonPrefixes).map((p) => String(p.Prefix ?? "")),
        isTruncated: r.IsTruncated === "true" || r.IsTruncated === true,
        nextContinuationToken: r.NextContinuationToken ? String(r.NextContinuationToken) : undefined,
    }
}

export async function deleteObjects(credentials: S3Credentials, keys: string[]): Promise<{ deleted: number }> {
    // ponytail: per-key DELETE loop instead of POST ?delete multi-object XML
    // (that needs a signed Content-MD5 header); switch if large batches get slow.
    const CONCURRENCY = 8
    let deleted = 0
    let firstError: unknown = null
    for (let i = 0; i < keys.length; i += CONCURRENCY) {
        const batch = keys.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
            batch.map(async (key) => {
                const url = await presign(credentials, "DELETE", objectUrl(credentials, key))
                await s3Request({ url, method: "DELETE" })
            }),
        )
        for (const res of results) {
            if (res.status === "fulfilled") deleted++
            else if (!firstError) firstError = res.reason
        }
    }
    if (firstError && deleted < keys.length) {
        throw firstError instanceof Error ? firstError : new Error("Failed to delete some objects")
    }
    return { deleted }
}

export async function createFolder(credentials: S3Credentials, prefix: string): Promise<{ key: string }> {
    const key = prefix.endsWith("/") ? prefix : `${prefix}/`
    const url = await presign(credentials, "PUT", objectUrl(credentials, key))
    await s3Request({ url, method: "PUT", body: "" })
    return { key }
}

export async function moveObject(
    credentials: S3Credentials,
    sourceKey: string,
    destinationKey: string,
): Promise<{ sourceKey: string; destinationKey: string }> {
    // CopyObject needs x-amz-copy-source signed as a header (query signing
    // doesn't cover request headers), so header-sign this one request.
    const signed = await client(credentials).sign(objectUrl(credentials, destinationKey).toString(), {
        method: "PUT",
        headers: { "x-amz-copy-source": `/${credentials.bucket}/${encodeKey(sourceKey)}` },
    })
    const headers: Record<string, string> = {}
    signed.headers.forEach((v, k) => {
        headers[k] = v
    })
    const env = await s3Request({ url: signed.url, method: "PUT", headers })
    // CopyObject can return 200 with an <Error> body — check before deleting the source.
    const parsed = parser.parse(envText(env))
    if (parsed?.Error) throw s3ErrorFrom(env)

    const delUrl = await presign(credentials, "DELETE", objectUrl(credentials, sourceKey))
    await s3Request({ url: delUrl, method: "DELETE" })
    return { sourceKey, destinationKey }
}

export async function getPresignedDownloadUrl(
    credentials: S3Credentials,
    key: string,
    expiresIn = 3600,
): Promise<PresignedUrlResponse> {
    return { url: await presign(credentials, "GET", objectUrl(credentials, key), expiresIn), key }
}

export async function getPresignedUploadUrl(
    credentials: S3Credentials,
    key: string,
    // Content-Type isn't part of the signature (only "host" is signed), so any
    // content type may be sent with the resulting URL.
    _contentType = "application/octet-stream",
): Promise<PresignedUrlResponse> {
    return { url: await presign(credentials, "PUT", objectUrl(credentials, key)), key }
}

export async function getPresignedBatch(
    credentials: S3Credentials,
    items: PresignedBatchItem[],
    expiresIn = 3600,
): Promise<PresignedBatchResponse> {
    const urls = await Promise.all(
        items.map(async (item) => ({
            key: item.key,
            url: await presign(credentials, item.op === "put" ? "PUT" : "GET", objectUrl(credentials, item.key), expiresIn),
        })),
    )
    return { urls }
}

// ── Transfer helpers (Rust proxy avoids webview CORS on fetch/XHR) ────────────

/** Download an object through the Rust proxy and return it as a Blob. */
export async function getObjectBlob(
    credentials: S3Credentials,
    key: string,
    opts?: { headers?: Record<string, string> },
): Promise<Blob> {
    // ponytail: whole body buffers in memory as base64 — fine for browsing-sized
    // files; stream to disk via a Rust command if multi-GB downloads matter.
    const url = await presign(credentials, "GET", objectUrl(credentials, key))
    const env = await s3Request({ url, method: "GET", headers: opts?.headers })
    const type = envHeader(env, "content-type") || "application/octet-stream"
    if (!env.body) return new Blob([], { type })
    return env.isBase64
        ? new Blob([b64ToBytes(env.body) as BlobPart], { type })
        : new Blob([env.body], { type })
}

/** Upload a File through the Rust proxy (base64 body, presigned PUT URL). */
export async function uploadFile(
    credentials: S3Credentials,
    key: string,
    file: File,
    onProgress?: (p: number) => void,
): Promise<void> {
    const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(",", 2)[1] ?? "")
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"))
        reader.readAsDataURL(file)
    })
    // ponytail: invoke() has no streaming progress — report a single midpoint
    // tick; wire real progress via a Rust upload command if it matters.
    onProgress?.(0.5)
    const url = await presign(credentials, "PUT", objectUrl(credentials, key))
    await s3Request({
        url,
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: { mode: "base64", data },
    })
    onProgress?.(1)
}
