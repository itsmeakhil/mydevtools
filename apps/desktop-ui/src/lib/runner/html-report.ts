/**
 * Self-contained HTML report for collection-runner results (no external
 * assets, every value escaped). Used by the runner dialog and `mdt --reporter html`.
 */
import type { RequestRunResult } from "./types"
import { requestFailed } from "./runner"
import { downloadFile } from "@/lib/desktop/save-file"

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function buildHtmlReport(results: RequestRunResult[], name: string, durationMs: number): string {
    const tests = results.flatMap((r) => r.tests)
    const failedRequests = results.filter(requestFailed).length
    const failedTests = tests.filter((t) => !t.pass).length
    const rows = results.map((r) => {
        const items = r.tests.map((t) => `<li class="${t.pass ? "ok" : "bad"}">${t.pass ? "✓" : "✗"} ${esc(t.name)}${t.pass ? "" : ` — ${esc(t.error)}`}</li>`).join("")
        const errors = [r.networkError, ...r.errors].filter(Boolean).map((e) => `<li class="bad">${esc(e)}</li>`).join("")
        return `<tr class="${requestFailed(r) ? "bad" : "ok"}"><td>${esc(r.method)}</td><td>${esc(r.requestName)}<br><small>${esc(r.url)}</small></td><td>${esc(r.status ?? "ERR")}</td><td>${esc(r.time ?? "")}</td><td><ul>${errors}${items}</ul></td></tr>`
    }).join("\n")
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(name)} — MyDevTools run</title>
<style>body{font:14px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}ul{margin:0;padding-left:16px}.bad{color:#b00020}.ok{color:inherit}li.ok{color:#1b7f3b}small{color:#666}</style></head>
<body><h1>${esc(name)}</h1><p>${results.length} requests (${failedRequests} failed), ${tests.length} tests (${failedTests} failed) in ${esc(durationMs)}ms</p>
<table><thead><tr><th>Method</th><th>Request</th><th>Status</th><th>ms</th><th>Results</th></tr></thead><tbody>
${rows}
</tbody></table></body></html>
`
}

export function downloadHtmlReport(results: RequestRunResult[], name: string, durationMs: number): void {
    if (typeof window === "undefined") return
    const blob = new Blob([buildHtmlReport(results, name, durationMs)], { type: "text/html" })
    downloadFile(blob, `${name.replace(/[^A-Za-z0-9_-]+/g, "_") || "run"}-report.html`)
}
