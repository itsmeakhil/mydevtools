/** Content types whose body is one JSON value per line. */
export function isNdjsonContentType(contentType: string): boolean {
    return /ndjson|jsonl|json-lines|jsonlines/.test(contentType.toLowerCase())
}

export interface NdjsonLine {
    /** 1-based line number in the body. */
    line: number
    text: string
    value?: unknown
    error?: string
}

/** Parse each non-blank line on its own; a bad line carries its error and parsing goes on. */
export function parseNdjson(body: string, maxLines = Infinity): { lines: NdjsonLine[]; truncated: boolean } {
    const lines: NdjsonLine[] = []
    const raw = body.split(/\r?\n/)
    for (let i = 0; i < raw.length; i++) {
        const text = raw[i].trim()
        if (!text) continue
        if (lines.length >= maxLines) return { lines, truncated: true }
        try {
            lines.push({ line: i + 1, text, value: JSON.parse(text) })
        } catch (e) {
            lines.push({ line: i + 1, text, error: (e as Error).message })
        }
    }
    return { lines, truncated: false }
}
