import { parseCron, cronMatches } from "../scheduling/cron"
import { encryptSecret, decryptSecret, isVaultValue } from "../vault/env-vault"
import { completeBody } from "../ai/schema-complete"
import { diffJson } from "../diff/json-diff"

describe("cron", () => {
    it("parses 5-field expression", () => {
        const p = parseCron("*/15 9-17 * * 1-5")
        expect(p.minutes.has(0)).toBe(true)
        expect(p.minutes.has(15)).toBe(true)
        expect(p.minutes.has(7)).toBe(false)
        expect(p.hours.has(12)).toBe(true)
        expect(p.hours.has(20)).toBe(false)
        expect(p.daysOfWeek.has(3)).toBe(true)  // Wed
        expect(p.daysOfWeek.has(0)).toBe(false) // Sun
    })

    it("matches a specific date", () => {
        const p = parseCron("0 12 * * *")
        // Use a date set to noon explicitly
        const noon = new Date(2024, 0, 15, 12, 0, 0)
        const elevenish = new Date(2024, 0, 15, 11, 59, 0)
        expect(cronMatches(p, noon)).toBe(true)
        expect(cronMatches(p, elevenish)).toBe(false)
    })

    it("supports comma-list + range + step", () => {
        const p = parseCron("0,30 0-23/3 1,15 * *")
        expect(p.minutes.size).toBe(2)
        expect(p.hours.has(0)).toBe(true)
        expect(p.hours.has(3)).toBe(true)
        expect(p.hours.has(4)).toBe(false)
        expect(p.daysOfMonth.has(15)).toBe(true)
    })

    it("rejects malformed expression", () => {
        expect(() => parseCron("0 12")).toThrow()
    })
})

describe("env-vault", () => {
    it("encrypts and decrypts round-trip", async () => {
        const entry = await encryptSecret("super-secret", "p4ssw0rd")
        expect(isVaultValue(entry.encrypted)).toBe(true)
        const plain = await decryptSecret(entry, "p4ssw0rd")
        expect(plain).toBe("super-secret")
    })

    it("rejects wrong passphrase", async () => {
        const entry = await encryptSecret("secret", "right")
        await expect(decryptSecret(entry, "wrong")).rejects.toThrow()
    })

    it("rejects non-vault input", async () => {
        await expect(decryptSecret("plaintext", "p")).rejects.toThrow(/Not a vault/)
    })
})

describe("schema completion", () => {
    it("fills required fields the user missed", () => {
        const schema = {
            type: "object",
            required: ["name", "email"],
            properties: {
                name: { type: "string" },
                email: { type: "string", format: "email" },
                age: { type: "integer" },
            },
        }
        const out = completeBody(schema, { name: "alice" }) as Record<string, unknown>
        expect(out.name).toBe("alice")
        expect(out.email).toBe("user@example.com")
    })

    it("recurses into nested objects", () => {
        const schema = {
            type: "object",
            required: ["addr"],
            properties: {
                addr: {
                    type: "object",
                    required: ["city"],
                    properties: { city: { type: "string" }, zip: { type: "string" } },
                },
            },
        }
        const out = completeBody(schema, {}) as Record<string, Record<string, unknown>>
        expect(out.addr.city).toBe("")
    })

    it("preserves user-typed values inside required props", () => {
        const schema = {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string" } },
        }
        const out = completeBody(schema, { name: "bob", extra: 42 }) as Record<string, unknown>
        expect(out.name).toBe("bob")
        expect(out.extra).toBe(42)
    })
})

describe("json diff", () => {
    it("flags adds + removes + changes", () => {
        const a = { name: "alice", age: 30, tags: ["x", "y"] }
        const b = { name: "alice", age: 31, tags: ["x", "z"], extra: true }
        const entries = diffJson(a, b)
        const kinds = entries.reduce<Record<string, number>>((m, e) => { m[e.kind] = (m[e.kind] ?? 0) + 1; return m }, {})
        expect(kinds.change).toBeGreaterThanOrEqual(2)
        expect(kinds.add).toBeGreaterThanOrEqual(1)
    })

    it("emits nothing when identical", () => {
        expect(diffJson({ a: 1 }, { a: 1 })).toEqual([])
    })

    it("handles array-length differences", () => {
        const entries = diffJson([1, 2, 3], [1, 2])
        expect(entries).toContainEqual({ path: "[2]", kind: "remove", before: 3 })
    })
})
