/**
 * Hawk HTTP authentication scheme — header-based MAC over a normalised string.
 * Reference: https://github.com/mozilla/hawk/blob/main/API.md
 *
 * Sets the `Authorization: Hawk id="…", ts="…", nonce="…", mac="…"` header.
 */

import type { HawkConfig } from "@/components/api-client/types"

const enc = new TextEncoder()

function toBase64(buf: ArrayBuffer): string {
    let bin = ""
    const bytes = new Uint8Array(buf)
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin)
}

async function hmacBase64(key: string, data: string, algorithm: "sha256" | "sha1"): Promise<string> {
    const name = algorithm === "sha1" ? "SHA-1" : "SHA-256"
    const k = await crypto.subtle.importKey(
        "raw",
        enc.encode(key),
        { name: "HMAC", hash: name },
        false,
        ["sign"],
    )
    const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data))
    return toBase64(sig)
}

async function digestBase64(payload: string, contentType: string, algorithm: "sha256" | "sha1"): Promise<string> {
    const name = algorithm === "sha1" ? "SHA-1" : "SHA-256"
    const normalised = `hawk.1.payload\n${contentType.split(";")[0].trim()}\n${payload}\n`
    const sig = await crypto.subtle.digest(name, enc.encode(normalised))
    return toBase64(sig)
}

function randomNonce(len = 12): string {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    let s = ""
    for (const b of bytes) s += String.fromCharCode(33 + (b % 94))  // printable ASCII
    return s
}

export async function signHawk(args: {
    method: string
    url: URL
    headers: Record<string, string>
    body: string
    cfg: HawkConfig
    now?: Date
    nonce?: string
}): Promise<string> {
    const now = args.now ?? new Date()
    const ts = Math.floor(now.getTime() / 1000)
    const nonce = args.nonce ?? randomNonce()
    const algorithm = args.cfg.algorithm ?? "sha256"
    const port = args.url.port || (args.url.protocol === "https:" ? "443" : "80")
    const resource = args.url.pathname + (args.url.search || "")

    let payloadHash = ""
    if (args.cfg.includePayloadHash && args.body) {
        const contentType =
            Object.entries(args.headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "text/plain"
        payloadHash = await digestBase64(args.body, contentType, algorithm)
    }

    const ext = args.cfg.ext ?? ""
    const normalised = [
        "hawk.1.header",
        String(ts),
        nonce,
        args.method.toUpperCase(),
        resource,
        args.url.hostname.toLowerCase(),
        port,
        payloadHash,
        ext,
        "",  // trailing newline
    ].join("\n")

    const mac = await hmacBase64(args.cfg.key, normalised, algorithm)
    const parts = [
        `id="${args.cfg.id}"`,
        `ts="${ts}"`,
        `nonce="${nonce}"`,
        ...(payloadHash ? [`hash="${payloadHash}"`] : []),
        ...(ext ? [`ext="${ext}"`] : []),
        `mac="${mac}"`,
    ]
    const header = `Hawk ${parts.join(", ")}`
    args.headers["Authorization"] = header
    return header
}
