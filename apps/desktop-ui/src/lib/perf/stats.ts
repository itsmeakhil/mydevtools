/**
 * Pure percentile math + summary helpers.
 * Same shape as a Newman / k6 summary so users coming from those tools recognise the columns.
 */

export interface LatencySample {
    /** 0-indexed iteration. */
    i: number
    /** Absolute timestamps so concurrent runs can be plotted on a real axis. */
    t0: number
    t1: number
    durationMs: number
    status?: number
    /** `undefined` when the request succeeded at the proxy layer. */
    error?: string
}

export interface PerfSummary {
    count: number
    ok: number
    fail: number
    mean: number
    min: number
    max: number
    p50: number
    p90: number
    p95: number
    p99: number
    /** Inverse of the wall-clock — requests per second across the run window. */
    rps: number
}

/** Percentile of a sorted ascending array. `p` is 0..100. */
export function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    if (p <= 0) return sorted[0]
    if (p >= 100) return sorted[sorted.length - 1]
    // Linear interpolation between adjacent ranks.
    const rank = (p / 100) * (sorted.length - 1)
    const lo = Math.floor(rank)
    const hi = Math.ceil(rank)
    if (lo === hi) return sorted[lo]
    const frac = rank - lo
    return sorted[lo] + (sorted[hi] - sorted[lo]) * frac
}

export function summarise(samples: LatencySample[]): PerfSummary {
    if (samples.length === 0) {
        return { count: 0, ok: 0, fail: 0, mean: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, p99: 0, rps: 0 }
    }
    const okSamples = samples.filter((s) => !s.error && s.status !== undefined && s.status < 400)
    const fail = samples.length - okSamples.length

    const sorted = [...samples].map((s) => s.durationMs).sort((a, b) => a - b)
    const sum = sorted.reduce((acc, v) => acc + v, 0)

    const t0 = Math.min(...samples.map((s) => s.t0))
    const t1 = Math.max(...samples.map((s) => s.t1))
    const windowSec = Math.max(0.001, (t1 - t0) / 1000)

    return {
        count: samples.length,
        ok: okSamples.length,
        fail,
        mean: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: percentile(sorted, 50),
        p90: percentile(sorted, 90),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        rps: samples.length / windowSec,
    }
}

export interface HistogramBucket {
    lo: number
    hi: number
    count: number
}

export function histogram(samples: LatencySample[], maxBuckets = 16): HistogramBucket[] {
    if (samples.length === 0) return []
    const ys = samples.map((s) => s.durationMs)
    const min = Math.max(1, Math.floor(Math.min(...ys)))
    const max = Math.ceil(Math.max(...ys))
    if (max === min) return [{ lo: min, hi: min + 1, count: samples.length }]
    const bucketWidth = Math.max(1, Math.ceil((max - min) / maxBuckets))
    const buckets: HistogramBucket[] = []
    for (let edge = min; edge < max; edge += bucketWidth) {
        buckets.push({ lo: edge, hi: edge + bucketWidth, count: 0 })
    }
    if (buckets.length === 0 || buckets[buckets.length - 1].hi < max) {
        buckets.push({
            lo: buckets.length === 0 ? min : buckets[buckets.length - 1].hi,
            hi: max + 1,
            count: 0,
        })
    }
    for (const y of ys) {
        for (const b of buckets) {
            if (y >= b.lo && y < b.hi) { b.count++; break }
        }
    }
    return buckets
}

export function toCsv(samples: LatencySample[]): string {
    const rows = [
        ["i", "t0_ms", "t1_ms", "duration_ms", "status", "error"].join(","),
        ...samples.map((s) =>
            [
                s.i,
                s.t0,
                s.t1,
                s.durationMs.toFixed(3),
                s.status ?? "",
                s.error ? `"${s.error.replace(/"/g, '""')}"` : "",
            ].join(","),
        ),
    ]
    return rows.join("\n") + "\n"
}
