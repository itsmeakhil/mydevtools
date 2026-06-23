import { proxyJsonAuthed } from "@/lib/backend-auth"

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000"

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

async function userPrefsRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await proxyJsonAuthed<T>(BACKEND_BASE_URL, method, path, body)
    if (status < 200 || status >= 300) {
        throw new Error(backendErrorMessage(data))
    }
    if (data === null || data === undefined) {
        throw new Error(`Empty response body from ${path} (status ${status})`)
    }
    return data as T
}

export async function getUserPreferences(): Promise<UserPreferencesOut> {
    return userPrefsRequest<UserPreferencesOut>("GET", BASE)
}

export async function patchUserPreferences(body: UserPreferencesPatch): Promise<UserPreferencesOut> {
    return userPrefsRequest<UserPreferencesOut>("PATCH", BASE, body)
}

export async function trackToolUsageApi(toolId: string): Promise<void> {
    await userPrefsRequest<{ ok: boolean }>("POST", `${BASE}/tool-usage`, { toolId })
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
    return userPrefsRequest<NosqlQueryHistoryOut>("GET", `${BASE}/nosql-query-history?${q.toString()}`)
}

export async function putNosqlQueryHistory(params: {
    connectionName: string
    dbName: string
    collectionName: string
    queries: string[]
}): Promise<NosqlQueryHistoryOut> {
    return userPrefsRequest<NosqlQueryHistoryOut>("PUT", `${BASE}/nosql-query-history`, params)
}
