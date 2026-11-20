/**
 * jest-environment-node has no localStorage; install a minimal in-memory shim so
 * the cookie-jar's persistence layer works under test. The module checks
 * `typeof window !== "undefined"` before touching localStorage, so we also stub
 * `window`. Real browsers obviously already have both.
 */
const storage: Record<string, string> = {}
const memoryLocalStorage = {
    getItem: (k: string) => (k in storage ? storage[k] : null),
    setItem: (k: string, v: string) => { storage[k] = String(v) },
    removeItem: (k: string) => { delete storage[k] },
    clear: () => { for (const k of Object.keys(storage)) delete storage[k] },
    key: (i: number) => Object.keys(storage)[i] ?? null,
    get length() { return Object.keys(storage).length },
}
;(globalThis as unknown as { window: object }).window = {}
;(globalThis as unknown as { localStorage: typeof memoryLocalStorage }).localStorage = memoryLocalStorage

import {
    parseSetCookie,
    storeCookiesFromResponse,
    cookieHeaderForUrl,
    listCookies,
    deleteCookie,
    clearCookies,
    exportJar,
    importCookies,
    parseCookieFile,
    toNetscapeCookies,
} from "../cookie-jar"

beforeEach(() => {
    memoryLocalStorage.clear()
})

describe("parseSetCookie", () => {
    it("parses name=value and attributes", () => {
        const c = parseSetCookie(
            "sid=abc123; Path=/; Domain=.example.com; HttpOnly; Secure; SameSite=Lax; Max-Age=3600",
            "https://api.example.com/v1/me",
        )
        expect(c).toMatchObject({
            name: "sid",
            value: "abc123",
            domain: "example.com",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
        })
        expect(c?.expires).toBeGreaterThan(Date.now())
    })

    it("defaults domain to request host when absent", () => {
        const c = parseSetCookie("foo=bar", "https://api.example.com/")
        expect(c?.domain).toBe("api.example.com")
        expect(c?.path).toBe("/")
    })

    it("returns null on cookies with no name", () => {
        expect(parseSetCookie("=bar", "https://x.test")).toBeNull()
    })
})

describe("storeCookiesFromResponse + cookieHeaderForUrl", () => {
    it("round-trips a cookie back as a Cookie header on matching domain+path", () => {
        storeCookiesFromResponse("https://api.example.com/v1/users", [
            "sid=abc; Path=/; Domain=example.com; Max-Age=600",
        ])
        const header = cookieHeaderForUrl("https://api.example.com/v1/users/42")
        expect(header).toBe("sid=abc")
    })

    it("does not send Secure cookies over http", () => {
        storeCookiesFromResponse("https://api.example.com/", [
            "sid=abc; Path=/; Secure; Max-Age=600",
        ])
        expect(cookieHeaderForUrl("https://api.example.com/v1")).toBe("sid=abc")
        expect(cookieHeaderForUrl("http://api.example.com/v1")).toBe("")
    })

    it("respects path scoping", () => {
        storeCookiesFromResponse("https://api.example.com/admin/", [
            "admin_sid=zzz; Path=/admin; Max-Age=600",
        ])
        expect(cookieHeaderForUrl("https://api.example.com/admin/dashboard")).toBe("admin_sid=zzz")
        expect(cookieHeaderForUrl("https://api.example.com/public")).toBe("")
    })

    it("upserts by (name, domain, path) — last write wins", () => {
        storeCookiesFromResponse("https://api.example.com/", [
            "sid=v1; Path=/; Max-Age=600",
        ])
        storeCookiesFromResponse("https://api.example.com/", [
            "sid=v2; Path=/; Max-Age=600",
        ])
        expect(cookieHeaderForUrl("https://api.example.com/")).toBe("sid=v2")
        expect(listCookies()).toHaveLength(1)
    })

    it("treats Max-Age=0 as a delete", () => {
        storeCookiesFromResponse("https://api.example.com/", ["sid=v1; Path=/; Max-Age=600"])
        storeCookiesFromResponse("https://api.example.com/", ["sid=; Path=/; Max-Age=0"])
        expect(cookieHeaderForUrl("https://api.example.com/")).toBe("")
    })

    it("subdomain matching: cookie with Domain=example.com sent to api.example.com", () => {
        storeCookiesFromResponse("https://example.com/", [
            "sid=abc; Path=/; Domain=example.com; Max-Age=600",
        ])
        expect(cookieHeaderForUrl("https://api.example.com/")).toBe("sid=abc")
    })

    it("does NOT cross to unrelated domain", () => {
        storeCookiesFromResponse("https://example.com/", [
            "sid=abc; Path=/; Domain=example.com; Max-Age=600",
        ])
        expect(cookieHeaderForUrl("https://attacker.test/")).toBe("")
    })
})

describe("deleteCookie + clearCookies", () => {
    beforeEach(() => {
        storeCookiesFromResponse("https://a.test/", ["x=1; Path=/; Max-Age=600"])
        storeCookiesFromResponse("https://b.test/", ["y=2; Path=/; Max-Age=600"])
    })

    it("deletes a single cookie by name+domain+path", () => {
        deleteCookie("x", "a.test", "/")
        expect(cookieHeaderForUrl("https://a.test/")).toBe("")
        expect(cookieHeaderForUrl("https://b.test/")).toBe("y=2")
    })

    it("clears a single domain", () => {
        clearCookies("a.test")
        expect(listCookies()).toHaveLength(1)
    })

    it("clears everything", () => {
        clearCookies()
        expect(listCookies()).toHaveLength(0)
    })
})

describe("cookie files", () => {
    const future = Date.now() + 86_400_000

    it("round-trips through cookies.txt and our JSON", () => {
        storeCookiesFromResponse("https://api.example.com/", [
            "sid=a\tb; Path=/v1; HttpOnly; Secure; Max-Age=3600",
            "theme=dark",
        ])
        const jar = exportJar()
        const txt = toNetscapeCookies(jar)
        expect(txt).toContain("#HttpOnly_.api.example.com\tTRUE\t/v1\tTRUE\t")
        const back = parseCookieFile(txt)
        expect(back.map((c) => [c.name, c.value, c.domain, c.path, !!c.httpOnly, !!c.secure])).toEqual([
            ["sid", "a\tb", "api.example.com", "/v1", true, true],
            ["theme", "dark", "api.example.com", "/", false, false],
        ])
        expect(Math.abs(back[0].expires! - jar[0].expires!)).toBeLessThan(1000)
        expect(back[1].expires).toBeUndefined()
        expect(parseCookieFile(JSON.stringify(jar))).toEqual(jar)
    })

    it("reads browser-extension JSON and skips junk rows", () => {
        const rows = parseCookieFile(JSON.stringify([
            { name: "a", value: "1", domain: ".x.test", path: "/", expirationDate: future / 1000, sameSite: "no_restriction", hostOnly: false },
            { name: "", domain: "x.test" },
            { value: "nameless" },
        ]))
        expect(rows).toEqual([{ name: "a", value: "1", domain: "x.test", path: "/", expires: Math.round(future), secure: undefined, httpOnly: undefined, sameSite: "None" }])
        expect(parseCookieFile("not json {")).toEqual([])
        expect(parseCookieFile("{bad")).toEqual([])
    })

    it("imports into the jar, upserting and skipping expired", () => {
        storeCookiesFromResponse("https://x.test/", ["a=old"])
        const n = importCookies([
            { name: "a", value: "new", domain: "x.test", path: "/" },
            { name: "gone", value: "1", domain: "x.test", path: "/", expires: Date.now() - 1 },
        ])
        expect(n).toBe(1)
        expect(cookieHeaderForUrl("https://x.test/")).toBe("a=new")
    })
})
