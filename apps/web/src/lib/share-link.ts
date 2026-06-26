/**
 * Hash-fragment share links for collections.
 *
 * Collection snapshot → gzip → base64url → URL fragment. No backend hop
 * required; recipients see exactly what the publisher saw at share-time.
 *
 * Trade-off: URL length grows with collection size. Modern browsers + servers
 * comfortably handle ~32KB URLs; we cap below that with a clear error.
 */

import type { Collection } from "@/components/api-client/types"

const MAX_FRAGMENT_BYTES = 24 * 1024  // ~24KB after base64url — safely under typical URL limits

function uint8ToBase64Url(bytes: Uint8Array): string {
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToUint8(s: string): Uint8Array {
    const pad = "=".repeat((4 - (s.length % 4)) % 4)
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function gzip(input: Uint8Array): Promise<Uint8Array> {
    if (typeof CompressionStream === "undefined") {
        // No compression available — pass through (test-env fallback).
        return input
    }
    const stream = new Blob([input as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"))
    const buf = await new Response(stream).arrayBuffer()
    return new Uint8Array(buf)
}

async function gunzip(input: Uint8Array): Promise<Uint8Array> {
    if (typeof DecompressionStream === "undefined") return input
    const stream = new Blob([input as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"))
    const buf = await new Response(stream).arrayBuffer()
    return new Uint8Array(buf)
}

export async function encodeCollectionShareFragment(collection: Collection): Promise<string> {
    const json = JSON.stringify(collection)
    const enc = new TextEncoder().encode(json)
    const compressed = await gzip(enc)
    const out = uint8ToBase64Url(compressed)
    if (out.length > MAX_FRAGMENT_BYTES) {
        throw new Error(
            `Collection too large to share via URL (${out.length} bytes; cap ${MAX_FRAGMENT_BYTES}). ` +
            `Export as Postman v2.1 JSON instead.`,
        )
    }
    return out
}

export async function decodeCollectionShareFragment(fragment: string): Promise<Collection> {
    if (!fragment) throw new Error("Empty share fragment")
    const compressed = base64UrlToUint8(fragment)
    const json = await gunzip(compressed)
    const text = new TextDecoder().decode(json)
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
        throw new Error("Share fragment did not decode to a collection")
    }
    return parsed as Collection
}

/** Build a `https://<origin>/api-client/share#<fragment>` URL. */
export async function buildShareUrl(origin: string, collection: Collection): Promise<string> {
    const frag = await encodeCollectionShareFragment(collection)
    return `${origin.replace(/\/$/, "")}/api-client/share#${frag}`
}
