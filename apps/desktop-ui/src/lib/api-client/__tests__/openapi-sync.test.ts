import { applyOpenApiSync, diffOpenApiSync, endpointKey, mergeJson } from "../openapi-sync"
import { importOpenApiSpec } from "@/lib/import/openapi"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

const v1 = {
    openapi: "3.0.3",
    info: { title: "Pets" },
    servers: [{ url: "https://pets.test/v1" }],
    paths: {
        "/pets": {
            get: { tags: ["pets"], summary: "List", parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }] },
            post: {
                tags: ["pets"], summary: "Create",
                requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } },
            },
        },
        "/pets/{petId}": { delete: { tags: ["pets"], summary: "Delete" } },
    },
}

// v2: limit+offset, a new body field, /pets/{id} DELETE gone, two new ops.
const v2 = {
    ...v1,
    paths: {
        "/pets": {
            get: {
                tags: ["pets"], summary: "List",
                parameters: [
                    { name: "limit", in: "query", schema: { type: "integer" } },
                    { name: "offset", in: "query", schema: { type: "integer" } },
                    { name: "X-Trace", in: "header", schema: { type: "string" } },
                ],
            },
            post: {
                tags: ["pets"], summary: "Create",
                requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, age: { type: "integer" } } } } } },
            },
        },
        "/pets/{petId}": { get: { tags: ["pets"], summary: "Get one" } },
        "/health": { get: { summary: "Health" } },
    },
}

const reqs = (c: Collection) => (c.items[0] as CollectionFolder).items as CollectionRequest[]

function userEdited(): Collection {
    const c = importOpenApiSpec(v1)
    const [list, create, del] = reqs(c)
    list.url = "{{baseUrl}}/pets"
    list.params[0].value = "50"
    list.testScript = "pm.test('ok', () => {})"
    list.auth = { type: "bearer", token: "{{token}}" }
    create.body = { type: "json", content: JSON.stringify({ name: "Rex", extra: true }) }
    del.url = "{{baseUrl}}/pets/:id"
    return c
}

describe("endpointKey", () => {
    it("ignores origin, {{var}} prefix, base path and param names", () => {
        expect(endpointKey("get", "https://pets.test/v1/pets/{petId}?x=1", "/v1")).toBe("GET /pets/{}")
        expect(endpointKey("GET", "{{baseUrl}}/pets/:id", "/v1")).toBe("GET /pets/{}")
        expect(endpointKey("GET", "{{baseUrl}}/v1/pets/{{id}}/", "/v1")).toBe("GET /pets/{}")
    })
})

describe("mergeJson", () => {
    it("keeps the user's values and fields, adds new spec fields", () => {
        expect(mergeJson({ name: "", age: 0, tags: [{ id: 0, label: "" }] }, { name: "Rex", extra: 1, tags: [{ id: 7 }] }))
            .toEqual({ name: "Rex", extra: 1, age: 0, tags: [{ id: 7, label: "" }] })
    })
})

describe("diffOpenApiSync", () => {
    it("reports added, changed and removed endpoints", () => {
        const c = userEdited()
        const changes = diffOpenApiSync(c, v2)
        const byKind = (k: string) => changes.filter((x) => x.kind === k).map((x) => x.key).sort()
        expect(byKind("added")).toEqual(["GET /health", "GET /pets/{}"])
        expect(byKind("removed")).toEqual(["DELETE /pets/{}"])
        expect(byKind("changed")).toEqual(["GET /pets", "POST /pets"])
        const list = changes.find((x) => x.key === "GET /pets")!
        expect(list.kind === "changed" && list.details).toEqual({ paramsAdded: ["offset"], headersAdded: ["X-Trace"], body: null })
    })

    it("is empty when the spec did not move, despite user edits", () => {
        expect(diffOpenApiSync(userEdited(), v1)).toEqual([])
    })

    it("puts new requests on the user's base-URL variable", () => {
        const added = diffOpenApiSync(userEdited(), v2).find((x) => x.key === "GET /health")
        expect(added?.kind === "added" && added.request.url).toBe("{{baseUrl}}/health")
    })

    it("accepts YAML text", () => {
        const yaml = "openapi: 3.0.0\ninfo: {title: t}\npaths:\n  /a:\n    get: {summary: A}\n"
        expect(diffOpenApiSync({ id: "c", name: "c", items: [] }, yaml).map((x) => x.key)).toEqual(["GET /a"])
    })
})

describe("applyOpenApiSync", () => {
    it("preserves user fields and only deletes what was accepted", () => {
        const c = userEdited()
        const changes = diffOpenApiSync(c, v2)
        // User accepts everything except the removal.
        const { items, ops } = applyOpenApiSync(c, changes.filter((x) => x.kind !== "removed"))
        const folder = items[0] as CollectionFolder
        const [list, create, del, getOne] = folder.items as CollectionRequest[]
        expect(list.params.map((p) => [p.key, p.value])).toEqual([["limit", "50"], ["offset", "0"]])
        expect(list.headers.map((h) => h.key)).toEqual(["X-Trace"])
        expect(list.testScript).toContain("pm.test")
        expect(list.auth).toEqual({ type: "bearer", token: "{{token}}" })
        expect(list.url).toBe("{{baseUrl}}/pets")
        expect(JSON.parse(create.body.content)).toEqual({ name: "Rex", extra: true, age: 0 })
        expect(del.name).toBe("Delete")
        expect(getOne.name).toBe("Get one")
        expect((items[1] as CollectionRequest).name).toBe("Health")
        expect(ops).toEqual(expect.arrayContaining([
            { type: "update", item_id: list.id, patch: expect.any(Object) },
            { type: "add", parent_id: folder.id, item: getOne },
            { type: "add", parent_id: c.id, item: items[1] },
        ]))
        expect(ops.some((o) => (o as { type: string }).type === "delete")).toBe(false)

        const { items: after, ops: delOps } = applyOpenApiSync(c, changes.filter((x) => x.kind === "removed"))
        expect((after[0] as CollectionFolder).items).toHaveLength(2)
        expect(delOps).toEqual([{ type: "delete", item_id: del.id }])
    })

    it("groups new endpoints of a new tag into one new folder", () => {
        const c: Collection = { id: "col", name: "c", items: [] }
        const spec = { openapi: "3.0.0", paths: { "/a": { get: { tags: ["x"] }, post: { tags: ["x"] } } } }
        const { items, ops } = applyOpenApiSync(c, diffOpenApiSync(c, spec))
        expect(items).toHaveLength(1)
        expect((items[0] as CollectionFolder).items).toHaveLength(2)
        expect(ops).toHaveLength(1)
    })
})
