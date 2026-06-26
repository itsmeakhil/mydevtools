/**
 * Tests for the sandboxed script runner (phase 2 batch 1).
 *
 * Same pattern as use-json-formatter.test.ts: the worker module's pure logic is
 * exercised directly. Web Worker / Comlink round-trip needs a worker-aware env
 * which Jest's jsdom doesn't provide.
 */

type RunnerApi = {
    run: (script: string, ctx: ScriptContext) => {
        ok: boolean
        error?: string
        tests: { name: string; pass: boolean; error?: string }[]
        logs: { level: string; args: string[] }[]
        environment: Record<string, string>
        variables: Record<string, string>
        request: { url: string; method: string; headers: Record<string, string>; body?: string }
    }
}

// Comlink's `expose` is mocked to stash whatever the module hands it onto the
// mock object itself — that gives the test a way to call the worker's pure
// `api.run(...)` directly, with no MessageChannel plumbing.
jest.mock("comlink", () => {
    const captured = { current: null as RunnerApi | null }
    return {
        expose: (a: RunnerApi) => { captured.current = a },
        __captured: captured,
    }
})

// Importing the worker module triggers its `Comlink.expose(api)` side-effect,
// which the mock above captures.
import "../workers/scripts-runner.worker"
import type { ScriptContext } from "../workers/scripts-runner.worker"

const comlinkMock = jest.requireMock("comlink") as { __captured: { current: RunnerApi | null } }
const api: RunnerApi = (() => {
    const a = comlinkMock.__captured.current
    if (!a) throw new Error("scripts-runner worker did not call expose()")
    return a
})()

const baseCtx = (over: Partial<ScriptContext> = {}): ScriptContext => ({
    request: { url: "https://example.com", method: "GET", headers: {} },
    environment: {},
    variables: {},
    ...over,
})

describe("scripts-runner: basic Postman API", () => {
    it("pm.test passes when assertion holds", () => {
        const r = api.run(
            `pm.test("ok", () => pm.expect(1 + 1).toBe(2))`,
            baseCtx(),
        )
        expect(r.ok).toBe(true)
        expect(r.tests).toEqual([{ name: "ok", pass: true }])
    })

    it("pm.test fails when assertion throws", () => {
        const r = api.run(
            `pm.test("nope", () => pm.expect(1).toBe(2))`,
            baseCtx(),
        )
        expect(r.tests[0].pass).toBe(false)
        expect(r.tests[0].error).toMatch(/to be 2/)
    })

    it("pm.environment.set mutates the env passed back to the caller", () => {
        const r = api.run(
            `pm.environment.set("token", "abc123")`,
            baseCtx({ environment: { existing: "v" } }),
        )
        expect(r.environment).toEqual({ existing: "v", token: "abc123" })
    })

    it("pm.environment.unset removes a key", () => {
        const r = api.run(
            `pm.environment.unset("dropme")`,
            baseCtx({ environment: { dropme: "x", keep: "y" } }),
        )
        expect(r.environment).toEqual({ keep: "y" })
    })

    it("pm.variables.set is session-only (kept separate from environment)", () => {
        const r = api.run(
            `pm.variables.set("session_x", "s")`,
            baseCtx({ environment: { e: "1" } }),
        )
        expect(r.variables).toEqual({ session_x: "s" })
        // Env should not be touched.
        expect(r.environment).toEqual({ e: "1" })
    })

    it("pm.request mutations propagate to caller", () => {
        const r = api.run(
            `
            pm.request.headers.add("Authorization", "Bearer " + pm.environment.get("tok"))
            pm.request.url = "https://override.example.com"
            `,
            baseCtx({ environment: { tok: "secret" } }),
        )
        expect(r.request.headers["Authorization"]).toBe("Bearer secret")
        expect(r.request.url).toBe("https://override.example.com")
    })

    it("pm.response.json parses the response body in test scripts", () => {
        const r = api.run(
            `pm.test("body has id", () => pm.expect(pm.response.json()).toHaveProperty("id"))`,
            baseCtx({
                response: {
                    status: 200,
                    statusText: "OK",
                    headers: { "content-type": "application/json" },
                    body: '{"id": 42}',
                    time: 12,
                },
            }),
        )
        expect(r.tests[0].pass).toBe(true)
    })

    it("syntax errors are reported in `error`, not thrown out", () => {
        const r = api.run(`this is not valid javascript ===`, baseCtx())
        expect(r.ok).toBe(false)
        expect(r.error).toBeDefined()
    })

    it("console.log calls land in logs", () => {
        const r = api.run(`console.log("hello", { a: 1 })`, baseCtx())
        expect(r.logs[0].args).toEqual(["hello", '{"a":1}'])
    })
})
