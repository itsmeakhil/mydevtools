const apiFetch = jest.fn()
jest.mock("@/lib/desktop/api-fetch", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }))

import { ensureFreshToken, fetchPasswordToken, type OAuth2Config } from "../oauth2"

/** Form fields of the token request the last apiFetch call sent through the proxy. */
const sentForm = () => Object.fromEntries(new URLSearchParams(JSON.parse(apiFetch.mock.calls.at(-1)![1].body).body))

beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({ json: async () => ({ status: 200, body: JSON.stringify({ access_token: "AT", expires_in: 60 }) }) })
})

const cfg: OAuth2Config = {
    grantType: "password",
    tokenUrl: "https://auth.test/token",
    clientId: "cid",
    username: "ada",
    password: "s3cret",
    scope: "read",
}

describe("password grant", () => {
    it("posts the resource-owner credentials and stores the token", async () => {
        const out = await fetchPasswordToken(cfg)
        expect(sentForm()).toEqual({ grant_type: "password", username: "ada", password: "s3cret", client_id: "cid", scope: "read" })
        expect(out.accessToken).toBe("AT")
    })

    it("requires a username", async () => {
        await expect(fetchPasswordToken({ ...cfg, username: "" })).rejects.toThrow(/username/)
        expect(apiFetch).not.toHaveBeenCalled()
    })

    it("is re-run automatically when the token has expired", async () => {
        await ensureFreshToken({ ...cfg, accessToken: "old", expiresAt: Date.now() - 1 })
        expect(sentForm().grant_type).toBe("password")
    })
})

describe("refresh_token grant", () => {
    it("exchanges the pasted refresh token on expiry", async () => {
        await ensureFreshToken({ grantType: "refresh_token", tokenUrl: "https://auth.test/token", clientId: "", refreshToken: "RT" })
        expect(sentForm()).toEqual({ grant_type: "refresh_token", refresh_token: "RT" })
    })
})
