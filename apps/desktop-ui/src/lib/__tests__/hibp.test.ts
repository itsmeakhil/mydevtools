import { checkPasswordsBreached } from "../hibp"

// SHA-1("hunter2") = F3BBBD66A63D4BF1747940578EC3D0103530E21D
const HUNTER2_PREFIX = "F3BBB"
const HUNTER2_SUFFIX = "D66A63D4BF1747940578EC3D0103530E21D"

jest.mock("@/lib/desktop/is-desktop", () => ({ isDesktop: () => false }))

describe("checkPasswordsBreached", () => {
    const originalFetch = global.fetch

    afterEach(() => {
        global.fetch = originalFetch
        jest.restoreAllMocks()
    })

    const respond = (body: string, init: { status?: number } = {}) =>
        ({
            ok: (init.status ?? 200) < 400,
            status: init.status ?? 200,
            headers: { get: () => null },
            text: async () => body,
        }) as unknown as Response

    it("reports a hit with its count", async () => {
        global.fetch = jest.fn(async () => respond(`${HUNTER2_SUFFIX}:41072`)) as unknown as typeof fetch
        const results = await checkPasswordsBreached([{ id: "a", password: "hunter2" }])
        expect(results.get("a")).toEqual({ status: "breached", count: 41072 })
    })

    it("reports a miss as clean", async () => {
        global.fetch = jest.fn(async () => respond("0000000000000000000000000000000000A:3")) as unknown as typeof fetch
        const results = await checkPasswordsBreached([{ id: "a", password: "hunter2" }])
        expect(results.get("a")).toEqual({ status: "clean" })
    })

    it("reports a failed lookup as unknown, never as clean", async () => {
        // The whole point: a network error used to surface as "not breached",
        // which is a false assurance about a possibly-compromised password.
        global.fetch = jest.fn(async () => {
            throw new Error("offline")
        }) as unknown as typeof fetch
        const results = await checkPasswordsBreached([{ id: "a", password: "hunter2" }])
        expect(results.get("a")).toEqual({ status: "unknown" })
    })

    it("reports a server error as unknown too", async () => {
        global.fetch = jest.fn(async () => respond("", { status: 503 })) as unknown as typeof fetch
        const results = await checkPasswordsBreached([{ id: "a", password: "hunter2" }])
        expect(results.get("a")).toEqual({ status: "unknown" })
    })

    it("fetches each hash prefix once, however many entries share it", async () => {
        // Reused passwords are exactly what this feature hunts for, and they
        // all hash to the same prefix.
        const fetchMock = jest.fn(async (_url: string) => respond(`${HUNTER2_SUFFIX}:5`))
        global.fetch = fetchMock as unknown as typeof fetch
        const results = await checkPasswordsBreached([
            { id: "a", password: "hunter2" },
            { id: "b", password: "hunter2" },
            { id: "c", password: "hunter2" },
        ])
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(String(fetchMock.mock.calls[0][0])).toContain(HUNTER2_PREFIX)
        expect(results.get("c")).toEqual({ status: "breached", count: 5 })
    })

    it("keeps checking after one entry fails", async () => {
        let call = 0
        global.fetch = jest.fn(async () => {
            call++
            if (call === 1) throw new Error("flaky")
            return respond("0000000000000000000000000000000000A:1")
        }) as unknown as typeof fetch
        const results = await checkPasswordsBreached([
            { id: "a", password: "first" },
            { id: "b", password: "second" },
        ])
        expect(results.get("a")).toEqual({ status: "unknown" })
        expect(results.get("b")).toEqual({ status: "clean" })
    })

    it("reports progress for every entry, failures included", async () => {
        global.fetch = jest.fn(async () => respond("")) as unknown as typeof fetch
        const seen: number[] = []
        await checkPasswordsBreached(
            [
                { id: "a", password: "one" },
                { id: "b", password: "two" },
            ],
            (checked) => seen.push(checked)
        )
        expect(seen).toEqual([1, 2])
    })
})
