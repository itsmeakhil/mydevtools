import type { User } from "firebase/auth"

/** Same-origin refresh endpoint (used by fetch helpers). */
export const BACKEND_AUTH_REFRESH_PATH = "/api/backend/auth/refresh"

/**
 * Exchange Firebase ID token for HttpOnly API cookies (call once after Firebase sign-in).
 */
export async function establishBackendSession(idToken: string): Promise<void> {
    const res = await fetch("/api/backend/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken, check_revoked: true }),
        cache: "no-store",
    })
    if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || `Session exchange failed (${res.status})`)
    }
}

/**
 * If JWT cookies are missing or expired but Firebase session exists, re-run the Firebase exchange.
 */
export async function ensureBackendSession(user: User): Promise<void> {
    const check = await fetch("/api/backend/auth/session/check", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    })
    if (check.ok) return
    const idToken = await user.getIdToken()
    await establishBackendSession(idToken)
}

export async function logoutBackendSession(): Promise<void> {
    await fetch("/api/backend/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
    })
}

/**
 * Same-origin fetch to `/api/backend/...` with cookies; refreshes access token on 401 once.
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
        const refr = await fetch(BACKEND_AUTH_REFRESH_PATH, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
        })
        if (refr.ok) {
            res = await run()
        }
    }
    return res
}
