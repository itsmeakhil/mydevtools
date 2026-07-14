import { truncateBody } from "../truncate-body"
import { generateCode } from "../generate-code"
import type { ApiRequestState } from "../types"

const baseRequest = (
    overrides: Partial<ApiRequestState> = {},
): ApiRequestState => ({
    id: "t1",
    name: "test",
    method: "POST",
    url: "https://example.com",
    params: [],
    headers: [],
    body: { type: "text", content: "" },
    auth: { type: "none" },
    response: null,
    isLoading: false,
    ...overrides,
})

describe("truncateBody — UTF-16 surrogate safety (B35)", () => {
    it("does not split a surrogate pair", () => {
        // 🔒 is two code units (D83D DD12). 100 ASCII chars + emoji = length 102.
        const body = "a".repeat(100) + "🔒b"
        // Force the cut to land between the two halves of the emoji.
        const { inline } = truncateBody(body, 101)
        // Should back off by 1 so we don't leave a lonely high surrogate.
        expect(inline.length).toBe(100)
        expect(inline.endsWith("a")).toBe(true)
        // No replacement char after re-encode round-trip.
        expect(JSON.stringify(inline)).not.toMatch(/\\ud83d$/)
    })

    it("returns the full body when shorter than max", () => {
        const body = "hello"
        const { inline, truncated } = truncateBody(body, 10)
        expect(inline).toBe(body)
        expect(truncated).toBe(false)
    })
})

describe("generateCode Go body escape (B19)", () => {
    it("escapes CR, TAB, and other control characters", () => {
        const code = generateCode(
            baseRequest({
                body: { type: "text", content: "line1\r\nline2\tcol2" },
            }),
            "go",
        )
        // The Go source string must show \r, \n, \t — not the raw control chars.
        expect(code).toContain('"line1\\r\\nline2\\tcol2"')
        // And must not contain a bare CR / TAB inside the quoted string literal.
        // [\s\S] avoids the `s` flag — same effect, broader engine compatibility.
        const literalMatch = code.match(/strings\.NewReader\("([\s\S]+?)"\)/)
        expect(literalMatch).not.toBeNull()
        expect(literalMatch?.[1]).not.toMatch(/[\r\t]/)
    })
})
