import { normalizeMethod } from "../http-method"

describe("normalizeMethod", () => {
    it("uppercases valid tokens, standard or custom", () => {
        expect(normalizeMethod("get")).toBe("GET")
        expect(normalizeMethod(" propfind ")).toBe("PROPFIND")
        expect(normalizeMethod("M-SEARCH")).toBe("M-SEARCH")
    })

    it("rejects empty, spaced or non-token input", () => {
        expect(normalizeMethod("")).toBeNull()
        expect(normalizeMethod("GET X")).toBeNull()
        expect(normalizeMethod("PO(ST")).toBeNull()
        expect(normalizeMethod(undefined)).toBeNull()
    })
})
