/**
 * Minimal CSV parser for collection-runner data files.
 * Handles quoted cells with embedded commas, escaped doubled quotes, and
 * CRLF/LF line endings. Spec subset enough for Postman/Newman data files.
 */

export function parseCsv(text: string): Record<string, string>[] {
    const rows = parseRows(text)
    if (rows.length === 0) return []
    const [headers, ...body] = rows
    return body
        .filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""))
        .map((cells) => {
            const obj: Record<string, string> = {}
            headers.forEach((h, i) => { obj[h] = cells[i] ?? "" })
            return obj
        })
}

function parseRows(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let inQuote = false

    for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (inQuote) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
            else if (c === '"') { inQuote = false }
            else cell += c
        } else {
            if (c === '"') { inQuote = true }
            else if (c === ",") { row.push(cell); cell = "" }
            else if (c === "\n" || c === "\r") {
                row.push(cell); cell = ""
                rows.push(row); row = []
                if (c === "\r" && text[i + 1] === "\n") i++
            } else {
                cell += c
            }
        }
    }
    if (cell.length > 0 || row.length > 0) {
        row.push(cell)
        rows.push(row)
    }
    return rows
}

/** Parse either CSV or JSON array. Auto-detected by first non-whitespace char. */
export function parseDataFile(text: string): Record<string, string>[] {
    const t = text.trimStart()
    if (t.startsWith("[")) {
        const parsed = JSON.parse(t)
        if (!Array.isArray(parsed)) throw new Error("JSON data file must be an array")
        return parsed.map((row: unknown) => {
            if (!row || typeof row !== "object") return {}
            const out: Record<string, string> = {}
            for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
                out[k] = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)
            }
            return out
        })
    }
    return parseCsv(text)
}
