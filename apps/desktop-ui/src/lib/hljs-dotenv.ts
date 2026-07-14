import hljs from "highlight.js/lib/core"
import properties from "highlight.js/lib/languages/properties"

let registered = false

function ensureRegistered() {
    if (registered) return
    hljs.registerLanguage("properties", properties)
    registered = true
}

/**
 * Returns HTML (span.hljs-*) for read-only .env / properties display. Escaped by highlight.js.
 */
export function highlightDotEnvSource(source: string): string {
    if (!source.trim()) return ""
    ensureRegistered()
    try {
        return hljs.highlight(source, { language: "properties", ignoreIllegals: true }).value
    } catch {
        return hljs.highlightAuto(source).value
    }
}
