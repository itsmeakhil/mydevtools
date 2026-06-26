/**
 * Anonymously-callable mock endpoint.
 *
 * URL shape:
 *   /api/mock/public/<mockId>/<arbitrary>/<path>?<query>
 *
 * No `requireBackendSession` gate — `mockId` itself is the credential
 * (~144 bits of entropy). The backend's GET /public-mock/{mock_id} is also
 * unauthenticated, so this route runs without forwarding any cookie.
 *
 * Reuses the same matcher semantics as the authed mock route: method-sensitive,
 * exact-pathname match, first-hit wins.
 */

import { NextRequest, NextResponse } from "next/server"
import type {
    CollectionFolder,
    CollectionRequest,
    SavedExample,
} from "@/components/api-client/types"

export const runtime = "nodejs"

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000"

interface RouteContext {
    params: Promise<{ mockId: string; path?: string[] }>
}

interface PublicMockShape {
    mock_id: string
    name: string
    items: Array<CollectionFolder | CollectionRequest>
}

function* walkRequests(items: Array<CollectionFolder | CollectionRequest>): Generator<CollectionRequest> {
    for (const item of items) {
        if ("type" in item && item.type === "folder") yield* walkRequests(item.items)
        else yield item as CollectionRequest
    }
}

function exampleMatches(ex: SavedExample, method: string, pathname: string): boolean {
    if (ex.request.method.toUpperCase() !== method.toUpperCase()) return false
    let storedPath: string
    try { storedPath = new URL(ex.request.url).pathname || "/" } catch { storedPath = ex.request.url || "/" }
    return storedPath === pathname
}

const RESPONSE_HEADERS_TO_DROP = new Set([
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
    "content-encoding", "content-length",
    "set-cookie",
])

async function handle(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
    const { mockId, path } = await ctx.params
    const pathname = "/" + (path ?? []).join("/")
    const method = req.method.toUpperCase()

    const res = await fetch(`${FASTAPI_BASE_URL.replace(/\/$/, "")}/api-client/public-mock/${encodeURIComponent(mockId)}`)
    if (res.status === 404) {
        return NextResponse.json({ error: "Public mock not found" }, { status: 404 })
    }
    if (!res.ok) {
        return NextResponse.json({ error: "Upstream mock lookup failed" }, { status: 502 })
    }
    const mock = (await res.json()) as PublicMockShape

    for (const r of walkRequests(mock.items ?? [])) {
        if (!r.examples) continue
        for (const ex of r.examples) {
            if (!exampleMatches(ex, method, pathname)) continue
            const headers = new Headers()
            for (const [k, v] of Object.entries(ex.response.headers ?? {})) {
                if (!RESPONSE_HEADERS_TO_DROP.has(k.toLowerCase())) headers.set(k, v)
            }
            headers.set("X-Mdt-Mock-Source", `${mock.name} / ${r.name} / ${ex.name}`)
            headers.set("X-Mdt-Mock-Public", "1")
            const body = ex.response.isBase64
                ? Buffer.from(ex.response.body, "base64")
                : ex.response.body
            return new NextResponse(body, {
                status: ex.response.status || 200,
                statusText: ex.response.statusText || "OK",
                headers,
            })
        }
    }

    return NextResponse.json({
        error: "No matching example",
        mock: mock.name,
        tried: { method, path: pathname },
    }, { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
export const OPTIONS = handle
