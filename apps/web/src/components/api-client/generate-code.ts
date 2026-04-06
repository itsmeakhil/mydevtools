import { ApiRequestState } from "./types"

export type CodeLanguage = "curl" | "javascript" | "python" | "go"

export function generateCode(request: ApiRequestState, language: CodeLanguage): string {
    const { method, url, headers, params, body, auth } = request

    // Construct full URL with params
    let fullUrl = url
    try {
        let urlObj: URL
        try {
            urlObj = new URL(url || "http://localhost")
        } catch {
            // Try prepending scheme if missing
            urlObj = new URL("http://" + url)
        }

        params.forEach(p => {
            if (p.active && p.key) {
                urlObj.searchParams.append(p.key, p.value)
            }
        })
        fullUrl = urlObj.toString()
    } catch {
        // Fallback for when URL cannot be parsed (e.g. contains variables in protocol)
        // Manual construction
        const queryString = params
            .filter(p => p.active && p.key)
            .map(p => `${p.key}=${p.value}`)
            .join("&")

        if (queryString) {
            fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString
        }
    }

    // Construct headers
    const headerObj: Record<string, string> = {}
    headers.forEach(h => {
        if (h.active && h.key) {
            headerObj[h.key] = h.value
        }
    })

    // Add Auth
    if (auth.type === "bearer" && auth.token) {
        headerObj["Authorization"] = `Bearer ${auth.token}`
    } else if (auth.type === "basic" && auth.username && auth.password) {
        const credentials = btoa(`${auth.username}:${auth.password}`)
        headerObj["Authorization"] = `Basic ${credentials}`
    }

    // Body
    let bodyContent = ""
    if (method !== "GET" && method !== "HEAD" && body.type !== "none") {
        bodyContent = body.content
        if (body.type === "json" && !headerObj["Content-Type"]) {
            headerObj["Content-Type"] = "application/json"
        } else if (!headerObj["Content-Type"]) {
            headerObj["Content-Type"] = "text/plain"
        }
    }

    switch (language) {
        case "curl":
            return generateCurl(method, fullUrl, headerObj, bodyContent)
        case "javascript":
            return generateJavascript(method, fullUrl, headerObj, bodyContent)
        case "python":
            return generatePython(method, fullUrl, headerObj, bodyContent)
        case "go":
            return generateGo(method, fullUrl, headerObj, bodyContent)
        default:
            return ""
    }
}

function generateCurl(method: string, url: string, headers: Record<string, string>, body: string): string {
    let curl = `curl -X ${method} '${url}'`

    Object.entries(headers).forEach(([key, value]) => {
        curl += ` \\\n  -H '${key}: ${value}'`
    })

    if (body) {
        // Escape single quotes in body
        const escapedBody = body.replace(/'/g, "'\\''")
        curl += ` \\\n  -d '${escapedBody}'`
    }

    return curl
}

function generateJavascript(method: string, url: string, headers: Record<string, string>, body: string): string {
    const options: any = {
        method,
        headers
    }

    if (body) {
        options.body = body
    }

    return `fetch('${url}', ${JSON.stringify(options, null, 2)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
}

function generatePython(method: string, url: string, headers: Record<string, string>, body: string): string {
    let code = `import requests\n\nurl = "${url}"\n\n`

    if (Object.keys(headers).length > 0) {
        code += `headers = ${JSON.stringify(headers, null, 2)}\n\n`
    } else {
        code += `headers = {}\n\n`
    }

    if (body) {
        code += `payload = ${JSON.stringify(body)}\n\n`
        code += `response = requests.request("${method}", url, headers=headers, data=payload)\n\n`
    } else {
        code += `response = requests.request("${method}", url, headers=headers)\n\n`
    }

    code += `print(response.text)`
    return code
}

function generateGo(method: string, url: string, headers: Record<string, string>, body: string): string {
    let code = `package main

import (
\t"fmt"
\t"io/ioutil"
\t"net/http"
\t"strings"
)

func main() {

\turl := "${url}"
\tmethod := "${method}"
`

    if (body) {
        // Escape double quotes
        const escapedBody = body.replace(/"/g, '\\"')
        code += `\n\tpayload := strings.NewReader("${escapedBody}")\n`
        code += `\n\tclient := &http.Client {}\n`
        code += `\treq, err := http.NewRequest(method, url, payload)\n`
    } else {
        code += `\n\tclient := &http.Client {}\n`
        code += `\treq, err := http.NewRequest(method, url, nil)\n`
    }

    code += `\n\tif err != nil {
\t\tfmt.Println(err)
\t\treturn
\t}
`

    Object.entries(headers).forEach(([key, value]) => {
        code += `\treq.Header.Add("${key}", "${value}")\n`
    })

    code += `\n\tres, err := client.Do(req)
\tif err != nil {
\t\tfmt.Println(err)
\t\treturn
\t}
\tdefer res.Body.Close()

\tbody, err := ioutil.ReadAll(res.Body)
\tif err != nil {
\t\tfmt.Println(err)
\t\treturn
\t}
\tfmt.Println(string(body))
}`

    return code
}
