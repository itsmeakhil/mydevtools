import { defaultVarName, loadVaultSecrets, maskEntries, maskFor } from "@/lib/terminal/secrets"
import { envVarOk } from "@/lib/terminal/env-vars"

jest.mock("@/lib/password-manager-api", () => ({ listPasswordEntries: jest.fn() }))
jest.mock("@/lib/api-key-vault-api", () => ({ listApiKeyEntries: jest.fn() }))
jest.mock("@/lib/encryption", () => ({ decryptData: jest.fn() }))
const { listPasswordEntries } = jest.requireMock("@/lib/password-manager-api")
const { listApiKeyEntries } = jest.requireMock("@/lib/api-key-vault-api")
const { decryptData } = jest.requireMock("@/lib/encryption")

/** Same rule as Rust `mask_ok` (terminal/mask.rs). */
const rustMaskOk = (name: string, value: string) =>
  /^[A-Z0-9_]{1,64}$/.test(name) && (n => n >= 8 && n <= 4096)(new TextEncoder().encode(value).length) && !value.includes("\0")

describe("defaultVarName", () => {
  it("label + field, uppercased", () => {
    expect(defaultVarName("GitHub", "password")).toBe("GITHUB_PASSWORD")
    expect(defaultVarName("Stripe live", "apiKey")).toBe("STRIPE_LIVE_API_KEY")
    expect(defaultVarName("aws", "secret")).toBe("AWS_SECRET")
    expect(defaultVarName("aws", "username")).toBe("AWS_USERNAME")
  })
  it("punctuation and non-ASCII collapse to single underscores", () => {
    expect(defaultVarName("My App (prod)", "password")).toBe("MY_APP_PROD_PASSWORD")
    expect(defaultVarName("Café — staging!", "apiKey")).toBe("CAFE_STAGING_API_KEY")
    expect(defaultVarName("日本", "secret")).toBe("SECRET")
  })
  it("a leading digit gets an underscore; long labels fit 64", () => {
    expect(defaultVarName("1password", "password")).toBe("_1PASSWORD_PASSWORD")
    const long = defaultVarName("x".repeat(100), "apiKey")
    expect(long.length).toBeLessThanOrEqual(64)
    expect(long.endsWith("_API_KEY")).toBe(true)
    for (const l of ["GitHub", "My App (prod)", "1password", "x".repeat(100), "日本", ""]) expect(envVarOk(defaultVarName(l, "password"), "v")).toBe(true)
  })
})

describe("maskFor", () => {
  const env = { GITHUB_TOKEN: "ghp_abcdefgh", PGPASSWORD: "longpassword", NODE_ENV: "production", API_KEY: "short", DB_HOST: "db.internal.example" }
  it("default: secret-looking names with values of 8+ bytes", () => {
    expect(maskFor(env, {})).toEqual({ GITHUB_TOKEN: "ghp_abcdefgh", PGPASSWORD: "longpassword" })
    expect(maskFor({ MYSQL_PWD: "12345678", REDISCLI_AUTH: "abcdefghi", my_apikey: "abcdefghij" }, {}))
      .toEqual({ MYSQL_PWD: "12345678", REDISCLI_AUTH: "abcdefghi", MY_APIKEY: "abcdefghij" })
  })
  it("default also catches KEY, PAT, DSN and WEBHOOK names, as whole name parts", () => {
    const e = { STRIPE_KEY: "sk_live_abcdef", GITHUB_PAT: "github_pat_abc", SENTRY_DSN: "https://k@sentry.io/1", SLACK_WEBHOOK_URL: "https://hooks.slack.com/x", MONKEY_NAME: "abcdefghij", PATH_PREFIX: "/usr/local/x" }
    expect(Object.keys(maskFor(e, {}))).toEqual(["STRIPE_KEY", "GITHUB_PAT", "SENTRY_DSN", "SLACK_WEBHOOK_URL"])
  })
  it("non-empty values too short to mask are reported", () => {
    expect(maskEntries(env, {}).tooShort).toEqual(["API_KEY"])
    expect(maskEntries({ PIN: "1234", EMPTY_TOKEN: "" }, { all: true }).tooShort).toEqual(["PIN"])
  })
  it("all: every value of 8+ bytes", () => {
    expect(maskFor(env, { all: true })).toEqual({ GITHUB_TOKEN: "ghp_abcdefgh", PGPASSWORD: "longpassword", NODE_ENV: "production", DB_HOST: "db.internal.example" })
  })
  it("labels and values always pass the Rust rule; too long ones are reported, not sent", () => {
    const big = "x".repeat(4097)
    const { mask, tooLong } = maskEntries({ "lower.case-name": "abcdefgh", ["T".repeat(80)]: "abcdefgh", BIG_SECRET: big, NUL_TOKEN: "abc\0defgh", EXACT_TOKEN: "é".repeat(2048) }, { all: true })
    expect(tooLong).toEqual(["BIG_SECRET"])
    expect(Object.values(mask)).not.toContain(big)
    expect(mask["LOWER_CASE_NAME"]).toBe("abcdefgh")
    expect(mask["EXACT_TOKEN"]).toBe("é".repeat(2048)) // 4096 bytes
    for (const [k, v] of Object.entries(mask)) expect(rustMaskOk(k, v)).toBe(true)
  })
  it("names that collide after uppercasing both stay masked; at most 64 entries", () => {
    const m = maskFor({ api_token: "aaaaaaaa", API_TOKEN: "bbbbbbbb" }, {})
    expect(Object.values(m).sort()).toEqual(["aaaaaaaa", "bbbbbbbb"])
    for (const k of Object.keys(m)) expect(rustMaskOk(k, "aaaaaaaa")).toBe(true)
    const many = Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`T${i}_TOKEN`, `secret-${i}-value`]))
    const r = maskEntries(many, {})
    expect(Object.keys(r.mask)).toHaveLength(64)
    expect(r.tooMany).toHaveLength(6)
  })
  it("every masked value is one of the env values", () => {
    const e = { A_TOKEN: "abcdefgh", B: "zzzzzzzzz" }
    for (const v of Object.values(maskFor(e, { all: true }))) expect(Object.values(e)).toContain(v)
  })
})

describe("loadVaultSecrets", () => {
  it("decrypts passwords and API keys, keeps non-empty secret fields, skips unreadable rows", async () => {
    listPasswordEntries.mockResolvedValueOnce([{ id: "p1", encryptedData: "e1", iv: "i" }, { id: "p2", encryptedData: "bad", iv: "i" }])
    listApiKeyEntries.mockResolvedValueOnce([{ id: "k1", encryptedData: "e2", iv: "i" }])
    decryptData.mockImplementation(async (_k: CryptoKey, data: string) => {
      if (data === "e1") return JSON.stringify({ service: "GitHub", username: "me", password: "pw-123456", url: "https://github.com" })
      if (data === "e2") return JSON.stringify({ name: "Stripe live", apiKey: "sk_live_x", secret: "", env: "production", notes: "" })
      throw new Error("bad")
    })
    await expect(loadVaultSecrets({} as CryptoKey)).resolves.toEqual([
      { id: "p1", source: "password", label: "GitHub", fields: { password: "pw-123456", username: "me" } },
      { id: "k1", source: "apiKey", label: "Stripe live", fields: { apiKey: "sk_live_x" } },
    ])
  })
})
