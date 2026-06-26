/** JUnit XML emitter — port of `apps/web/src/lib/runner/junit.ts`. */

import type { RequestRunResult } from "./types.js"

function escapeXml(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

export function buildJUnitXml(results: RequestRunResult[], suiteName: string): string {
    const allTests = results.flatMap((r) => r.tests.map((t) => ({ run: r, test: t })))
    const totalTests = allTests.length
    const failed = allTests.filter(({ test }) => !test.pass).length
    const errored = results.filter((r) => r.networkError || r.errors.length > 0).length
    const totalTime = results.reduce((s, r) => s + (r.time ?? 0), 0) / 1000

    const cases = allTests.map(({ run, test }) => {
        const classname = escapeXml(run.requestName)
        const name = escapeXml(test.name)
        const time = ((run.time ?? 0) / 1000).toFixed(3)
        if (test.pass) {
            return `    <testcase classname="${classname}" name="${name}" time="${time}" />`
        }
        const msg = escapeXml(test.error ?? "assertion failed")
        return `    <testcase classname="${classname}" name="${name}" time="${time}">
      <failure message="${msg}" type="AssertionError">${msg}</failure>
    </testcase>`
    })

    const errorCases = results
        .filter((r) => r.networkError || r.errors.length > 0)
        .map((r) => {
            const msg = escapeXml(r.networkError ?? r.errors.join("; "))
            const classname = escapeXml(r.requestName)
            const time = ((r.time ?? 0) / 1000).toFixed(3)
            return `    <testcase classname="${classname}" name="request transport" time="${time}">
      <error message="${msg}" type="RuntimeError">${msg}</error>
    </testcase>`
        })

    const body = [...cases, ...errorCases].join("\n")
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${escapeXml(suiteName)}" tests="${totalTests + errored}" failures="${failed}" errors="${errored}" time="${totalTime.toFixed(3)}">
${body}
  </testsuite>
</testsuites>`
}
