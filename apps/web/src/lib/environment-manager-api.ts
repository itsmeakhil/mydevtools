const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000"

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
    if (!proxyData.body) {
        return { status: proxyData.status, data: null }
    }
    try {
        return { status: proxyData.status, data: JSON.parse(proxyData.body) as T }
    } catch {
        return { status: proxyData.status, data: proxyData.body as unknown as T }
    }
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

async function envManagerRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const { status, data } = await proxyJson<T>(method, path, body)
    if (status < 200 || status >= 300) {
        throw new Error(backendErrorMessage(data))
    }
    return data as T
}

export async function listEnvSetEntries(): Promise<EnvSetEntryOut[]> {
    return envManagerRequest<EnvSetEntryOut[]>("GET", `${BASE}/entries`)
}

export async function createEnvSetEntry(body: EnvSetEntryCreate): Promise<EnvSetEntryOut> {
    return envManagerRequest<EnvSetEntryOut>("POST", `${BASE}/entries`, body)
}

export async function updateEnvSetEntry(
    entryId: string,
    body: EnvSetEntryUpdate
): Promise<EnvSetEntryOut> {
    return envManagerRequest<EnvSetEntryOut>(
        "PATCH",
        `${BASE}/entries/${encodeURIComponent(entryId)}`,
        body
    )
}

export async function deleteEnvSetEntry(entryId: string): Promise<void> {
    await envManagerRequest<unknown>("DELETE", `${BASE}/entries/${encodeURIComponent(entryId)}`)
}
