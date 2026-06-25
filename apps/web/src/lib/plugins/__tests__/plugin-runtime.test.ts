import { instantiatePlugin, applyBeforeSend, applyAfterResponse } from "../plugin-runtime"
import type { PluginSource } from "../plugin-runtime"

const make = (source: string): PluginSource => ({
    id: "p1",
    name: "T",
    source,
    enabled: true,
    createdAt: 1,
})

describe("instantiatePlugin", () => {
    it("returns error on syntax failure", () => {
        const r = instantiatePlugin(make("===bad syntax"))
        expect(r.error).toBeDefined()
        expect(r.instance).toBeUndefined()
    })

    it("captures registered hooks", () => {
        const r = instantiatePlugin(make(`
            plugin.onBeforeSend((r) => { r.headers["X"] = "1"; return r })
            plugin.onAfterResponse(() => {})
            plugin.provideCommand({ label: "Cmd" })
        `))
        expect(r.instance).toBeDefined()
        expect(r.instance!.commands).toHaveLength(1)
        expect(r.instance!.commands[0].label).toBe("Cmd")
    })

    it("collects console.log into logs", () => {
        const r = instantiatePlugin(make(`console.log("hello", 42)`))
        expect(r.logs).toEqual([{ level: "log", args: ["hello", "42"] }])
    })
})

describe("applyBeforeSend / applyAfterResponse", () => {
    it("chains onBeforeSend across plugins", () => {
        const a = instantiatePlugin(make(`plugin.onBeforeSend((r) => { r.headers["A"] = "1"; return r })`)).instance!
        const b = instantiatePlugin(make(`plugin.onBeforeSend((r) => { r.headers["B"] = "2"; return r })`)).instance!
        const { req } = applyBeforeSend([a, b], {
            method: "GET", url: "https://x", headers: {},
        })
        expect(req.headers).toEqual({ A: "1", B: "2" })
    })

    it("captures errors from broken hook without throwing", () => {
        const broken = instantiatePlugin(make(`plugin.onBeforeSend(() => { throw new Error("boom") })`)).instance!
        const { req, events } = applyBeforeSend([broken], { method: "GET", url: "x", headers: {} })
        expect(req.url).toBe("x")
        expect(events[0].kind).toBe("error")
    })

    it("runs onAfterResponse without affecting return value", () => {
        let captured: number | null = null
        const inst = instantiatePlugin(make(`
            plugin.onAfterResponse((ctx) => { globalThis.__capturedStatus = ctx.response.status })
        `)).instance!
        applyAfterResponse([inst], {
            request: { method: "GET", url: "x", headers: {} },
            response: { status: 200, statusText: "OK", headers: {}, body: "", timeMs: 12 },
        })
        captured = (globalThis as unknown as { __capturedStatus?: number }).__capturedStatus ?? null
        expect(captured).toBe(200)
    })
})
