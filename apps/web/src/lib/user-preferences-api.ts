import { auth } from "@/database/firebase"
import { BACKEND_AUTH_REFRESH_PATH, ensureBackendSession } from "@/lib/backend-auth"

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

async function syncApiSessionIfNeeded(): Promise<void> {
    const u = auth.currentUser
    if (u) await ensureBackendSession(u)
}

async function proxyJson<T>(
    method: string,
    path: string,
    body?: unknown
): Promise<{ status: number; data: T | null }> {
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
        body: JSON.stringify({
            url,
            method,
            headers: headersObj,
            body: proxyBody,
        }),
    })

    const proxyData = (await proxyRes.json()) as ProxyResponse
    const rawBody = proxyData.body
    if (rawBody === undefined || rawBody === null || rawBody === "") {
        return { status: proxyData.status, data: null }
    }
    try {
        return { status: proxyData.status, data: JSON.parse(rawBody) as T }
    } catch {
        return { status: proxyData.status, data: rawBody as unknown as T }
    }
}

/** Ensures JWT cookies exist, then proxies. Retries after refresh or Firebase re-exchange on 401. */
async function proxyJsonAuthed<T>(
    method: string,
    path: string,
    body?: unknown
): Promise<{ status: number; data: T | null }> {
    await syncApiSessionIfNeeded()
    let result = await proxyJson<T>(method, path, body)
    if (result.status === 401) {
        const refr = await fetch(BACKEND_AUTH_REFRESH_PATH, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
        })
        if (refr.ok) {
            result = await proxyJson<T>(method, path, body)
        }
    }
    if (result.status === 401) {
        await syncApiSessionIfNeeded()
        result = await proxyJson<T>(method, path, body)
    }
    return result
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
    const { status, data } = await proxyJsonAuthed<T>(method, path, body)
    if (status < 200 || status >= 300) {
        throw new Error(backendErrorMessage(data))
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
