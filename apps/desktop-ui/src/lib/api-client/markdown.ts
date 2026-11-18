import { Marked, type Tokens } from "marked"

/** HTML-escape text for element content and double-quoted attributes. */
export function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

/** http(s), mailto and in-page anchors only — no javascript:, data:, file: … */
function safeHref(href: string): string | null {
    const h = href.trim()
    if (h.startsWith("#")) return h
    return /^(https?:|mailto:)/i.test(h) ? h : null
}

// Own instance: never touches the global `marked` the Notes editor configures.
const md = new Marked({
    gfm: true,
    renderer: {
        // Raw HTML in markdown is shown as text, never executed.
        html({ text }: Tokens.HTML | Tokens.Tag) {
            return escapeHtml(text)
        },
        link({ href, title, tokens }: Tokens.Link) {
            const inner = this.parser.parseInline(tokens)
            const safe = safeHref(href)
            if (!safe) return inner
            const t = title ? ` title="${escapeHtml(title)}"` : ""
            return `<a href="${escapeHtml(safe)}"${t} rel="noopener noreferrer">${inner}</a>`
        },
        // Images would fetch from the network; docs stay offline, so link to them instead.
        image({ href, text }: Tokens.Image) {
            const safe = safeHref(href)
            const label = escapeHtml(text || href)
            return safe ? `<a href="${escapeHtml(safe)}" rel="noopener noreferrer">${label}</a>` : label
        },
    },
})

/** Markdown → HTML safe to inject: raw HTML escaped, unsafe link schemes dropped, no images. */
export function renderMarkdown(source: string | undefined): string {
    if (!source?.trim()) return ""
    return md.parse(source, { async: false }) as string
}
