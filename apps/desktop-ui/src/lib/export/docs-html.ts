/**
 * Collection → one self-contained, offline HTML docs page (inline CSS, no
 * scripts, CSP blocks every external request). Labels are English-only.
 *
 * Never emits credentials: auth shows its TYPE only, and headers / params /
 * URL query values with credential-looking names are masked unless they are a
 * `{{variable}}` reference (shown as-is so readers know what to fill in).
 */
import type {
    Collection, CollectionFolder, CollectionRequest, KeyValueItem, RequestAuth, RequestBody,
} from "@/components/api-client/types"
import { escapeHtml as esc, renderMarkdown } from "@/lib/api-client/markdown"
import { saveFile } from "@/lib/desktop/save-file"

const SENSITIVE = /authorization|cookie|token|secret|passw(or)?d|api[-_]?key|apikey|session|signature|credential|private/i
const MASK = "••••••"
const MAX_EXAMPLE_BODY = 2000

const isVarRef = (v: string) => /^\s*\{\{[^}]+\}\}\s*$/.test(v)
const safeValue = (key: string, value: string) => (SENSITIVE.test(key) && value && !isVarRef(value) ? MASK : value)

const decode = (s: string) => { try { return decodeURIComponent(s) } catch { return s } }

/** Mask credential-looking query values in a raw URL (may hold {{vars}}, so no URL parser). */
export function maskUrl(url: string): string {
    return url.replace(/([?&])([^=&#]+)=([^&#]*)/g, (m, sep: string, k: string, v: string) =>
        SENSITIVE.test(decode(k)) && v && !isVarRef(decode(v)) ? `${sep}${k}=${MASK}` : m)
}

const AUTH_LABEL: Record<RequestAuth["type"], string> = {
    none: "Inherited", inherit: "Inherited", bearer: "Bearer token", basic: "Basic auth", "api-key": "API key",
    oauth2: "OAuth 2.0", "aws-sigv4": "AWS Signature v4", hawk: "Hawk", digest: "Digest", ntlm: "NTLM",
    "jwt-bearer": "JWT bearer", spnego: "SPNEGO / Kerberos",
}

const isFolder = (i: CollectionFolder | CollectionRequest): i is CollectionFolder => (i as CollectionFolder).type === "folder"

function kvTable(rows: KeyValueItem[] | undefined, title: string): string {
    const live = (rows ?? []).filter((r) => r.active && r.key)
    if (!live.length) return ""
    const body = live.map((r) => `<tr><td><code>${esc(r.key)}</code></td><td><code>${esc(safeValue(r.key, r.value))}</code></td></tr>`).join("")
    return `<h4>${title}</h4><table><thead><tr><th>Name</th><th>Value</th></tr></thead><tbody>${body}</tbody></table>`
}

function bodyBlock(b: RequestBody): string {
    switch (b.type) {
        case "json": case "text": case "xml": case "graphql":
            return b.content.trim() ? `<h4>Body <span class="tag">${b.type}</span></h4><pre><code>${esc(b.content)}</code></pre>` : ""
        case "x-www-form-urlencoded":
            return kvTable(b.urlEncoded, "Body <span class=\"tag\">form-urlencoded</span>")
        case "form-data": {
            const rows = (b.formData ?? []).filter((f) => f.active && f.key)
                .map((f) => ({ id: f.id, key: f.key, active: true, value: f.valueType === "file" ? `[file] ${f.fileName ?? ""}` : f.value }))
            return kvTable(rows, "Body <span class=\"tag\">form-data</span>")
        }
        case "binary":
            return b.binaryFile?.fileName ? `<h4>Body <span class="tag">binary</span></h4><p><code>${esc(b.binaryFile.fileName)}</code></p>` : ""
        default:
            return ""
    }
}

function requestSection(r: CollectionRequest, anchor: string): string {
    const examples = (r.examples ?? []).map((ex) => {
        const body = ex.response.isBase64 ? "[binary]" : ex.response.body
        const clipped = body.length > MAX_EXAMPLE_BODY ? `${body.slice(0, MAX_EXAMPLE_BODY)}\n…` : body
        return `<details><summary><span class="status s${String(ex.response.status)[0]}">${ex.response.status}</span> ${esc(ex.name)}</summary><pre><code>${esc(clipped)}</code></pre></details>`
    }).join("")
    return `<section id="${anchor}" class="req">
<h3>${esc(r.name)}</h3>
<p class="line"><span class="method">${esc(r.method)}</span> <code>${esc(maskUrl(r.url))}</code></p>
<p class="meta">Auth: ${AUTH_LABEL[r.auth?.type ?? "inherit"] ?? esc(r.auth.type)}</p>
${renderMarkdown(r.description)}
${kvTable(r.params, "Query parameters")}
${kvTable(r.headers, "Headers")}
${bodyBlock(r.body)}
${examples ? `<h4>Examples</h4>${examples}` : ""}
</section>`
}

/** Pure: same collection in → same HTML out. */
export function exportCollectionDocsHtml(col: Collection): string {
    let n = 0
    const nav: string[] = []
    const main: string[] = []
    const walk = (items: (CollectionFolder | CollectionRequest)[]) => {
        for (const item of items) {
            const anchor = `s${++n}`
            if (isFolder(item)) {
                nav.push(`<li><a href="#${anchor}" class="folder">${esc(item.name)}</a><ul>`)
                const auth = item.defaultAuth && item.defaultAuth.type !== "none" ? `<p class="meta">Auth: ${AUTH_LABEL[item.defaultAuth.type]}</p>` : ""
                main.push(`<section id="${anchor}" class="folder"><h2>${esc(item.name)}</h2>${auth}${renderMarkdown(item.description)}</section>`)
                walk(item.items)
                nav.push("</ul></li>")
            } else {
                nav.push(`<li><a href="#${anchor}"><span class="method">${esc(item.method)}</span> ${esc(item.name)}</a></li>`)
                main.push(requestSection(item, anchor))
            }
        }
    }
    walk(col.items)
    const colAuth = col.defaultAuth && col.defaultAuth.type !== "none" ? `<p class="meta">Auth: ${AUTH_LABEL[col.defaultAuth.type]}</p>` : ""
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<meta name="generator" content="MyDevTools">
<title>${esc(col.name)} — API docs</title>
<style>${CSS}</style>
</head>
<body>
<nav><p class="brand">${esc(col.name)}</p><ul>${nav.join("")}</ul></nav>
<main>
<header><h1>${esc(col.name)}</h1>${colAuth}${renderMarkdown(col.description)}</header>
${main.join("\n")}
<footer>Generated by MyDevTools</footer>
</main>
</body>
</html>
`
}

export async function saveCollectionDocsHtml(col: Collection): Promise<boolean> {
    const name = col.name.replace(/[^a-zA-Z0-9-_]+/g, "_") || "collection"
    return saveFile(exportCollectionDocsHtml(col), `${name}-docs.html`, "text/html")
}

const CSS = `
:root{--bg:#fff;--fg:#1d1d1f;--muted:#6e6e73;--line:#e5e5ea;--card:#f5f5f7;--accent:#0a66d8;--ok:#1a7f37;--warn:#9a6700;--err:#cf222e}
@media (prefers-color-scheme:dark){:root{--bg:#161618;--fg:#f2f2f7;--muted:#a1a1a6;--line:#2c2c2e;--card:#1f1f22;--accent:#5aa2ff;--ok:#4ac26b;--warn:#d4a72c;--err:#ff7b72}}
*{box-sizing:border-box}
body{margin:0;display:flex;min-height:100vh;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
nav{position:sticky;top:0;align-self:flex-start;width:280px;height:100vh;overflow:auto;padding:24px 16px;border-right:1px solid var(--line)}
nav ul{list-style:none;margin:0;padding-left:12px}
nav>ul{padding-left:0}
nav a{display:block;padding:3px 6px;border-radius:6px;color:var(--fg);text-decoration:none;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
nav a:hover{background:var(--card)}
nav a.folder{font-weight:600;margin-top:6px}
.brand{font-weight:700;margin:0 0 12px}
main{flex:1;min-width:0;max-width:920px;padding:32px 40px}
h1{font-size:28px;margin:0 0 8px}h2{font-size:21px;margin:40px 0 8px;padding-top:8px;border-top:1px solid var(--line)}
h3{font-size:17px;margin:0 0 6px}h4{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:18px 0 6px}
.req{margin:24px 0;padding:20px;border:1px solid var(--line);border-radius:12px}
.line{margin:0 0 6px;word-break:break-all}.meta{margin:0 0 8px;color:var(--muted);font-size:13px}
.method{display:inline-block;min-width:44px;font:600 11px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--accent)}
.tag{font:11px ui-monospace,Menlo,monospace;text-transform:none;letter-spacing:0;padding:1px 6px;border-radius:999px;background:var(--card)}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px}
:not(pre)>code{background:var(--card);padding:1px 5px;border-radius:5px}
pre{background:var(--card);padding:12px;border-radius:8px;overflow:auto}
table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top;word-break:break-all}
th{color:var(--muted);font-weight:600}
a{color:var(--accent)}
details{margin:6px 0}summary{cursor:pointer}
.status{font:600 12px ui-monospace,Menlo,monospace}.s2{color:var(--ok)}.s3{color:var(--warn)}.s4,.s5{color:var(--err)}
footer{margin:48px 0 0;color:var(--muted);font-size:12px}
@media (max-width:760px){body{display:block}nav{position:static;width:auto;height:auto;border-right:0;border-bottom:1px solid var(--line)}main{padding:20px 16px}}
`
