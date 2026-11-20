import type { ScriptTestResult } from "@/components/api-client/types"
import { queryJsonPath } from "./jsonpath"

/**
 * Declarative assertions (Bruno-style `res.status eq 200` rows). Evaluated in
 * plain TS — no eval — and reported as ordinary test results next to `pm.test`.
 */

export const ASSERTION_OPERATORS = [
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "notIn",
    "contains", "notContains", "startsWith", "endsWith", "matches", "notMatches",
    "isNull", "isUndefined", "isDefined", "isEmpty", "isNotEmpty", "isTruthy", "isFalsy",
    "isNumber", "isString", "isBoolean", "isArray", "isJson",
] as const

export type AssertionOperator = (typeof ASSERTION_OPERATORS)[number]

/** Operators that take no value. */
export const UNARY_OPERATORS: ReadonlySet<AssertionOperator> = new Set([
    "isNull", "isUndefined", "isDefined", "isEmpty", "isNotEmpty", "isTruthy", "isFalsy",
    "isNumber", "isString", "isBoolean", "isArray", "isJson",
])

export interface Assertion {
    id: string
    enabled: boolean
    /** `res.status`, `res.responseTime`, `res.headers.content-type`, `res.body`, `res.body.items[0].id`, `res.body..id` */
    target: string
    operator: AssertionOperator
    value: string
}

export interface AssertionResponse {
    status: number
    headers: Record<string, string>
    body: string
    time: number
}

export function isAssertionOperator(op: unknown): op is AssertionOperator {
    return (ASSERTION_OPERATORS as readonly unknown[]).includes(op)
}

function parseBody(body: string): unknown {
    try { return JSON.parse(body) } catch { return body }
}

/** Value of `target` in the response; `undefined` when it doesn't exist. Throws on a bad path. */
export function resolveAssertionTarget(target: string, res: AssertionResponse): unknown {
    const t = target.trim().replace(/^res(?=[.[]|$)/, "")
    if (t === ".status") return res.status
    if (t === ".responseTime" || t === ".time") return res.time
    if (t === ".headers") return res.headers
    if (t.startsWith(".headers.")) {
        const name = t.slice(".headers.".length).toLowerCase()
        return Object.entries(res.headers).find(([k]) => k.toLowerCase() === name)?.[1]
    }
    if (t === ".body") return parseBody(res.body)
    if (t.startsWith(".body")) {
        const json = parseBody(res.body)
        if (typeof json !== "object" || json === null) return undefined
        return queryJsonPath(json, `$${t.slice(".body".length)}`).value
    }
    throw new Error(`Unknown target "${target}"`)
}

/** The typed value: JSON when it parses (`200`, `true`, `"ok"`, `[1,2]`), else the raw text. */
function parseExpected(raw: string): unknown {
    try { return JSON.parse(raw) } catch { return raw }
}

function equal(a: unknown, b: unknown): boolean {
    if (a === b) return true
    const prim = (v: unknown) => v === null || ["string", "number", "boolean"].includes(typeof v)
    if (prim(a) && prim(b)) return String(a) === String(b)
    return JSON.stringify(a) === JSON.stringify(b)
}

function list(raw: string): unknown[] {
    const v = parseExpected(raw)
    return Array.isArray(v) ? v : raw.split(",").map((s) => parseExpected(s.trim()))
}

function isEmpty(v: unknown): boolean {
    if (v === null || v === undefined || v === "") return true
    if (Array.isArray(v)) return v.length === 0
    return typeof v === "object" && Object.keys(v).length === 0
}

function check(op: AssertionOperator, actual: unknown, raw: string): boolean {
    const expected = parseExpected(raw)
    const num = (v: unknown) => (typeof v === "number" ? v : Number(v))
    const compare = (fn: (a: number, b: number) => boolean) => {
        const a = num(actual), b = num(expected)
        return !Number.isNaN(a) && !Number.isNaN(b) && actual !== null && actual !== "" && fn(a, b)
    }
    const contains = () =>
        Array.isArray(actual) ? actual.some((x) => equal(x, expected))
            : typeof actual === "string" ? actual.includes(String(expected))
                : false
    const str = typeof actual === "string" ? actual : actual === undefined ? "" : JSON.stringify(actual)
    switch (op) {
        case "eq": return equal(actual, expected)
        case "neq": return !equal(actual, expected)
        case "gt": return compare((a, b) => a > b)
        case "gte": return compare((a, b) => a >= b)
        case "lt": return compare((a, b) => a < b)
        case "lte": return compare((a, b) => a <= b)
        case "in": return list(raw).some((x) => equal(actual, x))
        case "notIn": return !list(raw).some((x) => equal(actual, x))
        case "contains": return contains()
        case "notContains": return !contains()
        case "startsWith": return typeof actual === "string" && actual.startsWith(raw)
        case "endsWith": return typeof actual === "string" && actual.endsWith(raw)
        case "matches": return new RegExp(raw).test(str)
        case "notMatches": return !new RegExp(raw).test(str)
        case "isNull": return actual === null
        case "isUndefined": return actual === undefined
        case "isDefined": return actual !== undefined
        case "isEmpty": return isEmpty(actual)
        case "isNotEmpty": return !isEmpty(actual)
        case "isTruthy": return Boolean(actual)
        case "isFalsy": return !actual
        case "isNumber": return typeof actual === "number"
        case "isString": return typeof actual === "string"
        case "isBoolean": return typeof actual === "boolean"
        case "isArray": return Array.isArray(actual)
        case "isJson": return typeof actual === "object" && actual !== null
    }
}

function show(v: unknown): string {
    if (v === undefined) return "undefined"
    const s = JSON.stringify(v) ?? String(v)
    return s.length > 120 ? `${s.slice(0, 117)}...` : s
}

/** One test result per enabled row with a target, named like the row (`res.status eq 200`). */
export function evaluateAssertions(assertions: Assertion[] | undefined, res: AssertionResponse): ScriptTestResult[] {
    return (assertions ?? [])
        .filter((a) => a.enabled && a.target.trim())
        .map((a) => {
            const unary = UNARY_OPERATORS.has(a.operator)
            const name = `${a.target.trim()} ${a.operator}${unary ? "" : ` ${a.value}`}`
            try {
                const actual = resolveAssertionTarget(a.target, res)
                return check(a.operator, actual, a.value)
                    ? { name, pass: true }
                    : { name, pass: false, error: `expected ${show(actual)} to be ${a.operator}${unary ? "" : ` ${a.value}`}` }
            } catch (e) {
                return { name, pass: false, error: (e as Error).message }
            }
        })
}

/** Bruno `.bru` assert line value (`eq 200`, `isDefined`) → operator + value; unknown operators → null. */
export function parseBruAssertion(raw: string): Pick<Assertion, "operator" | "value"> | null {
    const m = /^(\S+)\s*([\s\S]*)$/.exec(raw.trim())
    if (!m || !isAssertionOperator(m[1])) return null
    return { operator: m[1], value: m[2].trim() }
}
