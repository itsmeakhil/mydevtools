import { buildJUnitXml } from "@/lib/runner/junit"
import { requestFailed } from "@/lib/runner/runner"
import type { RequestRunResult } from "@/lib/runner/types"

export type ReporterName = "cli" | "json" | "junit" | "html"
export const REPORTERS: ReporterName[] = ["cli", "json", "junit", "html"]

export interface Summary {
    requests: number
    failedRequests: number
    tests: number
    failedTests: number
    durationMs: number
}

export function summarize(results: RequestRunResult[], durationMs: number): Summary {
    const tests = results.flatMap((r) => r.tests)
    return {
        requests: results.length,
        failedRequests: results.filter(requestFailed).length,
        tests: tests.length,
        failedTests: tests.filter((t) => !t.pass).length,
        durationMs,
    }
}

/** One request, as printed live by the cli reporter. */
export function cliLines(r: RequestRunResult): string {
    const mark = requestFailed(r) ? "✗" : "✓"
    const status = r.networkError ? "ERR" : `${r.status ?? ""}`
    const lines = [`${mark} ${r.method} ${r.requestName}  ${status}${r.time != null ? `  ${r.time}ms` : ""}`]
    if (r.networkError) lines.push(`    ! ${r.networkError}`)
    for (const e of r.errors) lines.push(`    ! ${e}`)
    for (const t of r.tests) lines.push(`    ${t.pass ? "✓" : "✗"} ${t.name}${t.pass ? "" : ` — ${t.error ?? "failed"}`}`)
    for (const l of r.logs) if (l.level !== "log") lines.push(`    ${l.level}: ${l.args.join(" ")}`)
    return lines.join("\n")
}

export function cliSummary(s: Summary): string {
    return `\n${s.requests} requests (${s.failedRequests} failed), ${s.tests} tests (${s.failedTests} failed) in ${s.durationMs}ms`
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function html(results: RequestRunResult[], name: string, s: Summary): string {
    const rows = results.map((r) => {
        const tests = r.tests.map((t) => `<li class="${t.pass ? "ok" : "bad"}">${t.pass ? "✓" : "✗"} ${esc(t.name)}${t.pass ? "" : ` — ${esc(t.error)}`}</li>`).join("")
        const errors = [r.networkError, ...r.errors].filter(Boolean).map((e) => `<li class="bad">${esc(e)}</li>`).join("")
        return `<tr class="${requestFailed(r) ? "bad" : "ok"}"><td>${esc(r.method)}</td><td>${esc(r.requestName)}<br><small>${esc(r.url)}</small></td><td>${esc(r.status ?? "ERR")}</td><td>${esc(r.time ?? "")}</td><td><ul>${errors}${tests}</ul></td></tr>`
    }).join("\n")
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — MyDevTools run</title>
<style>body{font:14px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}ul{margin:0;padding-left:16px}.bad{color:#b00020}.ok{color:inherit}li.ok{color:#1b7f3b}small{color:#666}</style></head>
<body><h1>${esc(name)}</h1><p>${s.requests} requests (${s.failedRequests} failed), ${s.tests} tests (${s.failedTests} failed) in ${s.durationMs}ms</p>
<table><thead><tr><th>Method</th><th>Request</th><th>Status</th><th>ms</th><th>Results</th></tr></thead><tbody>
${rows}
</tbody></table></body></html>
`
}

/** Full report body for a file / stdout reporter. */
export function render(reporter: ReporterName, results: RequestRunResult[], name: string, s: Summary): string {
    switch (reporter) {
        case "json": return JSON.stringify({ collection: name, summary: s, results }, null, 2) + "\n"
        case "junit": return buildJUnitXml(results, name)
        case "html": return html(results, name, s)
        case "cli": return results.map(cliLines).join("\n") + cliSummary(s) + "\n"
    }
}
