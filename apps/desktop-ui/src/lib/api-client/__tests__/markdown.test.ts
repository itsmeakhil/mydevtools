import { renderMarkdown } from "../markdown"

describe("renderMarkdown", () => {
    it("renders common markdown", () => {
        const html = renderMarkdown("# Title\n\n**bold** and `code`\n\n- a\n- b")
        expect(html).toContain("<h1")
        expect(html).toContain("<strong>bold</strong>")
        expect(html).toContain("<code>code</code>")
        expect(html).toContain("<li>a</li>")
    })

    it("escapes raw HTML instead of emitting it", () => {
        const html = renderMarkdown('<script>alert(1)</script>\n\nhi <img src=x onerror="alert(2)">')
        expect(html).not.toMatch(/<script|<img/i)
        expect(html).toContain("&lt;script&gt;")
    })

    it("drops unsafe link schemes but keeps the text", () => {
        const html = renderMarkdown("[click](javascript:alert(1)) [data](data:text/html,x)")
        expect(html).not.toMatch(/javascript:|data:text/i)
        expect(html).toContain("click")
    })

    it("keeps http(s), mailto and anchor links, escaping attributes", () => {
        const html = renderMarkdown('[a](https://x.test/?q="1") [m](mailto:a@b.c) [h](#top)')
        expect(html).toContain('href="https://x.test/?q=&quot;1&quot;"')
        expect(html).toContain('href="mailto:a@b.c"')
        expect(html).toContain('href="#top"')
    })

    it("never emits <img> (no network fetches)", () => {
        const html = renderMarkdown("![logo](https://x.test/logo.png)")
        expect(html).not.toContain("<img")
        expect(html).toContain(">logo</a>")
    })

    it("returns empty string for empty input", () => {
        expect(renderMarkdown(undefined)).toBe("")
        expect(renderMarkdown("   ")).toBe("")
    })
})
