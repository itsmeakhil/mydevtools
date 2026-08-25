import { encodeBasicCredentials } from "@/lib/basic-auth"
import { ensureHttpScheme } from "@/lib/url-normalize"
import { ApiRequestState, RequestFormDataItem } from "./types"

/** POSIX shell single-quoted literal — close, escape every embedded apostrophe, reopen. */
function shSingleQuote(s: string): string {
    return `'${s.replace(/'/g, "'\\''")}'`
}

export type CodeLanguage = "curl" | "javascript" | "typescript" | "python" | "go"

interface BodyContext {
    type: "none" | "json" | "text" | "form-data" | "x-www-form-urlencoded"
    content: string
    formData: RequestFormDataItem[]
}

export function generateCode(request: ApiRequestState, language: CodeLanguage): string {
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

    // Build headers
    const headerObj: Record<string, string> = {}
    headers.forEach(h => {
        if (h.active && h.key) headerObj[h.key] = h.value
    })

    // Auth
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
        } else {
            bodyCtx.type = "text"
            bodyCtx.content = body.content
            if (!hasContentType) headerObj["Content-Type"] = "text/plain"
        }
    }

    switch (language) {
        case "curl":       return generateCurl(method, fullUrl, headerObj, bodyCtx)
        case "javascript": return generateJavascript(method, fullUrl, headerObj, bodyCtx)
        case "typescript": return generateTypescript(method, fullUrl, headerObj, bodyCtx)
        case "python":     return generatePython(method, fullUrl, headerObj, bodyCtx)
        case "go":         return generateGo(method, fullUrl, headerObj, bodyCtx)
        default:           return ""
    }
}

function generateCurl(method: string, url: string, headers: Record<string, string>, body: BodyContext): string {
    let curl = `curl -X ${method} ${shSingleQuote(url)}`
    Object.entries(headers).forEach(([k, v]) => {
        curl += ` \\\n  -H ${shSingleQuote(`${k}: ${v}`)}`
    })
    if (body.type === "form-data") {
        body.formData.forEach(item => {
            if (item.valueType === "file") {
                curl += ` \\\n  -F ${shSingleQuote(`${item.key}=@${item.fileName || "file.bin"}`)}`
            } else {
                curl += ` \\\n  -F ${shSingleQuote(`${item.key}=${item.value}`)}`
            }
        })
    } else if (body.content) {
        curl += ` \\\n  -d ${shSingleQuote(body.content)}`
    }
    return curl
}

function buildFetchOptions(method: string, headers: Record<string, string>, bodyContent?: string): string {
    const opts: Record<string, unknown> = { method, headers }
    if (bodyContent !== undefined) opts.body = bodyContent
    return JSON.stringify(opts, null, 2)
}

function generateJavascript(method: string, url: string, headers: Record<string, string>, body: BodyContext): string {
    if (body.type === "form-data") {
        let code = `const formData = new FormData()\n`
        body.formData.forEach(item => {
            if (item.valueType === "file") {
                code += `// formData.append('${item.key}', fileInput.files[0]) // "${item.fileName || "file"}"\n`
            } else {
                code += `formData.append('${item.key}', '${item.value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')\n`
            }
        })
        code += `\nfetch('${url}', {
  method: '${method}',
  headers: ${JSON.stringify(headers, null, 2)},
  body: formData,
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error))`
        return code
    }

    return `fetch('${url}', ${buildFetchOptions(method, headers, body.content || undefined)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error))`
}

function generateTypescript(method: string, url: string, headers: Record<string, string>, body: BodyContext): string {
    if (body.type === "form-data") {
        let code = `const formData = new FormData()\n`
        body.formData.forEach(item => {
            if (item.valueType === "file") {
                code += `// formData.append('${item.key}', fileInput.files[0]) // "${item.fileName || "file"}"\n`
            } else {
                code += `formData.append('${item.key}', '${item.value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')\n`
            }
        })
        code += `
const response = await fetch('${url}', {
  method: '${method}',
  headers: ${JSON.stringify(headers, null, 2)},
  body: formData,
})
const data: unknown = await response.json()
console.log(data)`
        return code
    }

    const opts: Record<string, unknown> = { method, headers }
    if (body.content) opts.body = body.content
    return `const response = await fetch('${url}', ${JSON.stringify(opts, null, 2)})
const data: unknown = await response.json()
console.log(data)`
}

function generatePython(method: string, url: string, headers: Record<string, string>, body: BodyContext): string {
    let code = `import requests\n\nurl = "${url}"\n\n`

    code += Object.keys(headers).length > 0
        ? `headers = ${JSON.stringify(headers, null, 2)}\n\n`
        : `headers = {}\n\n`

    if (body.type === "form-data") {
        const textFields = body.formData.filter(i => i.valueType !== "file")
        const fileFields = body.formData.filter(i => i.valueType === "file")
        if (textFields.length > 0) {
            code += `data = ${JSON.stringify(Object.fromEntries(textFields.map(i => [i.key, i.value])), null, 2)}\n\n`
        }
        if (fileFields.length > 0) {
            code += `# files = {\n`
            fileFields.forEach(i => {
                code += `#     '${i.key}': ('${i.fileName || "file.bin"}', open('path/to/${i.fileName || "file.bin"}', 'rb'), '${i.fileType || "application/octet-stream"}'),\n`
            })
            code += `# }\n\n`
        }
        const dataArg = textFields.length > 0 ? ", data=data" : ""
        const filesArg = fileFields.length > 0 ? ", files=files" : ""
        code += `response = requests.request("${method}", url, headers=headers${dataArg}${filesArg})\n\n`
    } else if (body.content) {
        code += `payload = ${JSON.stringify(body.content)}\n\n`
        code += `response = requests.request("${method}", url, headers=headers, data=payload)\n\n`
    } else {
        code += `response = requests.request("${method}", url, headers=headers)\n\n`
    }

    code += `print(response.text)`
    return code
}

function generateGo(method: string, url: string, headers: Record<string, string>, body: BodyContext): string {
    const isFormData = body.type === "form-data"
    const hasTextBody = body.content.length > 0

    let imports: string[]
    if (isFormData) {
        imports = [`"bytes"`, `"fmt"`, `"io"`, `"mime/multipart"`, `"net/http"`]
    } else if (hasTextBody) {
        imports = [`"fmt"`, `"io"`, `"net/http"`, `"strings"`]
    } else {
        imports = [`"fmt"`, `"io"`, `"net/http"`]
    }

    let code = `package main\n\nimport (\n\t${imports.join("\n\t")}\n)\n\nfunc main() {\n`

    if (isFormData) {
        code += `\n\tvar buf bytes.Buffer\n\tw := multipart.NewWriter(&buf)\n\n`
        body.formData.forEach(item => {
            if (item.valueType === "file") {
                code += `\t// fw, _ := w.CreateFormFile("${item.key}", "${item.fileName || "file.bin"}")\n`
                code += `\t// fw.Write(fileBytes) // load "${item.fileName || "file.bin"}" bytes here\n`
            } else {
                code += `\t_ = w.WriteField("${item.key}", "${item.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")\n`
            }
        })
        code += `\tw.Close()\n\n`
        code += `\treq, err := http.NewRequest("${method}", "${url}", &buf)\n`
        code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`
        code += `\treq.Header.Set("Content-Type", w.FormDataContentType())\n`
    } else if (hasTextBody) {
        // Cover the full Go double-quoted string escape set, not just `\` `"` `\n`.
        // Missing `\r`, `\t`, NUL, and `\b` previously corrupted bodies (CRLF JSON, TSV, etc.).
        const escaped = body.content
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t")
            .replace(/\f/g, "\\f")
            .replace(/\v/g, "\\v")
            .replace(/\0/g, "\\x00")
        code += `\n\tpayload := strings.NewReader("${escaped}")\n`
        code += `\n\treq, err := http.NewRequest("${method}", "${url}", payload)\n`
        code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`
    } else {
        code += `\n\treq, err := http.NewRequest("${method}", "${url}", nil)\n`
        code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`
    }

    Object.entries(headers).forEach(([k, v]) => {
        code += `\treq.Header.Add("${k}", "${v}")\n`
    })

    code += `\n\tclient := &http.Client{}\n`
    code += `\tres, err := client.Do(req)\n`
    code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`
    code += `\tdefer res.Body.Close()\n\n`
    code += `\tbody, err := io.ReadAll(res.Body)\n`
    code += `\tif err != nil {\n\t\tfmt.Println(err)\n\t\treturn\n\t}\n`
    code += `\tfmt.Println(string(body))\n}`

    return code
}
