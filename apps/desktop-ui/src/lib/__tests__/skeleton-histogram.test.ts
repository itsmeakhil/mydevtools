import { parseProto, skeletonForType } from "../proto-parser"
import { histogram } from "../perf/stats"

describe("skeletonForType", () => {
    const proto = `
syntax = "proto3";
package demo;
enum Tier { FREE = 0; PRO = 1; }
message Inner { string label = 1; }
message Req {
    string name = 1;
    int32 age = 2;
    bool admin = 3;
    int64 counter = 4;
    bytes raw = 5;
    Tier tier = 6;
    Inner inner = 7;
    repeated string tags = 8;
}`
    const { root } = parseProto(proto)

    it("builds a default-value skeleton for every field type", () => {
        const sk = skeletonForType(root, "demo.Req") as Record<string, unknown>
        expect(sk.name).toBe("")
        expect(sk.age).toBe(0)
        expect(sk.admin).toBe(false)
        expect(sk.counter).toBe("0")  // 64-bit kept as string
        expect(sk.raw).toBe("")
        expect(sk.tier).toBe("FREE")
        expect(sk.inner).toEqual({ label: "" })
        expect(sk.tags).toEqual([""])
    })
})

describe("histogram", () => {
    it("returns [] on empty", () => {
        expect(histogram([])).toEqual([])
    })

    it("bins samples into at most maxBuckets buckets", () => {
        const samples = Array.from({ length: 100 }, (_, i) => ({
            i,
            t0: i * 100,
            t1: i * 100 + i,
            durationMs: i + 1,  // 1..100ms
        }))
        const buckets = histogram(samples, 10)
        expect(buckets.length).toBeLessThanOrEqual(11)
        const total = buckets.reduce((s, b) => s + b.count, 0)
        expect(total).toBe(100)
    })

    it("uses a single bucket when min === max", () => {
        const samples = Array.from({ length: 5 }, (_, i) => ({
            i, t0: 0, t1: 50, durationMs: 50,
        }))
        const buckets = histogram(samples, 10)
        expect(buckets).toHaveLength(1)
        expect(buckets[0].count).toBe(5)
    })
})
