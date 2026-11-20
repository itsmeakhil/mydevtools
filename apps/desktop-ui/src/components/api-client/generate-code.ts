import { encodeBasicCredentials } from "@/lib/basic-auth"
import { ensureHttpScheme } from "@/lib/url-normalize"
import { ApiRequestState, RequestFormDataItem } from "./types"

/** Picker order; labels are product/library names, not translated. */
export const CODE_LANGUAGES = [
    ["curl", "cURL"],
    ["httpie", "HTTPie"],
    ["wget", "Wget"],
    ["powershell", "PowerShell"],
    ["javascript", "JavaScript (fetch)"],
    ["typescript", "TypeScript (fetch)"],
    ["python", "Python (requests)"],
    ["go", "Go (net/http)"],
    ["java", "Java (HttpClient)"],
    ["kotlin", "Kotlin (OkHttp)"],
    ["csharp", "C# (HttpClient)"],
    ["php", "PHP (cURL)"],
    ["ruby", "Ruby (Net::HTTP)"],
    ["swift", "Swift (URLSession)"],
    ["rust", "Rust (reqwest)"],
    ["dart", "Dart (http)"],
] as const

export type CodeLanguage = (typeof CODE_LANGUAGES)[number][0]

// ── String literals ────────────────────────────────────────────────────────

/** POSIX shell single-quoted literal — close, escape every embedded apostrophe, reopen. */
function sh(s: string): string {
    return `'${s.replace(/'/g, "'\\''")}'`
}
/** Shell word: bare when it's a plain token (HTTP methods), quoted otherwise. */
const shWord = (s: string) => (/^[A-Za-z0-9_-]+$/.test(s) ? s : sh(s))
/** Double-quoted literal with JSON escapes — valid in JS/TS, Python, Go, Java and C#. */
const dq = (s: string) => JSON.stringify(s)
/** Kotlin / Dart: double-quoted, plus `$` (string templates). */
const dqNoTemplate = (s: string) => dq(s).replace(/\$/g, "\\$")
/** PHP / Ruby single-quoted: only `\` and `'` are special. */
const sq = (s: string) => `'${s.replace(/[\\']/g, "\\$&")}'`
/** PowerShell single-quoted: quotes doubled — it also treats the typographic single quotes as quotes. */
const PS_QUOTES = new RegExp("['\\u2018-\\u201B]", "g")
const psq = (s: string) => `'${s.replace(PS_QUOTES, "$&$&")}'`
const BRACE_ESC: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t", "\0": "\\0" }
/** Swift / Rust: no `\b` `\f` `\uXXXX` — other control characters become `\u{..}`. */
const braceQuote = (s: string) =>
    `"${s.replace(/[\\"\x00-\x1f\x7f]/g, c => BRACE_ESC[c] ?? `\\u{${c.charCodeAt(0).toString(16)}}`)}"`
/** Text placed inside a line comment: no line breaks, no backslashes (Java expands `\u000a` even in comments). */
const LINE_BREAKS = new RegExp("[\\r\\n\\u2028\\u2029]+", "g")
const oneLine = (s: string) => s.replace(LINE_BREAKS, " ").replace(/\\/g, "/")

// ── Request preparation ────────────────────────────────────────────────────

interface BodyContext {
    type: "none" | "json" | "text" | "form-data" | "x-www-form-urlencoded"
    content: string
    formData: RequestFormDataItem[]
}

/** Auth a client can perform itself (challenge/response or signing) instead of a fixed header. */
type NativeAuth =
    | { kind: "digest" | "ntlm"; username: string; password: string; domain?: string }
    | { kind: "aws-sigv4"; accessKeyId: string; secretAccessKey: string; region: string; service: string }

interface Snippet {
    method: string
    url: string
    headers: Record<string, string>
    body: BodyContext
    /** Set only when the target language supports it natively. */
    native?: NativeAuth
    /** Comment line (with trailing newline) explaining an auth placeholder, or "". */
    head: string
}

interface Prepared extends Omit<Snippet, "native" | "head"> {
    native?: NativeAuth
    /** Header + explanation used when the language can't do `native` (or for per-request signers). */
    fallback?: { header: string; note: string }
}

function prepare(request: ApiRequestState): Prepared {
    const { method, url, headers, params, body, auth } = request

    // Build URL with query params
    let fullUrl = url
    try {
        let urlObj: URL
        try {
            urlObj = new URL(url || "http://localhost")
        } catch {
            urlObj = new URL(ensureHttpScheme(url || "http://localhost"))
        }
        params.forEach(p => {
            if (p.active && p.key) urlObj.searchParams.append(p.key, p.value)
        })
        fullUrl = urlObj.toString()
    } catch {
        const qs = params.filter(p => p.active && p.key).map(p => `${p.key}=${p.value}`).join("&")
        if (qs) fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs
    }

    const headerObj: Record<string, string> = {}
    headers.forEach(h => {
        if (h.active && h.key) headerObj[h.key] = h.value
    })

    // Auth. Values are emitted verbatim — snippets never sign or fetch tokens.
    let native: NativeAuth | undefined
    let fallback: Prepared["fallback"]
    if (auth.type === "bearer" && auth.token) {
        headerObj["Authorization"] = `Bearer ${auth.token}`
    } else if (auth.type === "basic" && auth.username && auth.password) {
        headerObj["Authorization"] = `Basic ${encodeBasicCredentials(auth.username, auth.password)}`
    } else if (auth.type === "api-key" && auth.apiKeyKey && auth.apiKeyValue) {
        if (auth.apiKeyLocation === "query") {
            const sep = fullUrl.includes("?") ? "&" : "?"
            fullUrl += `${sep}${encodeURIComponent(auth.apiKeyKey)}=${encodeURIComponent(auth.apiKeyValue)}`
        } else {
            headerObj[auth.apiKeyKey] = auth.apiKeyValue
        }
    } else if (auth.type === "oauth2" && auth.oauth2) {
        if (auth.oauth2.accessToken) {
            headerObj["Authorization"] = `${auth.oauth2.tokenType || "Bearer"} ${auth.oauth2.accessToken}`
        } else {
            fallback = { header: "Bearer <access token>", note: "OAuth 2.0: fetch an access token first and put it in the Authorization header." }
        }
    } else if (auth.type === "spnego" && auth.spnego?.token) {
        headerObj["Authorization"] = `Negotiate ${auth.spnego.token}`
    } else if (auth.type === "digest" && auth.digest) {
        native = { kind: "digest", username: auth.digest.username, password: auth.digest.password }
        fallback = { header: "Digest <computed from the server's 401 challenge>", note: "Digest auth: compute the Authorization header from the server's 401 challenge." }
    } else if (auth.type === "ntlm" && auth.ntlm) {
        native = { kind: "ntlm", username: auth.ntlm.username, password: auth.ntlm.password, domain: auth.ntlm.domain }
        fallback = { header: "NTLM <handshake token>", note: "NTLM auth needs a multi-step handshake; use an NTLM-capable client library." }
    } else if (auth.type === "aws-sigv4" && auth.awsSigV4) {
        const a = auth.awsSigV4
        native = { kind: "aws-sigv4", accessKeyId: a.accessKeyId, secretAccessKey: a.secretAccessKey, region: a.region, service: a.service }
        fallback = { header: "AWS4-HMAC-SHA256 <signature>", note: `AWS Signature v4 (${a.region}/${a.service}): sign each request with an AWS SDK signer.` }
        if (a.sessionToken) headerObj["X-Amz-Security-Token"] = a.sessionToken
    } else if (auth.type === "hawk" && auth.hawk) {
        fallback = { header: `Hawk id="${auth.hawk.id}", ts="<timestamp>", nonce="<nonce>", mac="<mac>"`, note: "Hawk auth: compute ts, nonce and mac per request with a Hawk library." }
    } else if (auth.type === "jwt-bearer" && auth.jwtBearer) {
        fallback = { header: `Bearer <JWT signed with ${auth.jwtBearer.algorithm}>`, note: "JWT Bearer: sign a fresh token before each request." }
    }

    // Body
    const bodyCtx: BodyContext = { type: "none", content: "", formData: [] }
    if (method !== "GET" && method !== "HEAD" && body.type !== "none") {
        const hasContentType = Object.keys(headerObj).some(k => k.toLowerCase() === "content-type")
        if (body.type === "json") {
            bodyCtx.type = "json"
            bodyCtx.content = body.content
            if (!hasContentType) headerObj["Content-Type"] = "application/json"
        } else if (body.type === "x-www-form-urlencoded") {
            const p = new URLSearchParams()
            ;(body.urlEncoded ?? []).forEach(item => {
                if (item.active && item.key) p.append(item.key, item.value)
            })
            bodyCtx.type = "x-www-form-urlencoded"
            bodyCtx.content = p.toString()
            if (!hasContentType) headerObj["Content-Type"] = "application/x-www-form-urlencoded"
        } else if (body.type === "form-data") {
            bodyCtx.type = "form-data"
            bodyCtx.formData = (body.formData ?? []).filter(item => item.active && item.key)
        } else if (body.type === "graphql") {
            // GraphQL travels as { query, variables } JSON — mirror the send pipeline.
            let variables: unknown
            const rawVars = (body.graphqlVariables ?? "").trim()
            if (rawVars) {
                try { variables = JSON.parse(rawVars) } catch { /* invalid variables: emit query only */ }
            }
            bodyCtx.type = "json"
            bodyCtx.content = JSON.stringify(variables !== undefined ? { query: body.content, variables } : { query: body.content })
            if (!hasContentType) headerObj["Content-Type"] = "application/json"
        } else if (body.type === "binary") {
            // ponytail: no file-upload snippet yet; emits the Content-Type only.
            if (!hasContentType) headerObj["Content-Type"] = body.binaryFile?.fileType || "application/octet-stream"
        } else {
            bodyCtx.type = "text"
            bodyCtx.content = body.content
            if (!hasContentType) headerObj["Content-Type"] = body.type === "xml" ? "application/xml" : "text/plain"
        }
    }

    return { method, url: fullUrl, headers: headerObj, body: bodyCtx, native, fallback }
}

type NativeKind = NativeAuth["kind"]

const GENERATORS: Record<CodeLanguage, { comment: string; native?: NativeKind[]; gen: (s: Snippet) => string }> = {
    curl: { comment: "#", native: ["digest", "ntlm", "aws-sigv4"], gen: generateCurl },
    httpie: { comment: "#", native: ["digest"], gen: generateHttpie },
    wget: { comment: "#", native: ["digest", "ntlm"], gen: generateWget },
    powershell: { comment: "#", native: ["digest", "ntlm"], gen: generatePowershell },
    javascript: { comment: "//", gen: generateJavascript },
    typescript: { comment: "//", gen: generateTypescript },
    python: { comment: "#", gen: generatePython },
    go: { comment: "//", gen: generateGo },
    java: { comment: "//", gen: generateJava },
    kotlin: { comment: "//", gen: generateKotlin },
    csharp: { comment: "//", native: ["digest", "ntlm"], gen: generateCsharp },
    php: { comment: "//", native: ["digest", "ntlm"], gen: generatePhp },
    ruby: { comment: "#", gen: generateRuby },
    swift: { comment: "//", gen: generateSwift },
    rust: { comment: "//", gen: generateRust },
    dart: { comment: "//", gen: generateDart },
}

export function generateCode(request: ApiRequestState, language: CodeLanguage): string {
    const entry = GENERATORS[language]
    if (!entry) return ""
    const { fallback, native, ...p } = prepare(request)
    if (native && entry.native?.includes(native.kind)) return entry.gen({ ...p, native, head: "" })
    const headers = fallback ? { ...p.headers, Authorization: fallback.header } : p.headers
    const head = fallback ? `${entry.comment} ${oneLine(fallback.note)}\n` : ""
    return entry.gen({ ...p, headers, head })
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fileName = (item: RequestFormDataItem) => item.fileName || "file.bin"
const isContentType = (k: string) => k.toLowerCase() === "content-type"
const ntlmUser = (n: NativeAuth & { kind: "digest" | "ntlm" }) => (n.domain ? `${n.domain}\\${n.username}` : n.username)

/** Hand-built multipart body for clients without a multipart builder; file parts are left to the caller. */
function multipartText(items: RequestFormDataItem[]): { contentType: string; body: string } {
    const boundary = "----MyDevToolsFormBoundary7MA4YWxkTrZu0gW"
    const esc = (s: string) => s.replace(/"/g, "%22").replace(/\r/g, "%0D").replace(/\n/g, "%0A")
    let body = ""
    for (const i of items) {
        if (i.valueType === "file") continue
        body += `--${boundary}\r\nContent-Disposition: form-data; name="${esc(i.key)}"\r\n\r\n${i.value}\r\n`
    }
    return { contentType: `multipart/form-data; boundary=${boundary}`, body: body + `--${boundary}--\r\n` }
}

// ── Shell clients ──────────────────────────────────────────────────────────

function generateCurl({ method, url, headers, body, native, head }: Snippet): string {
    // -I, not -X HEAD: curl would otherwise wait for a body that never comes.
    const parts = [method === "HEAD" ? `curl -I ${sh(url)}` : `curl -X ${shWord(method)} ${sh(url)}`]
    if (native?.kind === "aws-sigv4") {
        parts.push(`--aws-sigv4 ${sh(`aws:amz:${native.region}:${native.service}`)}`, `--user ${sh(`${native.accessKeyId}:${native.secretAccessKey}`)}`)
    } else if (native) {
        parts.push(`--${native.kind}`, `-u ${sh(`${ntlmUser(native)}:${native.password}`)}`)
    }
    Object.entries(headers).forEach(([k, v]) => parts.push(`-H ${sh(`${k}: ${v}`)}`))
    if (body.type === "form-data") {
        body.formData.forEach(item => {
            // --form-string: a text value starting with @ or < must not read a file.
            parts.push(item.valueType === "file" ? `-F ${sh(`${item.key}=@${fileName(item)}`)}` : `--form-string ${sh(`${item.key}=${item.value}`)}`)
        })
    } else if (body.content) {
        parts.push(`--data-raw ${sh(body.content)}`) // -d would read a file for a body starting with @
    }
    return head + parts.join(" \\\n  ")
}

function generateHttpie({ method, url, headers, body, native, head }: Snippet): string {
    const keyEsc = (k: string) => k.replace(/[\\:=@;]/g, "\\$&")
    const parts = ["http --ignore-stdin"]
    if (native?.kind === "digest") parts.push(`-A digest -a ${sh(`${native.username}:${native.password}`)}`)
    if (body.type === "form-data") parts.push("--multipart")
    else if (body.content) parts.push(`--raw ${sh(body.content)}`)
    parts.push(`${shWord(method)} ${sh(url)}`)
    Object.entries(headers).forEach(([k, v]) => parts.push(sh(v ? `${keyEsc(k)}:${v}` : `${keyEsc(k)};`)))
    if (body.type === "form-data") {
        body.formData.forEach(item => {
            parts.push(sh(item.valueType === "file" ? `${keyEsc(item.key)}@${fileName(item)}` : `${keyEsc(item.key)}=${item.value}`))
        })
    }
    return head + parts.join(" \\\n  ")
}

function generateWget({ method, url, headers, body, native, head }: Snippet): string {
    let pre = head
    const parts = [`wget --quiet --output-document=- --method=${shWord(method)}`]
    if (native && native.kind !== "aws-sigv4") parts.push(`--user=${sh(ntlmUser(native))}`, `--password=${sh(native.password)}`)
    Object.entries(headers).forEach(([k, v]) => parts.push(`--header=${sh(`${k}: ${v}`)}`))
    if (body.type === "form-data") {
        const fields = body.formData.map(i => (i.valueType === "file" ? `${i.key}=@${fileName(i)}` : i.key)).join(", ")
        pre += `# wget cannot send multipart/form-data (${oneLine(fields)}); use cURL or HTTPie for this request.\n`
    }
    else if (body.content) parts.push(`--body-data=${sh(body.content)}`)
    parts.push(sh(url))
    return pre + parts.join(" \\\n  ")
}

const PS_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "DELETE", "TRACE", "OPTIONS", "PATCH", "MERGE"])

function generatePowershell({ method, url, headers, body, native, head }: Snippet): string {
    const entries = Object.entries(headers)
    const contentType = entries.find(([k]) => isContentType(k))?.[1]
    const rest = entries.filter(([k]) => !isContentType(k))
    let code = head
    code += rest.length ? `$headers = @{\n${rest.map(([k, v]) => `    ${psq(k)} = ${psq(v)}`).join("\n")}\n}\n` : `$headers = @{}\n`
    const args = [`-Uri ${psq(url)}`, PS_METHODS.has(method) ? `-Method ${psq(method)}` : `-CustomMethod ${psq(method)}`, "-Headers $headers"]
    if (native && native.kind !== "aws-sigv4") {
        code += `$cred = New-Object System.Management.Automation.PSCredential(${psq(ntlmUser(native))}, (ConvertTo-SecureString ${psq(native.password)} -AsPlainText -Force))\n`
        args.push("-Credential $cred")
        if (url.startsWith("http:")) args.push("-AllowUnencryptedAuthentication")
    }
    if (body.type === "form-data") {
        const fields = body.formData.map(i =>
            `    ${psq(i.key)} = ${i.valueType === "file" ? `Get-Item -LiteralPath ${psq(fileName(i))}` : psq(i.value)}`)
        code += `$form = @{\n${fields.join("\n")}\n}\n`
        args.push("-Form $form")
    } else if (body.content) {
        code += `$body = ${psq(body.content)}\n`
        args.push("-Body $body")
        if (contentType) args.push(`-ContentType ${psq(contentType)}`)
    }
    return `${code}\n$response = Invoke-RestMethod ${args.join(" `\n  ")}\n$response`
}

// ── JavaScript / TypeScript / Python / Go ──────────────────────────────────

function jsFormData(items: RequestFormDataItem[]): string {
    let code = `const formData = new FormData()\n`
    items.forEach(item => {
        code += item.valueType === "file"
            ? `// formData.append(${dq(item.key)}, fileInput.files[0]) // ${oneLine(fileName(item))}\n`
            : `formData.append(${dq(item.key)}, ${dq(item.value)})\n`
    })
    return code
}

function generateJavascript({ method, url, headers, body, head }: Snippet): string {
    const then = `
  .then(response => response.text())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error))`
    if (body.type === "form-data") {
        return `${head}${jsFormData(body.formData)}\nfetch(${dq(url)}, {
  method: ${dq(method)},
  headers: ${JSON.stringify(headers, null, 2)},
  body: formData,
})${then}`
    }
    const opts: Record<string, unknown> = { method, headers }
    if (body.content) opts.body = body.content
    return `${head}fetch(${dq(url)}, ${JSON.stringify(opts, null, 2)})${then}`
}

function generateTypescript({ method, url, headers, body, head }: Snippet): string {
    const tail = `\nconst data: string = await response.text()\nconsole.log(data)`
    if (body.type === "form-data") {
        return `${head}${jsFormData(body.formData)}
const response = await fetch(${dq(url)}, {
  method: ${dq(method)},
  headers: ${JSON.stringify(headers, null, 2)},
  body: formData,
})${tail}`
    }
    const opts: Record<string, unknown> = { method, headers }
    if (body.content) opts.body = body.content
    return `${head}const response = await fetch(${dq(url)}, ${JSON.stringify(opts, null, 2)})${tail}`
}

function generatePython({ method, url, headers, body, head }: Snippet): string {
    let code = `${head}import requests\n\nurl = ${dq(url)}\n\n`
    code += Object.keys(headers).length > 0 ? `headers = ${JSON.stringify(headers, null, 2)}\n\n` : `headers = {}\n\n`

    if (body.type === "form-data") {
        const textFields = body.formData.filter(i => i.valueType !== "file")
        const fileFields = body.formData.filter(i => i.valueType === "file")
        if (textFields.length > 0) {
            code += `data = ${JSON.stringify(Object.fromEntries(textFields.map(i => [i.key, i.value])), null, 2)}\n\n`
        }
        if (fileFields.length > 0) {
            code += `files = {\n`
            fileFields.forEach(i => {
                code += `    ${dq(i.key)}: (${dq(fileName(i))}, open(${dq(fileName(i))}, "rb"), ${dq(i.fileType || "application/octet-stream")}),\n`
            })
            code += `}\n\n`
        }
        const dataArg = textFields.length > 0 ? ", data=data" : ""
        const filesArg = fileFields.length > 0 ? ", files=files" : ""
        code += `response = requests.request(${dq(method)}, url, headers=headers${dataArg}${filesArg})\n\n`
    } else if (body.content) {
        code += `payload = ${dq(body.content)}\n\n`
        code += `response = requests.request(${dq(method)}, url, headers=headers, data=payload)\n\n`
    } else {
        code += `response = requests.request(${dq(method)}, url, headers=headers)\n\n`
    }
    return code + `print(response.text)`
}

function generateGo({ method, url, headers, body, head }: Snippet): string {
    const isFormData = body.type === "form-data"
    const hasTextBody = body.content.length > 0
    const imports = isFormData
        ? [`"bytes"`, `"fmt"`, `"io"`, `"mime/multipart"`, `"net/http"`]
        : hasTextBody ? [`"fmt"`, `"io"`, `"net/http"`, `"strings"`] : [`"fmt"`, `"io"`, `"net/http"`]
    const check = `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`

    // JSON string escapes are a subset of Go's interpreted string literal escapes.
    let code = `${head}package main\n\nimport (\n\t${imports.join("\n\t")}\n)\n\nfunc main() {\n`
    if (isFormData) {
        code += `\n\tvar buf bytes.Buffer\n\tw := multipart.NewWriter(&buf)\n\n`
        body.formData.forEach(item => {
            if (item.valueType === "file") {
                code += `\t// fw, _ := w.CreateFormFile(${dq(item.key)}, ${dq(fileName(item))})\n`
                code += `\t// fw.Write(fileBytes) // load ${oneLine(fileName(item))} bytes here\n`
            } else {
                code += `\t_ = w.WriteField(${dq(item.key)}, ${dq(item.value)})\n`
            }
        })
        code += `\tw.Close()\n\n`
        code += `\treq, err := http.NewRequest(${dq(method)}, ${dq(url)}, &buf)\n${check}`
        code += `\treq.Header.Set("Content-Type", w.FormDataContentType())\n`
    } else if (hasTextBody) {
        code += `\n\tpayload := strings.NewReader(${dq(body.content)})\n`
        code += `\n\treq, err := http.NewRequest(${dq(method)}, ${dq(url)}, payload)\n${check}`
    } else {
        code += `\n\treq, err := http.NewRequest(${dq(method)}, ${dq(url)}, nil)\n${check}`
    }
    Object.entries(headers).forEach(([k, v]) => {
        code += `\treq.Header.Add(${dq(k)}, ${dq(v)})\n`
    })
    code += `\n\tres, err := http.DefaultClient.Do(req)\n${check}\tdefer res.Body.Close()\n\n`
    code += `\tbody, err := io.ReadAll(res.Body)\n${check}\tfmt.Println(string(body))\n}`
    return code
}

// ── JVM / .NET ─────────────────────────────────────────────────────────────

function generateJava({ method, url, headers, body, head }: Snippet): string {
    const hdrs = { ...headers }
    let pre = ""
    let publisher = "HttpRequest.BodyPublishers.noBody()"
    if (body.type === "form-data") {
        const mp = multipartText(body.formData)
        hdrs["Content-Type"] = mp.contentType
        publisher = `HttpRequest.BodyPublishers.ofString(${dq(mp.body)})`
        body.formData.filter(i => i.valueType === "file").forEach(i => {
            pre += `        // file part ${oneLine(i.key)} (${oneLine(fileName(i))}) not included: java.net.http has no multipart builder\n`
        })
    } else if (body.content) {
        publisher = `HttpRequest.BodyPublishers.ofString(${dq(body.content)})`
    }
    const headerLines = Object.entries(hdrs).map(([k, v]) => `\n                .header(${dq(k)}, ${dq(v)})`).join("")
    return `${head}import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class Main {
    public static void main(String[] args) throws Exception {
${pre}        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(${dq(url)}))${headerLines}
                .method(${dq(method)}, ${publisher})
                .build();
        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println(response.body());
    }
}`
}

function generateKotlin({ method, url, headers, body, head }: Snippet): string {
    const kt = dqNoTemplate
    const entries = Object.entries(headers)
    const contentType = entries.find(([k]) => isContentType(k))?.[1]
    const imports = new Set(["okhttp3.OkHttpClient", "okhttp3.Request"])
    let bodyExpr: string
    if (body.type === "form-data") {
        imports.add("okhttp3.MultipartBody")
        bodyExpr = "MultipartBody.Builder()\n        .setType(MultipartBody.FORM)"
        body.formData.forEach(i => {
            bodyExpr += i.valueType === "file"
                ? `\n        // .addFormDataPart(${kt(i.key)}, ${kt(fileName(i))}, File(${kt(fileName(i))}).asRequestBody())`
                : `\n        .addFormDataPart(${kt(i.key)}, ${kt(i.value)})`
        })
        bodyExpr += "\n        .build()"
    } else if (body.content) {
        imports.add("okhttp3.RequestBody.Companion.toRequestBody")
        if (contentType) imports.add("okhttp3.MediaType.Companion.toMediaType")
        bodyExpr = `${kt(body.content)}.toRequestBody(${contentType ? `${kt(contentType)}.toMediaType()` : ""})`
    } else if (method === "GET" || method === "HEAD") {
        bodyExpr = "null"
    } else {
        imports.add("okhttp3.RequestBody.Companion.toRequestBody")
        bodyExpr = "ByteArray(0).toRequestBody()"
    }
    // OkHttp derives Content-Type from the body's media type.
    const headerLines = entries.filter(([k]) => !isContentType(k)).map(([k, v]) => `\n        .addHeader(${kt(k)}, ${kt(v)})`).join("")
    return `${head}${[...imports].sort().map(i => `import ${i}`).join("\n")}

fun main() {
    val client = OkHttpClient()
    val body = ${bodyExpr}
    val request = Request.Builder()
        .url(${kt(url)})
        .method(${kt(method)}, body)${headerLines}
        .build()
    client.newCall(request).execute().use { response ->
        println(response.body?.string())
    }
}`
}

function generateCsharp({ method, url, headers, body, native, head }: Snippet): string {
    const entries = Object.entries(headers)
    const contentType = entries.find(([k]) => isContentType(k))?.[1]
    let code = head
    if (native && native.kind !== "aws-sigv4") {
        const domain = native.kind === "ntlm" && native.domain ? `, ${dq(native.domain)}` : ""
        code += `using System.Net;\n\nvar handler = new HttpClientHandler { Credentials = new NetworkCredential(${dq(native.username)}, ${dq(native.password)}${domain}) };\nusing var client = new HttpClient(handler);\n`
    } else {
        code += `using var client = new HttpClient();\n`
    }
    code += `var request = new HttpRequestMessage(new HttpMethod(${dq(method)}), ${dq(url)});\n`
    entries.filter(([k]) => !isContentType(k)).forEach(([k, v]) => {
        code += `request.Headers.TryAddWithoutValidation(${dq(k)}, ${dq(v)});\n`
    })
    if (body.type === "form-data") {
        code += `var form = new MultipartFormDataContent();\n`
        body.formData.forEach(i => {
            code += i.valueType === "file"
                ? `// form.Add(new StreamContent(File.OpenRead(${dq(fileName(i))})), ${dq(i.key)}, ${dq(fileName(i))});\n`
                : `form.Add(new StringContent(${dq(i.value)}), ${dq(i.key)});\n`
        })
        code += `request.Content = form;\n`
    } else if (body.content) {
        code += `request.Content = new StringContent(${dq(body.content)});\n`
        if (contentType) {
            // Set raw: StringContent's mediaType overload rejects parameters like "; charset=utf-8".
            code += `request.Content.Headers.Remove("Content-Type");\nrequest.Content.Headers.TryAddWithoutValidation("Content-Type", ${dq(contentType)});\n`
        }
    }
    code += `\nvar response = await client.SendAsync(request);\nConsole.WriteLine(await response.Content.ReadAsStringAsync());`
    return code
}

// ── PHP / Ruby ─────────────────────────────────────────────────────────────

function generatePhp({ method, url, headers, body, native, head }: Snippet): string {
    const opts = [`CURLOPT_URL => ${sq(url)}`, `CURLOPT_RETURNTRANSFER => true`, `CURLOPT_CUSTOMREQUEST => ${sq(method)}`]
    if (method === "HEAD") opts.push(`CURLOPT_NOBODY => true`)
    if (native && native.kind !== "aws-sigv4") {
        opts.push(`CURLOPT_HTTPAUTH => ${native.kind === "digest" ? "CURLAUTH_DIGEST" : "CURLAUTH_NTLM"}`, `CURLOPT_USERPWD => ${sq(`${ntlmUser(native)}:${native.password}`)}`)
    }
    const hdrs = Object.entries(headers)
    if (hdrs.length) opts.push(`CURLOPT_HTTPHEADER => [\n${hdrs.map(([k, v]) => `        ${sq(`${k}: ${v}`)},`).join("\n")}\n    ]`)
    if (body.type === "form-data") {
        const fields = body.formData.map(i =>
            `        ${sq(i.key)} => ${i.valueType === "file" ? `new CURLFile(${sq(fileName(i))})` : sq(i.value)},`)
        opts.push(`CURLOPT_POSTFIELDS => [\n${fields.join("\n")}\n    ]`)
    } else if (body.content) {
        opts.push(`CURLOPT_POSTFIELDS => ${sq(body.content)}`)
    }
    return `<?php\n${head}
$ch = curl_init();
curl_setopt_array($ch, [
${opts.map(o => `    ${o},`).join("\n")}
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`
}

function generateRuby({ method, url, headers, body, head }: Snippet): string {
    const hasBody = body.type === "form-data" || body.content.length > 0
    let code = `${head}require 'net/http'
require 'uri'

uri = URI(${sq(url)})
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == 'https'

request = Net::HTTPGenericRequest.new(${sq(method)}, ${hasBody}, ${method !== "HEAD"}, uri.request_uri)
`
    Object.entries(headers).forEach(([k, v]) => {
        code += `request[${sq(k)}] = ${sq(v)}\n`
    })
    if (body.type === "form-data") {
        const fields = body.formData.map(i =>
            i.valueType === "file" ? `  [${sq(i.key)}, File.open(${sq(fileName(i))})],` : `  [${sq(i.key)}, ${sq(i.value)}],`)
        code += `request.set_form([\n${fields.join("\n")}\n], 'multipart/form-data')\n`
    } else if (body.content) {
        code += `request.body = ${sq(body.content)}\n`
    }
    return code + `\nresponse = http.request(request)\nputs response.body`
}

// ── Swift / Rust / Dart ────────────────────────────────────────────────────

function generateSwift({ method, url, headers, body, head }: Snippet): string {
    const hdrs = { ...headers }
    let bodyLine = ""
    let pre = ""
    if (body.type === "form-data") {
        const mp = multipartText(body.formData)
        hdrs["Content-Type"] = mp.contentType
        bodyLine = `request.httpBody = Data(${braceQuote(mp.body)}.utf8)\n`
        body.formData.filter(i => i.valueType === "file").forEach(i => {
            pre += `// file part ${oneLine(i.key)} (${oneLine(fileName(i))}) not included: append its bytes to httpBody\n`
        })
    } else if (body.content) {
        bodyLine = `request.httpBody = Data(${braceQuote(body.content)}.utf8)\n`
    }
    const headerLines = Object.entries(hdrs).map(([k, v]) => `request.setValue(${braceQuote(v)}, forHTTPHeaderField: ${braceQuote(k)})\n`).join("")
    return `${head}import Foundation

${pre}var request = URLRequest(url: URL(string: ${braceQuote(url)})!)
request.httpMethod = ${braceQuote(method)}
${headerLines}${bodyLine}
let (data, _) = try await URLSession.shared.data(for: request)
print(String(decoding: data, as: UTF8.self))`
}

function generateRust({ method, url, headers, body, head }: Snippet): string {
    const rs = braceQuote
    let pre = ""
    let bodyLine = ""
    if (body.type === "form-data") {
        pre = `    let form = reqwest::blocking::multipart::Form::new()`
        body.formData.filter(i => i.valueType !== "file").forEach(i => {
            pre += `\n        .text(${rs(i.key)}, ${rs(i.value)})`
        })
        pre += ";\n"
        body.formData.filter(i => i.valueType === "file").forEach(i => {
            pre += `    // let form = form.file(${rs(i.key)}, ${rs(fileName(i))})?;\n`
        })
        bodyLine = `\n        .multipart(form)`
    } else if (body.content) {
        bodyLine = `\n        .body(${rs(body.content)})`
    }
    const headerLines = Object.entries(headers).map(([k, v]) => `\n        .header(${rs(k)}, ${rs(v)})`).join("")
    return `${head}// Cargo.toml: reqwest = { version = "0.12", features = ["blocking"${body.type === "form-data" ? `, "multipart"` : ""}] }
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::blocking::Client::new();
${pre}    let response = client
        .request(reqwest::Method::from_bytes(${rs(method)}.as_bytes())?, ${rs(url)})${headerLines}${bodyLine}
        .send()?;
    println!("{}", response.text()?);
    Ok(())
}`
}

function generateDart({ method, url, headers, body, head }: Snippet): string {
    const dt = dqNoTemplate
    const isForm = body.type === "form-data"
    let code = `${head}import 'package:http/http.dart' as http;

Future<void> main() async {
  final request = http.${isForm ? "MultipartRequest" : "Request"}(${dt(method)}, Uri.parse(${dt(url)}));
`
    const hdrs = Object.entries(headers)
    if (hdrs.length) code += `  request.headers.addAll({\n${hdrs.map(([k, v]) => `    ${dt(k)}: ${dt(v)},`).join("\n")}\n  });\n`
    if (isForm) {
        body.formData.forEach(i => {
            code += i.valueType === "file"
                ? `  request.files.add(await http.MultipartFile.fromPath(${dt(i.key)}, ${dt(fileName(i))}));\n`
                : `  request.fields[${dt(i.key)}] = ${dt(i.value)};\n`
        })
    } else if (body.content) {
        code += `  request.body = ${dt(body.content)};\n`
    }
    return code + `  final response = await http.Response.fromStream(await request.send());
  print(response.body);
}`
}
