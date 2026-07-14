/**
 * Structural JSON diff. Walks two values, emits add / remove / change entries
 * keyed by dot-and-bracket path.
 */

export type DiffKind = "add" | "remove" | "change"

export interface DiffEntry {
    path: string
    kind: DiffKind
    before?: unknown
    after?: unknown
}

function isObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v)
}

function walk(a: unknown, b: unknown, path: string, out: DiffEntry[]): void {
    if (a === b) return
    if (typeof a !== typeof b || (Array.isArray(a) !== Array.isArray(b))) {
        out.push({ path, kind: "change", before: a, after: b })
        return
    }
    if (isObject(a) && isObject(b)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)])
        for (const k of keys) {
            const next = path ? `${path}.${k}` : k
            if (!(k in a)) out.push({ path: next, kind: "add", after: b[k] })
            else if (!(k in b)) out.push({ path: next, kind: "remove", before: a[k] })
            else walk(a[k], b[k], next, out)
        }
        return
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        const max = Math.max(a.length, b.length)
        for (let i = 0; i < max; i++) {
            const next = `${path}[${i}]`
            if (i >= a.length) out.push({ path: next, kind: "add", after: b[i] })
            else if (i >= b.length) out.push({ path: next, kind: "remove", before: a[i] })
            else walk(a[i], b[i], next, out)
        }
        return
    }
    if (a !== b) out.push({ path, kind: "change", before: a, after: b })
}

export function diffJson(a: unknown, b: unknown): DiffEntry[] {
    const out: DiffEntry[] = []
    walk(a, b, "", out)
    return out
}
