import { percentile, summarise, toCsv } from "../stats"
import type { LatencySample } from "../stats"

describe("percentile", () => {
    it("returns the boundary values at 0 and 100", () => {
        const sorted = [1, 2, 3, 4, 5]
        expect(percentile(sorted, 0)).toBe(1)
        expect(percentile(sorted, 100)).toBe(5)
    })

    it("interpolates linearly between ranks", () => {
        const sorted = [10, 20, 30, 40]
        // rank = (50/100) * 3 = 1.5 → between 20 and 30 → 25
        expect(percentile(sorted, 50)).toBe(25)
    })

    it("returns 0 on empty input", () => {
        expect(percentile([], 50)).toBe(0)
    })

    it("handles odd-count median", () => {
        expect(percentile([1, 2, 3], 50)).toBe(2)
    })
})

const sample = (i: number, dur: number, status = 200, error?: string): LatencySample => ({
    i, t0: i * 100, t1: i * 100 + dur, durationMs: dur, status, error,
})

describe("summarise", () => {
    it("returns all-zero summary on empty input", () => {
        const s = summarise([])
        expect(s).toEqual({ count: 0, ok: 0, fail: 0, mean: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0, rps: 0 })
    })

    it("computes ok/fail from status code", () => {
        const samples = [sample(0, 10, 200), sample(1, 20, 500), sample(2, 30, 200), sample(3, 40, 0, "boom")]
        const s = summarise(samples)
        expect(s.count).toBe(4)
        expect(s.ok).toBe(2)
        expect(s.fail).toBe(2)
    })

    it("computes mean / min / max / percentiles", () => {
        const samples = [10, 20, 30, 40, 50].map((d, i) => sample(i, d))
        const s = summarise(samples)
        expect(s.min).toBe(10)
        expect(s.max).toBe(50)
        expect(s.mean).toBe(30)
        expect(s.p50).toBe(30)
        expect(s.p90).toBeCloseTo(46, 0)
        expect(s.p99).toBeCloseTo(49.6, 1)
    })

    it("derives rps from the t0…t1 wall-clock window", () => {
        const samples = Array.from({ length: 10 }, (_, i) => sample(i, 50))
        const s = summarise(samples)
        // Window spans i=0..i=9 with last t1 at 900+50=950; first t0=0 → 0.95s.
        // rps = 10 / 0.95 ≈ 10.5
        expect(s.rps).toBeGreaterThan(9.5)
        expect(s.rps).toBeLessThan(11.5)
    })
})

describe("toCsv", () => {
    it("emits a header + one row per sample", () => {
        const samples = [sample(0, 12.3, 200), sample(1, 99.9, 0, 'oops, "quoted"')]
        const csv = toCsv(samples)
        const lines = csv.trim().split("\n")
        expect(lines[0]).toBe("i,t0_ms,t1_ms,duration_ms,status,error")
        expect(lines).toHaveLength(3)
        expect(lines[1]).toContain("12.300")
        expect(lines[2]).toContain('"oops, ""quoted"""')
    })
})
