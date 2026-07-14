import { recordMetric, recordCounter, recordLog, getMetrics, getLogs, getCounters, summariseMetrics, clearAll, subscribe } from "../metrics"

beforeEach(() => clearAll())

describe("metrics buffer", () => {
    it("records and surfaces metrics", () => {
        recordMetric({ method: "GET", url: "https://x", status: 200, timeMs: 50, sizeBytes: 100 })
        expect(getMetrics()).toHaveLength(1)
        expect(getMetrics()[0].method).toBe("GET")
    })

    it("aggregates ok/fail + avg + p95 + by-host + by-status", () => {
        for (let i = 0; i < 100; i++) {
            recordMetric({
                method: "GET",
                url: `https://a.test/${i}`,
                status: i < 90 ? 200 : 500,
                timeMs: i + 10,
                sizeBytes: 50,
            })
        }
        const s = summariseMetrics()
        expect(s.count).toBe(100)
        expect(s.ok).toBe(90)
        expect(s.fail).toBe(10)
        expect(s.byHost["a.test"]).toBe(100)
        expect(s.byStatus[200]).toBe(90)
        expect(s.byStatus[500]).toBe(10)
        expect(s.p95Ms).toBeGreaterThan(s.avgMs)
    })

    it("counters increment and round-trip", () => {
        recordCounter("plugin.applied")
        recordCounter("plugin.applied", 4)
        expect(getCounters().get("plugin.applied")).toBe(5)
    })

    it("logs ring buffer", () => {
        recordLog({ level: "warn", message: "something" })
        expect(getLogs()[0].level).toBe("warn")
    })

    it("notifies subscribers", () => {
        const fn = jest.fn()
        const off = subscribe(fn)
        recordMetric({ method: "GET", url: "https://y", status: 200, timeMs: 10, sizeBytes: 0 })
        expect(fn).toHaveBeenCalled()
        off()
    })
})
