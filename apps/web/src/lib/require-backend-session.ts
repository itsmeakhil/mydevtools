import { NextResponse } from "next/server"

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL

/**
 * Ensures the request has a valid backend JWT session (cookie or Bearer).
 * Returns null if OK, or a NextResponse to return from the route handler.
 */
export async function requireBackendSession(request: Request): Promise<NextResponse | null> {
  if (!FASTAPI_BASE_URL) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_FASTAPI_BASE_URL is not configured" },
      { status: 500 }
    )
  }

  const headers: Record<string, string> = {}
  const cookie = request.headers.get("cookie")
  const authorization = request.headers.get("authorization")

  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization

  try {
    const checkRes = await fetch(`${FASTAPI_BASE_URL}/api/v1/auth/session/check`, {
      method: "GET",
      headers,
      cache: "no-store",
    })

    if (checkRes.ok) return null
    if (checkRes.status === 401 || checkRes.status === 403) {
      return NextResponse.json({ error: "Unauthorized" }, { status: checkRes.status })
    }
    return NextResponse.json({ error: "Auth check failed" }, { status: 502 })
  } catch {
    return NextResponse.json({ error: "Failed to verify auth session" }, { status: 502 })
  }
}
