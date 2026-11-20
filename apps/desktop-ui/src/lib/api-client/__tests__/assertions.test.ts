import {
    evaluateAssertions,
    parseBruAssertion,
    resolveAssertionTarget,
    type Assertion,
    type AssertionOperator,
} from "../assertions"

const res = {
    status: 201,
    headers: { "Content-Type": "application/json; charset=utf-8", "X-Count": "3" },
    body: JSON.stringify({ data: [{ id: 7, email: "a@x.io", tags: ["x", "y"] }, { id: 9, email: null }], ok: true, empty: [] }),
    time: 120,
}

const row = (target: string, operator: AssertionOperator, value = "", enabled = true): Assertion => ({
    id: target + operator + value,
    enabled,
    target,
    operator,
    value,
})

const run = (target: string, operator: AssertionOperator, value = "") =>
    evaluateAssertions([row(target, operator, value)], res)[0]

describe("resolveAssertionTarget", () => {
    it("reads status, time, headers (case-insensitive) and body paths", () => {
        expect(resolveAssertionTarget("res.status", res)).toBe(201)
        expect(resolveAssertionTarget("res.responseTime", res)).toBe(120)
        expect(resolveAssertionTarget("res.headers.content-type", res)).toBe("application/json; charset=utf-8")
        expect(resolveAssertionTarget("res.body.data[0].id", res)).toBe(7)
        expect(resolveAssertionTarget("res.body.data[*].id", res)).toEqual([7, 9])
        expect(resolveAssertionTarget("res.body..email", res)).toEqual(["a@x.io", null])
        expect(resolveAssertionTarget("res.body.missing", res)).toBeUndefined()
    })

    it("returns the raw body when it isn't JSON, and undefined for paths into it", () => {
        const text = { ...res, body: "hello" }
        expect(resolveAssertionTarget("res.body", text)).toBe("hello")
        expect(resolveAssertionTarget("res.body.x", text)).toBeUndefined()
    })

    it("throws on unknown targets", () => {
        expect(() => resolveAssertionTarget("req.url", res)).toThrow(/Unknown target/)
    })
})

describe("evaluateAssertions", () => {
    it.each<[string, AssertionOperator, string, boolean]>([
        ["res.status", "eq", "201", true],
        ["res.status", "eq", "200", false],
        ["res.status", "neq", "200", true],
        ["res.headers.x-count", "eq", "3", true], // string header vs number
        ["res.body.data[0].email", "eq", '"a@x.io"', true],
        ["res.body.data[0].email", "eq", "a@x.io", true], // unquoted text
        ["res.body.data[0].tags", "eq", '["x","y"]', true],
        ["res.responseTime", "lt", "500", true],
        ["res.responseTime", "gte", "120", true],
        ["res.status", "gt", "abc", false],
        ["res.status", "in", "[200,201]", true],
        ["res.status", "in", "200, 204", false],
        ["res.status", "notIn", "200,204", true],
        ["res.headers.content-type", "contains", "json", true],
        ["res.body.data[0].tags", "contains", "y", true],
        ["res.body.data[0].tags", "notContains", "z", true],
        ["res.headers.content-type", "startsWith", "application/", true],
        ["res.body.data[0].email", "matches", "^a@.+\\.io$", true],
        ["res.body.data[0].email", "notMatches", "gmail", true],
        ["res.body.data[1].email", "isNull", "", true],
        ["res.body.nope", "isUndefined", "", true],
        ["res.body.data", "isDefined", "", true],
        ["res.body.empty", "isEmpty", "", true],
        ["res.body.data", "isNotEmpty", "", true],
        ["res.body.ok", "isTruthy", "", true],
        ["res.body.ok", "isBoolean", "", true],
        ["res.status", "isNumber", "", true],
        ["res.body.data[0].email", "isString", "", true],
        ["res.body.data", "isArray", "", true],
        ["res.body", "isJson", "", true],
        ["res.status", "isJson", "", false],
    ])("%s %s %s → %s", (target, op, value, pass) => {
        expect(run(target, op, value).pass).toBe(pass)
    })

    it("names results after the row and explains failures", () => {
        expect(run("res.status", "eq", "200")).toEqual({
            name: "res.status eq 200",
            pass: false,
            error: "expected 201 to be eq 200",
        })
        expect(run("res.body.data", "isDefined").name).toBe("res.body.data isDefined")
    })

    it("fails (never throws) on a bad regex or path", () => {
        expect(run("res.status", "matches", "(").pass).toBe(false)
        expect(run("res.body.data[", "isDefined").pass).toBe(false)
    })

    it("skips disabled and blank rows", () => {
        expect(evaluateAssertions([row("res.status", "eq", "201", false), row("  ", "eq", "1")], res)).toEqual([])
        expect(evaluateAssertions(undefined, res)).toEqual([])
    })
})

describe("parseBruAssertion", () => {
    it("splits operator and value", () => {
        expect(parseBruAssertion("eq 200")).toEqual({ operator: "eq", value: "200" })
        expect(parseBruAssertion('contains "a b"')).toEqual({ operator: "contains", value: '"a b"' })
        expect(parseBruAssertion("isDefined")).toEqual({ operator: "isDefined", value: "" })
        expect(parseBruAssertion("between 1,2")).toBeNull()
    })
})
