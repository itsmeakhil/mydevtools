import { buildJUnitXml } from "@/lib/runner/junit"
import { buildHtmlReport } from "@/lib/runner/html-report"
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

/** Full report body for a file / stdout reporter. */
export function render(reporter: ReporterName, results: RequestRunResult[], name: string, s: Summary): string {
    switch (reporter) {
        case "json": return JSON.stringify({ collection: name, summary: s, results }, null, 2) + "\n"
        case "junit": return buildJUnitXml(results, name)
        case "html": return buildHtmlReport(results, name, s.durationMs)
        case "cli": return results.map(cliLines).join("\n") + cliSummary(s) + "\n"
    }
}
