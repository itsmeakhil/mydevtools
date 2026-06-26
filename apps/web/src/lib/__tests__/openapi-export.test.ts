import { exportCollectionAsOpenApi } from "../export/openapi"
import { importOpenApiSpec } from "../import/openapi"
import type { Collection, CollectionRequest } from "@/components/api-client/types"

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

describe("exportCollectionAsOpenApi", () => {
    it("emits an openapi 3.0.3 document with the collection's name as title", () => {
        const doc = exportCollectionAsOpenApi({ id: "c", name: "Acme", items: [] })
        expect(doc.openapi).toBe("3.0.3")
        expect(doc.info.title).toBe("Acme")
    })

    it("picks the most-common origin as servers[0].url", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [
                req({ url: "https://a.test/one" }),
                req({ url: "https://a.test/two" }),
                req({ url: "https://b.test/three" }),
            ],
        }
        const doc = exportCollectionAsOpenApi(col)
        expect(doc.servers[0].url).toBe("https://a.test")
    })

    it("emits operations grouped by HTTP method under each path", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [
                req({ method: "GET", url: "https://api.test/users", name: "List users" }),
                req({ method: "POST", url: "https://api.test/users", name: "Create user" }),
            ],
        }
        const doc = exportCollectionAsOpenApi(col)
        expect(Object.keys(doc.paths)).toEqual(["/users"])
        expect(Object.keys(doc.paths["/users"])).toEqual(["get", "post"])
        expect(doc.paths["/users"].get.summary).toBe("List users")
    })

    it("infers schema from a JSON body", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [req({
                method: "POST",
                url: "https://api.test/items",
                body: { type: "json", content: '{"name":"a","age":3,"tags":["x"]}' },
            })],
        }
        const doc = exportCollectionAsOpenApi(col)
        const schema = doc.paths["/items"].post.requestBody?.content["application/json"].schema
        expect(schema?.type).toBe("object")
        expect(schema?.properties?.name).toMatchObject({ type: "string", example: "a" })
        expect(schema?.properties?.age).toMatchObject({ type: "integer", example: 3 })
        expect(schema?.properties?.tags).toMatchObject({ type: "array", items: { type: "string", example: "x" } })
    })

    it("converts query + header params, skipping common header noise", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [req({
                url: "https://api.test/things",
                params: [{ id: "p", key: "limit", value: "10", active: true }],
                headers: [
                    { id: "h1", key: "X-Trace", value: "abc", active: true },
                    { id: "h2", key: "Authorization", value: "Bearer x", active: true },
                ],
            })],
        }
        const doc = exportCollectionAsOpenApi(col)
        const op = doc.paths["/things"].get
        expect(op.parameters?.map((p) => `${p.in}:${p.name}`)).toEqual([
            "query:limit",
            "header:X-Trace",
        ])
    })

    it("uses folder name as tag", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [
                {
                    id: "f", name: "users", type: "folder",
                    items: [req({ url: "https://api.test/users" })],
                },
            ],
        }
        const doc = exportCollectionAsOpenApi(col)
        expect(doc.paths["/users"].get.tags).toEqual(["users"])
        expect(doc.tags).toEqual([{ name: "users" }])
    })

    it("round-trips through the OpenAPI importer", () => {
        const col: Collection = {
            id: "c", name: "Petstore",
            items: [
                {
                    id: "f", name: "pets", type: "folder",
                    items: [
                        req({ method: "GET", url: "https://petstore.test/pets", name: "List pets" }),
                        req({
                            method: "POST",
                            url: "https://petstore.test/pets",
                            name: "Create pet",
                            body: { type: "json", content: '{"name":"a"}' },
                        }),
                    ],
                },
            ],
        }
        const doc = exportCollectionAsOpenApi(col)
        // Import back — should yield two requests prefixed with our server URL.
        const reimported = importOpenApiSpec(JSON.stringify(doc))
        const flat: CollectionRequest[] = []
        const walk = (items: typeof reimported.items): void => {
            for (const it of items) {
                if ("type" in it && it.type === "folder") walk(it.items)
                else flat.push(it as CollectionRequest)
            }
        }
        walk(reimported.items)
        expect(flat).toHaveLength(2)
        expect(flat[0].url).toBe("https://petstore.test/pets")
    })
})
