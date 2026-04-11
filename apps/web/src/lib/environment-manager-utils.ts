import type { EnvSetEntry, EnvVariableRow } from "@/store/environment-manager-store"

export function parseDotEnvBlock(text: string): EnvVariableRow[] {
    const out: EnvVariableRow[] = []
    for (let line of text.split(/\r?\n/)) {
        line = line.trim()
        if (!line || line.startsWith("#")) continue
        if (line.startsWith("export ")) {
            line = line.slice(7).trim()
        }
        const eq = line.indexOf("=")
        if (eq <= 0) continue
        const rawKey = line.slice(0, eq).trim()
        let val = line.slice(eq + 1)
        if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
        ) {
            val = val.slice(1, -1)
            val = val.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\'/g, "'")
        }
        if (rawKey) {
            out.push({ key: rawKey, value: val })
        }
    }
    return out
}

export function formatDotEnv(variables: EnvVariableRow[]): string {
    return variables
        .filter((v) => v.key.trim())
        .map(({ key, value }) => {
            const k = key.trim()
            if (/[\n\r"'\\#]/.test(value) || /\s/.test(value) || value.includes("=")) {
                const esc = value
                    .replace(/\\/g, "\\\\")
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, "\\n")
                    .replace(/\r/g, "\\r")
                return `${k}="${esc}"`
            }
            return `${k}=${value}`
        })
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
