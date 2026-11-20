jest.mock("@/lib/desktop/api-fetch", () => ({ apiFetch: jest.fn() }))

import { apiFetch } from "@/lib/desktop/api-fetch"
import { runCollection } from "../runner"
import { buildHtmlReport } from "../html-report"
import type { Collection, CollectionRequest, RequestAuth } from "@/components/api-client/types"
import type { RequestRunResult } from "../types"

const mockFetch = apiFetch as jest.Mock

function req(id: string, auth: RequestAuth, extra: Partial<CollectionRequest> = {}): CollectionRequest {
    return {
        id, name: id, method: "POST", url: "https://api.example.com/items?x=1",
        params: [], headers: [], body: { type: "json", content: '{"a":1}' }, auth, ...extra,
    } as CollectionRequest
}

const run = (items: CollectionRequest[], only?: Set<string>) => runCollection({
    collection: { id: "c", name: "C", items } as Collection,
    iterations: 1,
    environmentVariables: { secret: "s3cret" },
    runScript: async () => { throw new Error("no scripts") },
    only,
})

beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(async () => new Response(JSON.stringify({ status: 200, statusText: "OK", headers: {}, body: "{}", time: 1, size: 2 })))
})
const sentHeaders = (call: number) => JSON.parse(mockFetch.mock.calls[call][1].body).headers as Record<string, string>

describe("runner auth (shared with the send pipeline)", () => {
    test("signs AWS SigV4, Hawk and JWT bearer", async () => {
        const results = await run([
            req("aws", { type: "aws-sigv4", awsSigV4: { accessKeyId: "AKID", secretAccessKey: "k", region: "us-east-1", service: "execute-api" } }),
            req("hawk", { type: "hawk", hawk: { id: "id1", key: "k" } }),
            req("jwt", { type: "jwt-bearer", jwtBearer: { algorithm: "HS256", secret: "{{secret}}", issuer: "me" } } as RequestAuth),
        ])
        expect(results.map((r) => r.networkError)).toEqual([undefined, undefined, undefined])
        expect(sentHeaders(0).Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKID\//)
        expect(sentHeaders(1).Authorization).toMatch(/^Hawk id="id1"/)
        expect(sentHeaders(2).Authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/)
    })

    test("bearer substitutes variables", async () => {
        await run([req("b", { type: "bearer", token: " {{secret}} " })])
        expect(sentHeaders(0).Authorization).toBe("Bearer s3cret")
    })

    test("NTLM fails clearly instead of sending unauthenticated", async () => {
        const [r] = await run([req("n", { type: "ntlm", ntlm: { username: "u", password: "p" } } as RequestAuth)])
        expect(r.networkError).toMatch(/NTLM auth is not supported/)
        expect(mockFetch).not.toHaveBeenCalled()
    })

    test("only runs the selected requests, in collection order", async () => {
        const none: RequestAuth = { type: "none" }
        const results = await run([req("a", none), req("b", none), req("c", none)], new Set(["c", "a"]))
        expect(results.map((r) => r.requestId)).toEqual(["a", "c"])
    })
})

describe("buildHtmlReport", () => {
    const result = (over: Partial<RequestRunResult>): RequestRunResult => ({
        iteration: 0, requestId: "r", requestName: "r", method: "GET", url: "https://x", tests: [], logs: [], errors: [], ...over,
    })

    test("escapes every value (no script injection from names, URLs or errors)", () => {
        const html = buildHtmlReport([result({
            requestName: "<script>alert(1)</script>",
            url: "https://x/?q=\"><img src=x onerror=alert(1)>",
            networkError: "<b>boom</b>",
            tests: [{ name: "<i>t</i>", pass: false, error: "'x'" }],
        })], "<svg onload=alert(1)>", 12)
        expect(html).not.toMatch(/<script>|<img|<svg|<b>|<i>/)
        expect(html).toContain("&#60;script&#62;alert(1)&#60;/script&#62;")
        expect(html).toContain("&#39;x&#39;")
    })

    test("summarises requests and tests and has no external assets", () => {
        const html = buildHtmlReport([
            result({ status: 200, tests: [{ name: "ok", pass: true }] }),
            result({ status: 500, tests: [{ name: "bad", pass: false }] }),
        ], "Shop", 34)
        expect(html).toContain("2 requests (1 failed), 2 tests (1 failed) in 34ms")
        expect(html).not.toMatch(/(src|href)=/)
    })
})
