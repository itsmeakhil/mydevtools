/**
 * curl-to-code.ts
 *
 * Pure-TypeScript logic for the "cURL to Code" tool.
 *
 * Parses a `curl` command into a structured representation and generates
 * equivalent HTTP request code for several languages / libraries.
 *
 * No React, no npm deps, no i18n. Everything here is total (never throws)
 * except `parseCurl`, which throws on non-curl input by design.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedCurl {
    /** Upper-case HTTP method. Defaults to GET, or POST when a body is present and no method was given explicitly. */
    method: string
    /** Request URL. */
    url: string
    /** Request headers in original order. */
    headers: { name: string; value: string }[]
    /** Raw request body (from -d / --data* flags), or null when there is none. */
    body: string | null
    /** Basic-auth credentials (from -u user:pass), or null. */
    auth: { user: string; password: string } | null
}

export type CurlTarget =
    | "fetch"
    | "node-fetch"
    | "axios"
    | "xhr"
    | "python-requests"
    | "python-http"
    | "go"
    | "php-curl"
    | "ruby"
    | "java"
    | "csharp"

export const CURL_TARGETS: { value: CurlTarget; label: string }[] = [
    { value: "fetch", label: "JavaScript — fetch" },
    { value: "node-fetch", label: "Node.js — node-fetch" },
    { value: "axios", label: "JavaScript — axios" },
    { value: "xhr", label: "JavaScript — XMLHttpRequest" },
    { value: "python-requests", label: "Python — requests" },
    { value: "python-http", label: "Python — http.client" },
    { value: "go", label: "Go — net/http" },
    { value: "php-curl", label: "PHP — cURL" },
    { value: "ruby", label: "Ruby — net/http" },
    { value: "java", label: "Java — HttpClient" },
    { value: "csharp", label: "C# — HttpClient" },
]

export interface CurlToCodeResult {
    code: string
    error: string | null
}

// ---------------------------------------------------------------------------
// Base64 (pure TS, no btoa / Buffer dependency at generation time)
// ---------------------------------------------------------------------------

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/**
 * Encode a JS string to base64. UTF-8 aware so non-ASCII credentials still
 * produce a valid Basic-auth header value.
 */
function base64Encode(input: string): string {
    // Convert to a byte array (UTF-8).
    const bytes: number[] = []
    for (let i = 0; i < input.length; i++) {
        let code = input.charCodeAt(i)
        if (code < 0x80) {
            bytes.push(code)
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
        } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
            // Surrogate pair.
            const hi = code
            const lo = input.charCodeAt(++i)
            code = 0x10000 + ((hi & 0x3ff) << 10) + (lo & 0x3ff)
            bytes.push(
                0xf0 | (code >> 18),
                0x80 | ((code >> 12) & 0x3f),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f),
            )
        } else {
            bytes.push(
                0xe0 | (code >> 12),
                0x80 | ((code >> 6) & 0x3f),
                0x80 | (code & 0x3f),
            )
        }
    }

    let out = ""
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i]
        const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
        const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0

        out += B64_CHARS[b0 >> 2]
        out += B64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)]
        out += i + 1 < bytes.length ? B64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)] : "="
        out += i + 2 < bytes.length ? B64_CHARS[b2 & 0x3f] : "="
    }
    return out
}

/** Basic-auth header value for the given credentials. */
function basicAuthValue(user: string, password: string): string {
    return "Basic " + base64Encode(`${user}:${password}`)
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/**
 * Split a shell-ish command string into tokens, honoring single quotes,
 * double quotes, and backslash / caret / backtick line-continuations.
 * Surrounding quotes are stripped from each token.
 */
function tokenize(str: string): string[] {
    const tokens: string[] = []
    let current = ""
    let hasToken = false // distinguishes an empty quoted token ("") from whitespace
    let inSingle = false
    let inDouble = false
    let escaped = false

    const push = () => {
        if (hasToken) {
            tokens.push(current)
            current = ""
            hasToken = false
        }
    }

    for (let i = 0; i < str.length; i++) {
        const char = str[i]

        if (escaped) {
            current += char
            hasToken = true
            escaped = false
            continue
        }

        if (char === "\\") {
            if (inSingle) {
                // Backslash is literal inside single quotes.
                current += char
                hasToken = true
            } else {
                // Line continuation: "\" followed by newline is swallowed.
                if (str[i + 1] === "\n") {
                    i += 1
                    continue
                }
                if (str[i + 1] === "\r" && str[i + 2] === "\n") {
                    i += 2
                    continue
                }
                escaped = true
            }
            continue
        }

        // Windows / PowerShell line continuations (only meaningful at line end).
        if ((char === "^" || char === "`") && !inSingle && !inDouble) {
            if (str[i + 1] === "\n") {
                i += 1
                continue
            }
            if (str[i + 1] === "\r" && str[i + 2] === "\n") {
                i += 2
                continue
            }
            current += char
            hasToken = true
            continue
        }

        if (char === "'" && !inDouble) {
            inSingle = !inSingle
            hasToken = true
            continue
        }

        if (char === '"' && !inSingle) {
            inDouble = !inDouble
            hasToken = true
            continue
        }

        if (/\s/.test(char) && !inSingle && !inDouble) {
            push()
        } else {
            current += char
            hasToken = true
        }
    }

    push()
    return tokens
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function looksLikeUrl(token: string): boolean {
    return (
        token.includes("://") ||
        token.startsWith("localhost") ||
        token.startsWith("www.") ||
        /^[\w.-]+\.[a-z]{2,}(?:[:/?#]|$)/i.test(token)
    )
}

function addHeader(
    headers: { name: string; value: string }[],
    raw: string,
): void {
    const colon = raw.indexOf(":")
    if (colon === -1) return
    const name = raw.slice(0, colon).trim()
    const value = raw.slice(colon + 1).trim()
    if (name) headers.push({ name, value })
}

/**
 * Parse a curl command into a {@link ParsedCurl}.
 * @throws Error('Not a curl command') when the input does not start with `curl`.
 */
export function parseCurl(command: string): ParsedCurl {
    const trimmed = command.trim()
    if (!/^curl(\s|$)/.test(trimmed)) {
        throw new Error("Not a curl command")
    }

    const args = tokenize(trimmed)
    if (args[0] === "curl") args.shift()

    let method = ""
    let url = ""
    const headers: { name: string; value: string }[] = []
    const bodyParts: string[] = []
    let auth: { user: string; password: string } | null = null

    const setAuth = (creds: string) => {
        const colon = creds.indexOf(":")
        if (colon === -1) {
            auth = { user: creds, password: "" }
        } else {
            auth = { user: creds.slice(0, colon), password: creds.slice(colon + 1) }
        }
    }

    const next = (i: number): { value: string; i: number } => {
        if (i + 1 < args.length) return { value: args[i + 1], i: i + 1 }
        return { value: "", i }
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        if (arg.startsWith("-") && arg !== "-") {
            // Method
            if (arg === "-X" || arg === "--request") {
                const n = next(i)
                method = n.value.toUpperCase()
                i = n.i
            } else if (arg.startsWith("-X")) {
                method = arg.slice(2).toUpperCase()
            }
            // Header
            else if (arg === "-H" || arg === "--header") {
                const n = next(i)
                addHeader(headers, n.value)
                i = n.i
            } else if (arg.startsWith("-H")) {
                addHeader(headers, arg.slice(2))
            }
            // Body variants
            else if (
                arg === "-d" ||
                arg === "--data" ||
                arg === "--data-raw" ||
                arg === "--data-ascii" ||
                arg === "--data-binary" ||
                arg === "--data-urlencode"
            ) {
                const n = next(i)
                bodyParts.push(n.value)
                i = n.i
            } else if (arg.startsWith("-d")) {
                bodyParts.push(arg.slice(2))
            }
            // Basic auth
            else if (arg === "-u" || arg === "--user") {
                const n = next(i)
                setAuth(n.value)
                i = n.i
            } else if (arg.startsWith("-u")) {
                setAuth(arg.slice(2))
            }
            // Explicit URL
            else if (arg === "--url") {
                const n = next(i)
                if (n.value) url = n.value
                i = n.i
            }
            // Cookie
            else if (arg === "-b" || arg === "--cookie") {
                const n = next(i)
                if (n.value) headers.push({ name: "Cookie", value: n.value })
                i = n.i
            } else if (arg.startsWith("-b")) {
                headers.push({ name: "Cookie", value: arg.slice(2) })
            }
            // User-Agent
            else if (arg === "-A" || arg === "--user-agent") {
                const n = next(i)
                if (n.value) headers.push({ name: "User-Agent", value: n.value })
                i = n.i
            }
            // Referer
            else if (arg === "-e" || arg === "--referer") {
                const n = next(i)
                if (n.value) headers.push({ name: "Referer", value: n.value })
                i = n.i
            }
            // Flags that take no argument and don't affect the request shape.
            else if (
                arg === "--compressed" ||
                arg === "-L" ||
                arg === "--location" ||
                arg === "-k" ||
                arg === "--insecure" ||
                arg === "-s" ||
                arg === "--silent" ||
                arg === "-i" ||
                arg === "--include" ||
                arg === "-v" ||
                arg === "--verbose" ||
                arg === "-g" ||
                arg === "--globoff"
            ) {
                // ignore
            }
            // Unknown flag: ignore it. Do not consume a following token, since
            // guessing wrong could swallow the URL.
        } else {
            // Bare token — treat as the URL.
            if (!url && looksLikeUrl(arg)) {
                url = arg
            } else if (!url) {
                url = arg
            }
        }
    }

    const body = bodyParts.length > 0 ? bodyParts.join("&") : null

    if (!method) {
        method = body !== null ? "POST" : "GET"
    }

    return { method, url, headers, body, auth }
}

// ---------------------------------------------------------------------------
// Escaping helpers
// ---------------------------------------------------------------------------

/** Escape for a JS/TS double-quoted string. */
function jsStr(s: string): string {
    return (
        '"' +
        s
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
        '"'
    )
}

/** Escape for a JS/TS template literal (backticks). */
function jsTemplate(s: string): string {
    return "`" + s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${") + "`"
}

/** Escape for a Python single-quoted string. */
function pyStr(s: string): string {
    return (
        "'" +
        s
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
        "'"
    )
}

/** Escape for a Go double-quoted string. */
function goStr(s: string): string {
    return (
        '"' +
        s
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
        '"'
    )
}

/** Escape for a PHP single-quoted string (only \ and ' are special). */
function phpStr(s: string): string {
    return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'"
}

/** Escape for a Ruby double-quoted string. */
function rubyStr(s: string): string {
    return (
        '"' +
        s
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/#/g, "\\#")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
        '"'
    )
}

/** Escape for a Java double-quoted string. */
function javaStr(s: string): string {
    return (
        '"' +
        s
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
        '"'
    )
}

/** Escape for a C# verbatim/regular double-quoted string. */
function csStr(s: string): string {
    return (
        '"' +
        s
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t") +
        '"'
    )
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Headers with a synthetic Authorization header appended for basic auth (used by targets without native auth). */
function headersWithBasicAuth(p: ParsedCurl): { name: string; value: string }[] {
    if (!p.auth) return p.headers
    return [
        ...p.headers,
        { name: "Authorization", value: basicAuthValue(p.auth.user, p.auth.password) },
    ]
}

function genFetch(p: ParsedCurl, importFetch: boolean): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = []
    if (importFetch) lines.push(`import fetch from "node-fetch"`, "")

    const optLines: string[] = [`  method: ${jsStr(p.method)},`]
    if (headers.length > 0) {
        optLines.push("  headers: {")
        headers.forEach((h) => optLines.push(`    ${jsStr(h.name)}: ${jsStr(h.value)},`))
        optLines.push("  },")
    }
    if (p.body !== null) {
        optLines.push(`  body: ${jsStr(p.body)},`)
    }

    lines.push(`const response = await fetch(${jsStr(p.url)}, {`)
    lines.push(...optLines)
    lines.push("})")
    lines.push("")
    lines.push("const data = await response.json()")
    lines.push("console.log(data)")
    return lines.join("\n")
}

function genAxios(p: ParsedCurl): string {
    const lines: string[] = [`import axios from "axios"`, ""]
    lines.push("const response = await axios({")
    lines.push(`  method: ${jsStr(p.method)},`)
    lines.push(`  url: ${jsStr(p.url)},`)
    if (p.headers.length > 0) {
        lines.push("  headers: {")
        p.headers.forEach((h) => lines.push(`    ${jsStr(h.name)}: ${jsStr(h.value)},`))
        lines.push("  },")
    }
    if (p.body !== null) {
        lines.push(`  data: ${jsStr(p.body)},`)
    }
    if (p.auth) {
        lines.push("  auth: {")
        lines.push(`    username: ${jsStr(p.auth.user)},`)
        lines.push(`    password: ${jsStr(p.auth.password)},`)
        lines.push("  },")
    }
    lines.push("})")
    lines.push("")
    lines.push("console.log(response.data)")
    return lines.join("\n")
}

function genXhr(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = []
    lines.push("const xhr = new XMLHttpRequest()")
    lines.push(`xhr.open(${jsStr(p.method)}, ${jsStr(p.url)})`)
    lines.push("")
    headers.forEach((h) =>
        lines.push(`xhr.setRequestHeader(${jsStr(h.name)}, ${jsStr(h.value)})`),
    )
    if (headers.length > 0) lines.push("")
    lines.push("xhr.onload = () => {")
    lines.push("  console.log(xhr.status, xhr.responseText)")
    lines.push("}")
    lines.push("")
    lines.push(p.body !== null ? `xhr.send(${jsStr(p.body)})` : "xhr.send()")
    return lines.join("\n")
}

function genPythonRequests(p: ParsedCurl): string {
    const lines: string[] = ["import requests", ""]
    lines.push(`url = ${pyStr(p.url)}`)
    if (p.headers.length > 0) {
        lines.push("headers = {")
        p.headers.forEach((h) => lines.push(`    ${pyStr(h.name)}: ${pyStr(h.value)},`))
        lines.push("}")
    }
    if (p.body !== null) {
        lines.push(`data = ${pyStr(p.body)}`)
    }

    const callArgs: string[] = [pyStr(p.method), "url"]
    if (p.headers.length > 0) callArgs.push("headers=headers")
    if (p.body !== null) callArgs.push("data=data")
    if (p.auth) callArgs.push(`auth=(${pyStr(p.auth.user)}, ${pyStr(p.auth.password)})`)

    lines.push("")
    lines.push(`response = requests.request(${callArgs.join(", ")})`)
    lines.push("print(response.status_code)")
    lines.push("print(response.text)")
    return lines.join("\n")
}

function genPythonHttp(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = ["import http.client", ""]

    // Split URL into host / path (best effort, no external deps).
    let scheme = "https"
    let hostPort = p.url
    let path = "/"
    const schemeMatch = p.url.match(/^(https?):\/\/([^/]+)(\/.*)?$/i)
    if (schemeMatch) {
        scheme = schemeMatch[1].toLowerCase()
        hostPort = schemeMatch[2]
        path = schemeMatch[3] || "/"
    }
    const conn = scheme === "http" ? "HTTPConnection" : "HTTPSConnection"

    lines.push(`conn = http.client.${conn}(${pyStr(hostPort)})`)
    if (p.body !== null) {
        lines.push(`payload = ${pyStr(p.body)}`)
    } else {
        lines.push("payload = None")
    }
    if (headers.length > 0) {
        lines.push("headers = {")
        headers.forEach((h) => lines.push(`    ${pyStr(h.name)}: ${pyStr(h.value)},`))
        lines.push("}")
    } else {
        lines.push("headers = {}")
    }
    lines.push("")
    lines.push(`conn.request(${pyStr(p.method)}, ${pyStr(path)}, payload, headers)`)
    lines.push("response = conn.getresponse()")
    lines.push("print(response.status, response.reason)")
    lines.push("print(response.read().decode())")
    return lines.join("\n")
}

function genGo(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = []
    lines.push("package main")
    lines.push("")
    lines.push("import (")
    lines.push('\t"fmt"')
    lines.push('\t"io"')
    if (p.body !== null) lines.push('\t"strings"')
    lines.push('\t"net/http"')
    lines.push(")")
    lines.push("")
    lines.push("func main() {")
    lines.push(`\turl := ${goStr(p.url)}`)
    if (p.body !== null) {
        lines.push(`\tpayload := strings.NewReader(${goStr(p.body)})`)
        lines.push(`\treq, err := http.NewRequest(${goStr(p.method)}, url, payload)`)
    } else {
        lines.push(`\treq, err := http.NewRequest(${goStr(p.method)}, url, nil)`)
    }
    lines.push("\tif err != nil {")
    lines.push("\t\tpanic(err)")
    lines.push("\t}")
    lines.push("")
    headers.forEach((h) => lines.push(`\treq.Header.Set(${goStr(h.name)}, ${goStr(h.value)})`))
    if (headers.length > 0) lines.push("")
    lines.push("\tres, err := http.DefaultClient.Do(req)")
    lines.push("\tif err != nil {")
    lines.push("\t\tpanic(err)")
    lines.push("\t}")
    lines.push("\tdefer res.Body.Close()")
    lines.push("")
    lines.push("\tbody, _ := io.ReadAll(res.Body)")
    lines.push("\tfmt.Println(res.Status)")
    lines.push("\tfmt.Println(string(body))")
    lines.push("}")
    return lines.join("\n")
}

function genPhpCurl(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = ["<?php", ""]
    lines.push("$ch = curl_init();")
    lines.push("")
    lines.push("curl_setopt_array($ch, [")
    lines.push(`    CURLOPT_URL => ${phpStr(p.url)},`)
    lines.push("    CURLOPT_RETURNTRANSFER => true,")
    lines.push(`    CURLOPT_CUSTOMREQUEST => ${phpStr(p.method)},`)
    if (p.body !== null) {
        lines.push(`    CURLOPT_POSTFIELDS => ${phpStr(p.body)},`)
    }
    if (headers.length > 0) {
        lines.push("    CURLOPT_HTTPHEADER => [")
        headers.forEach((h) => lines.push(`        ${phpStr(`${h.name}: ${h.value}`)},`))
        lines.push("    ],")
    }
    lines.push("]);")
    lines.push("")
    lines.push("$response = curl_exec($ch);")
    lines.push("if (curl_errno($ch)) {")
    lines.push("    echo 'Error: ' . curl_error($ch);")
    lines.push("}")
    lines.push("curl_close($ch);")
    lines.push("echo $response;")
    return lines.join("\n")
}

function genRuby(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = ['require "uri"', 'require "net/http"', ""]
    lines.push(`url = URI(${rubyStr(p.url)})`)
    lines.push("")
    lines.push("http = Net::HTTP.new(url.host, url.port)")
    lines.push('http.use_ssl = url.scheme == "https"')
    lines.push("")

    // Map method to the appropriate Net::HTTP request class.
    const cls =
        "Net::HTTP::" +
        (p.method.charAt(0).toUpperCase() + p.method.slice(1).toLowerCase())
    lines.push(`request = ${cls}.new(url)`)
    headers.forEach((h) => lines.push(`request[${rubyStr(h.name)}] = ${rubyStr(h.value)}`))
    if (p.body !== null) {
        lines.push(`request.body = ${rubyStr(p.body)}`)
    }
    lines.push("")
    lines.push("response = http.request(request)")
    lines.push("puts response.code")
    lines.push("puts response.body")
    return lines.join("\n")
}

function genJava(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = []
    lines.push("import java.net.URI;")
    lines.push("import java.net.http.HttpClient;")
    lines.push("import java.net.http.HttpRequest;")
    lines.push("import java.net.http.HttpResponse;")
    lines.push("")
    lines.push("HttpClient client = HttpClient.newHttpClient();")
    lines.push("")
    lines.push("HttpRequest request = HttpRequest.newBuilder()")
    lines.push(`    .uri(URI.create(${javaStr(p.url)}))`)
    const bodyPublisher =
        p.body !== null
            ? `HttpRequest.BodyPublishers.ofString(${javaStr(p.body)})`
            : "HttpRequest.BodyPublishers.noBody()"
    lines.push(`    .method(${javaStr(p.method)}, ${bodyPublisher})`)
    headers.forEach((h) => lines.push(`    .header(${javaStr(h.name)}, ${javaStr(h.value)})`))
    lines.push("    .build();")
    lines.push("")
    lines.push(
        "HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());",
    )
    lines.push("System.out.println(response.statusCode());")
    lines.push("System.out.println(response.body());")
    return lines.join("\n")
}

function genCsharp(p: ParsedCurl): string {
    const headers = headersWithBasicAuth(p)
    const lines: string[] = []
    lines.push("using System;")
    lines.push("using System.Net.Http;")
    lines.push("using System.Threading.Tasks;")
    lines.push("")
    lines.push("using var client = new HttpClient();")
    lines.push("")
    const methodExpr = `new HttpMethod(${csStr(p.method)})`
    lines.push(
        `var request = new HttpRequestMessage(${methodExpr}, ${csStr(p.url)});`,
    )
    if (p.body !== null) {
        lines.push(
            `request.Content = new StringContent(${csStr(p.body)});`,
        )
    }
    // Header placement: content headers vs. request headers. Keep it simple and
    // route Content-Type onto the content when a body exists.
    headers.forEach((h) => {
        if (
            p.body !== null &&
            h.name.toLowerCase() === "content-type"
        ) {
            lines.push(
                `if (request.Content != null) request.Content.Headers.Remove("Content-Type");`,
            )
            lines.push(
                `if (request.Content != null) request.Content.Headers.TryAddWithoutValidation(${csStr(h.name)}, ${csStr(h.value)});`,
            )
        } else {
            lines.push(
                `request.Headers.TryAddWithoutValidation(${csStr(h.name)}, ${csStr(h.value)});`,
            )
        }
    })
    lines.push("")
    lines.push("var response = await client.SendAsync(request);")
    lines.push("var body = await response.Content.ReadAsStringAsync();")
    lines.push("Console.WriteLine((int)response.StatusCode);")
    lines.push("Console.WriteLine(body);")
    return lines.join("\n")
}

// jsTemplate is exported-in-spirit for potential multiline bodies; reference it
// so strict/no-unused settings stay happy while keeping it available.
void jsTemplate

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Convert a curl command into code for the given target.
 * Never throws: returns { code: "", error } on failure.
 */
export function curlToCode(command: string, target: CurlTarget): CurlToCodeResult {
    if (!command || !command.trim()) {
        return { code: "", error: null }
    }

    let parsed: ParsedCurl
    try {
        parsed = parseCurl(command)
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse curl command"
        return { code: "", error: message }
    }

    try {
        let code: string
        switch (target) {
            case "fetch":
                code = genFetch(parsed, false)
                break
            case "node-fetch":
                code = genFetch(parsed, true)
                break
            case "axios":
                code = genAxios(parsed)
                break
            case "xhr":
                code = genXhr(parsed)
                break
            case "python-requests":
                code = genPythonRequests(parsed)
                break
            case "python-http":
                code = genPythonHttp(parsed)
                break
            case "go":
                code = genGo(parsed)
                break
            case "php-curl":
                code = genPhpCurl(parsed)
                break
            case "ruby":
                code = genRuby(parsed)
                break
            case "java":
                code = genJava(parsed)
                break
            case "csharp":
                code = genCsharp(parsed)
                break
            default: {
                // Exhaustiveness guard.
                const _never: never = target
                return { code: "", error: `Unknown target: ${String(_never)}` }
            }
        }
        return { code, error: null }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate code"
        return { code: "", error: message }
    }
}
