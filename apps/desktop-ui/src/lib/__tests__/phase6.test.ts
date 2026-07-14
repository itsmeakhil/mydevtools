import { STRING_MUTATIONS, NUMBER_MUTATIONS, generateFuzzCases, applyMutation } from "../fuzz/mutators"
import { exportPrometheus } from "../observability/prometheus-export"
import { recordMetric, recordCounter, clearAll } from "../observability/metrics"
import { importPostmanEnvironment, looksLikePostmanEnvironment } from "../import/postman-env"

describe("fuzz mutators", () => {
    it("string mutations include canonical edge cases", () => {
        const ids = STRING_MUTATIONS.map((m) => m.id)
        for (const expected of ["empty", "null", "huge", "sqli", "xss", "type-swap"]) {
            expect(ids).toContain(expected)
        }
    })

    it("applies a leaf mutation through a nested path", () => {
        const root = { user: { name: "alice", age: 30 } }
        const out = applyMutation(root, "user.name", "") as { user: { name: string } }
        expect(out.user.name).toBe("")
        // Original untouched.
        expect(root.user.name).toBe("alice")
    })

    it("walks nested object emitting per-field mutations", () => {
        const cases = [...generateFuzzCases({ a: "x", b: 1, c: { d: true } })]
        const paths = new Set(cases.map((c) => c.path))
        expect(paths.has("a")).toBe(true)
        expect(paths.has("b")).toBe(true)
        expect(paths.has("c.d")).toBe(true)
        // Each leaf yields multiple mutations.
        expect(cases.filter((c) => c.path === "a").length).toBe(STRING_MUTATIONS.length)
        expect(cases.filter((c) => c.path === "b").length).toBe(NUMBER_MUTATIONS.length)
    })
})

describe("prometheus export", () => {
    beforeEach(() => clearAll())

    it("emits HELP/TYPE blocks and counts", () => {
        recordMetric({ method: "GET", url: "https://api.test/x", status: 200, timeMs: 50, sizeBytes: 100 })
        recordMetric({ method: "POST", url: "https://api.test/y", status: 500, timeMs: 80, sizeBytes: 0 })
        recordCounter("plugin.fired", 3)

        const txt = exportPrometheus(1_700_000_000_000)
        expect(txt).toContain("# HELP mdt_requests_total")
        expect(txt).toContain("mdt_requests_total 2")
        expect(txt).toContain("mdt_requests_ok_total 1")
        expect(txt).toContain("mdt_requests_fail_total 1")
        expect(txt).toMatch(/mdt_requests_by_status_total\{status="200"\} 1/)
        expect(txt).toMatch(/mdt_requests_by_host_total\{host="api.test"\} 2/)
        expect(txt).toMatch(/mdt_user_counter\{name="plugin\.fired"\} 3/)
        expect(txt).toContain("# scraped_at 1700000000000")
    })

    it("escapes label values", () => {
        recordMetric({ method: "GET", url: 'https://a.test/"weird"', status: 200, timeMs: 1, sizeBytes: 0 })
        const txt = exportPrometheus()
        expect(txt).not.toMatch(/host="https.*"weird"/)
    })
})

describe("postman env import", () => {
    it("imports key/value pairs", () => {
        const env = importPostmanEnvironment(JSON.stringify({
            id: "x",
            name: "Prod",
            values: [
                { key: "host", value: "https://api.test", enabled: true, type: "default" },
                { key: "token", value: "secret", enabled: true, type: "secret" },
                { key: "disabled-var", value: "skip", enabled: false, type: "default" },
            ],
        }))
        expect(env.name).toBe("Prod")
        expect(env.variables).toHaveLength(3)
        expect(env.secretKeys).toEqual(["token"])
        const disabled = env.variables.find((v) => v.key === "disabled-var")
        expect(disabled?.enabled).toBe(false)
    })

    it("rejects non-environment input", () => {
        expect(() => importPostmanEnvironment("{}")).toThrow(/values/)
    })

    it("detects a Postman env via shape", () => {
        expect(looksLikePostmanEnvironment(JSON.stringify({ name: "x", values: [{ key: "a", value: "b" }] }))).toBe(true)
        // A Postman collection has `info` → should NOT match.
        expect(looksLikePostmanEnvironment(JSON.stringify({ info: { name: "X" }, item: [] }))).toBe(false)
        expect(looksLikePostmanEnvironment("not json")).toBe(false)
    })
})
