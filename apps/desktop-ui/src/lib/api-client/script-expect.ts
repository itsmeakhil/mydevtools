/**
 * chai-style BDD `expect` for pre-request / test scripts (pm.expect / expect),
 * plus the jest-style matchers the sandbox shipped first (toBe, toEqual, …)
 * as aliases. chai isn't a dependency; this covers the subset Postman/Bruno
 * collections actually use. Unsupported chains fail with a TypeError naming them.
 */

const show = (v: unknown): string => {
    if (typeof v === "string") return JSON.stringify(v)
    if (v === undefined) return "undefined"
    if (typeof v === "number" && Number.isNaN(v)) return "NaN"
    if (v instanceof RegExp) return String(v)
    try { return JSON.stringify(v) ?? String(v) } catch { return String(v) }
}

/** chai's type names: array, null, regexp, date, … else `typeof`. */
export function typeName(v: unknown): string {
    if (v === null) return "null"
    if (Array.isArray(v)) return "array"
    if (v instanceof RegExp) return "regexp"
    if (v instanceof Date) return "date"
    return typeof v
}

export function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true
    if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false
    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    if (ka.length !== kb.length) return false
    return ka.every((k) => Object.hasOwn(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/** Does `haystack` (string, array or object) include `needle`? Objects: subset match. */
function includes(haystack: unknown, needle: unknown, deep: boolean): boolean {
    if (typeof haystack === "string") return haystack.includes(String(needle))
    if (Array.isArray(haystack)) return haystack.some((x) => (deep ? deepEqual(x, needle) : x === needle))
    if (haystack instanceof Set) return haystack.has(needle)
    if (haystack && typeof haystack === "object" && needle && typeof needle === "object") {
        return Object.entries(needle).every(([k, v]) => {
            const h = haystack as Record<string, unknown>
            return Object.hasOwn(h, k) && (deep ? deepEqual(h[k], v) : h[k] === v)
        })
    }
    return false
}

class Assertion {
    private negate = false
    private isDeep = false
    private isContains = false
    private anyKeys = false

    constructor(private obj: unknown, private readonly label = "") {}

    private assert(ok: boolean, msg: string, negMsg: string): this {
        if (ok === this.negate) throw new Error((this.label ? `${this.label}: ` : "") + (this.negate ? negMsg : msg))
        return this
    }

    // ── language chains (no-ops) ──────────────────────────────────────────
    get to() { return this }
    get be() { return this }
    get been() { return this }
    get is() { return this }
    get that() { return this }
    get which() { return this }
    get and() { return this }
    get has() { return this }
    get have() { return this }
    get with() { return this }
    get at() { return this }
    get of() { return this }
    get does() { return this }
    get still() { return this }

    // ── flags ─────────────────────────────────────────────────────────────
    get not() { this.negate = !this.negate; return this }
    get deep() { this.isDeep = true; return this }
    get any() { this.anyKeys = true; return this }
    get all() { this.anyKeys = false; return this }
    /** `.include` / `.contain` as a flag (e.g. `.to.include.members`) or a method. */
    get include() { return this.containsChain() }
    get contain() { return this.containsChain() }
    get includes() { return this.containsChain() }
    get contains() { return this.containsChain() }

    private containsChain() {
        this.isContains = true
        const fn = (needle: unknown) => this.assertInclude(needle)
        // Callable *and* chainable, like chai: `.include(x)` and `.include.members([…])`.
        return new Proxy(fn, {
            get: (_t, prop) => {
                const v = Reflect.get(this, prop, this)
                return typeof v === "function" ? v.bind(this) : v
            },
        }) as unknown as ((needle: unknown) => Assertion) & Assertion
    }

    private assertInclude(needle: unknown) {
        const o = this.obj
        return this.assert(
            includes(o, needle, this.isDeep),
            `expected ${show(o)} to include ${show(needle)}`,
            `expected ${show(o)} to not include ${show(needle)}`,
        )
    }

    // ── property assertions ───────────────────────────────────────────────
    get ok() { return this.assert(!!this.obj, `expected ${show(this.obj)} to be truthy`, `expected ${show(this.obj)} to be falsy`) }
    get true() { return this.assert(this.obj === true, `expected ${show(this.obj)} to be true`, `expected ${show(this.obj)} to not be true`) }
    get false() { return this.assert(this.obj === false, `expected ${show(this.obj)} to be false`, `expected ${show(this.obj)} to not be false`) }
    get null() { return this.assert(this.obj === null, `expected ${show(this.obj)} to be null`, `expected ${show(this.obj)} to not be null`) }
    get undefined() { return this.assert(this.obj === undefined, `expected ${show(this.obj)} to be undefined`, `expected ${show(this.obj)} to not be undefined`) }
    get NaN() { return this.assert(Number.isNaN(this.obj), `expected ${show(this.obj)} to be NaN`, `expected ${show(this.obj)} to not be NaN`) }
    get exist() { return this.assert(this.obj != null, `expected ${show(this.obj)} to exist`, `expected ${show(this.obj)} to not exist`) }
    get empty() {
        const o = this.obj
        const size = typeof o === "string" || Array.isArray(o) ? o.length
            : o instanceof Map || o instanceof Set ? o.size
            : o && typeof o === "object" ? Object.keys(o).length
            : NaN
        if (Number.isNaN(size)) throw new TypeError(`.empty was passed non-string primitive ${show(o)}`)
        return this.assert(size === 0, `expected ${show(o)} to be empty`, `expected ${show(o)} not to be empty`)
    }

    // ── method assertions ─────────────────────────────────────────────────
    equal(expected: unknown) {
        const ok = this.isDeep ? deepEqual(this.obj, expected) : this.obj === expected
        return this.assert(ok, `expected ${show(this.obj)} to ${this.isDeep ? "deeply " : ""}equal ${show(expected)}`,
            `expected ${show(this.obj)} to not ${this.isDeep ? "deeply " : ""}equal ${show(expected)}`)
    }
    equals(e: unknown) { return this.equal(e) }
    eq(e: unknown) { return this.equal(e) }
    eql(expected: unknown) { this.isDeep = true; return this.equal(expected) }
    eqls(e: unknown) { return this.eql(e) }

    a(type: string) {
        const want = String(type).toLowerCase()
        const got = typeName(this.obj)
        const article = /^[aeiou]/.test(want) ? "an" : "a"
        return this.assert(got === want, `expected ${show(this.obj)} to be ${article} ${want}`, `expected ${show(this.obj)} not to be ${article} ${want}`)
    }
    an(type: string) { return this.a(type) }
    instanceOf(ctor: new (...args: never[]) => unknown) {
        return this.assert(this.obj instanceof ctor, `expected ${show(this.obj)} to be an instance of ${ctor.name}`,
            `expected ${show(this.obj)} to not be an instance of ${ctor.name}`)
    }

    property(name: string, ...value: unknown[]) {
        const o = this.obj
        const has = o != null && (typeof o === "object" || typeof o === "function") && name in (o as object)
        const actual = has ? (o as Record<string, unknown>)[name] : undefined
        if (value.length > 0) {
            const match = has && (this.isDeep ? deepEqual(actual, value[0]) : actual === value[0])
            this.assert(match, `expected ${show(o)} to have property "${name}" of ${show(value[0])}, but got ${show(actual)}`,
                `expected ${show(o)} to not have property "${name}" of ${show(value[0])}`)
        } else {
            this.assert(has, `expected ${show(o)} to have property "${name}"`, `expected ${show(o)} to not have property "${name}"`)
        }
        // chai: `.property(name)` moves the subject to the property's value.
        if (!this.negate) this.obj = actual
        return this
    }
    ownProperty(name: string, ...value: unknown[]) {
        const o = this.obj
        const own = o != null && typeof o === "object" && Object.hasOwn(o, name)
        if (!own && !this.negate) throw new Error(`expected ${show(o)} to have own property "${name}"`)
        return this.property(name, ...value)
    }

    lengthOf(n: number) {
        const len = (this.obj as { length?: number; size?: number } | null)?.length ?? (this.obj as { size?: number } | null)?.size
        return this.assert(len === n, `expected ${show(this.obj)} to have a length of ${n} but got ${len}`,
            `expected ${show(this.obj)} to not have a length of ${n}`)
    }
    length(n: number) { return this.lengthOf(n) }

    private compare(ok: boolean, word: string, n: unknown) {
        return this.assert(ok, `expected ${show(this.obj)} to be ${word} ${show(n)}`, `expected ${show(this.obj)} to not be ${word} ${show(n)}`)
    }
    above(n: number) { return this.compare(Number(this.obj) > n, "above", n) }
    gt(n: number) { return this.above(n) }
    greaterThan(n: number) { return this.above(n) }
    least(n: number) { return this.compare(Number(this.obj) >= n, "at least", n) }
    gte(n: number) { return this.least(n) }
    below(n: number) { return this.compare(Number(this.obj) < n, "below", n) }
    lt(n: number) { return this.below(n) }
    lessThan(n: number) { return this.below(n) }
    most(n: number) { return this.compare(Number(this.obj) <= n, "at most", n) }
    lte(n: number) { return this.most(n) }
    within(lo: number, hi: number) {
        const v = Number(this.obj)
        return this.compare(v >= lo && v <= hi, "within", `${lo}..${hi}`)
    }
    closeTo(expected: number, delta: number) {
        return this.compare(Math.abs(Number(this.obj) - expected) <= delta, "close to", `${expected} ±${delta}`)
    }

    match(re: RegExp) {
        return this.assert(re.test(String(this.obj)), `expected ${show(this.obj)} to match ${re}`, `expected ${show(this.obj)} not to match ${re}`)
    }
    matches(re: RegExp) { return this.match(re) }
    string(sub: string) {
        return this.assert(String(this.obj).includes(sub), `expected ${show(this.obj)} to contain ${show(sub)}`,
            `expected ${show(this.obj)} to not contain ${show(sub)}`)
    }

    oneOf(list: unknown[]) {
        const ok = list.some((x) => (this.isDeep ? deepEqual(x, this.obj) : x === this.obj))
        return this.assert(ok, `expected ${show(this.obj)} to be one of ${show(list)}`, `expected ${show(this.obj)} to not be one of ${show(list)}`)
    }

    keys(...args: unknown[]) {
        const want = (args.length === 1 && Array.isArray(args[0]) ? args[0] : args).map(String)
        const o = this.obj
        const have = o && typeof o === "object" ? Object.keys(o) : []
        const ok = this.anyKeys
            ? want.some((k) => have.includes(k))
            : want.every((k) => have.includes(k)) && (this.isContains || have.length === want.length)
        const how = this.anyKeys ? "any of" : this.isContains ? "" : "only"
        return this.assert(ok, `expected ${show(o)} to have ${how ? how + " " : ""}keys ${show(want)}`,
            `expected ${show(o)} to not have ${how ? how + " " : ""}keys ${show(want)}`)
    }
    key(...args: unknown[]) { return this.keys(...args) }

    members(list: unknown[]) {
        const o = Array.isArray(this.obj) ? this.obj : []
        const has = (arr: unknown[], x: unknown) => arr.some((y) => (this.isDeep ? deepEqual(x, y) : x === y))
        const ok = this.isContains
            ? list.every((x) => has(o, x))
            : o.length === list.length && list.every((x) => has(o, x)) && o.every((x) => has(list, x))
        return this.assert(ok, `expected ${show(this.obj)} to have ${this.isContains ? "included " : "the same "}members ${show(list)}`,
            `expected ${show(this.obj)} to not have ${this.isContains ? "included " : "the same "}members ${show(list)}`)
    }

    satisfy(fn: (v: unknown) => boolean) {
        return this.assert(!!fn(this.obj), `expected ${show(this.obj)} to satisfy ${fn.name || "predicate"}`,
            `expected ${show(this.obj)} to not satisfy ${fn.name || "predicate"}`)
    }

    throw(match?: string | RegExp) {
        if (typeof this.obj !== "function") throw new TypeError(`expected ${show(this.obj)} to be a function`)
        let thrown: unknown
        try { (this.obj as () => unknown)() } catch (e) { thrown = e ?? new Error("thrown") }
        const msg = thrown instanceof Error ? thrown.message : String(thrown)
        const ok = thrown !== undefined && (match === undefined || (match instanceof RegExp ? match.test(msg) : msg.includes(match)))
        return this.assert(ok, `expected function to throw${match ? " " + show(match) : ""}`, `expected function to not throw${match ? " " + show(match) : ""}`)
    }

    /** Postman: `pm.response.to.have.status(200)` (or a status text). */
    status(code: number | string) {
        const r = this.obj as { code?: number; status?: string } | null
        const actual = typeof code === "number" ? r?.code : r?.status
        return this.assert(actual === code, `expected response to have status ${show(code)} but got ${show(actual)}`,
            `expected response to not have status ${show(code)}`)
    }

    // ── jest-style aliases (the sandbox's original matchers) ──────────────
    toBe(e: unknown) { return this.assert(this.obj === e, `expected ${show(this.obj)} to be ${show(e)}`, `expected ${show(this.obj)} not to be ${show(e)}`) }
    toEqual(e: unknown) { return this.eql(e) }
    toMatch(re: unknown) {
        const ok = re instanceof RegExp ? re.test(String(this.obj)) : String(this.obj).includes(String(re))
        return this.assert(ok, `expected ${show(this.obj)} to match ${show(re)}`, `expected ${show(this.obj)} not to match ${show(re)}`)
    }
    toContain(sub: unknown) { return this.assertInclude(sub) }
    toBeGreaterThan(n: number) { return this.above(n) }
    toBeLessThan(n: number) { return this.below(n) }
    toHaveProperty(k: string, ...v: unknown[]) { return this.property(k, ...v) }
    toBeTruthy() { return this.ok }
    toBeFalsy() { return this.assert(!this.obj, `expected ${show(this.obj)} to be falsy`, `expected ${show(this.obj)} to be truthy`) }
}

/** `expect(value, label?)` — chai BDD entry point. */
export function expect(value: unknown, label?: string): Assertion {
    return new Assertion(value, label)
}
