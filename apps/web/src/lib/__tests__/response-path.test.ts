import { parseResponsePath, resolveResponsePath } from "../response-path"
import type { ApiResponse } from "@/components/api-client/types"

describe("parseResponsePath", () => {
    it("splits dot paths", () => {
        expect(parseResponsePath("body.users")).toEqual(["body", "users"])
    })
    it("emits numeric indexes", () => {
        expect(parseResponsePath("body.users[0].id")).toEqual(["body", "users", 0, "id"])
    })
    it("handles chained indexes", () => {
        expect(parseResponsePath("body.matrix[2][1]")).toEqual(["body", "matrix", 2, 1])
    })
})

const resp: ApiResponse = {
    status: 200,
    statusText: "OK",
    headers: { "X-Trace": "abc", "Content-Type": "application/json" },
    body: JSON.stringify({
        token: "tok-xyz",
        users: [{ id: 1, name: "alice" }, { id: 2, name: "bob" }],
    }),
    time: 12,
    size: 88,
}

describe("resolveResponsePath", () => {
    it("returns status as string", () => {
        expect(resolveResponsePath("status", resp)).toBe("200")
    })
    it("returns statusText", () => {
        expect(resolveResponsePath("statusText", resp)).toBe("OK")
    })
    it("returns headers case-insensitively", () => {
        expect(resolveResponsePath("headers.x-trace", resp)).toBe("abc")
        expect(resolveResponsePath("headers.X-TRACE", resp)).toBe("abc")
    })
    it("returns top-level body keys", () => {
        expect(resolveResponsePath("body.token", resp)).toBe("tok-xyz")
    })
    it("returns nested body keys with array indexes", () => {
        expect(resolveResponsePath("body.users[1].name", resp)).toBe("bob")
    })
    it("stringifies object leaves", () => {
        const out = resolveResponsePath("body.users[0]", resp)
        expect(out).toBe('{"id":1,"name":"alice"}')
    })
    it("returns undefined on miss", () => {
        expect(resolveResponsePath("body.missing", resp)).toBeUndefined()
        expect(resolveResponsePath("status", null)).toBeUndefined()
    })
})
