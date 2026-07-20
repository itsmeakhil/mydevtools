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
    /** Keyed pinned-tools map added in T24. Present on all responses after backend migration. */
    pinnedToolsByWorkspace?: Record<string, string[]>
    toolStats: Record<string, ToolStatOut>
    createdAt: number
    updatedAt: number
}

export type UserPreferencesPatch = {
    theme?: ThemePreference
    accentColor?: string
    locale?: string
    enabledTools?: string[]
    /** Legacy flat array — only accepted by backend for one-release compat. */
    toolFavorites?: string[]
    /** New keyed pinned-tools map (T24). Frontend sends this instead of toolFavorites. */
    pinnedToolsByWorkspace?: Record<string, string[]>
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

export type NosqlSavedQuery = {
    name: string
    query: string
}

export type NosqlSavedQueriesOut = {
    connectionName: string
    dbName: string
    collectionName: string
    queries: NosqlSavedQuery[]
    updatedAt: number
}

export async function getNosqlSavedQueries(params: {
    connectionName: string
    dbName: string
    collectionName: string
}): Promise<NosqlSavedQueriesOut> {
    const q = new URLSearchParams(params)
    return apiRequest<NosqlSavedQueriesOut>("GET", `${BASE}/nosql-saved-queries?${q.toString()}`)
}

export async function putNosqlSavedQueries(params: {
    connectionName: string
    dbName: string
    collectionName: string
    queries: NosqlSavedQuery[]
}): Promise<NosqlSavedQueriesOut> {
    return apiRequest<NosqlSavedQueriesOut>("PUT", `${BASE}/nosql-saved-queries`, params)
}

// ── SQL client — same generic list store, keyed by connection + database ────

export async function getSqlQueryHistory(params: {
    connectionName: string
    dbName: string
}): Promise<NosqlQueryHistoryOut> {
    const q = new URLSearchParams({ ...params, collectionName: "" })
    return apiRequest<NosqlQueryHistoryOut>("GET", `${BASE}/sql-query-history?${q.toString()}`)
}

export async function putSqlQueryHistory(params: {
    connectionName: string
    dbName: string
    queries: string[]
}): Promise<NosqlQueryHistoryOut> {
    return apiRequest<NosqlQueryHistoryOut>("PUT", `${BASE}/sql-query-history`, { ...params, collectionName: "" })
}

export async function getSqlSavedQueries(params: {
    connectionName: string
    dbName: string
}): Promise<NosqlSavedQueriesOut> {
    const q = new URLSearchParams({ ...params, collectionName: "" })
    return apiRequest<NosqlSavedQueriesOut>("GET", `${BASE}/sql-saved-queries?${q.toString()}`)
}

export async function putSqlSavedQueries(params: {
    connectionName: string
    dbName: string
    queries: NosqlSavedQuery[]
}): Promise<NosqlSavedQueriesOut> {
    return apiRequest<NosqlSavedQueriesOut>("PUT", `${BASE}/sql-saved-queries`, { ...params, collectionName: "" })
}
