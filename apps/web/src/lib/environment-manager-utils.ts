import type { EnvSetEntry, EnvVariableRow } from "@/store/environment-manager-store"

/** Typical .env export key: letters, digits, underscore; must not start with digit. */
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Index of the closing quote matching `s[0]`, or -1 if unterminated. `\` escapes inside `"`. */
function findClosingQuote(s: string, quote: string): number {
    for (let i = 1; i < s.length; i++) {
        if (quote === '"' && s[i] === "\\") {
            i++ // skip the escaped character
            continue
        }
        if (s[i] === quote) return i
    }
    return -1
}

/** Unescape a double-quoted value in a single pass so `\\n` stays a literal backslash + n. */
function unescapeDoubleQuoted(val: string): string {
    return val.replace(/\\([\\nrt"'])/g, (_, c: string) => {
        switch (c) {
            case "n":
                return "\n"
            case "r":
                return "\r"
            case "t":
                return "\t"
            default:
                return c // \\  \"  \'
        }
    })
}

function parseEnvAssignmentBody(line: string): EnvVariableRow | null {
    let s = line.trim()
    if (s.startsWith("export ")) {
        s = s.slice(7).trim()
    }
    const eq = s.indexOf("=")
    if (eq <= 0) return null
    const rawKey = s.slice(0, eq).trim()
    if (!ENV_KEY_RE.test(rawKey)) return null

    // Whitespace between `=` and the value (e.g. `KEY = value`) is not part of the value.
    const rest = s.slice(eq + 1).replace(/^[ \t]+/, "")

    const quote = rest[0]
    if (quote === '"' || quote === "'") {
        const close = findClosingQuote(rest, quote)
        if (close !== -1) {
            const inner = rest.slice(1, close)
            // Only double-quoted values process escapes; single-quoted are literal.
            // Anything after the closing quote (e.g. an inline comment) is discarded.
            const val = quote === '"' ? unescapeDoubleQuoted(inner) : inner
            return { key: rawKey, value: val }
        }
        // Unterminated quote: fall through and treat the whole thing as an unquoted value.
    }

    // Unquoted: an inline comment (` #...`) and trailing whitespace are not part of the value.
    const commentAt = rest.search(/\s#/)
    const val = (commentAt === -1 ? rest : rest.slice(0, commentAt)).replace(/[ \t]+$/, "")
    return { key: rawKey, value: val }
}

export type DotEnvParseDetailed = {
    /** Uncommented KEY=value lines */
    active: EnvVariableRow[]
    /** Lines like `# KEY=value` (commented-out assignments) */
    commentedEnv: EnvVariableRow[]
    /** `#` lines that are not commented-out assignments */
    plainCommentLines: number
}

export function parseDotEnvDetailed(text: string): DotEnvParseDetailed {
    const active: EnvVariableRow[] = []
    const commentedEnv: EnvVariableRow[] = []
    let plainCommentLines = 0

    for (const rawLine of text.split(/\r?\n/)) {
        const trimmed = rawLine.trim()
        if (!trimmed) continue

        if (trimmed.startsWith("#")) {
            const afterHash = trimmed.slice(1).trim()
            if (!afterHash) {
                plainCommentLines += 1
                continue
            }
            const parsed = parseEnvAssignmentBody(afterHash)
            if (parsed) {
                commentedEnv.push(parsed)
            } else {
                plainCommentLines += 1
            }
            continue
        }

        const parsed = parseEnvAssignmentBody(trimmed)
        if (parsed) {
            active.push(parsed)
        }
    }

    return { active, commentedEnv, plainCommentLines }
}

/** True if paste looks like an env file (at least one assignment, active or commented-out). */
export function isValidEnvPasteText(text: string): boolean {
    const d = parseDotEnvDetailed(text)
    return d.active.length > 0 || d.commentedEnv.length > 0
}

export function mergeEnvVariableRows(
    prev: EnvVariableRow[],
    incoming: EnvVariableRow[],
    emptyRow: EnvVariableRow
): EnvVariableRow[] {
    const base = prev.filter((r) => r.key.trim() || r.value.trim())
    const keyIndex = new Map(base.map((r, i) => [r.key, i]))
    const result = [...base]
    for (const row of incoming) {
        const idx = keyIndex.get(row.key)
        if (idx !== undefined) {
            result[idx] = row
        } else {
            keyIndex.set(row.key, result.length)
            result.push(row)
        }
    }
    return result.length > 0 ? result : [emptyRow]
}

export function parseDotEnvBlock(text: string): EnvVariableRow[] {
    return parseDotEnvDetailed(text).active
}

/** Unquoted values are widely supported for this charset (dotenv / shell-like .env). */
const SAFE_UNQUOTED_VALUE = /^[A-Za-z0-9_.@+/:%-]+$/

function formatOneEnvLine(k: string, value: string): string {
    if (value === "") {
        return `${k}=`
    }
    if (SAFE_UNQUOTED_VALUE.test(value)) {
        return `${k}=${value}`
    }

    const hasNewline = /[\n\r]/.test(value)
    const hasSingle = value.includes("'")
    const hasDouble = value.includes('"')
    const hasBackslash = value.includes("\\")

    // Use single-quoted literal when the value has " but no ', newlines, or backslashes — avoids `\"` noise.
    if (hasDouble && !hasSingle && !hasNewline && !hasBackslash) {
        return `${k}='${value}'`
    }

    const esc = value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
    return `${k}="${esc}"`
}

export function formatDotEnv(variables: EnvVariableRow[]): string {
    return variables
        .filter((v) => v.key.trim())
        .map(({ key, value }) => formatOneEnvLine(key.trim(), value))
        .join("\n")
}

export type EnvPayloadDecoded = Omit<EnvSetEntry, "id" | "createdAt" | "updatedAt">

export function parseEnvPayloadJson(plain: string): EnvPayloadDecoded | null {
    try {
        const p = JSON.parse(plain) as unknown
        if (!p || typeof p !== "object") return null
        const o = p as Record<string, unknown>
        const project = typeof o.project === "string" ? o.project : ""
        const environment = typeof o.environment === "string" ? o.environment : ""
        let variables: EnvVariableRow[] = []
        if (Array.isArray(o.variables)) {
            variables = o.variables
                .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
                .map((v) => ({
                    key: typeof v.key === "string" ? v.key : "",
                    value: typeof v.value === "string" ? v.value : "",
                }))
        }
        const tags = Array.isArray(o.tags)
            ? o.tags.filter((t): t is string => typeof t === "string")
            : []
        const notes = typeof o.notes === "string" ? o.notes : ""
        return { project, environment, variables, tags, notes }
    } catch {
        return null
    }
}
