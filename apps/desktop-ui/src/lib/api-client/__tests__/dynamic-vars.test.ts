import { DYNAMIC_VARS, classifyVariable, resolveDynamicVar } from "../dynamic-vars"

describe("resolveDynamicVar", () => {
    it("generates fresh values per call", () => {
        expect(resolveDynamicVar("$guid")).toMatch(/^[0-9a-f-]{36}$/)
        expect(resolveDynamicVar("$guid")).not.toBe(resolveDynamicVar("$guid"))
    })

    it("formats timestamps and numbers", () => {
        expect(Number(resolveDynamicVar("$timestamp"))).toBeCloseTo(Date.now() / 1000, -1)
        expect(resolveDynamicVar("$isoTimestamp")).toMatch(/^\d{4}-\d\d-\d\dT/)
        const n = Number(resolveDynamicVar("$randomInt"))
        expect(Number.isInteger(n) && n >= 0 && n <= 1000).toBe(true)
        expect(resolveDynamicVar("$randomEmail")).toMatch(/^[a-z.-]+@example\.com$/)
        expect(resolveDynamicVar("$randomHexColor")).toMatch(/^#[0-9a-f]{6}$/)
    })

    it("every generator returns a non-empty string", () => {
        for (const gen of Object.values(DYNAMIC_VARS)) expect(gen()).toMatch(/./)
    })

    it("ignores unknown names and prototype keys", () => {
        expect(resolveDynamicVar("$nope")).toBeUndefined()
        expect(resolveDynamicVar("toString")).toBeUndefined()
    })
})

describe("classifyVariable", () => {
    const env = { host: "api.test", $guid: "pinned" }

    it("prefers the environment, even over a dynamic name", () => {
        expect(classifyVariable("host", env)).toEqual({ status: "resolved", value: "api.test" })
        expect(classifyVariable("$guid", env)).toEqual({ status: "resolved", value: "pinned" })
    })

    it("recognises send-time sources and flags the rest as missing", () => {
        expect(classifyVariable("$timestamp", env).status).toBe("dynamic")
        expect(classifyVariable("response.body.token", env).status).toBe("response")
        expect(classifyVariable("vault.stripe", env).status).toBe("secret")
        expect(classifyVariable("env.app.prod.KEY", env).status).toBe("secret")
        expect(classifyVariable("tokn", env).status).toBe("missing")
        expect(classifyVariable("constructor", env).status).toBe("missing")
    })
})
