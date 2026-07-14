import { apiRequest } from "@/lib/backend-api"

const BASE = "/api/v1/s3-drive"

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

// ── Connection CRUD ───────────────────────────────────────────────────────────

export async function listConnections(): Promise<S3ConnectionOut[]> {
    return apiRequest<S3ConnectionOut[]>("GET", `${BASE}/connections`)
}

export async function createConnection(body: S3ConnectionCreate): Promise<S3ConnectionOut> {
    return apiRequest<S3ConnectionOut>("POST", `${BASE}/connections`, body)
}

export async function getConnection(connId: string): Promise<S3ConnectionOut> {
    return apiRequest<S3ConnectionOut>("GET", `${BASE}/connections/${encodeURIComponent(connId)}`)
}

export async function updateConnection(connId: string, body: S3ConnectionUpdate): Promise<S3ConnectionOut> {
    return apiRequest<S3ConnectionOut>("PATCH", `${BASE}/connections/${encodeURIComponent(connId)}`, body)
}

export async function deleteConnection(connId: string): Promise<void> {
    await apiRequest<unknown>("DELETE", `${BASE}/connections/${encodeURIComponent(connId)}`)
}

// ── S3 operations ─────────────────────────────────────────────────────────────
// Direct-to-bucket requests signed client-side and executed through the Rust
// HTTP proxy — see src/lib/s3-direct.ts. Same signatures as the old
// backend-proxied versions, so call sites are unchanged.

export type PresignedBatchItem = { key: string; op?: "get" | "put"; contentType?: string }
export type PresignedBatchResponse = { urls: PresignedUrlResponse[] }

export {
    listBuckets,
    listObjects,
    deleteObjects,
    createFolder,
    moveObject,
    getPresignedDownloadUrl,
    getPresignedUploadUrl,
    getPresignedBatch,
} from "./s3-direct"
