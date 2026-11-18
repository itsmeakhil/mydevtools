import { resolveVariable, staticVariables, substituteVariables, variablesToRecord } from "../variables"
import type { ApiResponse } from "@/components/api-client/types"

describe("resolveVariable precedence", () => {
    const scopes = {
        globals: { a: "global", g: "only-global" },
        collection: { a: "collection", c: "only-collection" },
        environment: { a: "env" },
        secrets: { "vault.k": "s3cret" },
    }

    it("environment > collection > globals", () => {
        expect(resolveVariable("a", scopes)).toBe("env")
        expect(resolveVariable("c", scopes)).toBe("only-collection")
        expect(resolveVariable("g", scopes)).toBe("only-global")
        const noEnv = { ...scopes, environment: {} }
        expect(resolveVariable("a", noEnv)).toBe("collection")
    })

    it("runtime scopes beat stored ones; unset hides everything below it", () => {
        expect(resolveVariable("a", { ...scopes, session: { a: "session" } })).toBe("session")
        expect(resolveVariable("a", { ...scopes, overlay: { a: "script" }, session: { a: "session" } })).toBe("script")
        expect(resolveVariable("a", { ...scopes, unsets: new Set(["a"]) })).toBeUndefined()
        expect(resolveVariable("a", { ...scopes, row: { a: "row" }, unsets: new Set(["a"]) })).toBe("row")
    })

    it("falls through to secrets then dynamic vars; ignores prototype keys", () => {
        expect(resolveVariable("vault.k", scopes)).toBe("s3cret")
        expect(resolveVariable("$guid", scopes)).toMatch(/^[0-9a-f-]{36}$/)
        expect(resolveVariable("constructor", scopes)).toBeUndefined()
    })

    it("reads response.* from the previous response only", () => {
        const previousResponse = { status: 201, statusText: "Created", headers: {}, body: '{"id":7}', time: 1, size: 1 } as ApiResponse
        expect(resolveVariable("response.body.id", { previousResponse })).toBe("7")
        expect(resolveVariable("response.body.id", {})).toBeUndefined()
    })

    it("substitutes and leaves unknown tokens as typed", () => {
        expect(substituteVariables("{{a}}/{{ c }}/{{nope}}", scopes)).toBe("env/only-collection/{{nope}}")
    })
})

describe("helpers", () => {
    it("staticVariables layers globals < collection < environment", () => {
        expect(staticVariables({ globals: { a: "1", b: "1" }, collection: { b: "2" }, environment: { c: "3" } }))
            .toEqual({ a: "1", b: "2", c: "3" })
    })

    it("variablesToRecord skips disabled and keyless rows", () => {
        expect(variablesToRecord([
            { key: "a", value: "1", active: true },
            { key: "b", value: "2", active: false },
            { key: "c", value: "3", enabled: false },
            { key: "", value: "x" },
            { key: "d", value: "4" },
        ])).toEqual({ a: "1", d: "4" })
    })
})
