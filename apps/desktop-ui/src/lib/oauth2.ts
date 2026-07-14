import { apiFetch } from "@/lib/desktop/api-fetch";
/**
 * OAuth 2.0 helpers for the API client.
 * Token requests go through `/api/proxy` so they benefit from the same SSRF
 * checks and live in the same trust boundary as ordinary API calls.
 *
 * Supported grants (this batch):
 *   - client_credentials
 *   - refresh_token (driven automatically when an access token is expired)
 *
 * authorization_code + PKCE lands in batch 3 (needs a /oauth/callback route).
 */

export type OAuth2GrantType =
    | "client_credentials"
    | "authorization_code"
    | "password"
    | "refresh_token"

export interface OAuth2Config {
    grantType: OAuth2GrantType
    tokenUrl: string
    clientId: string
    clientSecret?: string
    scope?: string
    /** For password grant (rarely used). */
    username?: string
    password?: string
    /** Auth0/AWS-Cognito style audience parameter. Sent only when set. */
    audience?: string

    // ── authorization_code (PKCE) only ────────────────────────────────────
    /** The provider's `/authorize` endpoint (where the user logs in). */
    authUrl?: string
    /** Where the provider redirects after consent. Must match registered redirect URI. */
    redirectUri?: string

    // ── Token state (populated after a successful exchange) ───────────────
    accessToken?: string
    refreshToken?: string
    tokenType?: string
    /** Epoch ms when the access token stops being usable. */
    expiresAt?: number
}

export interface OAuthTokenResponse {
    access_token: string
    token_type?: string
    expires_in?: number
    refresh_token?: string
    scope?: string
    /** Anything the server returns alongside — preserved for downstream use. */
    [k: string]: unknown
}

/**
 * Default leeway around expiry: refresh if the token would expire in the next
 * 30 seconds. Trades a tiny window of slack for fewer 401-then-retry round trips.
 */
const DEFAULT_LEEWAY_MS = 30_000

export function isTokenExpired(cfg: OAuth2Config, leewayMs = DEFAULT_LEEWAY_MS): boolean {
    if (!cfg.accessToken) return true
    if (cfg.expiresAt == null) return false  // no known expiry → treat as long-lived
    return Date.now() + leewayMs >= cfg.expiresAt
}

/**
 * POST the token request through the proxy. Centralised so client-credentials,
 * refresh, and (later) auth-code+PKCE all share the same transport.
 */
async function postTokenRequest(
    tokenUrl: string,
    bodyParams: Record<string, string>,
): Promise<OAuthTokenResponse> {
    const form = new URLSearchParams(bodyParams).toString()
    const proxyRes = await apiFetch("/api/proxy", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url: tokenUrl,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: form,
        }),
    })
    type ProxyResponse = {
        status: number
        body: string
        error?: string
    }
    const data = (await proxyRes.json()) as ProxyResponse
    if (data.status >= 400 || data.error) {
        const bodyPreview = data.body ? data.body.slice(0, 500) : "(no body)"
        throw new Error(`Token endpoint returned ${data.status}: ${bodyPreview}`)
    }
    let parsed: unknown
    try {
        parsed = JSON.parse(data.body)
    } catch {
        // Some servers (Okta legacy) return form-encoded — fall back to URLSearchParams.
        const u = new URLSearchParams(data.body)
        parsed = Object.fromEntries(u.entries())
    }
    const tokenResp = parsed as OAuthTokenResponse
    if (!tokenResp.access_token) {
        throw new Error("Token response missing access_token")
    }
    return tokenResp
}

/** Merge a fresh token response into the existing config, computing expiresAt. */
export function applyTokenResponse(cfg: OAuth2Config, resp: OAuthTokenResponse): OAuth2Config {
    const expiresAt =
        typeof resp.expires_in === "number" && resp.expires_in > 0
            ? Date.now() + resp.expires_in * 1000
            : undefined
    return {
        ...cfg,
        accessToken: resp.access_token,
        tokenType: resp.token_type ?? cfg.tokenType ?? "Bearer",
        refreshToken: resp.refresh_token ?? cfg.refreshToken,
        expiresAt,
    }
}

export async function fetchClientCredentialsToken(cfg: OAuth2Config): Promise<OAuth2Config> {
    if (!cfg.tokenUrl) throw new Error("OAuth: tokenUrl is required")
    if (!cfg.clientId) throw new Error("OAuth: clientId is required")
    const body: Record<string, string> = {
        grant_type: "client_credentials",
        client_id: cfg.clientId,
    }
    if (cfg.clientSecret) body.client_secret = cfg.clientSecret
    if (cfg.scope) body.scope = cfg.scope
    if (cfg.audience) body.audience = cfg.audience
    const resp = await postTokenRequest(cfg.tokenUrl, body)
    return applyTokenResponse(cfg, resp)
}

export async function refreshAccessToken(cfg: OAuth2Config): Promise<OAuth2Config> {
    if (!cfg.refreshToken) throw new Error("OAuth: no refresh_token to refresh with")
    if (!cfg.tokenUrl) throw new Error("OAuth: tokenUrl is required")
    const body: Record<string, string> = {
        grant_type: "refresh_token",
        refresh_token: cfg.refreshToken,
    }
    if (cfg.clientId) body.client_id = cfg.clientId
    if (cfg.clientSecret) body.client_secret = cfg.clientSecret
    if (cfg.scope) body.scope = cfg.scope
    const resp = await postTokenRequest(cfg.tokenUrl, body)
    return applyTokenResponse(cfg, resp)
}

/**
 * Top-level entry point used by `handleSend` before each request.
 * Returns the (possibly refreshed) config — callers must persist if the access
 * token changed.
 *   - Valid + non-expired → returned as-is.
 *   - Expired + refresh token present → refreshes.
 *   - Expired + client-credentials grant → re-fetches (server-to-server has no user).
 *   - Otherwise returned as-is and the caller decides what to do (no Authorization sent).
 */
/**
 * Drive the authorization-code + PKCE flow.
 *
 * Pops up the provider's /authorize endpoint, waits for the redirect to
 * `redirectUri` to relay `code` + `state` back via postMessage, then exchanges
 * the code for an access token. The verifier never leaves this tab.
 *
 * Throws if the popup is blocked, the user closes it, or state mismatches.
 */
export async function startAuthorizationCodeFlow(cfg: OAuth2Config): Promise<OAuth2Config> {
    if (typeof window === "undefined") throw new Error("authorization_code flow requires a browser")
    if (!cfg.authUrl) throw new Error("OAuth: authUrl is required")
    if (!cfg.tokenUrl) throw new Error("OAuth: tokenUrl is required")
    if (!cfg.clientId) throw new Error("OAuth: clientId is required")
    if (!cfg.redirectUri) throw new Error("OAuth: redirectUri is required")

    const { generateVerifier, challengeFor, generateState } = await import("./oauth2-pkce")
    const verifier = generateVerifier()
    const challenge = await challengeFor(verifier)
    const state = generateState()

    const authUrl = new URL(cfg.authUrl)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("client_id", cfg.clientId)
    authUrl.searchParams.set("redirect_uri", cfg.redirectUri)
    authUrl.searchParams.set("state", state)
    authUrl.searchParams.set("code_challenge", challenge)
    authUrl.searchParams.set("code_challenge_method", "S256")
    if (cfg.scope) authUrl.searchParams.set("scope", cfg.scope)
    if (cfg.audience) authUrl.searchParams.set("audience", cfg.audience)

    const popup = window.open(authUrl.toString(), "oauth_auth", "width=600,height=720,noopener=no")
    if (!popup) {
        throw new Error("Popup blocked — allow popups for this site and retry")
    }

    const code = await waitForOauthCallback(popup, state)

    const body: Record<string, string> = {
        grant_type: "authorization_code",
        code,
        redirect_uri: cfg.redirectUri,
        client_id: cfg.clientId,
        code_verifier: verifier,
    }
    if (cfg.clientSecret) body.client_secret = cfg.clientSecret
    const resp = await postTokenRequest(cfg.tokenUrl, body)
    return applyTokenResponse(cfg, resp)
}

interface OAuthCallbackMessage {
    kind: "oauth-callback"
    code?: string
    state?: string
    error?: string
    description?: string
}

function waitForOauthCallback(popup: Window, expectedState: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let pollId: ReturnType<typeof setInterval> | null = null
        const cleanup = () => {
            window.removeEventListener("message", onMessage)
            if (pollId) clearInterval(pollId)
        }
        const onMessage = (e: MessageEvent<unknown>) => {
            // SAME-ORIGIN enforcement: only trust messages from our own callback page.
            if (e.origin !== window.location.origin) return
            const data = e.data as OAuthCallbackMessage | undefined
            if (!data || data.kind !== "oauth-callback") return
            cleanup()
            try { popup.close() } catch { /* already closed */ }
            if (data.error) {
                reject(new Error(`OAuth error: ${data.error}${data.description ? ` — ${data.description}` : ""}`))
                return
            }
            if (data.state !== expectedState) {
                reject(new Error("OAuth state mismatch (possible CSRF)"))
                return
            }
            if (!data.code) {
                reject(new Error("OAuth callback missing authorization code"))
                return
            }
            resolve(data.code)
        }
        window.addEventListener("message", onMessage)

        // If the user closes the popup before completing, surface a clean error.
        pollId = setInterval(() => {
            if (popup.closed) {
                cleanup()
                reject(new Error("OAuth popup closed before completion"))
            }
        }, 500)
    })
}

export async function ensureFreshToken(cfg: OAuth2Config): Promise<OAuth2Config> {
    if (!isTokenExpired(cfg)) return cfg
    if (cfg.refreshToken) {
        try {
            return await refreshAccessToken(cfg)
        } catch (err) {
            // Refresh failed (revoked / network) — fall through to grant retry if applicable.
            if (cfg.grantType === "client_credentials") {
                return fetchClientCredentialsToken(cfg)
            }
            throw err
        }
    }
    if (cfg.grantType === "client_credentials") {
        return fetchClientCredentialsToken(cfg)
    }
    return cfg
}
