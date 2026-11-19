import { generateCode, CODE_LANGUAGES, type CodeLanguage } from "../generate-code"
import type { ApiRequestState } from "../types"

function gqlRequest(graphqlVariables?: string): ApiRequestState {
    return {
        method: "POST",
        url: "https://api.example.com/graphql",
        headers: [],
        params: [],
        auth: { type: "none" },
        body: { type: "graphql", content: "query { me { id } }", graphqlVariables },
    } as unknown as ApiRequestState
}

describe("generateCode graphql body", () => {
    it("serialises query + variables as JSON with application/json", () => {
        const curl = generateCode(gqlRequest('{"id": 1}'), "curl")
        expect(curl).toContain('"query":"query { me { id } }"')
        expect(curl).toContain('"variables":{"id":1}')
        expect(curl).toContain("Content-Type: application/json")
    })

    it("emits query-only payload when variables missing or invalid", () => {
        for (const vars of [undefined, "not json"]) {
            const curl = generateCode(gqlRequest(vars), "curl")
            expect(curl).toContain('{"query":"query { me { id } }"}')
            expect(curl).not.toContain('"variables"')
        }
    })
})

function req(over: Record<string, unknown> = {}): ApiRequestState {
    return {
        method: "POST",
        url: "https://api.example.com/items",
        headers: [],
        params: [],
        auth: { type: "none" },
        body: { type: "none", content: "" },
        ...over,
    } as unknown as ApiRequestState
}

const LANGS = CODE_LANGUAGES.map(([l]) => l)

// Quote, double quote, $ (shell/Kotlin/Dart/PHP interpolation), backslash, newline.
const TRICKY = `a'b"c$d\\e\nf`
const ESCAPED: Record<CodeLanguage, string> = {
    curl: `'a'\\''b"c$d\\e\nf'`,
    httpie: `'a'\\''b"c$d\\e\nf'`,
    wget: `'a'\\''b"c$d\\e\nf'`,
    powershell: `'a''b"c$d\\e\nf'`,
    javascript: `"a'b\\"c$d\\\\e\\nf"`,
    typescript: `"a'b\\"c$d\\\\e\\nf"`,
    python: `"a'b\\"c$d\\\\e\\nf"`,
    go: `"a'b\\"c$d\\\\e\\nf"`,
    java: `"a'b\\"c$d\\\\e\\nf"`,
    csharp: `"a'b\\"c$d\\\\e\\nf"`,
    kotlin: `"a'b\\"c\\$d\\\\e\\nf"`,
    dart: `"a'b\\"c\\$d\\\\e\\nf"`,
    php: `'a\\'b"c$d\\\\e\nf'`,
    ruby: `'a\\'b"c$d\\\\e\nf'`,
    swift: `"a'b\\"c$d\\\\e\\nf"`,
    rust: `"a'b\\"c$d\\\\e\\nf"`,
}

describe("generateCode escaping, every language", () => {
    it.each(LANGS)("%s escapes the body literal", (lang) => {
        const code = generateCode(req({ body: { type: "text", content: TRICKY } }), lang)
        expect(code).toContain(ESCAPED[lang])
    })

    it.each(LANGS)("%s escapes header values the same way", (lang) => {
        const code = generateCode(req({ headers: [{ id: "1", key: "X-Note", value: TRICKY, active: true }] }), lang)
        // Shell / PHP clients put "Name: value" in one literal; check the value's escaped tail.
        expect(code).toContain(ESCAPED[lang].slice(2))
    })

    it.each(LANGS)("%s emits form-data and no-body requests", (lang) => {
        const form = generateCode(req({
            body: { type: "form-data", content: "", formData: [
                { id: "1", key: "note", value: "hi", active: true, valueType: "text" },
                { id: "2", key: "doc", value: "", active: true, valueType: "file", fileName: "a.pdf" },
            ] },
        }), lang)
        expect(form).toContain("note")
        expect(form).toContain("a.pdf")
        expect(generateCode(req({ method: "GET" }), lang)).toContain("api.example.com/items")
    })

    it("Swift / Rust use \\u{..} for control characters, not \\b or \\u0001", () => {
        for (const lang of ["swift", "rust"] as const) {
            const code = generateCode(req({ body: { type: "text", content: "x\u0001\by" } }), lang)
            expect(code).toContain(`"x\\u{1}\\u{8}y"`)
        }
    })

    it("curl uses --data-raw and --form-string so @ never reads a file", () => {
        expect(generateCode(req({ body: { type: "text", content: "@/etc/passwd" } }), "curl")).toContain("--data-raw '@/etc/passwd'")
        const form = generateCode(req({ body: { type: "form-data", content: "", formData: [
            { id: "1", key: "k", value: "@x", active: true, valueType: "text" },
        ] } }), "curl")
        expect(form).toContain("--form-string 'k=@x'")
    })
})

describe("generateCode auth", () => {
    const digest = { type: "digest", digest: { username: "alice", password: "s3cret", realm: "", nonce: "" } }
    const ntlm = { type: "ntlm", ntlm: { username: "bob", password: "pw", domain: "CORP" } }
    const aws = { type: "aws-sigv4", awsSigV4: { accessKeyId: "AK", secretAccessKey: "SK", sessionToken: "ST", region: "us-east-1", service: "s3" } }

    it("uses native client support where it exists", () => {
        expect(generateCode(req({ auth: digest }), "curl")).toContain("--digest \\\n  -u 'alice:s3cret'")
        expect(generateCode(req({ auth: ntlm }), "curl")).toContain("--ntlm \\\n  -u 'CORP\\bob:pw'")
        const awsCurl = generateCode(req({ auth: aws }), "curl")
        expect(awsCurl).toContain("--aws-sigv4 'aws:amz:us-east-1:s3'")
        expect(awsCurl).toContain("--user 'AK:SK'")
        expect(awsCurl).toContain("X-Amz-Security-Token: ST")
        expect(generateCode(req({ auth: digest }), "httpie")).toContain("-A digest -a 'alice:s3cret'")
        expect(generateCode(req({ auth: ntlm }), "wget")).toContain("--user='CORP\\bob'")
        expect(generateCode(req({ auth: ntlm }), "powershell")).toContain("-Credential $cred")
        expect(generateCode(req({ auth: ntlm }), "csharp")).toContain('new NetworkCredential("bob", "pw", "CORP")')
        expect(generateCode(req({ auth: digest }), "php")).toContain("CURLAUTH_DIGEST")
        for (const lang of ["curl", "powershell", "csharp"] as const) {
            expect(generateCode(req({ auth: digest }), lang)).not.toContain("<computed")
        }
    })

    it("falls back to a commented Authorization placeholder", () => {
        const py = generateCode(req({ auth: digest }), "python")
        expect(py.startsWith("# Digest auth")).toBe(true)
        expect(py).toContain(`"Authorization": "Digest <computed`)
        expect(generateCode(req({ auth: aws }), "go")).toMatch(/^\/\/ AWS Signature v4 \(us-east-1\/s3\)/)
        expect(generateCode(req({ auth: { type: "hawk", hawk: { id: "h1", key: "k" } } }), "java")).toContain('Hawk id=\\"h1\\"')
        expect(generateCode(req({ auth: { type: "jwt-bearer", jwtBearer: { algorithm: "HS256" } } }), "ruby")).toContain("Bearer <JWT signed with HS256>")
        expect(generateCode(req({ auth: aws }), "php").startsWith("<?php\n// AWS Signature v4")).toBe(true)
    })

    it("emits ready tokens as plain headers", () => {
        expect(generateCode(req({ auth: { type: "oauth2", oauth2: { accessToken: "tok", tokenType: "Bearer" } } }), "rust"))
            .toContain(`.header("Authorization", "Bearer tok")`)
        expect(generateCode(req({ auth: { type: "spnego", spnego: { token: "YII=" } } }), "dart"))
            .toContain(`"Authorization": "Negotiate YII="`)
        const noToken = generateCode(req({ auth: { type: "oauth2", oauth2: {} } }), "kotlin")
        expect(noToken).toContain("// OAuth 2.0")
        expect(noToken).toContain(`"Bearer <access token>"`)
    })
})
