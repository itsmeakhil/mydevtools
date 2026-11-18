import { exportCollectionDocsHtml, maskUrl } from "../docs-html"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

const kv = (key: string, value: string) => ({ id: `kv-${key}`, key, value, active: true })

const req = (over: Partial<CollectionRequest> = {}): CollectionRequest => ({
    id: "r1", name: "Get user", method: "GET", url: "https://api.test/users/1",
    params: [], headers: [], body: { type: "none", content: "" }, auth: { type: "inherit" }, ...over,
})

const SECRETS = ["BEARER-LIT", "BASIC-PW", "OAUTH-SECRET", "APIKEY-LIT", "HDR-TOKEN", "QS-KEY", "COLL-TOKEN", "FOLDER-PW"]

const col = (): Collection => ({
    id: "c1",
    name: "Shop <API>",
    description: "Intro <script>alert('c')</script>",
    defaultAuth: { type: "bearer", token: "COLL-TOKEN" },
    items: [
        {
            id: "f1", name: "Orders", type: "folder", description: "Folder **docs**",
            defaultAuth: { type: "basic", username: "u", password: "FOLDER-PW" },
            items: [
                req({
                    id: "r1", name: "<img src=x onerror=alert(1)>", method: "POST",
                    url: "https://api.test/orders?api_key=QS-KEY&page=2&token={{token}}",
                    description: "Creates an order. [x](javascript:alert(1))",
                    auth: { type: "bearer", token: "BEARER-LIT" },
                    headers: [kv("Authorization", "Bearer HDR-TOKEN"), kv("X-Trace", "abc"), kv("X-Api-Key", "{{apiKey}}")],
                    params: [kv("page", "2")],
                    body: { type: "json", content: '{"note":"</code><script>alert(2)</script>"}' },
                    examples: [{
                        id: "e1", name: "Created", capturedAt: 1,
                        request: { method: "POST", url: "u", headers: [], body: { type: "none", content: "" } },
                        response: { status: 201, statusText: "Created", headers: {}, body: '{"id":7}' },
                    }],
                }),
                req({ id: "r2", name: "Basic", auth: { type: "basic", username: "u", password: "BASIC-PW" } }),
                req({ id: "r3", name: "OAuth", auth: { type: "oauth2", oauth2: { grantType: "client_credentials", clientSecret: "OAUTH-SECRET" } as never } }),
                req({ id: "r4", name: "Key", auth: { type: "api-key", apiKeyKey: "X-Key", apiKeyValue: "APIKEY-LIT" } }),
            ],
        } as CollectionFolder,
    ],
})

describe("exportCollectionDocsHtml", () => {
    const html = exportCollectionDocsHtml(col())

    it("never emits literal credentials", () => {
        for (const s of SECRETS) expect(html).not.toContain(s)
    })

    it("shows auth type and keeps {{variable}} references", () => {
        expect(html).toContain("Auth: Bearer token")
        expect(html).toContain("Auth: Basic auth")
        expect(html).toContain("Auth: OAuth 2.0")
        expect(html).toContain("{{apiKey}}")
        expect(html).toContain("token={{token}}")
        expect(html).toContain("page=2")
    })

    it("escapes names, descriptions and bodies (no executable markup)", () => {
        expect(html).not.toMatch(/<script|<img|javascript:/i)
        expect(html).toContain("Shop &lt;API&gt;")
        expect(html).toContain("&lt;/code&gt;&lt;script&gt;")
    })

    it("is self-contained and offline", () => {
        expect(html).toContain("Content-Security-Policy")
        expect(html).not.toMatch(/<link|<script|<img|<iframe|@import|url\(/i)
        expect(html).toContain("prefers-color-scheme:dark")
    })

    it("has folder navigation, request sections, markdown and examples", () => {
        expect(html).toMatch(/<a href="#s1" class="folder">Orders<\/a>/)
        expect(html).toContain('<section id="s2" class="req">')
        expect(html).toContain("<strong>docs</strong>")
        expect(html).toContain("<details><summary><span class=\"status s2\">201</span> Created</summary>")
    })

    it("is deterministic", () => {
        expect(exportCollectionDocsHtml(col())).toBe(html)
    })
})

describe("maskUrl", () => {
    it("masks credential-looking query values only", () => {
        expect(maskUrl("https://x.test/a?access_token=abc&q=1&password=p#f")).toBe("https://x.test/a?access_token=••••••&q=1&password=••••••#f")
        expect(maskUrl("{{base}}/a?apiKey={{k}}")).toBe("{{base}}/a?apiKey={{k}}")
        expect(maskUrl("https://x.test/?token=%E0%A4%A")).toBe("https://x.test/?token=••••••")
    })
})
