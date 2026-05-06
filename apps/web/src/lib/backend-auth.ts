import type { User } from "firebase/auth"

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
    } = {}
): Promise<void> {
    const maxAttempts = Math.max(1, opts.maxAttempts ?? 3)
    let token = idToken
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch("/api/backend/auth/session", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: token, check_revoked: true }),
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
}

/**
 * If JWT cookies are missing or expired but Firebase session exists, re-run the Firebase exchange.
 */
export async function ensureBackendSession(user: User): Promise<void> {
    let check = await fetch("/api/backend/auth/session/check", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
    })
    if (check.ok) return
    if (check.status >= 500) {
        await sleep(200)
        check = await fetch("/api/backend/auth/session/check", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
        })
        if (check.ok) return
    }

    const idToken = await user.getIdToken()
    await establishBackendSession(idToken, {
        maxAttempts: 3,
        getFreshIdToken: () => user.getIdToken(true),
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
        const refr = await fetch(BACKEND_AUTH_REFRESH_PATH, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
        })
        if (refr.ok) {
            res = await run()
            // Refresh succeeded but still getting 401/403 — session is truly invalid.
            if (res.status === 401 || res.status === 403) {
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
