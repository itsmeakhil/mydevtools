import {
    looksLikeBrunoBru,
    looksLikeOpenCollectionYaml,
    parseBruRequest,
    parseBrunoEnvironment,
    parseOpenCollectionRequestYaml,
    importBrunoFolder,
} from "../bruno"
import type { KeyValueItem } from "@/components/api-client/types"

const kv = (items: KeyValueItem[] | undefined) =>
    (items ?? []).map((i) => [i.key, i.value, i.active] as const)

// ── fixtures ────────────────────────────────────────────────────────────────

const createUser = `meta {
  name: Create user
  type: http
  seq: 2
}

post {
  url: {{base_url}}/users?dry=1
  body: json
  auth: bearer
}

params:query {
  dry: 1
  ~verbose: true
}

headers {
  Content-Type: application/json
  ~X-Debug: 1
}

auth:bearer {
  token: {{token}}
}

body:json {
  {
    "name": "Ada"
  }
}

script:pre-request {
  bru.setVar("t", Date.now())
}

tests {
  test("created", function() {
    expect(res.getStatus()).to.equal(201)
  })
}
`

const listUsers = `meta {
  name: List users
  type: http
  seq: 1
}

get {
  url: {{base_url}}/users
}
`

const graphqlReq = `meta {
  name: Search
  type: graphql
  seq: 1
}

post {
  url: {{base_url}}/graphql
  body: graphql
}

body:graphql {
  query Search($q: String) { search(q: $q) { id } }
}

body:graphql:vars {
  { "q": "ada" }
}
`

const uploadReq = `meta {
  name: Upload
  seq: 2
}

post {
  url: {{base_url}}/upload
  body: multipartForm
  auth: oauth2
}

body:multipart-form {
  avatar: @file(/tmp/a.png)
  caption: hello
}

auth:oauth2 {
  grant_type: client_credentials
  access_token_url: https://id.example.com/token
  client_id: cid
  client_secret: shh
  scope: read write
}
`

const folderBru = `meta {
  name: Users API
  seq: 1
}

headers {
  Accept: application/json
}
`

const envBru = `vars {
  base_url: https://api.example.com
  ~staging_only: 1
}

vars:secret [
  token
]
`

const ocRequest = `info:
  name: OC ping
  type: http
  seq: 1
http:
  method: GET
  url: "{{base_url}}/ping"
  headers:
    - name: Accept
      value: application/json
    - name: X-Off
      value: "1"
      disabled: true
  auth:
    type: bearer
    token: "{{token}}"
`

// ── tests ───────────────────────────────────────────────────────────────────

describe("bruno .bru detection", () => {
    it("recognises .bru files and rejects other text", () => {
        expect(looksLikeBrunoBru(createUser)).toBe(true)
        expect(looksLikeBrunoBru(folderBru)).toBe(true)
        expect(looksLikeBrunoBru('{"info":{"name":"x"},"item":[]}')).toBe(false)
    })
})

describe("parseBruRequest", () => {
    it("maps method, url, params, headers, json body, bearer auth and scripts", () => {
        const r = parseBruRequest(createUser)
        expect(r.name).toBe("Create user")
        expect(r.method).toBe("POST")
        expect(r.url).toBe("{{base_url}}/users?dry=1")
        expect(kv(r.params)).toEqual([["dry", "1", true], ["verbose", "true", false]])
        expect(kv(r.headers)).toEqual([
            ["Content-Type", "application/json", true],
            ["X-Debug", "1", false],
        ])
        expect(r.body.type).toBe("json")
        expect(JSON.parse(r.body.content)).toEqual({ name: "Ada" })
        expect(r.auth).toEqual({ type: "bearer", token: "{{token}}" })
        expect(r.preRequestScript).toContain('bru.setVar("t"')
        expect(r.testScript).toContain('test("created"')
    })

    it("maps a graphql body with variables", () => {
        const r = parseBruRequest(graphqlReq)
        expect(r.body.type).toBe("graphql")
        expect(r.body.content).toContain("query Search")
        expect(JSON.parse(r.body.graphqlVariables ?? "{}")).toEqual({ q: "ada" })
    })

    it("maps multipart @file entries and oauth2 client_credentials", () => {
        const r = parseBruRequest(uploadReq)
        expect(r.body.type).toBe("form-data")
        const [avatar, caption] = r.body.formData ?? []
        expect(avatar).toMatchObject({ key: "avatar", valueType: "file", fileName: "/tmp/a.png" })
        expect(caption).toMatchObject({ key: "caption", value: "hello", valueType: "text" })
        expect(r.auth).toMatchObject({
            type: "oauth2",
            oauth2: {
                grantType: "client_credentials",
                tokenUrl: "https://id.example.com/token",
                clientId: "cid",
                clientSecret: "shh",
                scope: "read write",
            },
        })
    })
})

describe("parseBrunoEnvironment", () => {
    it("reads vars, disabled vars and secret names (values blank)", () => {
        const env = parseBrunoEnvironment(envBru, "prod")
        expect(env.name).toBe("prod")
        expect(env.variables.map((v) => [v.key, v.value, v.enabled])).toEqual([
            ["base_url", "https://api.example.com", true],
            ["staging_only", "1", false],
            ["token", "", true],
        ])
    })
})

describe("OpenCollection YAML", () => {
    it("detects and parses a request.yml", () => {
        expect(looksLikeOpenCollectionYaml(ocRequest)).toBe(true)
        const r = parseOpenCollectionRequestYaml(ocRequest)
        expect(r.name).toBe("OC ping")
        expect(r.method).toBe("GET")
        expect(r.url).toBe("{{base_url}}/ping")
        expect(kv(r.headers)).toEqual([
            ["Accept", "application/json", true],
            ["X-Off", "1", false],
        ])
        expect(r.auth).toEqual({ type: "bearer", token: "{{token}}" })
    })
})

describe("importBrunoFolder", () => {
    const files = [
        { path: "bruno.json", text: JSON.stringify({ version: "1", name: "Pet Store", type: "collection" }) },
        { path: "users/folder.bru", text: folderBru },
        { path: "users/create-user.bru", text: createUser },
        { path: "users/list-users.bru", text: listUsers },
        { path: "environments/prod.bru", text: envBru },
        { path: "README.md", text: "ignored" },
    ]

    it("builds the collection tree, honours seq order and reads environments", () => {
        const { collection, environments } = importBrunoFolder(files)
        expect(collection.name).toBe("Pet Store")
        expect(collection.items).toHaveLength(1)

        const folder = collection.items[0]
        expect(folder).toMatchObject({ type: "folder", name: "Users API" })
        if (!("type" in folder) || folder.type !== "folder") throw new Error("expected a folder")
        expect(kv(folder.defaultHeaders)).toEqual([["Accept", "application/json", true]])
        // seq 1 before seq 2, not file order
        expect(folder.items.map((i) => i.name)).toEqual(["List users", "Create user"])

        expect(environments).toHaveLength(1)
        expect(environments[0].name).toBe("prod")
        expect(environments[0].variables[0]).toMatchObject({ key: "base_url" })
    })

    it("tolerates a wrapping directory (zip-style) and windows separators", () => {
        const wrapped = files.map((f) => ({ ...f, path: `Pet Store\\${f.path.replace(/\//g, "\\")}` }))
        const { collection, environments } = importBrunoFolder(wrapped)
        expect(collection.name).toBe("Pet Store")
        expect(collection.items).toHaveLength(1)
        expect(environments).toHaveLength(1)
    })

    it("mixes OpenCollection YAML requests into the same tree", () => {
        const { collection } = importBrunoFolder([
            { path: "opencollection.yml", text: "info:\n  name: OC Store\n" },
            { path: "ping.yml", text: ocRequest },
        ])
        expect(collection.name).toBe("OC Store")
        expect(collection.items.map((i) => i.name)).toEqual(["OC ping"])
    })
})
