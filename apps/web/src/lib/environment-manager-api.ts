import { apiRequest } from "@/lib/backend-api"

const BASE = "/api/v1/environment-manager"

export type EnvSetEntryOut = {
    id: string
    encryptedData: string
    iv: string
    createdAt: number
    updatedAt: number
}

export type EnvSetEntryCreate = {
    encryptedData: string
    iv: string
    createdAt?: number
    updatedAt?: number
}

export type EnvSetEntryUpdate = {
    encryptedData: string
    iv: string
    updatedAt?: number
}

export async function listEnvSetEntries(): Promise<EnvSetEntryOut[]> {
    return apiRequest<EnvSetEntryOut[]>("GET", `${BASE}/entries`)
}

export async function createEnvSetEntry(body: EnvSetEntryCreate): Promise<EnvSetEntryOut> {
    return apiRequest<EnvSetEntryOut>("POST", `${BASE}/entries`, body)
}

export async function updateEnvSetEntry(
    entryId: string,
    body: EnvSetEntryUpdate
): Promise<EnvSetEntryOut> {
    return apiRequest<EnvSetEntryOut>(
        "PATCH",
        `${BASE}/entries/${encodeURIComponent(entryId)}`,
        body
    )
}

export async function deleteEnvSetEntry(entryId: string): Promise<void> {
    await apiRequest<unknown>("DELETE", `${BASE}/entries/${encodeURIComponent(entryId)}`)
}
