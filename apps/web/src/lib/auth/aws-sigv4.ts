/**
 * AWS Signature Version 4 — header-based signing.
 * Reference: https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html
 *
 * Mutates the supplied `headers` map in place — adds X-Amz-Date,
 * X-Amz-Security-Token (when session token present), X-Amz-Content-Sha256,
 * Host (if missing), and the final Authorization header.
 *
 * Uses Web Crypto only — works in both the browser and the proxy route.
 */

import type { AwsSigV4Config } from "@/components/api-client/types"

const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

async function sha256(data: ArrayBuffer | Uint8Array | string): Promise<ArrayBuffer> {
    const bytes = typeof data === "string" ? enc.encode(data) : data
    return crypto.subtle.digest("SHA-256", bytes as BufferSource)
}

async function hmac(key: ArrayBuffer | Uint8Array, data: ArrayBuffer | Uint8Array | string): Promise<ArrayBuffer> {
    const k = await crypto.subtle.importKey(
        "raw",
        key as BufferSource,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    )
    const bytes = typeof data === "string" ? enc.encode(data) : data
    return crypto.subtle.sign("HMAC", k, bytes as BufferSource)
}

/** YYYYMMDDTHHmmssZ */
function amzDate(d: Date): string {
    const iso = d.toISOString()
    return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** Canonical URI: each segment encoded per RFC 3986 (twice — AWS spec). */
function canonicalUri(pathname: string): string {
    if (!pathname || pathname === "") return "/"
    return pathname
        .split("/")
        .map((seg) => encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
        .join("/")
}

function canonicalQuery(searchParams: URLSearchParams): string {
    const entries: Array<[string, string]> = []
    searchParams.forEach((v, k) => entries.push([k, v]))
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return entries
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
}

function trimLws(s: string): string {
    return s.replace(/\s+/g, " ").trim()
}

/**
 * Sign a request. Mutates `headers` with the auth-related fields and returns
 * the assembled Authorization value (also already set on the map).
 */
export async function signAwsSigV4(args: {
    method: string
    url: URL
    headers: Record<string, string>
    body: string | Uint8Array
    cfg: AwsSigV4Config
    /** Defaults to `new Date()`; injectable for tests. */
    now?: Date
}): Promise<string> {
    const now = args.now ?? new Date()
    const amz = amzDate(now)
    const dateStamp = amz.slice(0, 8)
    const credentialScope = `${dateStamp}/${args.cfg.region}/${args.cfg.service}/aws4_request`

    // Required AWS headers go on first so they get signed.
    args.headers["X-Amz-Date"] = amz
    if (args.cfg.sessionToken) args.headers["X-Amz-Security-Token"] = args.cfg.sessionToken

    const bodyBytes = typeof args.body === "string" ? enc.encode(args.body) : args.body
    const payloadHash = toHex(await sha256(bodyBytes))
    args.headers["X-Amz-Content-Sha256"] = payloadHash

    if (!Object.keys(args.headers).some((k) => k.toLowerCase() === "host")) {
        args.headers["Host"] = args.url.host
    }

    // Canonical headers — must be lowercased name + trimmed value, joined with `\n`.
    const canonicalHeaderEntries = Object.entries(args.headers)
        .map(([k, v]) => [k.toLowerCase(), trimLws(v)] as [string, string])
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    const canonicalHeaders = canonicalHeaderEntries.map(([k, v]) => `${k}:${v}`).join("\n") + "\n"
    const signedHeaders = canonicalHeaderEntries.map(([k]) => k).join(";")

    const canonicalRequest = [
        args.method.toUpperCase(),
        canonicalUri(args.url.pathname),
        canonicalQuery(args.url.searchParams),
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join("\n")

    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amz,
        credentialScope,
        toHex(await sha256(canonicalRequest)),
    ].join("\n")

    const kDate = await hmac(enc.encode("AWS4" + args.cfg.secretAccessKey), dateStamp)
    const kRegion = await hmac(kDate, args.cfg.region)
    const kService = await hmac(kRegion, args.cfg.service)
    const kSigning = await hmac(kService, "aws4_request")
    const signature = toHex(await hmac(kSigning, stringToSign))

    const auth = `AWS4-HMAC-SHA256 Credential=${args.cfg.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    args.headers["Authorization"] = auth
    return auth
}
