/**
 * Prometheus text exposition format emitter.
 *
 * Converts the in-memory metric + counter buffer to a `# HELP / # TYPE` block
 * suitable for scraping by Prometheus or for one-shot inclusion in a Grafana
 * Promscale ingestion.
 */

import { getMetrics, getCounters, summariseMetrics } from "./metrics"

function escapeLabel(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")
}

function formatLabels(labels: Record<string, string>): string {
    const entries = Object.entries(labels)
    if (entries.length === 0) return ""
    return "{" + entries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(",") + "}"
}

export function exportPrometheus(now = Date.now()): string {
    const lines: string[] = []
    const metrics = getMetrics()
    const summary = summariseMetrics(metrics)

    lines.push("# HELP mdt_requests_total Total API client requests")
    lines.push("# TYPE mdt_requests_total counter")
    lines.push(`mdt_requests_total ${summary.count}`)

    lines.push("# HELP mdt_requests_ok_total Total successful (2xx/3xx) requests")
    lines.push("# TYPE mdt_requests_ok_total counter")
    lines.push(`mdt_requests_ok_total ${summary.ok}`)

    lines.push("# HELP mdt_requests_fail_total Total failed requests (4xx/5xx/errors)")
    lines.push("# TYPE mdt_requests_fail_total counter")
    lines.push(`mdt_requests_fail_total ${summary.fail}`)

    lines.push("# HELP mdt_request_latency_ms_avg Average request latency in ms")
    lines.push("# TYPE mdt_request_latency_ms_avg gauge")
    lines.push(`mdt_request_latency_ms_avg ${summary.avgMs.toFixed(2)}`)

    lines.push("# HELP mdt_request_latency_ms_p95 95th percentile latency in ms")
    lines.push("# TYPE mdt_request_latency_ms_p95 gauge")
    lines.push(`mdt_request_latency_ms_p95 ${summary.p95Ms.toFixed(2)}`)

    lines.push("# HELP mdt_response_bytes_total Sum of response bytes")
    lines.push("# TYPE mdt_response_bytes_total counter")
    lines.push(`mdt_response_bytes_total ${summary.bytesIn}`)

    lines.push("# HELP mdt_requests_by_status_total Requests bucketed by status code")
    lines.push("# TYPE mdt_requests_by_status_total counter")
    for (const [status, count] of Object.entries(summary.byStatus)) {
        lines.push(`mdt_requests_by_status_total${formatLabels({ status })} ${count}`)
    }

    lines.push("# HELP mdt_requests_by_host_total Requests bucketed by host")
    lines.push("# TYPE mdt_requests_by_host_total counter")
    for (const [host, count] of Object.entries(summary.byHost)) {
        lines.push(`mdt_requests_by_host_total${formatLabels({ host })} ${count}`)
    }

    const counters = getCounters()
    if (counters.size > 0) {
        lines.push("# HELP mdt_user_counter Arbitrary user counters from plugins")
        lines.push("# TYPE mdt_user_counter counter")
        for (const [name, value] of counters.entries()) {
            lines.push(`mdt_user_counter${formatLabels({ name })} ${value}`)
        }
    }

    return lines.join("\n") + `\n# scraped_at ${now}\n`
}
