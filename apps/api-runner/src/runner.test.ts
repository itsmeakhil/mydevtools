import { test } from "node:test"
import assert from "node:assert/strict"
import { runCollection } from "./runner.js"
import type { Collection } from "./types.js"

interface FetchCall { url: string; init?: RequestInit }
const calls: FetchCall[] = []
const originalFetch = globalThis.fetch

function installMockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString()
        calls.push({ url, init })
        return handler(url, init)
    }) as typeof fetch
}

test("substitutes env vars and runs test scripts", async () => {
    calls.length = 0
    installMockFetch(async () => new Response('{"id":42}', { status: 200, headers: { "content-type": "application/json" } }))

    const col: Collection = {
        id: "c", name: "T",
        items: [{
            id: "r1", name: "fetch",
            method: "GET",
            url: "https://api.test/items/{{wanted}}",
            params: [], headers: [],
            body: { type: "none", content: "" },
            auth: { type: "none" },
            testScript: "pm.test('200', () => pm.expect(pm.response.code).toBe(200))",
        }],
    }
    const results = await runCollection({
        collection: col,
        environmentVariables: { wanted: "42" },
        iterations: 1,
    })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "https://api.test/items/42")
    assert.equal(results[0].tests.length, 1)
    assert.equal(results[0].tests[0].pass, true)

    globalThis.fetch = originalFetch
})

test("chains {{response.body.token}} from previous request", async () => {
    calls.length = 0
    const responses = [
        new Response(JSON.stringify({ token: "xyz" }), { status: 200, headers: { "content-type": "application/json" } }),
        new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } }),
    ]
    installMockFetch(async () => responses.shift()!)

    const col: Collection = {
        id: "c", name: "T",
        items: [
            {
                id: "r1", name: "login",
                method: "POST",
                url: "https://api.test/login",
                params: [], headers: [],
                body: { type: "json", content: "{}" },
                auth: { type: "none" },
            },
            {
                id: "r2", name: "me",
                method: "GET",
                url: "https://api.test/me",
                params: [],
                headers: [{ id: "h", key: "Authorization", value: "Bearer {{response.body.token}}", active: true }],
                body: { type: "none", content: "" },
                auth: { type: "none" },
            },
        ],
    }
    await runCollection({ collection: col, environmentVariables: {}, iterations: 1 })
    assert.equal(calls.length, 2)
    const meReqHeaders = calls[1].init?.headers
    const authHeader = (meReqHeaders as Record<string, string>)?.Authorization
    assert.equal(authHeader, "Bearer xyz")

    globalThis.fetch = originalFetch
})

test("--bail short-circuits after first failing test", async () => {
    calls.length = 0
    installMockFetch(async () => new Response("", { status: 500 }))

    const col: Collection = {
        id: "c", name: "T",
        items: [
            { id: "r1", name: "a", method: "GET", url: "https://api.test/a", params: [], headers: [], body: { type: "none", content: "" }, auth: { type: "none" }, testScript: "pm.test('ok', () => pm.expect(pm.response.code).toBe(200))" },
            { id: "r2", name: "b", method: "GET", url: "https://api.test/b", params: [], headers: [], body: { type: "none", content: "" }, auth: { type: "none" } },
        ],
    }
    const results = await runCollection({ collection: col, environmentVariables: {}, iterations: 1, bail: true })
    assert.equal(results.length, 1)  // second request skipped
    assert.equal(calls.length, 1)

    globalThis.fetch = originalFetch
})
