import { diffFiles, type FileEntry } from "@/lib/api-client/file-store"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"
import { BrunoWriteError, readBrunoLink, serializeBrunoCollection, writeBruRequest, type BrunoLink } from "../bruno-write"
import { parseBruRequest } from "../bruno"

// ── Realistic Bruno 1.x files ──────────────────────────────────────────────

const CREATE_USER = `meta {
  name: Create user
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/users?verbose=1
  body: json
  auth: bearer
}

params:query {
  verbose: 1
  ~debug: true
}

headers {
  Content-Type: application/json
  X-Trace: {{traceId}}
}

auth:bearer {
  token: {{token}}
}

body:json {
  {
    "name": "Ada",
    "tags": ["a", "b"],
    "nested": { "x": "}" }
  }
}

body:text {
  stashed text body
}

vars:pre-request {
  startedAt: now
}

assert {
  res.status: eq 201
  ~res.body.id: isDefined
}

script:pre-request {
  const sig = "{" + bru.getEnvVar("x") + "}";
  if (sig) {
    req.setHeader("X-Sig", sig);
  }
}

script:post-response {
  bru.setVar("id", res.body.id);
}

tests {
  test("created", function () {
    expect(res.getStatus()).to.equal(201);
  });
}

settings {
  encodeUrl: true
}

docs {
  # Create user
  Creates a user. Body example: \`{ "a": 1 }\`
}
`

const LOGIN = `meta {
  name: Login
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/login
  body: formUrlEncoded
  auth: none
}

body:form-urlencoded {
  username: ada
  ~password: secret
}
`

const USERS_FOLDER = `meta {
  name: Users
  seq: 1
}

auth {
  mode: inherit
}

headers {
  X-Folder: users
}

script:pre-request {
  console.log("folder");
}

docs {
  Users folder docs
}
`

const SOCKET = `meta {
  name: Socket
  type: ws
  seq: 3
}

ws {
  url: wss://api.test/socket
}
`

const UPLOAD = `meta {
  name: Upload
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/upload
  body: multipartForm
  auth: basic
}

auth:basic {
  username: admin
  password: {{password}}
}

body:multipart-form {
  file: @file(fixtures/a.png|fixtures/b.png)
  note: hello @contentType(text/plain)
}
`

const GRAPHQL = `meta {
  name: GraphQL
  type: graphql
  seq: 3
}

post {
  url: {{baseUrl}}/graphql
  body: graphql
  auth: none
}

body:graphql {
  query Users($n: Int) {
    users(first: $n) { id }
  }
}

body:graphql:vars {
  { "n": 2 }
}
`

const DIGEST = ["meta {", "  name: Digest", "  type: http", "  seq: 4", "}", "", "get {", "  url: {{baseUrl}}/digest", "  body: none", "  auth: digest", "}", "", "auth:digest {", "  username: u", "  password: p", "}", ""].join("\r\n")

const COLLECTION_BRU = `headers {
  X-App: mdt
}

auth {
  mode: bearer
}

auth:bearer {
  token: {{token}}
}

vars:pre-request {
  baseUrl: https://api.test
}

script:pre-request {
  console.log("collection");
}
`

const BRUNO_JSON = `{
  "version": "1",
  "name": "Shop API",
  "type": "collection",
  "ignore": ["node_modules", ".git"]
}
`

const ENV_LOCAL = `vars {
  baseUrl: http://localhost:3000
}
vars:secret [
  token
]
`

const FILES: FileEntry[] = [
    { relPath: "bruno.json", content: BRUNO_JSON },
    { relPath: "collection.bru", content: COLLECTION_BRU },
    { relPath: "environments/Local.bru", content: ENV_LOCAL },
    { relPath: "users/folder.bru", content: USERS_FOLDER },
    { relPath: "users/Create user.bru", content: CREATE_USER },
    { relPath: "users/Login.bru", content: LOGIN },
    { relPath: "users/Socket.bru", content: SOCKET },
    { relPath: "Upload.bru", content: UPLOAD },
    { relPath: "GraphQL.bru", content: GRAPHQL },
    { relPath: "Digest.bru", content: DIGEST },
]

// ── Helpers ────────────────────────────────────────────────────────────────

const open = (files = FILES) => readBrunoLink("/repo", files)

type Item = CollectionFolder | CollectionRequest
const isFolder = (i: Item): i is CollectionFolder => "type" in i && i.type === "folder"
function find<T extends Item = CollectionRequest>(items: Item[], name: string): T {
    for (const i of items) {
        if (i.name === name) return i as T
        if (isFolder(i)) {
            try { return find<T>(i.items, name) } catch { /* keep looking */ }
        }
    }
    throw new Error(`no item ${name}`)
}

/** Clone the collection and apply `edit` to the named item. */
function edited(col: Collection, name: string, edit: (i: Item) => void): Collection {
    const copy = structuredClone(col)
    edit(find<Item>(copy.items, name))
    return copy
}

function save(col: Collection, link: BrunoLink) {
    const { files } = serializeBrunoCollection(col, link)
    const prev = Object.entries(link.files).map(([relPath, content]) => ({ relPath, content }))
    return { ...diffFiles(prev, files), byPath: Object.fromEntries(files.map((f) => [f.relPath, f.content])) }
}

const codeOf = (fn: () => unknown) => {
    try { fn() } catch (e) { return e instanceof BrunoWriteError ? `${e.code}:${e.params.part ?? ""}` : `other:${(e as Error).message}` }
    return "ok"
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("readBrunoLink", () => {
    it("reads requests, folder + collection defaults, and skips non-http requests", () => {
        const { collection, environments } = open()
        expect(collection.name).toBe("Shop API")
        expect(collection.variables?.map((v) => [v.key, v.value])).toEqual([["baseUrl", "https://api.test"]])
        expect(collection.defaultAuth).toEqual({ type: "bearer", token: "{{token}}" })
        const users = find<CollectionFolder>(collection.items, "Users")
        expect(users.defaultAuth).toEqual({ type: "inherit" })
        expect(users.items.map((i) => i.name)).toEqual(["Login", "Create user"])
        expect(() => find(collection.items, "Socket")).toThrow()
        expect(find(collection.items, "GraphQL").body.graphqlVariables).toBe('{ "n": 2 }')
        expect(environments[0].variables.find((v) => v.key === "token")?.secret).toBe(true)
    })

    it("keeps ids stable across reloads", () => {
        const first = open()
        const again = readBrunoLink("/repo", FILES, first.link.pathOf)
        expect(find(again.collection.items, "Create user").id).toBe(find(first.collection.items, "Create user").id)
        expect(again.collection.id).toBe(first.collection.id)
    })
})

describe("serializeBrunoCollection — untouched", () => {
    it("writes nothing when nothing changed (byte-identical, CRLF included)", () => {
        const { collection, link } = open()
        const r = save(collection, link)
        expect(r.writes).toEqual([])
        expect(r.deletes).toEqual([])
        expect(r.byPath["Digest.bru"]).toBe(DIGEST)
    })

    it("ignores UI-only state and empty editor rows", () => {
        const { collection, link } = open()
        const next = edited(collection, "Create user", (i) => {
            const r = i as CollectionRequest
            r.params = [...r.params, { id: "x", key: "", value: "", active: true }]
        })
        const users = find<CollectionFolder>(next.items, "Users")
        users.isOpen = true
        expect(save(next, link).writes).toEqual([])
    })
})

describe("request edits patch only what changed", () => {
    it("URL edit rewrites the url line and nothing else", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Create user", (i) => { (i as CollectionRequest).url = "{{baseUrl}}/v2/users" }), link)
        expect(r.writes.map((w) => w.relPath)).toEqual(["users/Create user.bru"])
        expect(r.writes[0].content).toBe(CREATE_USER.replace("url: {{baseUrl}}/users?verbose=1", "url: {{baseUrl}}/v2/users"))
    })

    it("rename touches meta.name only; the filename stays", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Create user", (i) => { i.name = "Create a user" }), link)
        expect(r.writes.map((w) => w.relPath)).toEqual(["users/Create user.bru"])
        expect(r.writes[0].content).toBe(CREATE_USER.replace("name: Create user", "name: Create a user"))
        expect(r.deletes).toEqual([])
    })

    it("header edit regenerates only the headers block", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Create user", (i) => {
            (i as CollectionRequest).headers.push({ id: "n", key: "X-New", value: "1", active: false })
        }), link)
        expect(r.writes[0].content).toBe(CREATE_USER.replace("  X-Trace: {{traceId}}\n", "  X-Trace: {{traceId}}\n  ~X-New: 1\n"))
    })

    it("JSON body edit keeps the inactive text stash, vars, settings and docs", () => {
        const { collection, link } = open()
        const body = '{\n  "name": "Grace"\n}'
        const r = save(edited(collection, "Create user", (i) => { (i as CollectionRequest).body.content = body }), link)
        const out = r.writes[0].content
        expect(out).toContain("body:json {\n  {\n    \"name\": \"Grace\"\n  }\n}")
        for (const kept of ["body:text {\n  stashed text body\n}", "vars:pre-request {", "settings {", "docs {", "script:post-response {"]) expect(out).toContain(kept)
        expect(parseBruRequest(out).body.content).toBe(body)
    })

    it("switching body mode keeps the old block as Bruno's stash", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Create user", (i) => {
            (i as CollectionRequest).body = { type: "xml", content: "<user/>" }
        }), link)
        const out = r.writes[0].content
        expect(out).toContain("  body: xml\n")
        expect(out).toContain("body:xml {\n  <user/>\n}")
        expect(out).toContain('body:json {\n  {\n    "name": "Ada"')
        expect(parseBruRequest(out).body).toEqual({ type: "xml", content: "<user/>" })
    })

    it("refuses to overwrite an inactive body stash", () => {
        const { collection, link } = open()
        expect(codeOf(() => save(edited(collection, "Create user", (i) => {
            (i as CollectionRequest).body = { type: "text", content: "new" }
        }), link))).toBe("modeStash:body")
    })

    it("a test-script addition lands in the tests block; post-response untouched", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Create user", (i) => {
            const req = i as CollectionRequest
            req.testScript = `${req.testScript}\ntest("more", () => {});`
        }), link)
        const out = r.writes[0].content
        expect(out).toContain("script:post-response {\n  bru.setVar(\"id\", res.body.id);\n}")
        expect(out).toContain('  test("more", () => {});\n}')
        expect(out.split("tests {").length).toBe(2)
    })

    it("refuses a test-script edit it can't split between post-response and tests", () => {
        const { collection, link } = open()
        expect(codeOf(() => save(edited(collection, "Create user", (i) => {
            (i as CollectionRequest).testScript = "test('x', () => {})"
        }), link))).toBe("ambiguousScripts:")
    })

    it("auth switch keeps the old auth block as stash; parse-back matches", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Create user", (i) => {
            (i as CollectionRequest).auth = { type: "basic", username: "u", password: "{{pw}}" }
        }), link)
        const out = r.writes[0].content
        expect(out).toContain("  auth: basic\n")
        expect(out).toContain("auth:basic {\n  username: u\n  password: {{pw}}\n}")
        expect(out).toContain("auth:bearer {\n  token: {{token}}\n}")
        expect(parseBruRequest(out).auth).toEqual({ type: "basic", username: "u", password: "{{pw}}" })
    })

    it("method change renames the method block and keeps its keys", () => {
        const { collection, link } = open()
        const out = save(edited(collection, "Login", (i) => { (i as CollectionRequest).method = "PUT" }), link).writes[0].content
        expect(out).toBe(LOGIN.replace("post {", "put {"))
    })

    it("assertion edit regenerates the assert block", () => {
        const { collection, link } = open()
        const out = save(edited(collection, "Create user", (i) => {
            (i as CollectionRequest).assertions![0].value = "200"
        }), link).writes[0].content
        expect(out).toContain("assert {\n  res.status: eq 200\n  ~res.body.id: isDefined\n}")
    })

    it("CRLF files keep CRLF when edited", () => {
        const { collection, link } = open()
        const out = save(edited(collection, "Digest", (i) => { (i as CollectionRequest).url = "{{baseUrl}}/d2" }), link).writes[0].content
        expect(out).toBe(DIGEST.replace("/digest", "/d2"))
    })

    it("graphql variables edit round-trips", () => {
        const { collection, link } = open()
        const out = save(edited(collection, "GraphQL", (i) => { (i as CollectionRequest).body.graphqlVariables = '{ "n": 5 }' }), link).writes[0].content
        expect(out).toBe(GRAPHQL.replace('{ "n": 2 }', '{ "n": 5 }'))
    })
})

describe("refusals instead of lossy writes", () => {
    const { collection, link } = open()
    const tryEdit = (name: string, edit: (r: CollectionRequest) => void) =>
        codeOf(() => save(edited(collection, name, (i) => edit(i as CollectionRequest)), link))

    it("multipart with multi-file/@contentType: URL editable, body not", () => {
        expect(tryEdit("Upload", (r) => { r.url = "{{baseUrl}}/up" })).toBe("ok")
        expect(tryEdit("Upload", (r) => { r.body.formData![1].value = "changed" })).toBe("lossy:body")
    })

    it("auth modes we don't model can't be edited", () => {
        expect(tryEdit("Digest", (r) => { r.auth = { type: "bearer", token: "t" } })).toBe("lossy:auth")
        expect(tryEdit("Login", (r) => { r.auth = { type: "digest", username: "a" } as CollectionRequest["auth"] })).toBe("unsupported:auth")
    })

    it("fields a .bru file can't hold are refused by name", () => {
        expect(tryEdit("Login", (r) => { r.timeoutMs = 5000 })).toBe("unsupported:timeoutMs")
        expect(tryEdit("Login", (r) => { r.method = "PURGE" })).toBe("unsupported:method")
        expect(tryEdit("Login", (r) => { r.body = { type: "binary", content: "", binaryFile: { fileName: "a.bin" } } })).toBe("unsupported:body")
        expect(tryEdit("Login", (r) => { r.examples = [{ id: "e" } as never] })).toBe("unsupported:examples")
    })
})

describe("folders and collection files", () => {
    it("folder rename only patches folder.bru meta.name", () => {
        const { collection, link } = open()
        const r = save(edited(collection, "Users", (i) => { i.name = "People" }), link)
        expect(r.writes.map((w) => w.relPath)).toEqual(["users/folder.bru"])
        expect(r.writes[0].content).toBe(USERS_FOLDER.replace("name: Users", "name: People"))
    })

    it("folder header edit keeps docs and scripts", () => {
        const { collection, link } = open()
        const out = save(edited(collection, "Users", (i) => {
            (i as CollectionFolder).defaultHeaders![0].value = "people"
        }), link).writes[0].content
        expect(out).toBe(USERS_FOLDER.replace("X-Folder: users", "X-Folder: people"))
    })

    it("collection variables → collection.bru; rename → bruno.json (other keys kept)", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        next.variables![0].value = "https://staging.test"
        next.name = "Shop"
        const r = save(next, link)
        expect(r.writes.map((w) => w.relPath).sort()).toEqual(["bruno.json", "collection.bru"])
        expect(r.byPath["collection.bru"]).toBe(COLLECTION_BRU.replace("https://api.test", "https://staging.test"))
        expect(JSON.parse(r.byPath["bruno.json"])).toEqual({ ...JSON.parse(BRUNO_JSON), name: "Shop" })
    })
})

describe("structure changes", () => {
    const newRequest = (name: string): CollectionRequest => ({
        id: crypto.randomUUID(), name, method: "GET", url: "{{baseUrl}}/health",
        params: [], headers: [], body: { type: "none", content: "" }, auth: { type: "inherit" },
    })

    it("adding a request writes one new file with the next seq", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        find<CollectionFolder>(next.items, "Users").items.push(newRequest("Health check"))
        const r = save(next, link)
        expect(r.deletes).toEqual([])
        expect(r.writes.map((w) => w.relPath)).toEqual(["users/Health check.bru"])
        const created = parseBruRequest(r.writes[0].content)
        expect([created.name, created.method, created.url, created.auth.type]).toEqual(["Health check", "GET", "{{baseUrl}}/health", "inherit"])
        expect(r.writes[0].content).toContain("  seq: 3\n")
    })

    it("a new request never overwrites an existing file", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        find<CollectionFolder>(next.items, "Users").items.push(newRequest("Login"))
        const r = save(next, link)
        expect(r.writes.map((w) => w.relPath)).toEqual(["users/Login 1.bru"])
    })

    it("deleting a request removes its file; unmodeled files stay", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        const users = find<CollectionFolder>(next.items, "Users")
        users.items = users.items.filter((i) => i.name !== "Login")
        const r = save(next, link)
        expect(r.deletes).toEqual(["users/Login.bru"])
        expect(r.writes).toEqual([])
    })

    it("deleting a folder removes only the files we model (Socket.bru survives)", () => {
        const { collection, link } = open()
        const next = { ...collection, items: collection.items.filter((i) => i.name !== "Users") }
        const r = save(next, link)
        expect(r.deletes.sort()).toEqual(["users/Create user.bru", "users/Login.bru", "users/folder.bru"])
        expect(r.byPath["users/Socket.bru"]).toBe(SOCKET)
    })

    it("moving a request moves its file (content unchanged except seq)", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        const users = find<CollectionFolder>(next.items, "Users")
        const login = users.items.find((i) => i.name === "Login")!
        users.items = users.items.filter((i) => i !== login)
        next.items.push(login)
        const r = save(next, link)
        expect(r.deletes).toEqual(["users/Login.bru"])
        expect(r.writes.map((w) => w.relPath)).toEqual(["Login.bru"])
        expect(parseBruRequest(r.writes[0].content).url).toBe("{{baseUrl}}/login")
    })

    it("reordering rewrites seq lines only", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        const users = find<CollectionFolder>(next.items, "Users")
        users.items.reverse()
        const r = save(next, link)
        expect(r.byPath["users/Create user.bru"]).toBe(CREATE_USER.replace("seq: 2", "seq: 1"))
        expect(r.byPath["users/Login.bru"]).toBe(LOGIN.replace("seq: 1", "seq: 2"))
    })

    it("moving a folder to another parent is refused", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        const users = find<CollectionFolder>(next.items, "Users")
        const gql = { id: "g", name: "Group", type: "folder" as const, items: [users] }
        next.items = [gql, ...next.items.filter((i) => i !== users)]
        expect(codeOf(() => serializeBrunoCollection(next, link))).toBe("folderMove:")
    })

    it("a new folder gets its own directory and folder.bru", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        next.items.push({ id: "nf", name: "Orders", type: "folder", items: [newRequest("List orders")] })
        const r = save(next, link)
        expect(r.writes.map((w) => w.relPath).sort()).toEqual(["Orders/List orders.bru", "Orders/folder.bru"])
        expect(r.byPath["Orders/folder.bru"]).toContain("name: Orders")
    })

    it("ids recorded for new items survive the next read", () => {
        const { collection, link } = open()
        const next = structuredClone(collection)
        const added = newRequest("Health check")
        find<CollectionFolder>(next.items, "Users").items.push(added)
        const { files, pathOf } = serializeBrunoCollection(next, link)
        const reread = readBrunoLink("/repo", files, pathOf)
        expect(find(reread.collection.items, "Health check").id).toBe(added.id)
    })
})

describe("folders and requests without seq (common in hand-made repos)", () => {
    const plain = (name: string) => `meta {\n  name: ${name}\n  type: http\n}\n\nget {\n  url: {{baseUrl}}/${name.toLowerCase()}\n  body: none\n  auth: none\n}\n`
    const files: FileEntry[] = [
        { relPath: "bruno.json", content: BRUNO_JSON },
        { relPath: "orders/List.bru", content: plain("List") },
        { relPath: "orders/Get.bru", content: plain("Get") },
        { relPath: "Health.bru", content: plain("Health") },
    ]

    it("untouched → nothing written, no folder.bru invented", () => {
        const { collection, link } = open(files)
        expect(save(collection, link).writes).toEqual([])
    })

    it("an edit or an added request touches only that file", () => {
        const { collection, link } = open(files)
        const next = edited(collection, "Get", (i) => { (i as CollectionRequest).url = "{{baseUrl}}/one" })
        find<CollectionFolder>(next.items, "orders").items.push({
            id: "new", name: "Create", method: "POST", url: "", params: [], headers: [],
            body: { type: "none", content: "" }, auth: { type: "none" },
        })
        const r = save(next, link)
        expect(r.writes.map((w) => w.relPath).sort()).toEqual(["orders/Create.bru", "orders/Get.bru"])
        expect(r.byPath["orders/Create.bru"]).not.toContain("seq:")
        expect(r.byPath["orders/List.bru"]).toBe(plain("List"))
    })
})

describe("read-only and new files", () => {
    it("OpenCollection folders are read-only", () => {
        const { collection, link } = open([{ relPath: "opencollection.yml", content: "info:\n  name: OC\n" }])
        expect(link.readOnly).toBe("opencollection")
        expect(codeOf(() => serializeBrunoCollection(collection, link))).toBe("readOnly:")
    })

    it("a brand-new request file parses back to the same request", () => {
        const req: CollectionRequest = {
            id: "n", name: "Everything", method: "PATCH", url: "{{baseUrl}}/x",
            params: [{ id: "p", key: "q", value: "1", active: true }],
            headers: [{ id: "h", key: "X-A", value: "multi\nline", active: true }],
            body: { type: "json", content: '{\n  "a": "}"\n}\n' },
            auth: { type: "api-key", apiKeyKey: "k", apiKeyValue: "{{v}}", apiKeyLocation: "query" },
            preRequestScript: 'if (true) {\n  console.log("{")\n}',
            testScript: "test('ok', () => {})",
            assertions: [{ id: "a", enabled: true, target: "res.status", operator: "eq", value: "200" }],
        }
        const back = parseBruRequest(writeBruRequest(undefined, req, 1))
        expect(back.headers[0].value).toBe("multi\nline")
        expect(back.body).toEqual(req.body)
        expect(back.auth).toEqual(req.auth)
        expect(back.preRequestScript).toBe(req.preRequestScript)
        expect(back.assertions?.[0]).toMatchObject({ target: "res.status", operator: "eq", value: "200" })
    })
})
