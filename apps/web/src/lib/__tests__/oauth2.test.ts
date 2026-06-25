import { applyTokenResponse, isTokenExpired, type OAuth2Config } from "../oauth2"

const baseCfg: OAuth2Config = {
    grantType: "client_credentials",
    tokenUrl: "https://auth.example.com/token",
    clientId: "abc",
}

describe("isTokenExpired", () => {
    it("treats no token as expired", () => {
        expect(isTokenExpired(baseCfg)).toBe(true)
    })

    it("treats present token with no expiry as long-lived (not expired)", () => {
        expect(isTokenExpired({ ...baseCfg, accessToken: "x" })).toBe(false)
    })

    it("treats future expiry as not expired", () => {
        expect(isTokenExpired({ ...baseCfg, accessToken: "x", expiresAt: Date.now() + 60_000 })).toBe(false)
    })

    it("treats past expiry as expired", () => {
        expect(isTokenExpired({ ...baseCfg, accessToken: "x", expiresAt: Date.now() - 1000 })).toBe(true)
    })

    it("treats imminent expiry within leeway as expired", () => {
        // Default leeway is 30s.
        expect(isTokenExpired({ ...baseCfg, accessToken: "x", expiresAt: Date.now() + 5_000 })).toBe(true)
    })
})

describe("applyTokenResponse", () => {
    it("merges access_token + computes expiresAt from expires_in", () => {
        const before = Date.now()
        const out = applyTokenResponse(baseCfg, {
            access_token: "AT",
            expires_in: 3600,
            token_type: "Bearer",
            refresh_token: "RT",
        })
        expect(out.accessToken).toBe("AT")
        expect(out.refreshToken).toBe("RT")
        expect(out.tokenType).toBe("Bearer")
        expect(out.expiresAt).toBeGreaterThanOrEqual(before + 3590_000)
    })

    it("preserves existing refreshToken when response omits it", () => {
        const out = applyTokenResponse(
            { ...baseCfg, refreshToken: "PREV" },
            { access_token: "NEW", expires_in: 60 },
        )
        expect(out.refreshToken).toBe("PREV")
    })

    it("defaults tokenType to Bearer", () => {
        const out = applyTokenResponse(baseCfg, { access_token: "X" })
        expect(out.tokenType).toBe("Bearer")
        expect(out.expiresAt).toBeUndefined()
    })
})
