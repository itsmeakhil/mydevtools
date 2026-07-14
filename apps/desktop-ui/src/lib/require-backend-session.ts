import { NextResponse } from "next/server"
import { createHash } from "crypto"

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL

const SESSION_CACHE_TTL_MS = Number(process.env.AUTH_SESSION_CACHE_TTL_MS ?? 30_000)
const SESSION_CACHE_MAX = 5_000

type CacheEntry = { expiresAt: number }
const sessionCache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<NextResponse | null>>()

function tokenKey(cookie: string | null, authorization: string | null): string | null {
  if (!cookie && !authorization) return null
  return createHash("sha256")
    .update(`${cookie ?? ""}${authorization ?? ""}`)
    .digest("hex")
}

function getCached(key: string): boolean {
  const entry = sessionCache.get(key)
  if (!entry) return false
  if (entry.expiresAt <= Date.now()) {
    sessionCache.delete(key)
    return false
  }
  return true
}

function setCached(key: string): void {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    const firstKey = sessionCache.keys().next().value
    if (firstKey) sessionCache.delete(firstKey)
  }
  sessionCache.set(key, { expiresAt: Date.now() + SESSION_CACHE_TTL_MS })
}

/**
 * Ensures the request has a valid backend JWT session (cookie or Bearer).
 * Returns null if OK, or a NextResponse to return from the route handler.
 *
 * Successful checks are cached per-instance for SESSION_CACHE_TTL_MS to avoid
 * a round-trip on every BFF API call. Revoked tokens remain accepted up to
 * the TTL window; tune via AUTH_SESSION_CACHE_TTL_MS (default 30s).
 */
export async function requireBackendSession(request: Request): Promise<NextResponse | null> {
  if (!FASTAPI_BASE_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FASTAPI_BASE_URL is not configured" },
      { status: 500 }
    )
  }

  const cookie = request.headers.get("cookie")
  const authorization = request.headers.get("authorization")
  const key = tokenKey(cookie, authorization)

  if (key && getCached(key)) return null

  if (key) {
    const pending = inflight.get(key)
    if (pending) return pending
  }

  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization

  const task = (async (): Promise<NextResponse | null> => {
    try {
      const checkRes = await fetch(`${FASTAPI_BASE_URL}/api/v1/auth/session/check`, {
        method: "GET",
        headers,
        cache: "no-store",
      })

      if (checkRes.ok) {
        if (key) setCached(key)
        return null
      }
      if (checkRes.status === 401 || checkRes.status === 403) {
        if (key) sessionCache.delete(key)
        return NextResponse.json({ error: "Unauthorized" }, { status: checkRes.status })
      }
      return NextResponse.json({ error: "Auth check failed" }, { status: 502 })
    } catch {
      return NextResponse.json({ error: "Failed to verify auth session" }, { status: 502 })
    }
  })()

  if (key) {
    inflight.set(key, task)
    try {
      return await task
    } finally {
      inflight.delete(key)
    }
  }
  return task
}
