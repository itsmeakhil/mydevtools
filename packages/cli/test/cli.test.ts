import { test, before, after, describe } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import { execFile } from "node:child_process"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseCliArgs, UsageError, environmentFromText } from "../src/main"
import { createScriptRunner } from "../src/scripts"
import { createProxy } from "../src/proxy"

const here = path.dirname(fileURLToPath(import.meta.url))
const BIN = path.join(here, "../bin/mdt.mjs")
const SHOP = path.join(here, "fixtures/shop")

/** Spawn the real CLI; resolves with the exit code (never rejects on code ≠ 0). */
function mdt(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        execFile(process.execPath, [BIN, ...args], { timeout: 60_000 }, (err, stdout, stderr) => {
            resolve({ code: err ? (typeof err.code === "number" ? err.code : 99) : 0, stdout, stderr })
        })
    })
}

// ── Fixture API: login → token + session cookie; /me needs both + headers. ──
let baseUrl = ""
const server = http.createServer((req, res) => {
    const json = (status: number, body: unknown, headers: Record<string, string> = {}) => {
        res.writeHead(status, { "Content-Type": "application/json", ...headers })
        res.end(JSON.stringify(body))
    }
    let body = ""
    req.on("data", (c) => { body += c })
    req.on("end", () => {
        if (req.method === "POST" && req.url === "/v1/login") {
            const user = JSON.parse(body || "{}").user
            if (req.headers["x-client"] !== "mdt") return json(400, { error: "collection header missing" })
            return json(200, { token: "t-1", user }, { "Set-Cookie": "session=abc; Path=/" })
        }
        if (req.method === "GET" && req.url === "/v1/me") {
            const ok = req.headers.authorization === "Bearer t-1" &&
                req.headers.cookie?.includes("session=abc") &&
                req.headers["x-client"] === "mdt"
            if (!ok) return json(401, { error: "unauthorized" })
            return json(200, { name: req.headers["x-trace"] === "ada" ? "Ada" : "Someone else" })
        }
        if (req.url === "/v1/hop") {
            res.writeHead(302, { Location: "/v1/me" })
            return res.end()
        }
        json(404, { error: "not found" })
    })
})

before(async () => {
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r))
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
after(() => new Promise<void>((r) => server.close(() => r())))

describe("argument parsing", () => {
    test("parses a full command line", () => {
        const o = parseCliArgs(["run", "dir", "--env", "local", "--env-var", "a=1", "--env-var", "b=x=y",
            "--reporter", "junit", "--output", "r.xml", "--bail", "--delay", "10", "--timeout", "500", "--insecure", "--no-scripts", "--folder", "A/B"])
        assert.deepEqual(o, {
            dir: "dir", folder: "A/B", env: "local", envVars: { a: "1", b: "x=y" }, data: undefined,
            reporter: "junit", output: "r.xml", bail: true, delayMs: 10, timeoutMs: 500, insecure: true, scripts: false,
        })
    })
    test("--help returns null", () => assert.equal(parseCliArgs(["--help"]), null))
    for (const [argv, msg] of [
        [[], /Missing command/],
        [["exec", "d"], /Unknown command/],
        [["run"], /Missing <collection-dir>/],
        [["run", "d", "--reporter", "xml"], /--reporter/],
        [["run", "d", "--env-var", "novalue"], /key=value/],
        [["run", "d", "--delay", "-5"], /--delay/],
        [["run", "d", "--nope"], /Unknown option/],
    ] as [string[], RegExp][]) {
        test(`rejects ${JSON.stringify(argv)}`, () => assert.throws(() => parseCliArgs(argv), (e) => e instanceof UsageError && msg.test(e.message)))
    }
})

describe("environment files", () => {
    test("Postman env JSON, our variables list and a plain map", () => {
        assert.deepEqual(environmentFromText(JSON.stringify({ values: [{ key: "a", value: "1" }, { key: "b", value: "2", enabled: false }] }), "e.json"), { a: "1" })
        assert.deepEqual(environmentFromText("variables:\n  - key: a\n    value: 1\n", "e.yaml"), { a: "1" })
        assert.deepEqual(environmentFromText("host: x\nport: 80\n", "e.yaml"), { host: "x", port: "80" })
    })
    test("Bruno .bru environment", () => {
        assert.deepEqual(environmentFromText("vars {\n  host: example.test\n  ~off: 1\n}\n", "dev.bru"), { host: "example.test" })
    })
})

describe("script sandbox", () => {
    const ctx = { request: { url: "http://x", method: "GET", headers: {} }, environment: {}, variables: {} }
    const noSend = async () => { throw new Error("no network in this test") }

    test("scripts see no process, fetch or Node modules; pm still works", async () => {
        const runner = createScriptRunner(noSend)
        try {
            const r = await runner.run(
                `let fs = "loaded"; try { require("fs") } catch (e) { fs = "refused" }
                 pm.environment.set("g", [typeof process, typeof fetch, typeof globalThis.process, typeof Buffer, fs].join(","))
                 pm.test("expect", () => pm.expect([1, 2]).to.have.lengthOf(2))`, ctx)
            assert.equal(r.error, undefined)
            assert.equal(r.environment.g, "undefined,undefined,undefined,undefined,refused")
            assert.deepEqual(r.tests, [{ name: "expect", pass: true }])
        } finally { await runner.close() }
    })

    test("an infinite loop is killed and the next script still runs", async () => {
        const runner = createScriptRunner(noSend, { scriptMs: 300, totalMs: 5_000 })
        try {
            const stuck = await runner.run("while (true) {}", ctx)
            assert.equal(stuck.ok, false)
            assert.match(stuck.error!, /timed out after 300ms/)
            const next = await runner.run(`pm.environment.set("ok", "yes")`, ctx)
            assert.equal(next.environment.ok, "yes")
        } finally { await runner.close() }
    })
})

describe("proxy", () => {
    test("blocks cloud metadata hosts and follows/stops redirects like the app", async () => {
        const { proxy, close } = createProxy()
        try {
            assert.equal((await proxy({ url: "http://169.254.169.254/latest" })).status, 403)
            const followed = await proxy({ url: `${baseUrl}/v1/hop` })
            assert.equal(followed.status, 401)
            assert.equal(followed.redirectChain.length, 1)
            const stopped = await proxy({ url: `${baseUrl}/v1/hop`, followRedirects: false })
            assert.equal(stopped.status, 302)
            assert.match((await proxy({ url: `${baseUrl}/v1/hop`, maxRedirects: 0 })).error ?? "", /Too many redirects/)
        } finally { await close() }
    })
})

describe("mdt run (end to end)", () => {
    test("passes: env file + env var + collection header/var + scripts + cookie jar + assertions → exit 0", async () => {
        const r = await mdt("run", SHOP, "--env", "local", "--env-var", `baseUrl=${baseUrl}`)
        assert.equal(r.code, 0, r.stdout + r.stderr)
        assert.match(r.stdout, /✓ POST Login {2}200/)
        assert.match(r.stdout, /✓ got a token/)
        assert.match(r.stdout, /✓ GET Me {2}200/)
        assert.match(r.stdout, /✓ res\.body\.name eq Ada/)
        assert.match(r.stdout, /2 requests \(0 failed\), 3 tests \(0 failed\)/)
    })

    test("a failed assertion exits 1", async () => {
        const r = await mdt("run", SHOP, "--env-var", `baseUrl=${baseUrl}`, "--env-var", "user=bob")
        assert.equal(r.code, 1)
        assert.match(r.stdout, /✗ res\.body\.name eq Ada — expected "Someone else" to be eq Ada|✗ res\.body\.name eq Ada/)
    })

    test("a connection failure is a network error: no scripts or assertions run on it", async () => {
        const closed = http.createServer()
        await new Promise<void>((r) => closed.listen(0, "127.0.0.1", r))
        const port = (closed.address() as { port: number }).port
        await new Promise<void>((r) => closed.close(() => r()))
        const r = await mdt("run", SHOP, "--env-var", `baseUrl=http://127.0.0.1:${port}`, "--reporter", "json")
        assert.equal(r.code, 1)
        const first = JSON.parse(r.stdout).results[0]
        assert.match(first.networkError, /ECONNREFUSED/)
        assert.deepEqual(first.tests, [])
    })

    test("--bail stops after the first failed request", async () => {
        const r = await mdt("run", SHOP, "--env-var", `baseUrl=${baseUrl}`, "--env-var", "apiVersion=v9", "--bail")
        assert.equal(r.code, 1)
        assert.match(r.stdout, /1 requests \(1 failed\)/)
    })

    test("--folder runs one folder with the collection's defaults", async () => {
        const r = await mdt("run", SHOP, "--folder", "account", "--env-var", `baseUrl=${baseUrl}`, "--reporter", "json")
        const report = JSON.parse(r.stdout)
        assert.equal(report.summary.requests, 1)
        // No login ran, so no token/cookie → 401, but the collection header was applied (else 400-style error path).
        assert.equal(report.results[0].status, 401)
        assert.equal(r.code, 1)
    })

    test("--no-scripts skips scripts but still runs assertions", async () => {
        const r = await mdt("run", SHOP, "--no-scripts", "--env", "local", "--env-var", `baseUrl=${baseUrl}`, "--reporter", "json")
        const report = JSON.parse(r.stdout)
        assert.equal(report.results[0].tests.length, 1) // assertion only, no "got a token"
        assert.ok(report.results[0].logs.some((l: { args: string[] }) => l.args[0] === "script skipped (--no-scripts)"))
    })

    test("junit and html reports written to --output", async () => {
        const dir = await mkdtemp(path.join(tmpdir(), "mdt-"))
        const xmlFile = path.join(dir, "r.xml")
        const htmlFile = path.join(dir, "r.html")
        const a = await mdt("run", SHOP, "--env-var", `baseUrl=${baseUrl}`, "--env-var", "user=bob", "--reporter", "junit", "--output", xmlFile)
        assert.equal(a.code, 1)
        const xml = await readFile(xmlFile, "utf8")
        assert.match(xml, /^<\?xml/)
        assert.match(xml, /<failure/)
        assertBalancedXml(xml)
        await mdt("run", SHOP, "--env", "local", "--env-var", `baseUrl=${baseUrl}`, "--reporter", "html", "--output", htmlFile)
        const html = await readFile(htmlFile, "utf8")
        assert.match(html, /<!doctype html>/)
        assert.match(html, /got a token/)
    })

    for (const [name, args, msg] of [
        ["missing folder", ["run", "/nope/nowhere"], /not found/],
        ["not a collection", ["run", here], /not a collection folder/],
        ["unknown env", ["run", SHOP, "--env", "prod"], /Environment "prod" not found/],
        ["unknown folder", ["run", SHOP, "--folder", "Nope"], /Folder "Nope" not found/],
        ["bad flag", ["run", SHOP, "--reporter", "xml"], /--reporter/],
    ] as [string, string[], RegExp][]) {
        test(`exit 2: ${name}`, async () => {
            const r = await mdt(...args)
            assert.equal(r.code, 2, r.stdout + r.stderr)
            assert.match(r.stderr, msg)
        })
    }
})

/** Minimal well-formedness: every opened tag closes in order. */
function assertBalancedXml(xml: string) {
    const stack: string[] = []
    const body = xml.replace(/<\?xml[^>]*\?>/, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    for (const m of body.matchAll(/<(\/?)([A-Za-z_][\w.-]*)[^>]*?(\/?)>/g)) {
        const [, closing, name, selfClosing] = m
        if (selfClosing) continue
        if (closing) assert.equal(stack.pop(), name, `unexpected </${name}>`)
        else stack.push(name)
    }
    assert.deepEqual(stack, [], "unclosed tags")
}
