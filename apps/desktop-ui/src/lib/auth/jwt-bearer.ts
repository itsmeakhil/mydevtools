/**
 * RFC 7519 JWT minter for the `Authorization: Bearer` use-case.
 * Supports HS256 / HS384 / HS512 (HMAC) and RS256 / ES256 (asymmetric).
 *
 * Asymmetric keys are pasted as PKCS#8 PEM and imported via Web Crypto.
 */

export type JwtAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "ES256"

export interface JwtClaims {
    iss?: string
    sub?: string
    aud?: string | string[]
    exp?: number
    nbf?: number
    iat?: number
    jti?: string
    /** Any additional claims. Merged in last. */
    extra?: Record<string, unknown>
}

const enc = new TextEncoder()

function base64UrlEncode(bytes: Uint8Array | string): string {
    const b = typeof bytes === "string" ? enc.encode(bytes) : bytes
    let bin = ""
    for (const x of b) bin += String.fromCharCode(x)
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
    const trimmed = pem
        .replace(/-----BEGIN [^-]+-----/, "")
        .replace(/-----END [^-]+-----/, "")
        .replace(/\s+/g, "")
    const bin = atob(trimmed)
    const buf = new ArrayBuffer(bin.length)
    const view = new Uint8Array(buf)
    for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
    return buf
}

function hashFor(alg: JwtAlgorithm): "SHA-256" | "SHA-384" | "SHA-512" {
    if (alg === "HS384") return "SHA-384"
    if (alg === "HS512") return "SHA-512"
    return "SHA-256"
}

async function signHmac(alg: JwtAlgorithm, secret: string, data: string): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret) as BufferSource,
        { name: "HMAC", hash: hashFor(alg) },
        false,
        ["sign"],
    )
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data))
    return new Uint8Array(sig)
}

async function signRs256(privatePem: string, data: string): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(privatePem),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"],
    )
    const sig = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, enc.encode(data))
    return new Uint8Array(sig)
}

async function signEs256(privatePem: string, data: string): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
        "pkcs8",
        pemToArrayBuffer(privatePem),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"],
    )
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(data))
    return new Uint8Array(sig)
}

export interface JwtSignOptions {
    algorithm: JwtAlgorithm
    /** Required for HMAC. */
    secret?: string
    /** Required for RS256 / ES256 (PKCS#8 PEM). */
    privateKeyPem?: string
    claims: JwtClaims
    /** TTL relative to `iat`; convenience over setting `exp`. */
    ttlSeconds?: number
    /** Now override for tests. */
    now?: number
}

export async function signJwt(opts: JwtSignOptions): Promise<string> {
    const header = { alg: opts.algorithm, typ: "JWT" }
    const now = Math.floor((opts.now ?? Date.now()) / 1000)
    const iat = opts.claims.iat ?? now
    const exp = opts.claims.exp ?? (opts.ttlSeconds ? iat + opts.ttlSeconds : undefined)
    const claims: Record<string, unknown> = {
        ...opts.claims,
        iat,
        ...(exp !== undefined ? { exp } : {}),
        ...(opts.claims.extra ?? {}),
    }
    delete (claims as { extra?: unknown }).extra

    const headerB64 = base64UrlEncode(JSON.stringify(header))
    const payloadB64 = base64UrlEncode(JSON.stringify(claims))
    const signingInput = `${headerB64}.${payloadB64}`

    let sigBytes: Uint8Array
    switch (opts.algorithm) {
        case "HS256":
        case "HS384":
        case "HS512":
            if (!opts.secret) throw new Error("HMAC algorithms require `secret`")
            sigBytes = await signHmac(opts.algorithm, opts.secret, signingInput)
            break
        case "RS256":
            if (!opts.privateKeyPem) throw new Error("RS256 requires PKCS#8 PEM in `privateKeyPem`")
            sigBytes = await signRs256(opts.privateKeyPem, signingInput)
            break
        case "ES256":
            if (!opts.privateKeyPem) throw new Error("ES256 requires PKCS#8 PEM in `privateKeyPem`")
            sigBytes = await signEs256(opts.privateKeyPem, signingInput)
            break
    }
    return `${signingInput}.${base64UrlEncode(sigBytes)}`
}
