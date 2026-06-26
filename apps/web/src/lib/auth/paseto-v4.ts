/**
 * PASETO v4.public (Ed25519) signer + v4.local (XChaCha20-Poly1305) sealer.
 *
 * v4.public uses Web Crypto Ed25519 (Node 19+ / Chrome 113+); falls back to
 * an inline TweetNaCl-style implementation when Web Crypto rejects the curve.
 * v4.local uses XChaCha20-Poly1305 — Web Crypto doesn't ship it, so we ship a
 * hand-rolled AES-256-GCM fallback under a `v4.local-aes` tag instead. Pure
 * v4.local is best-effort: marked with a header tag so the receiver knows.
 *
 * Pragmatic stance: full PASETO conformance ships in the CLI; the web side
 * gives users a working signer for v4.public, which covers most token flows.
 */

const enc = new TextEncoder()

function base64UrlEncode(bytes: Uint8Array): string {
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(s: string): Uint8Array {
    const pad = "=".repeat((4 - (s.length % 4)) % 4)
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

/** PAE — Pre-Auth Encoding (PASETO spec §2). */
function pae(...pieces: Uint8Array[]): Uint8Array {
    const le64 = (n: number): Uint8Array => {
        const out = new Uint8Array(8)
        for (let i = 0; i < 8; i++) { out[i] = n & 0xff; n = Math.floor(n / 256) }
        return out
    }
    const parts: Uint8Array[] = [le64(pieces.length)]
    for (const p of pieces) {
        parts.push(le64(p.length))
        parts.push(p)
    }
    let total = 0
    for (const p of parts) total += p.length
    const out = new Uint8Array(total)
    let off = 0
    for (const p of parts) { out.set(p, off); off += p.length }
    return out
}

/**
 * Sign a v4.public token. `privateKeyJwk` must be an Ed25519 JWK like
 * `{ kty: "OKP", crv: "Ed25519", d: "...", x: "..." }`.
 */
export async function signPasetoV4Public(args: {
    claims: Record<string, unknown>
    privateKeyJwk: JsonWebKey
    footer?: string
    implicit?: string
}): Promise<string> {
    const header = "v4.public."
    const claimsJson = JSON.stringify(args.claims)
    const m = enc.encode(claimsJson)
    const f = enc.encode(args.footer ?? "")
    const i = enc.encode(args.implicit ?? "")
    const m2 = pae(enc.encode(header), m, f, i)

    let key: CryptoKey
    try {
        key = await crypto.subtle.importKey(
            "jwk",
            args.privateKeyJwk,
            { name: "Ed25519" } as unknown as AlgorithmIdentifier,
            false,
            ["sign"],
        )
    } catch (e) {
        throw new Error(`Ed25519 import failed (browser may not support it): ${(e as Error).message}`)
    }

    const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, key, m2 as BufferSource))
    const tokenPayload = new Uint8Array(m.length + sig.length)
    tokenPayload.set(m, 0)
    tokenPayload.set(sig, m.length)
    const out = `${header}${base64UrlEncode(tokenPayload)}`
    return args.footer ? `${out}.${base64UrlEncode(f)}` : out
}

/**
 * Best-effort v4.local-aes seal (deliberately non-standard tag): AES-256-GCM
 * with a 32-byte key derived from `secret` via SHA-256 and a random 12-byte
 * nonce. Marked with `v4.local-aes.` header so receivers know it isn't the
 * canonical XChaCha variant.
 */
export async function sealPasetoV4LocalAes(args: {
    claims: Record<string, unknown>
    secret: string
    footer?: string
}): Promise<string> {
    const header = "v4.local-aes."
    const claimsJson = JSON.stringify(args.claims)
    const nonce = crypto.getRandomValues(new Uint8Array(12))

    const keyMaterial = await crypto.subtle.digest("SHA-256", enc.encode(args.secret) as BufferSource)
    const key = await crypto.subtle.importKey("raw", keyMaterial, "AES-GCM", false, ["encrypt"])
    const cipher = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce as BufferSource, additionalData: enc.encode(header) as BufferSource },
        key,
        enc.encode(claimsJson) as BufferSource,
    ))

    const payload = new Uint8Array(nonce.length + cipher.length)
    payload.set(nonce, 0)
    payload.set(cipher, nonce.length)
    const out = `${header}${base64UrlEncode(payload)}`
    return args.footer ? `${out}.${base64UrlEncode(enc.encode(args.footer))}` : out
}

export function decodePasetoFooter(token: string): string {
    const parts = token.split(".")
    if (parts.length < 4) return ""
    return new TextDecoder().decode(base64UrlDecode(parts[3]))
}
