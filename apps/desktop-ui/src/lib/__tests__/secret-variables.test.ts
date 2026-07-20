import { collectSecretTokens, buildSecretMap } from "@/lib/secret-variables"

const vaultKeys = [
    { name: "stripe", apiKey: "sk_live_123", secret: "whsec_456" },
    { name: "plain.secret", apiKey: "literal-wins", secret: "nope" },
]

const envSets = [
    {
        project: "shop",
        environment: "production",
        variables: [
            { key: "DATABASE_URL", value: "postgres://prod" },
            { key: "API.BASE", value: "https://api.shop" },
        ],
    },
    { project: "shop", environment: "staging", variables: [{ key: "DATABASE_URL", value: "postgres://staging" }] },
]

describe("collectSecretTokens", () => {
    it("finds vault/env tokens, trims, dedupes, ignores plain vars", () => {
        const tokens = collectSecretTokens([
            "https://x.test/{{ vault.stripe }}?a={{baseUrl}}",
            '{"h":"{{env.shop.production.DATABASE_URL}}","again":"{{vault.stripe}}"}',
            undefined,
        ])
        expect(tokens.sort()).toEqual(["env.shop.production.DATABASE_URL", "vault.stripe"])
    })
})

describe("buildSecretMap", () => {
    it("resolves vault name to apiKey and .secret suffix to secret", () => {
        const map = buildSecretMap(["vault.stripe", "vault.stripe.secret"], vaultKeys, [])
        expect(map["vault.stripe"]).toBe("sk_live_123")
        expect(map["vault.stripe.secret"]).toBe("whsec_456")
    })

    it("prefers an entry literally named with a .secret suffix", () => {
        const map = buildSecretMap(["vault.plain.secret"], vaultKeys, [])
        expect(map["vault.plain.secret"]).toBe("literal-wins")
    })

    it("resolves env.<project>.<environment>.<KEY>, keys may contain dots", () => {
        const map = buildSecretMap(
            ["env.shop.production.DATABASE_URL", "env.shop.staging.DATABASE_URL", "env.shop.production.API.BASE"],
            [],
            envSets,
        )
        expect(map["env.shop.production.DATABASE_URL"]).toBe("postgres://prod")
        expect(map["env.shop.staging.DATABASE_URL"]).toBe("postgres://staging")
        expect(map["env.shop.production.API.BASE"]).toBe("https://api.shop")
    })

    it("omits unresolvable tokens", () => {
        const map = buildSecretMap(["vault.missing", "env.shop.production.NOPE", "env.short"], vaultKeys, envSets)
        expect(map).toEqual({})
    })
})
