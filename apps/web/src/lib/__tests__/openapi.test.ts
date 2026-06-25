import { importOpenApiSpec } from "../import/openapi"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

const tinySpec = {
    openapi: "3.0.3",
    info: { title: "Petstore" },
    servers: [{ url: "https://petstore.test/v1" }],
    paths: {
        "/pets": {
            get: {
                tags: ["pets"],
                summary: "List pets",
                parameters: [
                    { name: "limit", in: "query", required: true, schema: { type: "integer", example: 20 } },
                    { name: "X-Trace", in: "header", schema: { type: "string" } },
                ],
            },
            post: {
                tags: ["pets"],
                summary: "Create pet",
                requestBody: {
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["name"],
                                properties: {
                                    name: { type: "string" },
                                    age: { type: "integer" },
                                },
                            },
                        },
                    },
                },
                security: [{ bearerAuth: [] }],
            },
        },
        "/health": {
            get: { summary: "health" },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: "http", scheme: "bearer" },
        },
    },
}

function reqs(items: Array<CollectionFolder | CollectionRequest>): CollectionRequest[] {
    const out: CollectionRequest[] = []
    for (const it of items) {
        if ("type" in it && it.type === "folder") out.push(...reqs(it.items))
        else out.push(it as CollectionRequest)
    }
    return out
}

describe("importOpenApiSpec", () => {
    it("creates one collection named after info.title with per-tag folders", () => {
        const col: Collection = importOpenApiSpec(JSON.stringify(tinySpec))
        expect(col.name).toBe("Petstore")
        const folderNames = col.items
            .filter((i) => "type" in i && i.type === "folder")
            .map((i) => i.name)
        expect(folderNames).toEqual(["pets"])
    })

    it("prepends servers[0].url to each operation", () => {
        const col = importOpenApiSpec(JSON.stringify(tinySpec))
        const all = reqs(col.items)
        for (const r of all) {
            expect(r.url.startsWith("https://petstore.test/v1")).toBe(true)
        }
    })

    it("places untagged operations at the root", () => {
        const col = importOpenApiSpec(JSON.stringify(tinySpec))
        const root = col.items.filter((i) => !("type" in i && i.type === "folder")) as CollectionRequest[]
        expect(root.some((r) => r.url.endsWith("/health"))).toBe(true)
    })

    it("converts query + header params with required-flag and examples", () => {
        const col = importOpenApiSpec(JSON.stringify(tinySpec))
        const list = reqs(col.items).find((r) => r.method === "GET" && r.url.endsWith("/pets"))!
        const limit = list.params.find((p) => p.key === "limit")
        expect(limit).toMatchObject({ value: "20", active: true })
        const trace = list.headers.find((h) => h.key === "X-Trace")
        expect(trace).toMatchObject({ active: false })
    })

    it("builds a JSON skeleton body from schema", () => {
        const col = importOpenApiSpec(JSON.stringify(tinySpec))
        const post = reqs(col.items).find((r) => r.method === "POST")!
        expect(post.body.type).toBe("json")
        const parsed = JSON.parse(post.body.content)
        expect(parsed).toEqual({ name: "", age: 0 })
    })

    it("maps http+bearer security scheme to bearer auth", () => {
        const col = importOpenApiSpec(JSON.stringify(tinySpec))
        const post = reqs(col.items).find((r) => r.method === "POST")!
        expect(post.auth).toEqual({ type: "bearer", token: "" })
    })

    it("imports a YAML spec", () => {
        const yaml = `
openapi: "3.0.0"
info:
  title: Yaml-API
servers:
  - url: https://y.test
paths:
  /ping:
    get:
      summary: Ping
`
        const col = importOpenApiSpec(yaml)
        expect(col.name).toBe("Yaml-API")
        expect(reqs(col.items)[0].url).toBe("https://y.test/ping")
    })

    it("rejects non-OpenAPI input", () => {
        expect(() => importOpenApiSpec("{}")).toThrow()
    })
})
