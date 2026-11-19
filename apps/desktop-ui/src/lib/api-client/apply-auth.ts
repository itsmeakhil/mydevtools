/**
 * Request auth shared by the send pipeline (`api-client.tsx`) and the
 * collection runner. OAuth2 stays with the callers (the editor writes the
 * refreshed token back to tab state); NTLM/SPNEGO go through their own proxy
 * routes; Digest without a pasted nonce is answered by the proxy.
 */
import type { RequestAuth } from "@/components/api-client/types"
import { encodeBasicCredentials } from "@/lib/basic-auth"
import { signAwsSigV4 } from "@/lib/auth/aws-sigv4"
import { signHawk } from "@/lib/auth/hawk"
import { signDigest } from "@/lib/auth/digest"
import { signJwt } from "@/lib/auth/jwt-bearer"

/**
 * Auth that only needs headers / URL: bearer, basic, api-key, jwt-bearer.
 * Credentials are trimmed — pasted tokens routinely carry whitespace servers
 * reject. Throws when a JWT can't be signed.
 */
export async function applyHeaderAuth(
    auth: RequestAuth,
    target: { headers: Record<string, string>; url: URL },
    substitute: (s: string) => string,
): Promise<void> {
    const { headers, url } = target
    if (auth.type === "bearer" && auth.token) {
        headers["Authorization"] = `Bearer ${substitute(auth.token).trim()}`
    } else if (auth.type === "basic" && auth.username && auth.password) {
        headers["Authorization"] = `Basic ${encodeBasicCredentials(substitute(auth.username).trim(), substitute(auth.password))}`
    } else if (auth.type === "api-key" && auth.apiKeyKey && auth.apiKeyValue) {
        const key = substitute(auth.apiKeyKey).trim()
        const val = substitute(auth.apiKeyValue).trim()
        if (auth.apiKeyLocation === "query") url.searchParams.append(key, val)
        else headers[key] = val
    } else if (auth.type === "jwt-bearer" && auth.jwtBearer) {
        const cfg = auth.jwtBearer
        const extra = cfg.extraClaimsJson?.trim()
            ? JSON.parse(cfg.extraClaimsJson) as Record<string, unknown>
            : undefined
        const jwt = await signJwt({
            algorithm: cfg.algorithm,
            secret: cfg.secret,
            privateKeyPem: cfg.privateKeyPem,
            ttlSeconds: cfg.ttlSeconds,
            claims: { iss: cfg.issuer || undefined, sub: cfg.subject || undefined, aud: cfg.audience || undefined, extra },
        })
        headers["Authorization"] = `Bearer ${jwt}`
    }
}

/**
 * Signers that hash the body (SigV4, Hawk, Digest with a pasted nonce): run
 * after body assembly, before the proxy fetch. Throws on signing failure.
 */
export async function applyPayloadAuth(
    auth: RequestAuth,
    target: { method: string; url: URL; headers: Record<string, string>; body: string },
): Promise<void> {
    const args = { method: target.method, url: target.url, headers: target.headers, body: target.body }
    if (auth.type === "aws-sigv4" && auth.awsSigV4) {
        await signAwsSigV4({ ...args, cfg: auth.awsSigV4 })
    } else if (auth.type === "hawk" && auth.hawk) {
        await signHawk({ ...args, cfg: auth.hawk })
    } else if (auth.type === "digest" && auth.digest?.nonce?.trim()) {
        await signDigest({ ...args, cfg: auth.digest })
    }
}
