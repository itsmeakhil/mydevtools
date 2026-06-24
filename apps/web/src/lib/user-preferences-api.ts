import { apiRequest } from "@/lib/backend-api"

const BASE = "/api/v1/user-preferences"

export type ThemePreference = "light" | "dark" | "system"

export type ToolStatOut = {
    usageCount: number
    lastUsed: string
}

export type UserPreferencesOut = {
    theme: ThemePreference
    accentColor: string
    locale: string
    enabledTools: string[]
    toolFavorites: string[]
    toolStats: Record<string, ToolStatOut>
    createdAt: number
    updatedAt: number
}

export type UserPreferencesPatch = {
    theme?: ThemePreference
    accentColor?: string
    locale?: string
    enabledTools?: string[]
    toolFavorites?: string[]
    toolStats?: Record<string, ToolStatOut>
}

export type NosqlQueryHistoryOut = {
    connectionName: string
    dbName: string
    collectionName: string
    queries: string[]
    updatedAt: number
}

export async function getUserPreferences(): Promise<UserPreferencesOut> {
    return apiRequest<UserPreferencesOut>("GET", BASE)
}

export async function patchUserPreferences(body: UserPreferencesPatch): Promise<UserPreferencesOut> {
    return apiRequest<UserPreferencesOut>("PATCH", BASE, body)
}

export async function trackToolUsageApi(toolId: string): Promise<void> {
    await apiRequest<{ ok: boolean }>("POST", `${BASE}/tool-usage`, { toolId })
}

export async function getNosqlQueryHistory(params: {
    connectionName: string
    dbName: string
    collectionName: string
}): Promise<NosqlQueryHistoryOut> {
    const q = new URLSearchParams({
        connectionName: params.connectionName,
        dbName: params.dbName,
        collectionName: params.collectionName,
    })
    return apiRequest<NosqlQueryHistoryOut>("GET", `${BASE}/nosql-query-history?${q.toString()}`)
}

export async function putNosqlQueryHistory(params: {
    connectionName: string
    dbName: string
    collectionName: string
    queries: string[]
}): Promise<NosqlQueryHistoryOut> {
    return apiRequest<NosqlQueryHistoryOut>("PUT", `${BASE}/nosql-query-history`, params)
}
