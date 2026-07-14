import { ApiRequestState, RequestMethod } from "@/components/api-client/types"

export function parseCurlCommand(curlCommand: string): Partial<ApiRequestState> {
    const result: Partial<ApiRequestState> = {
        method: "GET",
        headers: [],
        params: [],
        body: { type: "none", content: "" },
        auth: { type: "none" },
    }

    if (!curlCommand.trim().startsWith("curl")) {
        throw new Error("Not a curl command")
    }

    const args = tokenize(curlCommand)

    // Remove 'curl'
    if (args[0] === "curl") {
        args.shift()
    }

    let urlFound = false

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        if (arg.startsWith("-")) {
            // Handle flags
            if (arg === "-X" || arg === "--request") {
                if (i + 1 < args.length) {
                    result.method = args[++i].toUpperCase() as RequestMethod
                }
            } else if (arg.startsWith("-X")) {
                result.method = arg.substring(2).toUpperCase() as RequestMethod
            } else if (arg === "-H" || arg === "--header") {
                if (i + 1 < args.length) {
                    parseHeader(args[++i], result)
                }
            } else if (arg.startsWith("-H")) {
                parseHeader(arg.substring(2), result)
            } else if (arg === "-d" || arg === "--data" || arg === "--data-raw" || arg === "--data-binary" || arg === "--data-ascii") {
                if (i + 1 < args.length) {
                    parseBody(args[++i], result)
                }
            } else if (arg.startsWith("-d")) {
                parseBody(arg.substring(2), result)
            } else if (arg === "-u" || arg === "--user") {
                if (i + 1 < args.length) {
                    parseAuth(args[++i], result)
                }
            } else if (arg.startsWith("-u")) {
                parseAuth(arg.substring(2), result)
            } else if (arg === "--url") {
                if (i + 1 < args.length) {
                    parseUrl(args[++i], result)
                    urlFound = true
                }
            }
            // Ignore unknown flags
        } else if (!urlFound) {
            // Assume it's the URL if it looks like one or if we haven't found one yet and it's not a flag
            parseUrl(arg, result)
            urlFound = result.url !== undefined
        }
    }

    // Check for Bearer token in headers
    const authHeader = result.headers?.find(h => h.key.toLowerCase() === "authorization")
    if (authHeader && authHeader.value.startsWith("Bearer ")) {
        result.auth = {
            type: "bearer",
            token: authHeader.value.replace("Bearer ", ""),
        }
        result.headers = result.headers?.filter(h => h.id !== authHeader.id)
    }

    return result
}

function parseHeader(header: string, result: Partial<ApiRequestState>) {
    const colonIndex = header.indexOf(":")
    if (colonIndex !== -1) {
        const key = header.substring(0, colonIndex).trim()
        const value = header.substring(colonIndex + 1).trim()
        result.headers?.push({
            id: crypto.randomUUID(),
            key,
            value,
            active: true
        })
    }
}

function parseBody(data: string, result: Partial<ApiRequestState>) {
    // If we already have body content, append it (curl concatenates multiple -d)
    if (result.body?.type !== "none" && result.body?.content) {
        result.body.content += "&" + data
    } else {
        // Try to detect JSON
        try {
            JSON.parse(data)
            result.body = { type: "json", content: data }
        } catch {
            result.body = { type: "text", content: data }
        }
    }

    if (result.method === "GET") {
        result.method = "POST"
    }
}

function parseAuth(credentials: string, result: Partial<ApiRequestState>) {
    const [username, password] = credentials.split(":")
    result.auth = {
        type: "basic",
        username,
        password: password || ""
    }
}

function parseUrl(urlArg: string, result: Partial<ApiRequestState>) {
    let url = urlArg
    // Remove quotes if present (tokenizer handles this, but just in case)
    if ((url.startsWith("'") && url.endsWith("'")) || (url.startsWith('"') && url.endsWith('"'))) {
        url = url.substring(1, url.length - 1)
    }

    if (url.includes("://") || url.includes("localhost")) {
        if (url.includes("?")) {
            const [baseUrl, queryString] = url.split("?")
            result.url = baseUrl
            const params = new URLSearchParams(queryString)
            params.forEach((value, key) => {
                result.params?.push({
                    id: crypto.randomUUID(),
                    key,
                    value,
                    active: true,
                })
            })
        } else {
            result.url = url
        }
    }
}


function tokenize(str: string): string[] {
    const tokens: string[] = []
    let currentToken = ""
    let inSingleQuote = false
    let inDoubleQuote = false
    let escaped = false

    for (let i = 0; i < str.length; i++) {
        const char = str[i]

        if (escaped) {
            currentToken += char
            escaped = false
            continue
        }

        if (char === "\\") {
            if (inSingleQuote) {
                // Backslash in single quotes is literal
                currentToken += char
            } else {
                // Check for line continuation
                if (i + 1 < str.length && str[i + 1] === '\n') {
                    i++ // Skip newline
                    continue
                }
                if (i + 2 < str.length && str[i + 1] === '\r' && str[i + 2] === '\n') {
                    i += 2 // Skip \r\n
                    continue
                }
                escaped = true
            }
            continue
        }

        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote
            continue
        }

        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote
            continue
        }

        if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
            if (currentToken.length > 0) {
                tokens.push(currentToken)
                currentToken = ""
            }
        } else {
            currentToken += char
        }
    }

    if (currentToken.length > 0) {
        tokens.push(currentToken)
    }

    return tokens
}
