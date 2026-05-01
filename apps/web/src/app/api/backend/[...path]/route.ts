import { NextRequest, NextResponse } from "next/server"

export const runtime = 'edge';

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

function appendSetCookiesFromUpstream(upstream: Response, res: NextResponse) {
    const anyHeaders = upstream.headers as Headers & { getSetCookie?: () => string[] }
    if (typeof anyHeaders.getSetCookie === "function") {
        for (const c of anyHeaders.getSetCookie()) {
            res.headers.append("Set-Cookie", c)
        }
        return
    }
    const single = upstream.headers.get("set-cookie")
    if (single) {
        res.headers.append("Set-Cookie", single)
    }
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

    const cookie = req.headers.get("cookie")
    if (cookie) headers["cookie"] = cookie

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
        const res = new NextResponse(text, {
            status: upstreamRes.status,
            headers: {
                "content-type": upstreamContentType || "text/plain",
            },
        })
        appendSetCookiesFromUpstream(upstreamRes, res)
        return res
    }

    const json = await upstreamRes.json().catch(() => null)
    const res = NextResponse.json(json, { status: upstreamRes.status })
    appendSetCookiesFromUpstream(upstreamRes, res)
    return res
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
