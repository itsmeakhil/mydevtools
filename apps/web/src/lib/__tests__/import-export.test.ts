import { importPostmanCollection } from "../import/postman"
import { importHar } from "../import/har"
import { detectImportFormat } from "../import/detect"
import { exportPostmanCollection } from "../export/postman"
import type { Collection, CollectionRequest } from "@/components/api-client/types"

// ── detectImportFormat ────────────────────────────────────────────────────────
describe("detectImportFormat", () => {
    it("detects Postman by schema URL", () => {
        const blob = JSON.stringify({
            info: { name: "X", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
            item: [],
        })
        expect(detectImportFormat(blob)).toBe("postman")
    })
    it("detects Postman by info+item shape", () => {
        const blob = JSON.stringify({ info: { name: "X" }, item: [] })
        expect(detectImportFormat(blob)).toBe("postman")
    })
    it("detects HAR by log.entries", () => {
        const blob = JSON.stringify({ log: { entries: [] } })
        expect(detectImportFormat(blob)).toBe("har")
    })
    it("detects OpenAPI JSON", () => {
        expect(detectImportFormat(JSON.stringify({ openapi: "3.0.0" }))).toBe("openapi")
        expect(detectImportFormat(JSON.stringify({ swagger: "2.0" }))).toBe("openapi")
    })
    it("detects OpenAPI YAML", () => {
        expect(detectImportFormat("openapi: 3.0.0\ninfo:\n  title: X")).toBe("openapi")
    })
    it("detects cURL", () => {
        expect(detectImportFormat("curl https://example.com")).toBe("curl")
    })
    it("returns unknown on garbage", () => {
        expect(detectImportFormat("{not json")).toBe("unknown")
        expect(detectImportFormat("")).toBe("unknown")
    })
})

// ── Postman import ────────────────────────────────────────────────────────────
describe("importPostmanCollection", () => {
    it("imports a flat collection with raw JSON body and bearer auth", () => {
        const src = {
            info: { name: "Acme", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
            item: [{
                name: "List users",
                request: {
                    method: "GET",
                    url: { raw: "https://api.acme.test/users", query: [{ key: "limit", value: "10" }] },
                    header: [{ key: "X-Trace", value: "abc" }],
                    auth: {
                        type: "bearer",
                        bearer: [{ key: "token", value: "tok-123" }],
                    },
                },
                event: [
                    { listen: "prerequest", script: { type: "text/javascript", exec: ["pm.environment.set('ts', Date.now())"] } },
                    { listen: "test", script: { type: "text/javascript", exec: ["pm.test('ok', () => pm.expect(pm.response.code).toBe(200))"] } },
                ],
            }],
        }
        const col = importPostmanCollection(JSON.stringify(src))
        expect(col.name).toBe("Acme")
        expect(col.items).toHaveLength(1)
        const req = col.items[0] as CollectionRequest
        expect(req.method).toBe("GET")
        expect(req.url).toBe("https://api.acme.test/users")
        expect(req.params).toEqual([{ id: expect.any(String), key: "limit", value: "10", active: true }])
        expect(req.headers[0]).toMatchObject({ key: "X-Trace", value: "abc" })
        expect(req.auth).toEqual({ type: "bearer", token: "tok-123" })
        expect(req.preRequestScript).toMatch(/pm.environment.set/)
        expect(req.testScript).toMatch(/pm.test/)
    })

    it("imports nested folders", () => {
        const src = {
            info: { name: "Nested" },
            item: [{
                name: "Users",
                item: [{
                    name: "Get me",
                    request: { method: "GET", url: "https://x.test/me" },
                }],
            }],
        }
        const col = importPostmanCollection(JSON.stringify(src))
        expect(col.items[0].name).toBe("Users")
        const folder = col.items[0] as { type: "folder"; items: CollectionRequest[] }
        expect(folder.type).toBe("folder")
        expect(folder.items[0].method).toBe("GET")
    })

    it("imports urlencoded + formdata bodies", () => {
        const src = {
            info: { name: "Bodies" },
            item: [
                {
                    name: "Form url",
                    request: {
                        method: "POST",
                        url: "https://x.test/u",
                        body: { mode: "urlencoded", urlencoded: [{ key: "a", value: "1" }, { key: "b", value: "2", disabled: true }] },
                    },
                },
                {
                    name: "Form data",
                    request: {
                        method: "POST",
                        url: "https://x.test/m",
                        body: { mode: "formdata", formdata: [{ key: "file", value: "x.bin", type: "file" }] },
                    },
                },
            ],
        }
        const col = importPostmanCollection(JSON.stringify(src))
        const a = col.items[0] as CollectionRequest
        expect(a.body.type).toBe("x-www-form-urlencoded")
        expect(a.body.urlEncoded).toHaveLength(2)
        expect(a.body.urlEncoded?.[1].active).toBe(false)
        const b = col.items[1] as CollectionRequest
        expect(b.body.type).toBe("form-data")
        expect(b.body.formData?.[0].valueType).toBe("file")
    })

    it("throws on non-Postman input", () => {
        expect(() => importPostmanCollection('{"foo":"bar"}')).toThrow()
    })
})

// ── HAR import ────────────────────────────────────────────────────────────────
describe("importHar", () => {
    it("imports each entry as a request", () => {
        const src = {
            log: {
                creator: { name: "Chrome" },
                entries: [
                    {
                        request: {
                            method: "GET",
                            url: "https://api.test/health",
                            headers: [{ name: "Accept", value: "application/json" }],
                            queryString: [{ name: "v", value: "1" }],
                        },
                    },
                    {
                        request: {
                            method: "POST",
                            url: "https://api.test/login",
                            headers: [{ name: "Content-Type", value: "application/json" }],
                            postData: { mimeType: "application/json", text: '{"u":"a"}' },
                        },
                    },
                ],
            },
        }
        const col = importHar(JSON.stringify(src))
        expect(col.name).toBe("HAR from Chrome")
        expect(col.items).toHaveLength(2)
        const post = col.items[1] as CollectionRequest
        expect(post.method).toBe("POST")
        expect(post.body.type).toBe("json")
        expect(post.body.content).toBe('{"u":"a"}')
    })

    it("rejects non-HAR input", () => {
        expect(() => importHar("{}")).toThrow()
    })
})

// ── round-trip Postman export ↔ import ────────────────────────────────────────
describe("Postman export round-trip", () => {
    it("preserves requests, params, headers, body, auth, scripts", () => {
        const original: Collection = {
            id: "col-1",
            name: "Round",
            items: [
                {
                    id: "r-1",
                    name: "Make user",
                    method: "POST",
                    url: "https://api.test/users",
                    params: [{ id: "p-1", key: "tier", value: "pro", active: true }],
                    headers: [{ id: "h-1", key: "X-Trace", value: "t1", active: true }],
                    body: { type: "json", content: '{"name":"alice"}' },
                    auth: { type: "bearer", token: "tok" },
                    preRequestScript: "pm.environment.set('a', 1)",
                    testScript: "pm.test('ok', () => pm.expect(1).toBe(1))",
                },
            ],
        }
        const json = exportPostmanCollection(original)
        const reimported = importPostmanCollection(json)
        expect(reimported.name).toBe(original.name)
        const r = reimported.items[0] as CollectionRequest
        expect(r.method).toBe("POST")
        expect(r.url).toBe("https://api.test/users")
        expect(r.params[0]).toMatchObject({ key: "tier", value: "pro", active: true })
        expect(r.headers[0]).toMatchObject({ key: "X-Trace", value: "t1", active: true })
        expect(r.body.type).toBe("json")
        expect(r.body.content).toBe('{"name":"alice"}')
        expect(r.auth).toEqual({ type: "bearer", token: "tok" })
        expect(r.preRequestScript).toBe("pm.environment.set('a', 1)")
        expect(r.testScript).toBe("pm.test('ok', () => pm.expect(1).toBe(1))")
    })

    it("emits Postman v2.1 schema string", () => {
        const out = exportPostmanCollection({ id: "x", name: "y", items: [] })
        const parsed = JSON.parse(out)
        expect(parsed.info.schema).toContain("v2.1.0")
        expect(parsed.info.name).toBe("y")
    })
})
