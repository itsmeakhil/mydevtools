import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000'

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ code: string }> },
) {
    const { code } = await ctx.params
    const origin = new URL(req.url).origin

    try {
        const res = await fetch(
            `${FASTAPI_BASE}/api/v1/url-shortener/resolve/${encodeURIComponent(code)}`,
            { cache: 'no-store' },
        )

        if (!res.ok) {
            return NextResponse.redirect(`${origin}/not-found`, { status: 302 })
        }

        const { original_url, active } = await res.json() as {
            original_url: string
            active: boolean
        }

        if (!original_url) {
            return NextResponse.redirect(`${origin}/not-found`, { status: 302 })
        }

        if (!active) {
            return NextResponse.redirect(
                `${origin}/link-disabled?code=${encodeURIComponent(code)}`,
                { status: 302 },
            )
        }

        // Fire-and-forget click tracking
        fetch(`${FASTAPI_BASE}/api/v1/url-shortener/${encodeURIComponent(code)}/click`, {
            method: 'POST',
            cache: 'no-store',
        }).catch(() => {})

        return NextResponse.redirect(original_url, { status: 302 })
    } catch {
        return NextResponse.redirect(`${origin}/`, { status: 302 })
    }
}
