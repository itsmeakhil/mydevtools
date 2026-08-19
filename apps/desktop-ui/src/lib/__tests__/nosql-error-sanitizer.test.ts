import { sanitizeError } from "../nosql-error-sanitizer"

describe("sanitizeError", () => {
    it("scrubs a connection string with a path and query", () => {
        const out = sanitizeError(
            new Error("connect failed: mongodb://user:pw@host:27017/db?ssl=true retrying")
        )
        expect(out).not.toContain("pw@host")
        expect(out).toContain("mongodb://***SANITIZED***")
        expect(out).toContain("retrying")
    })

    it("scrubs mongodb+srv the same way", () => {
        expect(sanitizeError("mongodb+srv://u:p@cluster0.example.net/app")).toBe(
            "mongodb://***SANITIZED***"
        )
    })

    it("still scrubs bare user:password@ pairs and emails", () => {
        expect(sanitizeError("auth failed for admin:hunter2@db")).toContain("***:***@")
        expect(sanitizeError("no user alice@example.com")).toContain("***@***")
    })

    it("does not backtrack on a long near-match", () => {
        const input = `mongodb://${"a/".repeat(20000)} `
        const start = Date.now()
        sanitizeError(input)
        expect(Date.now() - start).toBeLessThan(1000)
    })
})
