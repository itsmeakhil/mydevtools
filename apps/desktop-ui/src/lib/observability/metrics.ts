/**
 * In-app observability — request metrics + structured log ring buffer.
 *
 * Lives entirely client-side. The Metrics panel reads from this store; plugins
 * can push custom counters via `recordCounter`. Stays under a fixed memory cap
 * (10k events) by evicting oldest.
 */

export interface RequestMetric {
    id: string
    timestamp: number
    method: string
    url: string
    status: number
    timeMs: number
    sizeBytes: number
    error?: string
    /** Set by handleSend when the request was OAuth-refreshed mid-flight. */
    oauthRefreshed?: boolean
}

export interface LogEntry {
    id: string
    timestamp: number
    level: "debug" | "info" | "warn" | "error"
    message: string
    tags?: Record<string, string>
}

const MAX_METRICS = 10_000
const MAX_LOGS = 5_000

const metrics: RequestMetric[] = []
const logs: LogEntry[] = []
const counters = new Map<string, number>()

type Subscriber = () => void
const subscribers = new Set<Subscriber>()

function notify(): void {
    for (const fn of subscribers) {
        try { fn() } catch { /* noop */ }
    }
}

export function subscribe(fn: Subscriber): () => void {
    subscribers.add(fn)
    return () => subscribers.delete(fn)
}

export function recordMetric(m: Omit<RequestMetric, "id" | "timestamp"> & { timestamp?: number }): void {
    metrics.push({
        ...m,
        id: crypto.randomUUID(),
        timestamp: m.timestamp ?? Date.now(),
    })
    while (metrics.length > MAX_METRICS) metrics.shift()
    notify()
}

export function recordLog(entry: Omit<LogEntry, "id" | "timestamp"> & { timestamp?: number }): void {
    logs.push({
        ...entry,
        id: crypto.randomUUID(),
        timestamp: entry.timestamp ?? Date.now(),
    })
    while (logs.length > MAX_LOGS) logs.shift()
    notify()
}

export function recordCounter(name: string, delta = 1): void {
    counters.set(name, (counters.get(name) ?? 0) + delta)
    notify()
}

export function getMetrics(): readonly RequestMetric[] { return metrics }
export function getLogs(): readonly LogEntry[] { return logs }
export function getCounters(): Readonly<Map<string, number>> { return counters }

export function clearAll(): void {
    metrics.length = 0
    logs.length = 0
    counters.clear()
    notify()
}

/** Aggregate stats over the current metric buffer (or a window). */
export interface MetricSummary {
    count: number
    ok: number
    fail: number
    avgMs: number
    p95Ms: number
    bytesIn: number
    /** Per-host count map. */
    byHost: Record<string, number>
    /** Per-status count map. */
    byStatus: Record<number, number>
}

export function summariseMetrics(buf: readonly RequestMetric[] = metrics): MetricSummary {
    if (buf.length === 0) {
        return { count: 0, ok: 0, fail: 0, avgMs: 0, p95Ms: 0, bytesIn: 0, byHost: {}, byStatus: {} }
    }
    let ok = 0, fail = 0, totalMs = 0, bytesIn = 0
    const byHost: Record<string, number> = {}
    const byStatus: Record<number, number> = {}
    const times: number[] = []
    for (const m of buf) {
        if (!m.error && m.status >= 200 && m.status < 400) ok++
        else fail++
        totalMs += m.timeMs
        bytesIn += m.sizeBytes
        try {
            const host = new URL(m.url).host
            byHost[host] = (byHost[host] ?? 0) + 1
        } catch { /* skip non-URL strings */ }
        byStatus[m.status] = (byStatus[m.status] ?? 0) + 1
        times.push(m.timeMs)
    }
    times.sort((a, b) => a - b)
    const p95Idx = Math.floor(times.length * 0.95)
    return {
        count: buf.length,
        ok,
        fail,
        avgMs: totalMs / buf.length,
        p95Ms: times[Math.min(p95Idx, times.length - 1)],
        bytesIn,
        byHost,
        byStatus,
    }
}
