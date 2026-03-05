import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const { url, method, headers, body } = await req.json()

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
        }

        try {
            new URL(url)
        } catch {
            return NextResponse.json({
                status: 400,
                statusText: "Bad Request",
                headers: {},
                body: "Invalid URL format",
                time: 0,
                size: 0,
                error: "Invalid URL format",
            })
        }

        const startTime = performance.now()

        const response = await fetch(url, {
            method,
            headers,
            body: body || undefined,
        })

        const endTime = performance.now()
        const time = Math.round(endTime - startTime)

        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value
        })

        const contentType = response.headers.get("content-type") || ""
        let responseBody: string
        let isBase64 = false

        if (contentType.includes("image/") || contentType.includes("application/pdf") || contentType.includes("audio/") || contentType.includes("video/")) {
            const buffer = await response.arrayBuffer()
            responseBody = Buffer.from(buffer).toString("base64")
            isBase64 = true
        } else {
            responseBody = await response.text()
        }

        const size = Number(response.headers.get("content-length")) || (isBase64 ? Buffer.from(responseBody, "base64").length : responseBody.length)

        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body: responseBody,
            isBase64,
            time,
            size,
        })

    } catch (error) {
        return NextResponse.json({
            status: 0,
            statusText: "Error",
            headers: {},
            body: (error as Error).message,
            time: 0,
            size: 0,
            error: (error as Error).message,
        })
    }
}
