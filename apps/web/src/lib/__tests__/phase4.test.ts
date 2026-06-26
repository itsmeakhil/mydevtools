import { signJwt } from "../auth/jwt-bearer"
import { generateMockExamplesFromOpenApi } from "../mocks/openapi-mock-gen"
import { enqueue, dequeue, listQueue, drainQueue } from "../offline/queue"
import type { Collection, CollectionRequest } from "@/components/api-client/types"

// localStorage shim for jest-environment-node
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

beforeEach(() => memoryLocalStorage.clear())

describe("signJwt HS256", () => {
    it("produces a 3-segment compact JWT with iat + exp", async () => {
        const jwt = await signJwt({
            algorithm: "HS256",
            secret: "secret",
            claims: { iss: "me", sub: "u1" },
            ttlSeconds: 60,
            now: 1_700_000_000_000,
        })
        const parts = jwt.split(".")
        expect(parts).toHaveLength(3)
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
        const pad = "=".repeat((4 - (b64.length % 4)) % 4)
        const payload = JSON.parse(atob(b64 + pad))
        expect(payload.iss).toBe("me")
        expect(payload.sub).toBe("u1")
        expect(payload.iat).toBe(1_700_000_000)
        expect(payload.exp).toBe(1_700_000_060)
    })

    it("emits same signature for same inputs", async () => {
        const opts = { algorithm: "HS256" as const, secret: "k", claims: {}, now: 1, ttlSeconds: 1 }
        const a = await signJwt(opts)
        const b = await signJwt(opts)
        expect(a).toBe(b)
    })

    it("rejects HS256 without secret", async () => {
        await expect(signJwt({ algorithm: "HS256", claims: {} })).rejects.toThrow(/secret/)
    })
})

describe("generateMockExamplesFromOpenApi", () => {
    it("synthesises an example body from 2xx response schema", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [{
                id: "r1", name: "list", method: "GET",
                url: "https://api.test/users",
                params: [], headers: [], auth: { type: "none" },
                body: { type: "none", content: "" },
            } as CollectionRequest],
        }
        const spec = {
            openapi: "3.0.0",
            paths: {
                "/users": {
                    get: {
                        responses: {
                            "200": {
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object",
                                            properties: {
                                                count: { type: "integer" },
                                                name: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }
        const result = generateMockExamplesFromOpenApi(col, JSON.stringify(spec))
        expect(result.addedCount).toBe(1)
        const req = col.items[0] as CollectionRequest
        expect(req.examples?.[0].response.status).toBe(200)
        const body = JSON.parse(req.examples![0].response.body)
        expect(body.count).toBe(0)
        expect(body.name).toBe("string")
    })

    it("skips when example already exists", () => {
        const col: Collection = {
            id: "c", name: "X",
            items: [{
                id: "r1", name: "list", method: "GET",
                url: "https://api.test/users",
                params: [], headers: [], auth: { type: "none" },
                body: { type: "none", content: "" },
                examples: [{
                    id: "e", name: "existing",
                    capturedAt: 1,
                    request: { method: "GET", url: "x", headers: [], body: { type: "none", content: "" } },
                    response: { status: 200, statusText: "", headers: {}, body: "{}" },
                }],
            } as CollectionRequest],
        }
        const result = generateMockExamplesFromOpenApi(col, JSON.stringify({ openapi: "3.0.0", paths: {} }))
        expect(result.skippedCount).toBe(1)
        expect(result.addedCount).toBe(0)
    })
})

describe("offline queue", () => {
    it("survives round trip via localStorage", () => {
        enqueue({ path: "/api", method: "POST", body: "x", label: "save" })
        expect(listQueue()).toHaveLength(1)
    })

    it("dequeues by id", () => {
        enqueue({ path: "/api", method: "POST", body: "x", label: "save" })
        const id = listQueue()[0].id
        dequeue(id)
        expect(listQueue()).toHaveLength(0)
    })

    it("drains successful mutations and keeps failures for retry", async () => {
        enqueue({ path: "/ok", method: "POST", label: "a" })
        enqueue({ path: "/ko", method: "POST", label: "b" })
        const fetcher = jest.fn(async (path: string) => {
            return new Response(null, { status: path === "/ok" ? 200 : 500 })
        }) as unknown as (p: string, init: RequestInit) => Promise<Response>
        const result = await drainQueue(fetcher)
        expect(result.succeeded).toBe(1)
        expect(result.failed).toBe(1)
        expect(listQueue()).toHaveLength(1)
        expect(listQueue()[0].label).toBe("b")
    })
})
