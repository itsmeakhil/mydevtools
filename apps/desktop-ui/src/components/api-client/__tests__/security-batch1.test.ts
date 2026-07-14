import { encodeBasicCredentials } from "@/lib/basic-auth"
import { generateCode } from "../generate-code"
import type { ApiRequestState } from "../types"

const baseRequest = (
    overrides: Partial<ApiRequestState> = {},
): ApiRequestState => ({
    id: "t1",
    name: "test",
    method: "GET",
    url: "https://example.com/path",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    response: null,
    isLoading: false,
    ...overrides,
})

describe("encodeBasicCredentials", () => {
    it("encodes ASCII creds the same as btoa", () => {
        expect(encodeBasicCredentials("alice", "hunter2")).toBe(btoa("alice:hunter2"))
    })

    it("handles UTF-8 in passwords without throwing", () => {
        // raw btoa would throw on this — InvalidCharacterError
        const encoded = encodeBasicCredentials("user", "pässwörd🔒")
        // Decode back through TextDecoder and compare bytes.
        const bin = atob(encoded)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const decoded = new TextDecoder().decode(bytes)
        expect(decoded).toBe("user:pässwörd🔒")
    })
})

describe("generateCode curl shell-escaping", () => {
    it("escapes single quotes inside header values", () => {
        const code = generateCode(
            baseRequest({
                headers: [
                    { id: "h1", key: "X-Note", value: "it's mine", active: true },
                ],
            }),
            "curl",
        )
        expect(code).toContain("'X-Note: it'\\''s mine'")
    })

    it("escapes single quotes inside form-data text values", () => {
        const code = generateCode(
            baseRequest({
                method: "POST",
                body: {
                    type: "form-data",
                    content: "",
                    formData: [
                        { id: "f1", key: "note", value: "can't stop", active: true, valueType: "text" },
                    ],
                },
            }),
            "curl",
        )
        expect(code).toContain("'note=can'\\''t stop'")
    })

    it("emits utf-8 safe Basic header", () => {
        const code = generateCode(
            baseRequest({
                auth: { type: "basic", username: "user", password: "pässwörd" },
            }),
            "curl",
        )
        const expected = `Basic ${encodeBasicCredentials("user", "pässwörd")}`
        expect(code).toContain(expected)
    })
})
