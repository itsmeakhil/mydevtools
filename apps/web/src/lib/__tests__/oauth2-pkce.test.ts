import { generateVerifier, challengeFor, generateState } from "../oauth2-pkce"

// jest-environment-node has crypto.getRandomValues + crypto.subtle since Node 19+.
describe("oauth2-pkce", () => {
    it("generates verifiers in the URL-safe alphabet", () => {
        const v = generateVerifier()
        expect(v).toMatch(/^[A-Za-z0-9_-]+$/)
        // Default 64 bytes → ~86 base64url chars (no padding).
        expect(v.length).toBeGreaterThanOrEqual(43)
        expect(v.length).toBeLessThanOrEqual(128)
    })

    it("verifiers are unique across calls", () => {
        const a = generateVerifier()
        const b = generateVerifier()
        expect(a).not.toBe(b)
    })

    it("S256 challenge round-trip matches RFC 7636 §A.1 vector", async () => {
        // The RFC test vector — verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        // hashes to challenge "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM".
        const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        const challenge = await challengeFor(verifier)
        expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
    })

    it("state values are unique and URL-safe", () => {
        const s = generateState()
        expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(generateState()).not.toBe(s)
    })
})
