const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000"

const BASE = "/api/v1/s3-drive"

// ── Types ─────────────────────────────────────────────────────────────────────

export type S3Provider = "aws" | "digitalocean" | "custom"

export type S3ConnectionOut = {
    id: string
    name: string
    provider: S3Provider
    encryptedData: string
    iv: string
    createdAt: number
    updatedAt: number
}

export type S3ConnectionCreate = {
    name: string
    provider: S3Provider
    encryptedData: string
    iv: string
    createdAt?: number
}

export type S3ConnectionUpdate = {
    name?: string
    provider?: S3Provider
    encryptedData?: string
    iv?: string
    updatedAt?: number
}

export type S3Credentials = {
    accessKey: string
    secretKey: string
    region: string
    bucket: string
    endpoint?: string
}

export type S3ObjectItem = {
    key: string
    size?: number
    lastModified?: string
    etag?: string
    isFolder: boolean
}

export type ListObjectsResponse = {
    objects: S3ObjectItem[]
    prefixes: string[]
    isTruncated: boolean
    nextContinuationToken?: string
}

export type PresignedUrlResponse = {
    url: string
    key: string
}

export type BucketInfo = {
    name: string
    creationDate?: string
}

// ── Proxy helper ──────────────────────────────────────────────────────────────

type ProxyResponse = {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    isBase64?: boolean
    time: number
    size: number
    error?: string
}

async function proxyJson<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
    const url = new URL(path, BACKEND_BASE_URL).toString()
    const headersObj: Record<string, string> = {}
    const proxyBody = body !== undefined ? JSON.stringify(body) : undefined
    if (proxyBody !== undefined && method !== "GET" && method !== "HEAD") {
        headersObj["Content-Type"] = "application/json"
    }
    const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method, headers: headersObj, body: proxyBody }),
    })
    const proxyData = (await proxyRes.json()) as ProxyResponse
    if (!proxyData.body) return { status: proxyData.status, data: null }
    try {
        return { status: proxyData.status, data: JSON.parse(proxyData.body) as T }
    } catch {
        return { status: proxyData.status, data: proxyData.body as unknown as T }
    }
}

function extractError(data: unknown): string {
    if (typeof data === "string" && data.trim()) return data
    if (data && typeof data === "object" && "detail" in data) {
        const d = (data as { detail: unknown }).detail
        if (typeof d === "string") return d
        try { return JSON.stringify(d) } catch { return "Request failed" }
    }
    return "Request failed"
}

async function s3Request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await proxyJson<T>(method, path, body)
    if (status < 200 || status >= 300) throw new Error(extractError(data))
    return data as T
}

// ── Connection CRUD ───────────────────────────────────────────────────────────

export async function listConnections(): Promise<S3ConnectionOut[]> {
    return s3Request<S3ConnectionOut[]>("GET", `${BASE}/connections`)
}

export async function createConnection(body: S3ConnectionCreate): Promise<S3ConnectionOut> {
    return s3Request<S3ConnectionOut>("POST", `${BASE}/connections`, body)
}

export async function getConnection(connId: string): Promise<S3ConnectionOut> {
    return s3Request<S3ConnectionOut>("GET", `${BASE}/connections/${encodeURIComponent(connId)}`)
}

export async function updateConnection(connId: string, body: S3ConnectionUpdate): Promise<S3ConnectionOut> {
    return s3Request<S3ConnectionOut>("PATCH", `${BASE}/connections/${encodeURIComponent(connId)}`, body)
}

export async function deleteConnection(connId: string): Promise<void> {
    await s3Request<unknown>("DELETE", `${BASE}/connections/${encodeURIComponent(connId)}`)
}

// ── S3 operations ─────────────────────────────────────────────────────────────

export async function listBuckets(credentials: S3Credentials): Promise<BucketInfo[]> {
    return s3Request<BucketInfo[]>("POST", `${BASE}/operations/buckets`, { credentials })
}

export async function listObjects(
    credentials: S3Credentials,
    prefix = "",
    continuationToken?: string,
    delimiter = "/",
): Promise<ListObjectsResponse> {
    return s3Request<ListObjectsResponse>("POST", `${BASE}/operations/list`, {
        credentials,
        prefix,
        continuationToken,
        delimiter,
    })
}

export async function deleteObjects(credentials: S3Credentials, keys: string[]): Promise<{ deleted: number }> {
    return s3Request<{ deleted: number }>("POST", `${BASE}/operations/delete`, { credentials, keys })
}

export async function createFolder(credentials: S3Credentials, prefix: string): Promise<{ key: string }> {
    return s3Request<{ key: string }>("POST", `${BASE}/operations/create-folder`, { credentials, prefix })
}

export async function getPresignedDownloadUrl(credentials: S3Credentials, key: string, expiresIn = 3600): Promise<PresignedUrlResponse> {
    return s3Request<PresignedUrlResponse>("POST", `${BASE}/operations/presigned-download`, { credentials, key, expiresIn })
}

export async function getPresignedUploadUrl(
    credentials: S3Credentials,
    key: string,
    contentType = "application/octet-stream",
): Promise<PresignedUrlResponse> {
    return s3Request<PresignedUrlResponse>("POST", `${BASE}/operations/presigned-upload`, { credentials, key, contentType })
}

export async function moveObject(
    credentials: S3Credentials,
    sourceKey: string,
    destinationKey: string,
): Promise<{ sourceKey: string; destinationKey: string }> {
    return s3Request("POST", `${BASE}/operations/move`, { credentials, sourceKey, destinationKey })
}

export async function configureBucketCors(
    credentials: S3Credentials,
    allowedOrigins: string[] = ["*"],
): Promise<{ bucket: string; status: string }> {
    return s3Request("POST", `${BASE}/operations/configure-cors`, { credentials, allowedOrigins })
}
