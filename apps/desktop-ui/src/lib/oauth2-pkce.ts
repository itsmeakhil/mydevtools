/**
 * PKCE (RFC 7636) helpers for the OAuth 2.0 authorization-code flow.
 * Verifier: cryptographically random, 43-128 chars from the URL-safe alphabet.
 * Challenge: BASE64URL(SHA-256(verifier)) — the only method we support (S256).
 * State: opaque random value bound to one flow, validated on callback to defeat CSRF.
 */

function base64url(bytes: Uint8Array): string {
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function randomBytes(len: number): Uint8Array {
    const out = new Uint8Array(len)
    crypto.getRandomValues(out)
    return out
}

/** Default to 64 raw bytes → ~86 base64url chars; comfortably within RFC's 43..128 range. */
export function generateVerifier(byteLength = 64): string {
    return base64url(randomBytes(byteLength))
}

export async function challengeFor(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier)
    const hash = await crypto.subtle.digest("SHA-256", data)
    return base64url(new Uint8Array(hash))
}

export function generateState(): string {
    return base64url(randomBytes(16))
}
