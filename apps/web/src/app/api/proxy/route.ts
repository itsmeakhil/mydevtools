import { NextRequest, NextResponse } from "next/server"

export const runtime = 'edge';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

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

        const requestHeaders = { ...(headers || {}) } as Record<string, string>
        const incomingCookie = req.headers.get("cookie")
        if (incomingCookie && !Object.keys(requestHeaders).some((k) => k.toLowerCase() === "cookie")) {
            requestHeaders["cookie"] = incomingCookie
        }
        let requestBody: BodyInit | undefined = body || undefined

        if (body && typeof body === "object" && body.mode === "form-data" && Array.isArray(body.entries)) {
            const form = new FormData()

            for (const entry of body.entries) {
                if (!entry?.key) continue

                if (entry.type === "file") {
                    if (!entry.fileContentBase64) continue
                    const fileBuffer = base64ToArrayBuffer(entry.fileContentBase64)
                    const blob = new Blob([fileBuffer], { type: entry.fileType || "application/octet-stream" })
                    form.append(entry.key, blob, entry.fileName || "upload.bin")
                } else {
                    form.append(entry.key, entry.value || "")
                }
            }

            requestBody = form
            const contentTypeKey = Object.keys(requestHeaders).find((key) => key.toLowerCase() === "content-type")
            if (contentTypeKey) {
                delete requestHeaders[contentTypeKey]
            }
        }

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: requestBody,
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
            responseBody = arrayBufferToBase64(buffer)
            isBase64 = true
        } else {
            responseBody = await response.text()
        }

        const contentLength = response.headers.get("content-length")
        const size = contentLength
            ? Number(contentLength)
            : isBase64
                ? Math.round((responseBody.length * 3) / 4)
                : new TextEncoder().encode(responseBody).length

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
