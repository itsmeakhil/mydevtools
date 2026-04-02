import { NextRequest, NextResponse } from "next/server"

const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL

function requireBaseUrl() {
    if (!FASTAPI_BASE_URL) {
        return NextResponse.json(
            { error: "NEXT_PUBLIC_FASTAPI_BASE_URL is not configured" },
            { status: 500 }
        )
    }
    return null
}

async function forward(req: NextRequest, method: string, pathSegments: string[]) {
    const baseUrlError = requireBaseUrl()
    if (baseUrlError) return baseUrlError

    const url = new URL(req.url)
    const upstreamUrl = new URL(`/api/v1/${pathSegments.join("/")}`, FASTAPI_BASE_URL)
    upstreamUrl.search = url.search

    const headers: Record<string, string> = {}
    const auth = req.headers.get("authorization")
    if (auth) headers["authorization"] = auth

    const contentType = req.headers.get("content-type")
    if (contentType) headers["content-type"] = contentType

    let body: BodyInit | undefined = undefined
    if (method !== "GET" && method !== "HEAD") {
        body = await req.text()
    }

    const upstreamRes = await fetch(upstreamUrl.toString(), {
        method,
        headers,
        body,
        cache: "no-store",
    })

    const upstreamContentType = upstreamRes.headers.get("content-type") || ""
    if (!upstreamContentType.includes("application/json")) {
        const text = await upstreamRes.text()
        return new NextResponse(text, {
            status: upstreamRes.status,
            headers: {
                "content-type": upstreamContentType || "text/plain",
            },
        })
    }

    const json = await upstreamRes.json().catch(() => null)
    return NextResponse.json(json, { status: upstreamRes.status })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const { path } = await ctx.params
    return forward(req, "GET", path)
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const { path } = await ctx.params
    return forward(req, "POST", path)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const { path } = await ctx.params
    return forward(req, "PATCH", path)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const { path } = await ctx.params
    return forward(req, "DELETE", path)
}

