/**
 * JSONPath subset for the response filter: `$`, `.key`, `['key']`, `[n]`
 * (negative = from the end), `[*]` / `.*`, `..` (recursive descent) and unions
 * `[0,2]` / `['a','b']`. `$` may be omitted (`data.items[0]`).
 *
 * ponytail: no filters `[?()]` or slices `[a:b]` — add when someone asks;
 * they throw a syntax error rather than silently returning nothing.
 */

type Selector =
    | { kind: "wildcard" }
    | { kind: "names"; names: string[] }
    | { kind: "indexes"; indexes: number[] }

interface Segment {
    descendant: boolean
    selector: Selector
}

export class JsonPathError extends Error {}

const NAME = /^[^.[\]\s'"]+/

function parseBracket(src: string, i: number): [Selector, number] {
    const close = src.indexOf("]", i)
    if (close === -1) throw new JsonPathError(`Missing ] at ${i}`)
    const inner = src.slice(i + 1, close).trim()
    if (inner === "*") return [{ kind: "wildcard" }, close + 1]
    const parts = inner.split(",").map((p) => p.trim())
    if (parts.every((p) => /^-?\d+$/.test(p))) {
        return [{ kind: "indexes", indexes: parts.map(Number) }, close + 1]
    }
    const names = parts.map((p) => {
        const m = p.match(/^'([^']*)'$/) ?? p.match(/^"([^"]*)"$/)
        if (!m) throw new JsonPathError(`Unsupported selector [${inner}]`)
        return m[1]
    })
    return [{ kind: "names", names }, close + 1]
}

export function parseJsonPath(path: string): Segment[] {
    let src = path.trim()
    if (!src.startsWith("$")) src = src.startsWith(".") || src.startsWith("[") ? `$${src}` : `$.${src}`
    const segments: Segment[] = []
    let i = 1
    while (i < src.length) {
        let descendant = false
        if (src.startsWith("..", i)) {
            descendant = true
            i += 2
        } else if (src[i] === ".") {
            i += 1
        } else if (src[i] !== "[") {
            throw new JsonPathError(`Unexpected "${src[i]}" at ${i}`)
        }
        if (src[i] === "[") {
            const [selector, next] = parseBracket(src, i)
            segments.push({ descendant, selector })
            i = next
        } else if (src[i] === "*") {
            segments.push({ descendant, selector: { kind: "wildcard" } })
            i += 1
        } else {
            const m = src.slice(i).match(NAME)
            if (!m) throw new JsonPathError(`Expected a key at ${i}`)
            segments.push({ descendant, selector: { kind: "names", names: [m[0]] } })
            i += m[0].length
        }
    }
    return segments
}

function select(node: unknown, sel: Selector): unknown[] {
    if (node === null || typeof node !== "object") return []
    if (sel.kind === "wildcard") return Array.isArray(node) ? node : Object.values(node)
    if (sel.kind === "indexes") {
        if (!Array.isArray(node)) return []
        return sel.indexes
            .map((n) => (n < 0 ? node.length + n : n))
            .filter((n) => n >= 0 && n < node.length)
            .map((n) => node[n])
    }
    if (Array.isArray(node)) return []
    return sel.names.filter((k) => Object.hasOwn(node, k)).map((k) => (node as Record<string, unknown>)[k])
}

function withDescendants(node: unknown, out: unknown[]): unknown[] {
    out.push(node)
    if (node !== null && typeof node === "object") {
        for (const child of Array.isArray(node) ? node : Object.values(node)) withDescendants(child, out)
    }
    return out
}

/**
 * Run `path` against `root`. A definite path (only single keys/indexes) yields
 * the one value it names (`undefined` on miss); anything else yields the array
 * of matches. Throws `JsonPathError` on bad syntax.
 */
export function queryJsonPath(root: unknown, path: string): { value: unknown; definite: boolean } {
    const segments = parseJsonPath(path)
    let nodes: unknown[] = [root]
    for (const seg of segments) {
        const pool = seg.descendant ? nodes.flatMap((n) => withDescendants(n, [])) : nodes
        nodes = pool.flatMap((n) => select(n, seg.selector))
    }
    const definite = segments.every(
        (s) => !s.descendant && s.selector.kind !== "wildcard" &&
            (s.selector.kind === "names" ? s.selector.names.length : s.selector.indexes.length) === 1,
    )
    return definite ? { value: nodes[0], definite } : { value: nodes, definite }
}
