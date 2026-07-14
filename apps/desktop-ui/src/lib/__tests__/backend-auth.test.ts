import { clearInflight } from "@/lib/auth-inflight"

// Mock firebase auth module that backend-auth.ts imports.
jest.mock("@/database/firebase", () => ({
    auth: { currentUser: { uid: "u1", getIdToken: jest.fn(async () => "id-token") } },
}))

import { proxyJsonAuthed } from "@/lib/backend-auth"

type MockResponseInit = {
    status?: number
    body?: unknown
    headers?: Record<string, string>
}

function mockResponse({ status = 200, body = {}, headers = {} }: MockResponseInit): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", ...headers },
    })
}

describe("proxyJsonAuthed", () => {
    let fetchMock: jest.Mock

    beforeEach(() => {
        clearInflight()
        fetchMock = jest.fn(async (url: string) => {
            if (typeof url === "string" && url.includes("/api/proxy")) {
                return mockResponse({
                    status: 200,
                    body: {
                        status: 200,
                        statusText: "OK",
                        headers: {},
                        body: JSON.stringify({ ok: true }),
                        time: 1,
                        size: 1,
                    },
                })
            }
            return mockResponse({ status: 200, body: { ok: true } })
        })
        global.fetch = fetchMock as unknown as typeof fetch
    })

    it("does not call /auth/session/check on warm path", async () => {
        await proxyJsonAuthed("http://b", "GET", "/x")
        const urls = fetchMock.mock.calls.map((c) => String(c[0]))
        expect(urls.some((u) => u.includes("/auth/session/check"))).toBe(false)
    })

    it("parallel 5 calls trigger zero /auth/session/check requests", async () => {
        await Promise.all(
            Array.from({ length: 5 }, () => proxyJsonAuthed("http://b", "GET", "/x"))
        )
        const checkCount = fetchMock.mock.calls.filter((c) =>
            String(c[0]).includes("/auth/session/check")
        ).length
        expect(checkCount).toBe(0)
    })

    it("on 401, calls /auth/refresh once even when invoked 3× concurrently", async () => {
        let proxyCalls = 0
        fetchMock.mockImplementation(async (url: string) => {
            const u = String(url)
            if (u.includes("/api/proxy")) {
                proxyCalls += 1
                const status = proxyCalls <= 3 ? 401 : 200
                return mockResponse({
                    status: 200,
                    body: {
                        status,
                        statusText: status === 200 ? "OK" : "Unauthorized",
                        headers: {},
                        body: JSON.stringify({ ok: status === 200 }),
                        time: 1,
                        size: 1,
                    },
                })
            }
            if (u.endsWith("/api/backend/auth/refresh")) {
                return mockResponse({ status: 200, body: { ok: true } })
            }
            return mockResponse({ status: 200, body: {} })
        })

        await Promise.all([
            proxyJsonAuthed("http://b", "GET", "/x"),
            proxyJsonAuthed("http://b", "GET", "/x"),
            proxyJsonAuthed("http://b", "GET", "/x"),
        ])

        const refreshCount = fetchMock.mock.calls.filter((c) =>
            String(c[0]).includes("/api/backend/auth/refresh")
        ).length
        expect(refreshCount).toBe(1)
    })
})

describe("establishBackendSession defaults", () => {
    let fetchMock: jest.Mock

    beforeEach(() => {
        clearInflight()
        fetchMock = jest.fn(async () => mockResponse({ status: 200, body: { ok: true } }))
        global.fetch = fetchMock as unknown as typeof fetch
    })

    it("defaults check_revoked to false", async () => {
        const { establishBackendSession } = await import("@/lib/backend-auth")
        await establishBackendSession("id-token")
        const sessionCall = fetchMock.mock.calls.find((c) =>
            String(c[0]).includes("/api/backend/auth/session")
        )
        expect(sessionCall).toBeDefined()
        const body = JSON.parse(String(sessionCall![1].body))
        expect(body.check_revoked).toBe(false)
    })

    it("respects explicit checkRevoked: true", async () => {
        const { establishBackendSession } = await import("@/lib/backend-auth")
        await establishBackendSession("id-token", { checkRevoked: true })
        const sessionCall = fetchMock.mock.calls.find((c) =>
            String(c[0]).includes("/api/backend/auth/session")
        )
        const body = JSON.parse(String(sessionCall![1].body))
        expect(body.check_revoked).toBe(true)
    })
})
