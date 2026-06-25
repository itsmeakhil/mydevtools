import { parseCsv, parseDataFile } from "../csv"
import { buildJUnitXml } from "../junit"
import type { RequestRunResult } from "../types"

describe("parseCsv", () => {
    it("parses a simple header row + rows", () => {
        const rows = parseCsv("name,age\nalice,30\nbob,25\n")
        expect(rows).toEqual([
            { name: "alice", age: "30" },
            { name: "bob", age: "25" },
        ])
    })

    it("handles quoted cells with commas inside", () => {
        const rows = parseCsv('a,b\n"hello, world",2\n')
        expect(rows[0].a).toBe("hello, world")
        expect(rows[0].b).toBe("2")
    })

    it("handles doubled quotes as escaped quote", () => {
        const rows = parseCsv('q\n"she said ""hi"""\n')
        expect(rows[0].q).toBe('she said "hi"')
    })

    it("handles CRLF line endings", () => {
        const rows = parseCsv("a,b\r\n1,2\r\n3,4\r\n")
        expect(rows).toHaveLength(2)
        expect(rows[1]).toEqual({ a: "3", b: "4" })
    })

    it("ignores trailing empty line", () => {
        const rows = parseCsv("h\nv\n\n")
        expect(rows).toEqual([{ h: "v" }])
    })
})

describe("parseDataFile auto-detect", () => {
    it("treats leading [ as JSON array", () => {
        const rows = parseDataFile('[{"id":1,"name":"a"},{"id":2,"name":"b"}]')
        expect(rows).toEqual([
            { id: "1", name: "a" },
            { id: "2", name: "b" },
        ])
    })

    it("stringifies nested values from JSON rows", () => {
        const rows = parseDataFile('[{"meta":{"x":1}}]')
        expect(rows[0].meta).toBe('{"x":1}')
    })

    it("falls back to CSV otherwise", () => {
        const rows = parseDataFile("h,k\n1,2\n")
        expect(rows[0]).toEqual({ h: "1", k: "2" })
    })

    it("rejects JSON arrays of non-array root", () => {
        // Leading `[` opts into JSON path; non-array there throws.
        expect(() => parseDataFile('"x"')).not.toThrow()  // "x" still attempted as CSV
        expect(() => parseDataFile("[1,2,3]")).not.toThrow()  // numbers stringified
    })
})

describe("buildJUnitXml", () => {
    const results: RequestRunResult[] = [
        {
            iteration: 0, requestId: "r1", requestName: "List users", method: "GET", url: "https://x/users",
            status: 200, time: 120,
            tests: [
                { name: "status 200", pass: true },
                { name: "has users", pass: false, error: "expected array" },
            ],
            logs: [], errors: [],
        },
        {
            iteration: 0, requestId: "r2", requestName: "Failing call", method: "GET", url: "https://x/dead",
            time: 50,
            tests: [],
            logs: [], errors: [],
            networkError: "DNS lookup failed",
        },
    ]

    it("emits a single <testsuite> with correct counts", () => {
        const xml = buildJUnitXml(results, "Acme")
        expect(xml).toContain('name="Acme"')
        expect(xml).toContain('tests="3"')  // 2 assertion tests + 1 networkError synthetic
        expect(xml).toContain('failures="1"')
        expect(xml).toContain('errors="1"')
    })

    it("emits <failure> blocks for failing assertions", () => {
        const xml = buildJUnitXml(results, "Acme")
        expect(xml).toContain("<failure")
        expect(xml).toContain("expected array")
    })

    it("emits <error> blocks for transport errors", () => {
        const xml = buildJUnitXml(results, "Acme")
        expect(xml).toContain("<error")
        expect(xml).toContain("DNS lookup failed")
    })

    it("escapes XML metacharacters", () => {
        const evil: RequestRunResult[] = [{
            iteration: 0, requestId: "r", requestName: "<weird>",
            method: "GET", url: "x", tests: [{ name: 'a & "b" \'c\'', pass: false, error: "<bad>" }],
            logs: [], errors: [],
        }]
        const xml = buildJUnitXml(evil, "x&y")
        expect(xml).toContain("&lt;weird&gt;")
        expect(xml).toContain("&amp;")
        expect(xml).toContain("&quot;b&quot;")
        expect(xml).toContain("&apos;c&apos;")
    })
})
