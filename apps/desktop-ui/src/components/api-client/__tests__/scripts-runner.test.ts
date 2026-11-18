/**
 * Tests for the sandboxed script runner (phase 2 batch 1).
 *
 * Same pattern as use-json-formatter.test.ts: the worker module's pure logic is
 * exercised directly. Web Worker / Comlink round-trip needs a worker-aware env
 * which Jest's jsdom doesn't provide.
 */

type RunnerApi = {
    run: (script: string, ctx: ScriptContext, host?: ScriptHost) => Promise<{
        ok: boolean
        error?: string
        tests: { name: string; pass: boolean; error?: string }[]
        logs: { level: string; args: string[] }[]
        environment: Record<string, string>
        variables: Record<string, string>
        request: { url: string; method: string; headers: Record<string, string>; body?: string }
    }>
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
import type { ScriptHost } from "@/lib/api-client/script-sandbox"

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
    it("pm.test passes when assertion holds", async () => {
        const r = await api.run(
            `pm.test("ok", () => pm.expect(1 + 1).toBe(2))`,
            baseCtx(),
        )
        expect(r.ok).toBe(true)
        expect(r.tests).toEqual([{ name: "ok", pass: true }])
    })

    it("pm.test fails when assertion throws", async () => {
        const r = await api.run(
            `pm.test("nope", () => pm.expect(1).toBe(2))`,
            baseCtx(),
        )
        expect(r.tests[0].pass).toBe(false)
        expect(r.tests[0].error).toMatch(/to be 2/)
    })

    it("pm.environment.set mutates the env passed back to the caller", async () => {
        const r = await api.run(
            `pm.environment.set("token", "abc123")`,
            baseCtx({ environment: { existing: "v" } }),
        )
        expect(r.environment).toEqual({ existing: "v", token: "abc123" })
    })

    it("pm.environment.unset removes a key", async () => {
        const r = await api.run(
            `pm.environment.unset("dropme")`,
            baseCtx({ environment: { dropme: "x", keep: "y" } }),
        )
        expect(r.environment).toEqual({ keep: "y" })
    })

    it("pm.variables.set is session-only (kept separate from environment)", async () => {
        const r = await api.run(
            `pm.variables.set("session_x", "s")`,
            baseCtx({ environment: { e: "1" } }),
        )
        expect(r.variables).toEqual({ session_x: "s" })
        // Env should not be touched.
        expect(r.environment).toEqual({ e: "1" })
    })

    it("pm.request mutations propagate to caller", async () => {
        const r = await api.run(
            `
            pm.request.headers.add("Authorization", "Bearer " + pm.environment.get("tok"))
            pm.request.url = "https://override.example.com"
            `,
            baseCtx({ environment: { tok: "secret" } }),
        )
        expect(r.request.headers["Authorization"]).toBe("Bearer secret")
        expect(r.request.url).toBe("https://override.example.com")
    })

    it("pm.response.json parses the response body in test scripts", async () => {
        const r = await api.run(
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

    it("syntax errors are reported in `error`, not thrown out", async () => {
        const r = await api.run(`this is not valid javascript ===`, baseCtx())
        expect(r.ok).toBe(false)
        expect(r.error).toBeDefined()
    })

    it("console.log calls land in logs", async () => {
        const r = await api.run(`console.log("hello", { a: 1 })`, baseCtx())
        expect(r.logs[0].args).toEqual(["hello", '{"a":1}'])
    })

    it("chai-style expect works via pm.expect, bare expect and pm.response.to", async () => {
        const r = await api.run(
            `pm.test("chai", () => pm.expect(pm.response.json().items).to.have.lengthOf(2))
             pm.test("bare", () => expect(pm.response.json()).to.have.property("items").that.is.an("array"))
             pm.test("status", () => pm.response.to.have.status(201))
             pm.test("fails readably", () => pm.expect(pm.response.code).to.equal(200))`,
            baseCtx({
                response: { status: 201, statusText: "Created", headers: {}, body: '{"items":[1,2]}', time: 5 },
            }),
        )
        expect(r.tests.map((t) => t.pass)).toEqual([true, true, true, false])
        expect(r.tests[3].error).toBe("expected 201 to equal 200")
    })
})

describe("scripts-runner: async scripts and pm.sendRequest", () => {
    const fakeHost = (status = 200, body = '{"token":"t1"}') => {
        const calls: unknown[] = []
        const host: ScriptHost = {
            async sendRequest(req) {
                calls.push(req)
                await new Promise((r) => setTimeout(r, 5))
                return { status, statusText: "OK", headers: { "content-type": "application/json" }, body, time: 3 }
            },
        }
        return { host, calls }
    }

    it("top-level await on pm.sendRequest, then use the response", async () => {
        const { host, calls } = fakeHost()
        const r = await api.run(
            `const res = await pm.sendRequest({ url: "https://auth.test/token", method: "post",
                 header: [{ key: "X-A", value: "1" }], body: { mode: "raw", raw: "{}" } })
             pm.environment.set("token", res.json().token)
             pm.test("ok", () => pm.expect(res).to.have.status(200))`,
            baseCtx(),
            host,
        )
        expect(r.ok).toBe(true)
        expect(r.environment.token).toBe("t1")
        expect(r.tests).toEqual([{ name: "ok", pass: true }])
        expect(calls).toEqual([{ url: "https://auth.test/token", method: "POST", headers: { "X-A": "1" }, body: "{}" }])
        expect(r.logs[0].args).toEqual(["pm.sendRequest", "POST https://auth.test/token", "→", "200"])
    })

    it("callback style is awaited even when the script doesn't await", async () => {
        const { host } = fakeHost()
        const r = await api.run(
            `pm.sendRequest("https://x.test", (err, res) => {
                 pm.variables.set("got", res.json().token)
                 pm.test("in callback", () => pm.expect(err).to.be.null)
             })`,
            baseCtx(),
            host,
        )
        expect(r.ok).toBe(true)
        expect(r.variables.got).toBe("t1")
        expect(r.tests[0]).toEqual({ name: "in callback", pass: true })
    })

    it("async pm.test bodies are awaited and keep script order", async () => {
        const r = await api.run(
            `pm.test("slow", async () => { await new Promise(r => setTimeout(r, 10)); pm.expect(1).to.equal(2) })
             pm.test("fast", () => {})`,
            baseCtx(),
        )
        expect(r.tests.map((t) => [t.name, t.pass])).toEqual([["slow", false], ["fast", true]])
        expect(r.tests[0].error).toBe("expected 1 to equal 2")
    })

    it("request errors reject (awaited) or reach the callback; callback throws fail the script", async () => {
        const host: ScriptHost = { sendRequest: async () => { throw new Error("Blocked: cloud metadata host") } }
        const awaited = await api.run(`await pm.sendRequest("http://169.254.169.254")`, baseCtx(), host)
        expect(awaited.ok).toBe(false)
        expect(awaited.error).toMatch(/Blocked/)
        expect(awaited.logs[0].level).toBe("error")

        const cb = await api.run(`pm.sendRequest("http://x", (err) => { pm.variables.set("e", err.message) })`, baseCtx(), host)
        expect(cb.ok).toBe(true)
        expect(cb.variables.e).toMatch(/Blocked/)

        const throwing = await api.run(`pm.sendRequest("http://x", () => { throw new Error("boom") })`, baseCtx(), host)
        expect(throwing.ok).toBe(false)
        expect(throwing.error).toBe("boom")
    })

    it("pm.sendRequest without a host fails clearly", async () => {
        const r = await api.run(`await pm.sendRequest("https://x.test")`, baseCtx())
        expect(r.ok).toBe(false)
        expect(r.error).toMatch(/not available/)
    })
})
