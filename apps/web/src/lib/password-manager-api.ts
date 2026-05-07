import { proxyJsonAuthed } from "@/lib/backend-auth"

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000"

const BASE = "/api/v1/password-manager"

export type PasswordEntryOut = {
    id: string
    encryptedData: string
    iv: string
    createdAt: number
    updatedAt: number
}

export type PasswordEntryCreate = {
    encryptedData: string
    iv: string
    createdAt?: number
    updatedAt?: number
}

export type PasswordEntryUpdate = {
    encryptedData: string
    iv: string
    updatedAt?: number
}

function backendErrorMessage(data: unknown): string {
    if (typeof data === "string" && data.trim()) return data
    if (data && typeof data === "object" && "detail" in data) {
        const d = (data as { detail: unknown }).detail
        if (typeof d === "string") return d
        try {
            return JSON.stringify(d)
        } catch {
            return "Request failed"
        }
    }
    return "Request failed"
}

async function passwordManagerRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body)
    if (status < 200 || status >= 300) {
        throw new Error(backendErrorMessage(data))
    }
    return data as T
}

export async function listPasswordEntries({
    skip,
    limit,
}: {
    skip?: number
    limit?: number
} = {}): Promise<PasswordEntryOut[]> {
    const params = new URLSearchParams()
    if (typeof skip === "number" && Number.isFinite(skip) && skip >= 0) {
        params.set("offset", String(Math.floor(skip)))
    }
    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
        params.set("limit", String(Math.floor(limit)))
    }
    const qs = params.toString()
    const path = qs ? `${BASE}/entries?${qs}` : `${BASE}/entries`
    return passwordManagerRequest<PasswordEntryOut[]>("GET", path)
}

export async function createPasswordEntry(body: PasswordEntryCreate): Promise<PasswordEntryOut> {
    return passwordManagerRequest<PasswordEntryOut>("POST", `${BASE}/entries`, body)
}

export async function updatePasswordEntry(
    entryId: string,
    body: PasswordEntryUpdate
): Promise<PasswordEntryOut> {
    return passwordManagerRequest<PasswordEntryOut>("PATCH", `${BASE}/entries/${encodeURIComponent(entryId)}`, body)
}

export async function deletePasswordEntry(entryId: string): Promise<void> {
    await passwordManagerRequest<unknown>("DELETE", `${BASE}/entries/${encodeURIComponent(entryId)}`)
}
