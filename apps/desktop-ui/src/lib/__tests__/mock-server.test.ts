/**
 * Mock-server matcher unit tests.
 * The route handler in `app/api/mock/.../route.ts` defers all decision logic to a
 * walk-and-match helper. We replicate it inline here so we can exercise it
 * without bootstrapping a Next.js request — same shape, kept in sync if the
 * route ever changes.
 */

import type {
    CollectionFolder,
    CollectionRequest,
    SavedExample,
} from "@/components/api-client/types"

function* walkRequests(items: Array<CollectionFolder | CollectionRequest>): Generator<CollectionRequest> {
    for (const item of items) {
        if ("type" in item && item.type === "folder") yield* walkRequests(item.items)
        else yield item as CollectionRequest
    }
}

function exampleMatches(ex: SavedExample, method: string, pathname: string): boolean {
    if (ex.request.method.toUpperCase() !== method.toUpperCase()) return false
    let storedPath: string
    try { storedPath = new URL(ex.request.url).pathname || "/" } catch { storedPath = ex.request.url || "/" }
    return storedPath === pathname
}

function findFirstMatch(
    items: Array<CollectionFolder | CollectionRequest>,
    method: string,
    pathname: string,
): SavedExample | null {
    for (const r of walkRequests(items)) {
        if (!r.examples) continue
        for (const ex of r.examples) {
            if (exampleMatches(ex, method, pathname)) return ex
        }
    }
    return null
}

const example = (over: Partial<SavedExample>): SavedExample => ({
    id: "x",
    name: "ex",
    capturedAt: 1,
    request: { method: "GET", url: "https://api.test/", headers: [], body: { type: "none", content: "" } },
    response: { status: 200, statusText: "OK", headers: {}, body: "{}" },
    ...over,
})

const req = (over: Partial<CollectionRequest>): CollectionRequest => ({
    id: "r",
    name: "r",
    method: "GET",
    url: "https://api.test/",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    ...over,
})

describe("mock-server matcher", () => {
    it("matches on method + exact pathname", () => {
        const items = [req({
            examples: [example({ request: { method: "GET", url: "https://api.test/users", headers: [], body: { type: "none", content: "" } } })],
        })]
        const hit = findFirstMatch(items, "GET", "/users")
        expect(hit).not.toBeNull()
    })

    it("ignores method differences from the original URL host", () => {
        const items = [req({
            examples: [example({ request: { method: "POST", url: "https://OTHER-HOST.test/v1/login", headers: [], body: { type: "none", content: "" } } })],
        })]
        const hit = findFirstMatch(items, "POST", "/v1/login")
        expect(hit).not.toBeNull()
    })

    it("is method-sensitive", () => {
        const items = [req({
            examples: [example({ request: { method: "POST", url: "https://api.test/x", headers: [], body: { type: "none", content: "" } } })],
        })]
        expect(findFirstMatch(items, "GET", "/x")).toBeNull()
        expect(findFirstMatch(items, "post", "/x")).not.toBeNull()  // case-insensitive method
    })

    it("walks nested folders", () => {
        const inner = req({
            examples: [example({ request: { method: "GET", url: "https://api.test/deep", headers: [], body: { type: "none", content: "" } } })],
        })
        const items: Array<CollectionFolder | CollectionRequest> = [
            { id: "f1", name: "f", type: "folder", items: [inner] },
        ]
        expect(findFirstMatch(items, "GET", "/deep")).not.toBeNull()
    })

    it("first hit wins", () => {
        const items = [req({
            examples: [
                example({ id: "a", request: { method: "GET", url: "https://api.test/dup", headers: [], body: { type: "none", content: "" } } }),
                example({ id: "b", request: { method: "GET", url: "https://api.test/dup", headers: [], body: { type: "none", content: "" } } }),
            ],
        })]
        const hit = findFirstMatch(items, "GET", "/dup")
        expect(hit?.id).toBe("a")
    })

    it("returns null on miss", () => {
        const items = [req({
            examples: [example({ request: { method: "GET", url: "https://api.test/found", headers: [], body: { type: "none", content: "" } } })],
        })]
        expect(findFirstMatch(items, "GET", "/not-found")).toBeNull()
    })

    it("handles examples with no parseable URL by falling back to literal string", () => {
        const items = [req({
            examples: [example({ request: { method: "GET", url: "/relative-url", headers: [], body: { type: "none", content: "" } } })],
        })]
        expect(findFirstMatch(items, "GET", "/relative-url")).not.toBeNull()
    })
})
