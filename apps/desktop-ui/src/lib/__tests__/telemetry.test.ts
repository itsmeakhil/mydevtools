/**
 * The only thing worth testing here is the consent gate — a bug that leaks
 * events from a user who never opted in is the one failure mode that matters.
 */

const store = new Map<string, string>()

function loadTelemetry(appKey: string) {
    jest.resetModules()
    process.env.NEXT_PUBLIC_APTABASE_KEY = appKey
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../telemetry") as typeof import("../telemetry")
}

beforeEach(() => {
    store.clear()
    const localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
    }
    // jest runs in the node environment; give the module the browser bits it uses.
    ;(globalThis as unknown as { window: unknown }).window = {
        localStorage,
        dispatchEvent: () => true,
    }
    ;(globalThis as unknown as { Event: unknown }).Event = class {
        constructor(public type: string) {}
    }
    globalThis.fetch = jest.fn(() => Promise.resolve(new Response(null, { status: 200 })))
})

afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window
})

describe("ingestUrl", () => {
    it("routes by the region embedded in the app key", () => {
        const { ingestUrl } = loadTelemetry("")
        expect(ingestUrl("A-EU-1234567890")).toBe("https://eu.aptabase.com/api/v0/event")
        expect(ingestUrl("A-US-1234567890")).toBe("https://us.aptabase.com/api/v0/event")
        expect(ingestUrl("A-SH-1234567890", "https://box.local")).toBe("https://box.local/api/v0/event")
    })

    it("returns null for keys it cannot place, so track stays a no-op", () => {
        const { ingestUrl } = loadTelemetry("")
        expect(ingestUrl("")).toBeNull()
        expect(ingestUrl("nonsense")).toBeNull()
        expect(ingestUrl("A-XX-1234567890")).toBeNull()
        expect(ingestUrl("A-SH-1234567890")).toBeNull() // self-hosted key, no host configured
    })
})

describe("track", () => {
    it("sends nothing until the user opts in", () => {
        const { track } = loadTelemetry("A-EU-1234567890")
        track("tool_opened", { tool: "json-formatter" })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("sends nothing after the user opts out", () => {
        const { track, setConsent } = loadTelemetry("A-EU-1234567890")
        setConsent("denied")
        track("tool_opened", { tool: "json-formatter" })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("sends nothing when the build ships without an app key", () => {
        const { track, setConsent } = loadTelemetry("")
        setConsent("granted")
        track("tool_opened", { tool: "json-formatter" })
        expect(globalThis.fetch).not.toHaveBeenCalled()
    })

    it("posts an anonymous event once consent is granted", () => {
        const { track, setConsent } = loadTelemetry("A-EU-1234567890")
        setConsent("granted")
        track("tool_opened", { tool: "json-formatter" })

        expect(globalThis.fetch).toHaveBeenCalledTimes(1)
        const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0]
        expect(url).toBe("https://eu.aptabase.com/api/v0/event")
        expect(init.headers["App-Key"]).toBe("A-EU-1234567890")
        expect(init.credentials).toBe("omit")

        const body = JSON.parse(init.body)
        expect(body.eventName).toBe("tool_opened")
        expect(body.props).toEqual({ tool: "json-formatter" })
        expect(typeof body.sessionId).toBe("string")
        // Nothing that identifies the install or the person using it.
        expect(JSON.stringify(body)).not.toMatch(/userId|deviceId|email/i)
    })

    it("never rejects when the network is down", async () => {
        const { track, setConsent } = loadTelemetry("A-EU-1234567890")
        setConsent("granted")
        globalThis.fetch = jest.fn(() => Promise.reject(new Error("offline")))
        expect(() => track("app_started")).not.toThrow()
        await Promise.resolve()
    })
})
