import type { User } from "firebase/auth"
import { auth } from "@/database/firebase"
import { dedupe } from "@/lib/auth-inflight"

/** Same-origin refresh endpoint (used by fetch helpers). */
export const BACKEND_AUTH_REFRESH_PATH = "/api/backend/auth/refresh"

/**
 * Exchange Firebase ID token for HttpOnly API cookies (call once after Firebase sign-in).
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readErrorMessage(res: Response): Promise<string> {
    const contentType = res.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
        const json = await res.json().catch(() => null)
        if (json && typeof json === "object") {
            const detail = (json as { detail?: unknown; error?: unknown }).detail
            if (typeof detail === "string" && detail.trim()) return detail
            const error = (json as { detail?: unknown; error?: unknown }).error
            if (typeof error === "string" && error.trim()) return error
        }
    }
    const text = await res.text().catch(() => "")
    return text.trim()
}

export async function establishBackendSession(
    idToken: string,
    opts: {
        maxAttempts?: number
        getFreshIdToken?: () => Promise<string>
        checkRevoked?: boolean
    } = {}
): Promise<void> {
    const maxAttempts = Math.max(1, opts.maxAttempts ?? 3)
    const checkRevoked = opts.checkRevoked ?? false
    return dedupe(`session:${checkRevoked ? "revoked" : "fast"}`, async () => {
        let token = idToken
        let lastError: Error | null = null
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const res = await fetch("/api/backend/auth/session", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id_token: token, check_revoked: checkRevoked }),
                    cache: "no-store",
                })

                if (res.ok) return

                const retriable = res.status === 429 || res.status >= 500
                const msg = await readErrorMessage(res)
                lastError = new Error(msg || `Session exchange failed (${res.status})`)

                if (!retriable || attempt === maxAttempts) {
                    throw lastError
                }
            } catch (e) {
                lastError = e instanceof Error ? e : new Error("Session exchange failed")
                if (attempt === maxAttempts) throw lastError
            }

            if (opts.getFreshIdToken) {
                try {
                    token = await opts.getFreshIdToken()
                } catch {
                    // keep the existing token for the next attempt
                }
            }
            await sleep(250 * attempt)
        }
    })
}

/**
 * If JWT cookies are missing or expired but Firebase session exists, re-run the Firebase exchange.
 */
export async function ensureBackendSession(user: User): Promise<void> {
    const ok = await dedupe("session-check", async () => {
        let check = await fetch("/api/backend/auth/session/check", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
        })
        if (check.ok) return true
        if (check.status >= 500) {
            await sleep(200)
            check = await fetch("/api/backend/auth/session/check", {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            })
            if (check.ok) return true
        }
        return false
    })
    if (ok) return

    const idToken = await user.getIdToken()
    await establishBackendSession(idToken, {
        maxAttempts: 3,
        getFreshIdToken: () => user.getIdToken(true),
        checkRevoked: false,
    })
}

export async function logoutBackendSession(): Promise<void> {
    await fetch("/api/backend/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
    })
}

/**
 * Dispatch a force-logout event without importing from logout-user (avoids circular dep).
 * The AuthLogoutListener picks this up and redirects to /login.
 */
function forceLogout(reason: "session-expired" | "unauthorized"): void {
    if (typeof window === "undefined") return
    window.dispatchEvent(
        new CustomEvent("mydevtools:force-logout", { detail: { reason } })
    )
}

// ── Shared proxy helper (used by feature API libs) ─────────────────────────

export type ProxyResponse = {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    isBase64?: boolean
    time: number
    size: number
    error?: string
}

/**
 * Parse a `/api/proxy` Response into a ProxyResponse envelope.
 * Throws a clear error when the proxy itself failed (e.g. dev pipe-lock 500
 * with empty body), instead of letting `Response.json()` blow up with
 * "Unexpected end of JSON input" and surface as unhandledRejection.
 */
export async function parseProxyResponse(res: Response): Promise<ProxyResponse> {
    const text = await res.text().catch(() => "")
    if (!res.ok && !text) {
        throw new Error(`Proxy request failed: ${res.status} ${res.statusText || ""}`.trim())
    }
    try {
        return JSON.parse(text) as ProxyResponse
    } catch {
        throw new Error(`Proxy returned non-JSON response (status ${res.status})`)
    }
}

async function rawProxyJson<T>(
    backendBaseUrl: string,
    method: string,
    path: string,
    body?: unknown
): Promise<{ status: number; data: T | null }> {
    const url = new URL(path, backendBaseUrl).toString()
    const headersObj: Record<string, string> = {}
    const proxyBody = body !== undefined ? JSON.stringify(body) : undefined
    if (proxyBody !== undefined && method !== "GET" && method !== "HEAD") {
        headersObj["Content-Type"] = "application/json"
    }
    const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method, headers: headersObj, body: proxyBody }),
    })
    const proxyData = await parseProxyResponse(proxyRes)
    if (!proxyData.body) return { status: proxyData.status, data: null }
    try {
        return { status: proxyData.status, data: JSON.parse(proxyData.body) as T }
    } catch {
        return { status: proxyData.status, data: proxyData.body as unknown as T }
    }
}

/**
 * Authenticated proxy call to the backend via `/api/proxy`.
 * On 401: tries token refresh, then Firebase session re-exchange.
 * On persistent 401/403: dispatches force-logout.
 */
export async function proxyJsonAuthed<T>(
    backendBaseUrl: string,
    method: string,
    path: string,
    body?: unknown
): Promise<{ status: number; data: T | null }> {
    let result = await rawProxyJson<T>(backendBaseUrl, method, path, body)

    if (result.status === 401) {
        const refr = await dedupe("refresh", async () =>
            fetch(BACKEND_AUTH_REFRESH_PATH, {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            })
        )
        if (refr.ok) {
            result = await rawProxyJson<T>(backendBaseUrl, method, path, body)
        }
    }

    if (result.status === 401) {
        const u2 = auth.currentUser
        if (u2) {
            try {
                await ensureBackendSession(u2)
            } catch {
                // Silent re-exchange failed — fall through to forceLogout below.
            }
        }
        result = await rawProxyJson<T>(backendBaseUrl, method, path, body)
    }

    if (result.status === 401 || result.status === 403) {
        forceLogout(result.status === 403 ? "unauthorized" : "session-expired")
    }

    return result
}

// ── /api/backend/... fetch helper ──────────────────────────────────────────

/**
 * Same-origin fetch to `/api/backend/...` with cookies; refreshes access token on 401 once.
 * Triggers a force-logout if the session cannot be recovered (persistent 401 or 403).
 */
export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
    const run = () =>
        fetch(path, {
            ...init,
            credentials: "include",
            cache: "no-store",
        })

    let res = await run()

    if (res.status === 401) {
        const refr = await dedupe("refresh", async () =>
            fetch(BACKEND_AUTH_REFRESH_PATH, {
                method: "POST",
                credentials: "include",
                cache: "no-store",
            })
        )
        if (refr.ok) {
            res = await run()
            if (res.status === 401 || res.status === 403) {
                // Refresh succeeded but still getting 401/403 — session is truly invalid.
                forceLogout("unauthorized")
            }
        } else {
            // Refresh endpoint itself rejected — session has expired.
            forceLogout("session-expired")
        }
    } else if (res.status === 403) {
        forceLogout("unauthorized")
    }

    return res
}
