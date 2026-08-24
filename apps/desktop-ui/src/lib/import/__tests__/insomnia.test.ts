import { exportCollectionAsInsomnia } from "../../export/insomnia"
import { importInsomniaWithMeta, looksLikeInsomniaExport } from "../insomnia"
import type { Collection, CollectionFolder, CollectionRequest, KeyValueItem } from "@/components/api-client/types"

// ── v4 JSON fixture ──────────────────────────────────────────────────────────

const v4 = {
    _type: "export",
    __export_format: 4,
    __export_source: "insomnia.desktop.app:v2023.5.8",
    resources: [
        { _id: "wrk_1", _type: "workspace", name: "Pet Store", scope: "collection", parentId: null },
        {
            _id: "env_base", _type: "environment", parentId: "wrk_1", name: "Base Environment", metaSortKey: 1,
            data: { base_url: "https://api.example.com", auth: { token: "abc", nested: { deep: 1 } }, flag: true, list: [1, 2], ref: "{{ _.base_url }}/v1" },
        },
        { _id: "env_prod", _type: "environment", parentId: "env_base", name: "Production", metaSortKey: 2, data: { base_url: "https://prod.example.com" } },
        { _id: "env_empty", _type: "environment", parentId: "env_base", name: "Empty", data: {} },
        { _id: "jar_1", _type: "cookie_jar", parentId: "wrk_1", name: "Default Jar", cookies: [] },
        { _id: "fld_users", _type: "request_group", parentId: "wrk_1", name: "Users", metaSortKey: -200, preRequestScript: "insomnia.environment.set('x', 1)" },
        { _id: "fld_admin", _type: "request_group", parentId: "fld_users", name: "Admin", metaSortKey: -100, environment: { ignored: true } },
        {
            _id: "req_list", _type: "request", parentId: "fld_users", name: "List users", method: "get", metaSortKey: -300,
            url: "{{ _.base_url }}/users",
            parameters: [{ name: "page", value: "1" }, { name: "debug", value: "true", disabled: true }],
            headers: [{ name: "Accept", value: "application/json" }, { name: "X-Off", value: "1", disabled: true }],
            body: {},
            authentication: { type: "bearer", token: "{{ _.auth.token }}", prefix: "Bearer" },
            preRequestScript: "insomnia.request.addHeader({ name: 'a', value: 'b' })",
            afterResponseScript: "insomnia.test('ok', () => {})",
        },
        {
            _id: "req_create", _type: "request", parentId: "fld_users", name: "Create user", method: "POST", metaSortKey: -200,
            url: "{{ base_url }}/users",
            body: { mimeType: "application/json", text: '{"name":"{{ _.name }}"}' },
            authentication: { type: "basic", username: "u", password: "p" },
        },
        {
            _id: "req_ban", _type: "request", parentId: "fld_admin", name: "Ban", method: "DELETE",
            url: "{{ _.base_url }}/users/1",
            body: { mimeType: "text/plain", text: "bye" },
            authentication: { type: "apikey", key: "X-Api-Key", value: "k", addTo: "header" },
        },
        {
            _id: "req_xml", _type: "request", parentId: "wrk_1", name: "XML", method: "PUT", metaSortKey: 10,
            url: "https://x/xml",
            body: { mimeType: "application/xml", text: "<a/>" },
            authentication: { type: "apikey", key: "api_key", value: "k", addTo: "queryParams" },
        },
        {
            _id: "req_form", _type: "request", parentId: "wrk_1", name: "Form", method: "POST", metaSortKey: 20,
            url: "https://x/form",
            body: { mimeType: "application/x-www-form-urlencoded", params: [{ name: "a", value: "1" }, { name: "b", value: "2", disabled: true }] },
            authentication: { type: "oauth2", grantType: "client_credentials", accessTokenUrl: "https://x/token", clientId: "cid", clientSecret: "sec", scope: "read" },
        },
        {
            _id: "req_multi", _type: "request", parentId: "wrk_1", name: "Upload", method: "POST", metaSortKey: 30,
            url: "https://x/upload",
            body: { mimeType: "multipart/form-data", params: [{ name: "file", type: "file", fileName: "/Users/me/a.png" }, { name: "note", value: "hi" }] },
            authentication: { type: "oauth2", grantType: "authorization_code", accessTokenUrl: "https://x/token", authorizationUrl: "https://x/auth", clientId: "cid", redirectUrl: "http://localhost/cb" },
        },
        {
            _id: "req_gql", _type: "request", parentId: "wrk_1", name: "GQL", method: "POST", metaSortKey: 40,
            url: "https://x/graphql",
            body: { mimeType: "application/graphql", text: JSON.stringify({ query: "query { me { id } }", variables: '{"a":1}' }) },
            authentication: { type: "basic", disabled: true, username: "u", password: "p" },
        },
        { _id: "req_bogus", _type: "request", parentId: "wrk_1", name: "Bogus", method: "PURGE", url: "https://x/", metaSortKey: 50 },
    ],
}

// ── v5 YAML fixtures ─────────────────────────────────────────────────────────

const v5 = `
type: collection.insomnia.rest/5.0
name: Pet Store v5
meta:
  id: wrk_v5
collection:
  - name: Users
    meta:
      id: fld_1
      sortKey: -100
    scripts:
      preRequest: insomnia.environment.set("folder", 1)
    children:
      - url: "{{ _.base_url }}/users"
        name: List users
        meta:
          id: req_1
          sortKey: -50
        method: GET
        parameters:
          - name: page
            value: "1"
          - name: off
            value: x
            disabled: true
        headers:
          - name: Accept
            value: application/json
        authentication:
          type: apikey
          key: X-Key
          value: "{{ _.key }}"
          addTo: header
        scripts:
          preRequest: |-
            insomnia.request.addHeader({ name: "a", value: "b" })
          afterResponse: |-
            insomnia.test("ok", () => {})
      - url: "{{ _.base_url }}/users"
        name: Create user
        meta:
          id: req_2
          sortKey: -40
        method: POST
        body:
          mimeType: application/json
          text: '{"name":"{{ _.name }}"}'
        authentication:
          type: bearer
          token: "{{ _.token }}"
  - url: https://x/ping
    name: Ping
    meta:
      id: req_3
      sortKey: 5
    method: HEAD
cookieJar:
  name: Default Jar
environments:
  name: Base Environment
  data:
    base_url: https://api.example.com
    key: k1
  subEnvironments:
    - name: Staging
      data:
        base_url: https://staging.example.com
`

const v5Env = `
type: environment.insomnia.rest/5.0
name: Prod
data:
  base_url: https://prod
  db:
    host: h
`

const folders = (items: Collection["items"]) => items as CollectionFolder[]
const reqs = (items: Collection["items"]) => items as CollectionRequest[]
const bare = (kv: KeyValueItem[]) => kv.map(({ key, value, active }) => ({ key, value, active }))

describe("looksLikeInsomniaExport", () => {
    it("detects v4 JSON and v5 YAML", () => {
        expect(looksLikeInsomniaExport(JSON.stringify(v4))).toBe(true)
        expect(looksLikeInsomniaExport(v5)).toBe(true)
        expect(looksLikeInsomniaExport(v5Env)).toBe(true)
    })

    it("rejects other formats and garbage", () => {
        expect(looksLikeInsomniaExport(JSON.stringify({ info: { name: "pm" }, item: [] }))).toBe(false)
        expect(looksLikeInsomniaExport("openapi: 3.0.0\ninfo:\n  title: x")).toBe(false)
        expect(looksLikeInsomniaExport("{ not json")).toBe(false)
        expect(looksLikeInsomniaExport("")).toBe(false)
    })
})

describe("Insomnia v4 import", () => {
    const { collection, environments } = importInsomniaWithMeta(JSON.stringify(v4))

    it("uses the workspace name and orders by metaSortKey", () => {
        expect(collection.name).toBe("Pet Store")
        expect(collection.items.map((i) => i.name)).toEqual(["Users", "XML", "Form", "Upload", "GQL", "Bogus"])
    })

    it("nests groups via parentId and keeps group scripts", () => {
        const users = folders(collection.items)[0]
        expect(users.type).toBe("folder")
        expect(users.preRequestScript).toBe("insomnia.environment.set('x', 1)")
        expect(users.items.map((i) => i.name)).toEqual(["List users", "Create user", "Admin"])
        const admin = users.items[2] as CollectionFolder
        expect(admin.type).toBe("folder")
        expect(admin.items.map((i) => i.name)).toEqual(["Ban"])
    })

    it("converts params, headers, disabled rows, template tags, and scripts", () => {
        const list = reqs(folders(collection.items)[0].items)[0]
        expect(list.method).toBe("GET")
        expect(list.url).toBe("{{base_url}}/users")
        expect(bare(list.params)).toEqual([{ key: "page", value: "1", active: true }, { key: "debug", value: "true", active: false }])
        expect(bare(list.headers)).toEqual([{ key: "Accept", value: "application/json", active: true }, { key: "X-Off", value: "1", active: false }])
        expect(list.body).toEqual({ type: "none", content: "" })
        expect(list.auth).toEqual({ type: "bearer", token: "{{auth.token}}" })
        expect(list.preRequestScript).toBe("insomnia.request.addHeader({ name: 'a', value: 'b' })")
        expect(list.testScript).toBe("insomnia.test('ok', () => {})")
        expect(list.params.every((p) => typeof p.id === "string" && p.id.length > 0)).toBe(true)
    })

    it("converts json / text / xml bodies and basic / apikey auth", () => {
        const create = reqs(folders(collection.items)[0].items)[1]
        expect(create.url).toBe("{{base_url}}/users")
        expect(create.body).toEqual({ type: "json", content: '{"name":"{{name}}"}' })
        expect(create.auth).toEqual({ type: "basic", username: "u", password: "p" })

        const ban = reqs((folders(collection.items)[0].items[2] as CollectionFolder).items)[0]
        expect(ban.method).toBe("DELETE")
        expect(ban.body).toEqual({ type: "text", content: "bye" })
        expect(ban.auth).toEqual({ type: "api-key", apiKeyKey: "X-Api-Key", apiKeyValue: "k", apiKeyLocation: "header" })

        const xml = reqs(collection.items)[1]
        expect(xml.body).toEqual({ type: "text", content: "<a/>" })
        expect(xml.auth).toEqual({ type: "api-key", apiKeyKey: "api_key", apiKeyValue: "k", apiKeyLocation: "query" })
    })

    it("converts urlencoded + multipart bodies and oauth2 auth", () => {
        const form = reqs(collection.items)[2]
        expect(form.body.type).toBe("x-www-form-urlencoded")
        expect(bare(form.body.urlEncoded!)).toEqual([{ key: "a", value: "1", active: true }, { key: "b", value: "2", active: false }])
        expect(form.auth).toMatchObject({
            type: "oauth2",
            oauth2: { grantType: "client_credentials", tokenUrl: "https://x/token", clientId: "cid", clientSecret: "sec", scope: "read" },
        })

        const upload = reqs(collection.items)[3]
        expect(upload.body.type).toBe("form-data")
        expect(upload.body.formData!.map(({ key, value, active, valueType, fileName, fileContentBase64 }) => ({ key, value, active, valueType, fileName, fileContentBase64 }))).toEqual([
            { key: "file", value: "", active: true, valueType: "file", fileName: "a.png", fileContentBase64: undefined },
            { key: "note", value: "hi", active: true, valueType: "text", fileName: undefined, fileContentBase64: undefined },
        ])
        expect(upload.auth).toMatchObject({
            type: "oauth2",
            oauth2: { grantType: "authorization_code", tokenUrl: "https://x/token", authUrl: "https://x/auth", clientId: "cid", redirectUri: "http://localhost/cb" },
        })
    })

    it("unpacks graphql bodies, drops disabled auth, and falls back on unknown methods", () => {
        const gql = reqs(collection.items)[4]
        expect(gql.body).toEqual({ type: "graphql", content: "query { me { id } }", graphqlVariables: '{"a":1}' })
        expect(gql.auth).toEqual({ type: "none" })

        const bogus = reqs(collection.items)[5]
        expect(bogus.method).toBe("GET")
        expect(bogus.auth).toEqual({ type: "none" })
        expect(bogus.body).toEqual({ type: "none", content: "" })
    })

    it("flattens environments to dotted keys and skips empty ones", () => {
        expect(environments.map((e) => e.name)).toEqual(["Base Environment", "Production"])
        const vars = Object.fromEntries(environments[0].variables.map((v) => [v.key, v.value]))
        expect(vars).toEqual({
            base_url: "https://api.example.com",
            "auth.token": "abc",
            "auth.nested.deep": "1",
            flag: "true",
            list: "[1,2]",
            ref: "{{base_url}}/v1",
        })
        expect(environments[0].variables.every((v) => v.enabled && v.id)).toBe(true)
        expect(environments[1].variables).toHaveLength(1)
    })
})

describe("Insomnia v5 YAML import", () => {
    it("walks the collection tree", () => {
        const { collection, environments } = importInsomniaWithMeta(v5)
        expect(collection.name).toBe("Pet Store v5")
        expect(collection.items.map((i) => i.name)).toEqual(["Users", "Ping"])

        const users = folders(collection.items)[0]
        expect(users.type).toBe("folder")
        expect(users.preRequestScript).toBe('insomnia.environment.set("folder", 1)')

        const list = reqs(users.items)[0]
        expect(list.method).toBe("GET")
        expect(list.url).toBe("{{base_url}}/users")
        expect(bare(list.params)).toEqual([{ key: "page", value: "1", active: true }, { key: "off", value: "x", active: false }])
        expect(bare(list.headers)).toEqual([{ key: "Accept", value: "application/json", active: true }])
        expect(list.auth).toEqual({ type: "api-key", apiKeyKey: "X-Key", apiKeyValue: "{{key}}", apiKeyLocation: "header" })
        expect(list.preRequestScript).toBe('insomnia.request.addHeader({ name: "a", value: "b" })')
        expect(list.testScript).toBe('insomnia.test("ok", () => {})')

        const create = reqs(users.items)[1]
        expect(create.body).toEqual({ type: "json", content: '{"name":"{{name}}"}' })
        expect(create.auth).toEqual({ type: "bearer", token: "{{token}}" })

        const ping = reqs(collection.items)[1]
        expect(ping.method).toBe("HEAD")
        expect(ping.body).toEqual({ type: "none", content: "" })

        expect(environments.map((e) => e.name)).toEqual(["Base Environment", "Staging"])
        expect(environments[0].variables.map((v) => [v.key, v.value])).toEqual([["base_url", "https://api.example.com"], ["key", "k1"]])
        expect(environments[1].variables.map((v) => [v.key, v.value])).toEqual([["base_url", "https://staging.example.com"]])
    })

    it("imports a standalone environment file", () => {
        const { collection, environments } = importInsomniaWithMeta(v5Env)
        expect(collection.items).toEqual([])
        expect(environments).toHaveLength(1)
        expect(environments[0].name).toBe("Prod")
        expect(environments[0].variables.map((v) => [v.key, v.value])).toEqual([["base_url", "https://prod"], ["db.host", "h"]])
    })

    it("throws on non-Insomnia input", () => {
        expect(() => importInsomniaWithMeta("openapi: 3.0.0")).toThrow(/Not an Insomnia/)
        expect(() => importInsomniaWithMeta('{"info":{"name":"pm"},"item":[]}')).toThrow(/Not an Insomnia/)
    })
})

describe("round-trip through export/insomnia.ts", () => {
    const kv = (key: string, value: string, active = true): KeyValueItem => ({ id: crypto.randomUUID(), key, value, active })
    const req = (over: Partial<CollectionRequest>): CollectionRequest => ({
        id: crypto.randomUUID(),
        name: "r",
        method: "GET",
        url: "https://api.test/x",
        params: [],
        headers: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
        ...over,
    })

    const original: Collection = {
        id: "c1",
        name: "Round trip",
        items: [
            req({
                name: "Create",
                method: "POST",
                url: "https://api.test/users",
                params: [kv("page", "2"), kv("off", "1", false)],
                headers: [kv("Content-Type", "application/json"), kv("X-Off", "1", false)],
                body: { type: "json", content: '{"a":1}' },
                auth: { type: "bearer", token: "{{TOKEN}}" },
            }),
            {
                id: "f", name: "Auth", type: "folder", isOpen: true,
                items: [
                    req({
                        name: "Login",
                        method: "POST",
                        url: "https://api.test/login",
                        body: { type: "x-www-form-urlencoded", content: "", urlEncoded: [kv("user", "a b"), kv("pass", "p&q"), kv("skip", "x", false)] },
                        auth: { type: "basic", username: "u", password: "p" },
                    }),
                    {
                        id: "f2", name: "Deep", type: "folder",
                        items: [
                            req({
                                name: "Note",
                                method: "PUT",
                                url: "https://api.test/n",
                                body: { type: "text", content: "hello" },
                                auth: { type: "api-key", apiKeyKey: "X-Key", apiKeyValue: "k", apiKeyLocation: "header" },
                            }),
                        ],
                    },
                ],
            },
        ],
    }

    it("preserves structure, method, url, active rows, body and auth", () => {
        const exported = exportCollectionAsInsomnia(original)
        expect(looksLikeInsomniaExport(exported)).toBe(true)
        const { collection, environments } = importInsomniaWithMeta(exported)

        expect(environments).toEqual([])
        expect(collection.name).toBe("Round trip")
        expect(collection.id).not.toBe(original.id)
        expect(collection.items.map((i) => i.name)).toEqual(["Create", "Auth"])

        const create = reqs(collection.items)[0]
        const origCreate = reqs(original.items)[0]
        expect(create.id).not.toBe(origCreate.id)
        expect(create.method).toBe("POST")
        expect(create.url).toBe("https://api.test/users")
        // Exporter drops inactive rows; everything active must survive.
        expect(bare(create.params)).toEqual([{ key: "page", value: "2", active: true }])
        expect(bare(create.headers)).toEqual([{ key: "Content-Type", value: "application/json", active: true }])
        expect(create.body).toEqual({ type: "json", content: '{"a":1}' })
        expect(create.auth).toEqual({ type: "bearer", token: "{{TOKEN}}" })

        const auth = folders(collection.items)[1]
        expect(auth.type).toBe("folder")
        expect(auth.items.map((i) => i.name)).toEqual(["Login", "Deep"])

        const login = reqs(auth.items)[0]
        expect(login.method).toBe("POST")
        expect(login.url).toBe("https://api.test/login")
        expect(login.body.type).toBe("x-www-form-urlencoded")
        expect(bare(login.body.urlEncoded!)).toEqual([{ key: "user", value: "a b", active: true }, { key: "pass", value: "p&q", active: true }])
        expect(login.auth).toEqual({ type: "basic", username: "u", password: "p" })

        const note = reqs((auth.items[1] as CollectionFolder).items)[0]
        expect(note.method).toBe("PUT")
        expect(note.url).toBe("https://api.test/n")
        expect(note.body).toEqual({ type: "text", content: "hello" })
        expect(note.auth).toEqual({ type: "api-key", apiKeyKey: "X-Key", apiKeyValue: "k", apiKeyLocation: "header" })
    })
})
