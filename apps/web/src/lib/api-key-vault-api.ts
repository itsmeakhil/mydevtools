import { apiRequest } from "@/lib/backend-api"

const BASE = "/api/v1/api-keys"

export type ApiKeyEntryOut = {
    id: string
    encryptedData: string
    iv: string
    createdAt: number
    updatedAt: number
}

export type ApiKeyEntryCreate = {
    encryptedData: string
    iv: string
    createdAt?: number
    updatedAt?: number
}

export type ApiKeyEntryUpdate = {
    encryptedData: string
    iv: string
    updatedAt?: number
}

export async function listApiKeyEntries(): Promise<ApiKeyEntryOut[]> {
    return apiRequest<ApiKeyEntryOut[]>("GET", `${BASE}/entries`)
}

export async function createApiKeyEntry(body: ApiKeyEntryCreate): Promise<ApiKeyEntryOut> {
    return apiRequest<ApiKeyEntryOut>("POST", `${BASE}/entries`, body)
}

export async function updateApiKeyEntry(
    entryId: string,
    body: ApiKeyEntryUpdate
): Promise<ApiKeyEntryOut> {
    return apiRequest<ApiKeyEntryOut>(
        "PATCH",
        `${BASE}/entries/${encodeURIComponent(entryId)}`,
        body
    )
}

export async function deleteApiKeyEntry(entryId: string): Promise<void> {
    await apiRequest<unknown>("DELETE", `${BASE}/entries/${encodeURIComponent(entryId)}`)
}
