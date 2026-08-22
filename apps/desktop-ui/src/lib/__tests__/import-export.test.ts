import { importPostmanCollection, importPostmanCollectionWithMeta } from "../import/postman"
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
    it("detects Insomnia v4 JSON and v5 YAML", () => {
        expect(detectImportFormat(JSON.stringify({ _type: "export", __export_format: 4, resources: [] })))
            .toBe("insomnia")
        expect(detectImportFormat("type: collection.insomnia.rest/5.0\nname: X\n")).toBe("insomnia")
    })
    it("detects Bruno .bru and OpenCollection YAML", () => {
        expect(detectImportFormat("meta {\n  name: Ping\n}\n\nget {\n  url: https://x/y\n}\n")).toBe("bruno")
        expect(detectImportFormat("info:\n  name: X\nhttp:\n  method: GET\n  url: https://x/y\n")).toBe("bruno")
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

// ── Real-world Postman v2.1 shape: collection auth/scripts/variables,
//    folder auth/scripts, graphql body ─────────────────────────────────────────
describe("importPostmanCollectionWithMeta (real-world v2.1)", () => {
    const realWorld = JSON.stringify({
        info: {
            name: "Acme API",
            schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        auth: { type: "bearer", bearer: [{ key: "token", value: "{{authToken}}", type: "string" }] },
        event: [
            { listen: "prerequest", script: { type: "text/javascript", exec: ["pm.environment.set('ts', Date.now())"] } },
            { listen: "test", script: { type: "text/javascript", exec: ["pm.test('status ok', () => pm.response.to.have.status(200))"] } },
        ],
        variable: [
            { key: "baseUrl", value: "https://api.acme.test", type: "string" },
            { key: "authToken", value: "" },
        ],
        item: [
            {
                name: "Users",
                auth: { type: "apikey", apikey: [{ key: "key", value: "X-Api-Key" }, { key: "value", value: "{{apiKey}}" }, { key: "in", value: "header" }] },
                event: [{ listen: "prerequest", script: { exec: "console.log('folder pre')" } }],
                item: [
                    {
                        name: "List users",
                        request: {
                            method: "GET",
                            url: {
                                raw: "{{baseUrl}}/users?page=1",
                                host: ["{{baseUrl}}"],
                                path: ["users"],
                                query: [{ key: "page", value: "1" }, { key: "debug", value: "true", disabled: true }],
                            },
                        },
                    },
                ],
            },
            {
                name: "Login",
                request: {
                    method: "POST",
                    url: "{{baseUrl}}/login",
                    body: { mode: "raw", raw: '{"user":"a"}', options: { raw: { language: "json" } } },
                },
                event: [{ listen: "test", script: { exec: ["pm.test('has token', () => true)"] } }],
            },
            {
                name: "GraphQL query",
                request: {
                    method: "POST",
                    url: "{{baseUrl}}/graphql",
                    body: {
                        mode: "graphql",
                        graphql: { query: "query { users { id } }", variables: '{"limit":10}' },
                    },
                },
            },
        ],
    })

    it("surfaces collection variables", () => {
        const { variables } = importPostmanCollectionWithMeta(realWorld)
        expect(variables).toEqual([
            { key: "baseUrl", value: "https://api.acme.test" },
            { key: "authToken", value: "" },
        ])
    })

    it("maps folder auth to defaultAuth and folder script to folder preRequestScript", () => {
        const { collection } = importPostmanCollectionWithMeta(realWorld)
        const folder = collection.items[0] as import("@/components/api-client/types").CollectionFolder
        expect(folder.type).toBe("folder")
        expect(folder.defaultAuth).toEqual({
            type: "api-key",
            apiKeyKey: "X-Api-Key",
            apiKeyValue: "{{apiKey}}",
            apiKeyLocation: "header",
        })
        expect(folder.preRequestScript).toContain("folder pre")
        // Collection pre-script is prepended to the top-level folder.
        expect(folder.preRequestScript!.indexOf("pm.environment.set")).toBeLessThan(
            folder.preRequestScript!.indexOf("folder pre"),
        )
    })

    it("bakes collection auth into root requests without their own auth", () => {
        const { collection } = importPostmanCollectionWithMeta(realWorld)
        const login = collection.items[1] as CollectionRequest
        expect(login.auth).toEqual({ type: "bearer", token: "{{authToken}}" })
        // Request under an auth-carrying folder inherits the folder auth at
        // runtime instead — stays "none" here.
        const folder = collection.items[0] as import("@/components/api-client/types").CollectionFolder
        const listUsers = folder.items[0] as CollectionRequest
        expect(listUsers.auth).toEqual({ type: "none" })
    })

    it("prepends collection test script to root request's own tests", () => {
        const { collection } = importPostmanCollectionWithMeta(realWorld)
        const login = collection.items[1] as CollectionRequest
        expect(login.testScript).toContain("status ok")
        expect(login.testScript).toContain("has token")
        expect(login.testScript!.indexOf("status ok")).toBeLessThan(login.testScript!.indexOf("has token"))
    })

    it("imports graphql bodies with query + variables", () => {
        const { collection } = importPostmanCollectionWithMeta(realWorld)
        const gql = collection.items[2] as CollectionRequest
        expect(gql.body).toEqual({
            type: "graphql",
            content: "query { users { id } }",
            graphqlVariables: '{"limit":10}',
        })
    })

    it("keeps disabled query params inactive", () => {
        const { collection } = importPostmanCollectionWithMeta(realWorld)
        const folder = collection.items[0] as import("@/components/api-client/types").CollectionFolder
        const listUsers = folder.items[0] as CollectionRequest
        const debug = listUsers.params.find((p) => p.key === "debug")
        expect(debug?.active).toBe(false)
    })
})
