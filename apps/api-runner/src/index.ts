#!/usr/bin/env node
/**
 * mydevtools-api CLI.
 * Headless equivalent of the web-side collection runner. Same scripts, same
 * substitution layering, same JUnit output — runs over a Postman v2.1 export.
 */

import { readFile, writeFile } from "node:fs/promises"
import { importPostmanCollection, parsePostmanEnvironment } from "./postman.js"
import { parseDataFile } from "./csv.js"
import { runCollection } from "./runner.js"
import { buildJUnitXml } from "./junit.js"
import type { RequestRunResult } from "./types.js"

interface CliArgs {
    cmd?: "run"
    collectionPath?: string
    envPath?: string
    dataPath?: string
    iterations: number
    reporter?: "cli" | "junit"
    reporterOut?: string
    bail: boolean
    help: boolean
}

function parseArgs(argv: string[]): CliArgs {
    const out: CliArgs = { iterations: 1, bail: false, help: false }
    if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
        out.help = true
        return out
    }
    out.cmd = argv[0] as "run"
    let i = 1
    while (i < argv.length) {
        const a = argv[i]
        if (a === "--data" || a === "-d") { out.dataPath = argv[++i] }
        else if (a === "--env" || a === "-e") { out.envPath = argv[++i] }
        else if (a === "--iterations" || a === "-n") { out.iterations = Math.max(1, Number(argv[++i]) || 1) }
        else if (a === "--reporter" || a === "-r") { out.reporter = argv[++i] as CliArgs["reporter"] }
        else if (a === "--reporter-out" || a === "-o") { out.reporterOut = argv[++i] }
        else if (a === "--bail") { out.bail = true }
        else if (a === "-h" || a === "--help") { out.help = true }
        else if (!out.collectionPath) { out.collectionPath = a }
        else throw new Error(`Unknown argument: ${a}`)
        i++
    }
    return out
}

function printUsage(): void {
    console.error(`Usage: mydevtools-api run <collection.json> [options]

Options:
  -d, --data <file>         CSV or JSON array of iteration rows (each row's keys
                            override env vars for one iteration).
  -e, --env <file>          Postman Environment export (v2 schema) — enabled
                            values become the base \`{{var}}\` map.
  -n, --iterations <N>      Iterations to run when no data file is given. Default 1.
  -r, --reporter <name>     'cli' (default) or 'junit'.
  -o, --reporter-out <path> Write the JUnit XML here. Required for --reporter junit.
      --bail                Stop on the first failing request.
  -h, --help                Show this message.

Exit codes:
  0 — all tests passed
  1 — one or more tests / requests failed
  2 — usage error
`)
}

function fmtRow(r: RequestRunResult): string {
    const ok = !r.networkError && r.tests.every((t) => t.pass)
    const status = r.status !== undefined ? r.status : "—"
    const time = r.time !== undefined ? `${r.time}ms` : ""
    return `  ${ok ? "✓" : "✗"} ${r.method.padEnd(6)} ${status} ${time}  ${r.requestName}`
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2))
    if (args.help || !args.cmd) { printUsage(); process.exit(args.help ? 0 : 2) }
    if (args.cmd !== "run" || !args.collectionPath) { printUsage(); process.exit(2) }
    if (args.reporter === "junit" && !args.reporterOut) {
        console.error("--reporter-out is required when --reporter junit is used")
        process.exit(2)
    }

    const collection = importPostmanCollection(await readFile(args.collectionPath, "utf-8"))
    const dataRows = args.dataPath ? parseDataFile(await readFile(args.dataPath, "utf-8")) : undefined
    const env = args.envPath ? parsePostmanEnvironment(await readFile(args.envPath, "utf-8")) : {}

    console.log(`Running ${collection.name}` + (dataRows ? ` × ${dataRows.length} iterations` : args.iterations > 1 ? ` × ${args.iterations} iterations` : ""))

    const results = await runCollection({
        collection,
        environmentVariables: env,
        iterations: args.iterations,
        dataRows,
        bail: args.bail,
        onProgress: (r) => console.log(fmtRow(r)),
    })

    const allTests = results.flatMap((r) => r.tests)
    const failed = allTests.filter((t) => !t.pass).length
    const errored = results.filter((r) => r.networkError || r.errors.length > 0).length
    const passed = allTests.length - failed

    console.log("")
    console.log(`Requests:    ${results.length}`)
    console.log(`Assertions:  ${allTests.length}  (✓ ${passed} / ✗ ${failed})`)
    if (errored > 0) console.log(`Errors:      ${errored}`)

    for (const r of results) {
        const failures = r.tests.filter((t) => !t.pass)
        if (failures.length === 0 && !r.networkError) continue
        console.log(`\n  ${r.method} ${r.requestName}`)
        if (r.networkError) console.log(`    ! ${r.networkError}`)
        for (const t of failures) console.log(`    ✗ ${t.name}\n        ${t.error}`)
    }

    if (args.reporter === "junit" && args.reporterOut) {
        await writeFile(args.reporterOut, buildJUnitXml(results, collection.name))
        console.log(`\nWrote JUnit XML to ${args.reporterOut}`)
    }

    process.exit(failed > 0 || errored > 0 ? 1 : 0)
}

main().catch((err) => {
    console.error(`Fatal: ${(err as Error).message}`)
    process.exit(1)
})
