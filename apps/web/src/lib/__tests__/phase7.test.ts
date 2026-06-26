// localStorage shim
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

import { startSession, stopSession, recordExchange, listSessions, deleteSession, replaySession, getSession } from "../recorder/traffic-recorder"
import { capturedToTab } from "../extension/listen"
import { scimClient } from "../scim/scim-client"

beforeEach(() => memoryLocalStorage.clear())

describe("traffic recorder", () => {
    it("records exchanges into the active session only", () => {
        const s = startSession("test")
        recordExchange({
            request: { method: "GET", url: "https://x", headers: {} },
            response: { status: 200, statusText: "OK", timeMs: 12, bodyExcerpt: "{}" },
        })
        stopSession()
        // Without an active session, recordExchange is a no-op.
        recordExchange({
            request: { method: "GET", url: "https://y", headers: {} },
            response: { status: 200, statusText: "OK", timeMs: 12, bodyExcerpt: "{}" },
        })
        const stored = getSession(s.id)
        expect(stored?.exchanges).toHaveLength(1)
        expect(stored?.exchanges[0].request.url).toBe("https://x")
    })

    it("replays session and counts match vs mismatch", async () => {
        const s = startSession("replay")
        recordExchange({
            request: { method: "GET", url: "https://a", headers: {} },
            response: { status: 200, statusText: "OK", timeMs: 10, bodyExcerpt: "" },
        })
        recordExchange({
            request: { method: "GET", url: "https://b", headers: {} },
            response: { status: 200, statusText: "OK", timeMs: 10, bodyExcerpt: "" },
        })
        stopSession()
        const session = getSession(s.id)!
        const result = await replaySession(session, async (req) => ({
            status: req.url.endsWith("a") ? 200 : 500,
            timeMs: 5,
        }))
        expect(result.matched).toBe(1)
        expect(result.mismatched).toBe(1)
    })

    it("deletes sessions cleanly", () => {
        const s = startSession("temp")
        deleteSession(s.id)
        expect(listSessions().some((x) => x.id === s.id)).toBe(false)
    })
})

describe("capturedToTab", () => {
    it("maps captured request shape to partial tab", () => {
        const partial = capturedToTab({
            method: "post",
            url: "https://api.test/x",
            headers: { "X-Trace": "abc" },
            body: '{"a":1}',
        })
        expect(partial.method).toBe("POST")
        expect(partial.url).toBe("https://api.test/x")
        expect(partial.headers?.[0]).toMatchObject({ key: "X-Trace", value: "abc", active: true })
        expect(partial.body).toEqual({ type: "json", content: '{"a":1}' })
    })

    it("defaults body to none when absent", () => {
        const partial = capturedToTab({ method: "GET", url: "https://api.test" })
        expect(partial.body).toEqual({ type: "none", content: "" })
    })
})

describe("scimClient", () => {
    const originalFetch = global.fetch
    afterEach(() => { global.fetch = originalFetch })

    it("listUsers GET hits /Users with filter + paging in query", async () => {
        const captured: { url?: string; init?: RequestInit } = {}
        global.fetch = jest.fn().mockImplementation(async (url: string, init: RequestInit) => {
            captured.url = url
            captured.init = init
            return new Response(JSON.stringify({ Resources: [], totalResults: 0 }), { status: 200 })
        }) as unknown as typeof fetch

        const client = scimClient({ baseUrl: "https://scim.test/v2", bearerToken: "tok" })
        await client.listUsers({ filter: 'userName eq "alice"', count: 25 })
        expect(captured.url).toContain("/Users")
        expect(captured.url).toContain("filter=userName")
        expect(captured.url).toContain("count=25")
        const headers = captured.init?.headers as Record<string, string>
        expect(headers.Authorization).toBe("Bearer tok")
    })

    it("patchUser wraps Operations in PatchOp envelope", async () => {
        const captured: { body?: string } = {}
        global.fetch = jest.fn().mockImplementation(async (_url: string, init: RequestInit) => {
            captured.body = init.body as string
            return new Response(JSON.stringify({ id: "u1", schemas: [] }), { status: 200 })
        }) as unknown as typeof fetch

        const client = scimClient({ baseUrl: "https://scim.test/v2", bearerToken: "tok" })
        await client.patchUser("u1", [{ op: "replace", path: "active", value: false }])
        const sent = JSON.parse(captured.body!)
        expect(sent.schemas).toContain("urn:ietf:params:scim:api:messages:2.0:PatchOp")
        expect(sent.Operations).toHaveLength(1)
    })

    it("throws on non-OK without proxy", async () => {
        global.fetch = jest.fn().mockResolvedValue(new Response("nope", { status: 500 })) as unknown as typeof fetch
        const client = scimClient({ baseUrl: "https://scim.test/v2", bearerToken: "tok" })
        await expect(client.getUser("u1")).rejects.toThrow(/SCIM 500/)
    })
})
