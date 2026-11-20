import { envelopeToScriptResponse, lockDownNetwork, normalizeSendRequest, toPmResponse } from "../script-sandbox"

describe("normalizeSendRequest", () => {
    it("accepts a URL string", () => {
        expect(normalizeSendRequest("https://a.test")).toEqual({ url: "https://a.test", method: "GET", headers: {} })
    })

    it("maps Postman request objects", () => {
        expect(normalizeSendRequest({
            url: { raw: "https://a.test/x" },
            method: "put",
            header: [{ key: "A", value: 1 }, { key: "Off", value: "x", disabled: true }],
            body: { mode: "urlencoded", urlencoded: [{ key: "a", value: "1 2" }, { key: "b", value: "x", disabled: true }] },
        })).toEqual({
            url: "https://a.test/x",
            method: "PUT",
            headers: { A: "1", "Content-Type": "application/x-www-form-urlencoded" },
            body: "a=1+2",
        })
        expect(normalizeSendRequest({ url: "u", headers: { B: "2" }, body: "raw" }).body).toBe("raw")
    })

    it("rejects missing urls and unsupported body modes", () => {
        expect(() => normalizeSendRequest({ method: "GET" })).toThrow(/no url/)
        expect(() => normalizeSendRequest({ url: "u", body: { mode: "formdata" } })).toThrow(/formdata/)
        expect(() => normalizeSendRequest(42)).toThrow(TypeError)
    })
})

describe("toPmResponse / envelopeToScriptResponse", () => {
    it("exposes the Postman response surface", () => {
        const r = toPmResponse({ status: 201, statusText: "Created", headers: { "Content-Type": "application/json" }, body: '{"a":1}', time: 9 })
        expect(r.code).toBe(201)
        expect(r.headers.get("content-type")).toBe("application/json")
        expect(r.json()).toEqual({ a: 1 })
        expect(r.json()).toBe(r.json())
        expect(() => r.to.have.status(201)).not.toThrow()
    })

    it("turns envelope errors into rejections", () => {
        expect(() => envelopeToScriptResponse({ status: 403, error: "Blocked" })).toThrow("Blocked")
        expect(envelopeToScriptResponse({ status: 200, body: "x" })).toEqual({ status: 200, statusText: "", headers: {}, body: "x", time: 0 })
    })
})

describe("lockDownNetwork", () => {
    it("removes every network global and reports none left", () => {
        const g: Record<string, unknown> = { fetch: () => {}, XMLHttpRequest: class {}, WebSocket: class {}, caches: {}, postMessage: () => {} }
        expect(lockDownNetwork(g)).toEqual([])
        expect(g.fetch).toBeUndefined()
        expect(g.XMLHttpRequest).toBeUndefined()
        expect(g.caches).toBeUndefined()
        expect(typeof g.postMessage).toBe("function")
    })

    it("pins non-deletable globals to undefined", () => {
        const g: Record<string, unknown> = {}
        Object.defineProperty(g, "fetch", { value: () => {}, writable: true, configurable: false, enumerable: true })
        expect(lockDownNetwork(g)).toEqual([])
        expect(g.fetch).toBeUndefined()
    })

    it("reports a global it could not remove", () => {
        const g: Record<string, unknown> = {}
        Object.defineProperty(g, "fetch", { value: () => {}, writable: false, configurable: false })
        expect(lockDownNetwork(g)).toEqual(["fetch"])
    })
})
