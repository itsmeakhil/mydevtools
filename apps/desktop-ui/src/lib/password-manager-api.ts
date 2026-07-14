import { apiRequest } from "@/lib/backend-api"

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
    return apiRequest<PasswordEntryOut[]>("GET", path)
}

export async function createPasswordEntry(body: PasswordEntryCreate): Promise<PasswordEntryOut> {
    return apiRequest<PasswordEntryOut>("POST", `${BASE}/entries`, body)
}

export async function updatePasswordEntry(
    entryId: string,
    body: PasswordEntryUpdate
): Promise<PasswordEntryOut> {
    return apiRequest<PasswordEntryOut>("PATCH", `${BASE}/entries/${encodeURIComponent(entryId)}`, body)
}

export async function deletePasswordEntry(entryId: string): Promise<void> {
    await apiRequest<unknown>("DELETE", `${BASE}/entries/${encodeURIComponent(entryId)}`)
}
