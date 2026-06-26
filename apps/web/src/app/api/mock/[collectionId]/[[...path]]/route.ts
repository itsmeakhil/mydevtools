/**
 * Mock-server endpoint. Resolves an incoming request against the saved examples
 * inside a collection and replays the matching one.
 *
 * URL shape:
 *   /api/mock/<collectionId>/<arbitrary>/<path>?<query>
 *
 * Matching rules (RFC-ish lite, ponytail):
 *   1. Method match — case-insensitive.
 *   2. Pathname match — the trailing `<arbitrary>/<path>` segment is compared
 *      against each example's original `request.url` pathname. Exact match only.
 *   3. First hit wins. Iteration order = walk-collection order.
 *
 * The endpoint requires the same session the API client uses (Firebase cookie
 * forwarded to backend). Anonymous public mocks would need a backend-side mockId
 * index — deliberate skip for v1; the collection.id IS the mockId here.
 */

import { requireBackendSession } from "@/lib/require-backend-session"
import { NextRequest, NextResponse } from "next/server"
import type {
    Collection,
    CollectionFolder,
    CollectionRequest,
    SavedExample,
} from "@/components/api-client/types"

export const runtime = "nodejs"

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000"

interface RouteContext {
    params: Promise<{ collectionId: string; path?: string[] }>
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

// Hop-by-hop + identity-revealing headers we never replay back to clients.
const RESPONSE_HEADERS_TO_DROP = new Set([
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade",
    "content-encoding", "content-length",  // re-derived by Next from body
    "set-cookie",  // would land on the user's mydevtools origin, never what they want
])

async function fetchCollectionViaBackend(req: NextRequest, collectionId: string): Promise<Collection | null> {
    // Forward our session cookie to the backend list endpoint and pick the matching collection.
    // There's no per-id GET on the backend yet (would be the right home eventually).
    const cookie = req.headers.get("cookie") ?? ""
    const res = await fetch(`${FASTAPI_BASE_URL.replace(/\/$/, "")}/api-client/collections`, {
        headers: { cookie },
    })
    if (!res.ok) return null
    const list = (await res.json()) as Collection[]
    return list.find((c) => c.id === collectionId) ?? null
}

async function handle(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
    const authError = await requireBackendSession(req)
    if (authError) return authError

    const { collectionId, path } = await ctx.params
    const pathname = "/" + (path ?? []).join("/")
    const method = req.method.toUpperCase()

    const collection = await fetchCollectionViaBackend(req, collectionId)
    if (!collection) {
        return NextResponse.json(
            { error: `No mock server: collection ${collectionId} not found` },
            { status: 404 },
        )
    }

    for (const r of walkRequests(collection.items)) {
        if (!r.examples) continue
        for (const ex of r.examples) {
            if (!exampleMatches(ex, method, pathname)) continue

            const headers = new Headers()
            for (const [k, v] of Object.entries(ex.response.headers ?? {})) {
                if (!RESPONSE_HEADERS_TO_DROP.has(k.toLowerCase())) headers.set(k, v)
            }
            headers.set("X-Mdt-Mock-Source", `${collection.name} / ${r.name} / ${ex.name}`)

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

    return NextResponse.json(
        {
            error: "No matching example",
            collection: collection.name,
            tried: { method, path: pathname },
        },
        { status: 404 },
    )
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const HEAD = handle
export const OPTIONS = handle
