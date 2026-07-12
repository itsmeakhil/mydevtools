export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type GraphNodeKind = 'object' | 'array' | 'value'

export interface GraphRow {
  key: string
  value: string
  valueType: 'string' | 'number' | 'boolean' | 'null'
}

export interface GraphNode {
  id: string
  /** JSONPath of this node, e.g. `$.users[3].address` */
  path: string
  /** Key (or `[index]`) under the parent; `$` for the root */
  label: string
  kind: GraphNodeKind
  /** Primitive key/value rows displayed inside the node */
  rows: GraphRow[]
  /** Number of object/array children (edges out of this node) */
  childIds: string[]
  parentId: string | null
  depth: number
  /** Raw subtree value — used by copy-value and the table view */
  value: JsonValue
  /** Character range of this subtree in the source text (best-effort) */
  span?: { start: number; end: number }
}

export interface JsonGraph {
  nodes: GraphNode[]
  rootId: string
  nodeCount: number
}

export type ParseGraphResult =
  | { ok: true; graph: JsonGraph; collapseByDefault: boolean }
  | { ok: false; error: string; tooLarge?: boolean; nodeCount?: number }

/** Above this many nodes the graph starts collapsed to depth 1. */
export const COLLAPSE_THRESHOLD = 600
/** Above this many nodes we refuse to render and show a friendly notice. */
export const HARD_NODE_CAP = 6000

const MAX_TEXT = 60

function formatPrimitive(v: string | number | boolean | null): string {
  if (v === null) return 'null'
  if (typeof v === 'string') return JSON.stringify(v.length > MAX_TEXT ? `${v.slice(0, MAX_TEXT)}…` : v)
  return String(v)
}

function primitiveType(v: string | number | boolean | null): GraphRow['valueType'] {
  if (v === null) return 'null'
  return typeof v as 'string' | 'number' | 'boolean'
}

function isPrimitive(v: JsonValue): v is string | number | boolean | null {
  return v === null || typeof v !== 'object'
}

export function escapePathKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`
}

/**
 * Builds the node graph from parsed JSON. Objects/arrays become nodes;
 * primitive members render as rows inside their parent's node, and each
 * object/array child becomes its own node connected by an edge.
 */
export function jsonToGraph(text: string): ParseGraphResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: '' }

  let value: JsonValue
  try {
    value = JSON.parse(trimmed) as JsonValue
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
  }

  const nodes: GraphNode[] = []
  let count = 0

  const spans = collectSpans(trimmed)

  function addNode(
    v: JsonValue,
    path: string,
    label: string,
    parentId: string | null,
    depth: number,
  ): string | null {
    count++
    if (count > HARD_NODE_CAP) return null
    const id = String(nodes.length)
    const node: GraphNode = {
      id,
      path,
      label,
      kind: isPrimitive(v) ? 'value' : Array.isArray(v) ? 'array' : 'object',
      rows: [],
      childIds: [],
      parentId,
      depth,
      value: v,
      span: spans?.get(path),
    }
    nodes.push(node)

    if (isPrimitive(v)) {
      node.rows.push({ key: '', value: formatPrimitive(v), valueType: primitiveType(v) })
      return id
    }

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const childId = addNode(v[i], `${path}[${i}]`, `[${i}]`, id, depth + 1)
        if (childId === null) return null
        node.childIds.push(childId)
      }
      return id
    }

    const entries = Object.entries(v)
    for (const [k, child] of entries) {
      if (isPrimitive(child)) {
        node.rows.push({ key: k, value: formatPrimitive(child), valueType: primitiveType(child) })
      }
    }
    for (const [k, child] of entries) {
      if (!isPrimitive(child)) {
        const childId = addNode(child, `${path}${escapePathKey(k)}`, k, id, depth + 1)
        if (childId === null) return null
        node.childIds.push(childId)
      }
    }
    return id
  }

  const rootId = addNode(value, '$', '$', null, 0)
  if (rootId === null) {
    return { ok: false, error: '', tooLarge: true, nodeCount: count }
  }

  return {
    ok: true,
    graph: { nodes, rootId, nodeCount: nodes.length },
    collapseByDefault: nodes.length > COLLAPSE_THRESHOLD,
  }
}

/**
 * Best-effort scanner mapping each object/array subtree to its character
 * range in the source. Correctness of values is anchored on JSON.parse in
 * jsonToGraph; if this scanner trips on anything, spans are simply omitted.
 */
export function collectSpans(text: string): Map<string, { start: number; end: number }> | null {
  const spans = new Map<string, { start: number; end: number }>()
  let i = 0

  function ws() {
    while (i < text.length && /[\s]/.test(text[i])) i++
  }

  function scanString(): string {
    // assumes text[i] === '"'
    const start = i
    i++
    while (i < text.length) {
      if (text[i] === '\\') i += 2
      else if (text[i] === '"') {
        i++
        return JSON.parse(text.slice(start, i)) as string
      } else i++
    }
    throw new Error('unterminated string')
  }

  function scanValue(path: string) {
    ws()
    const start = i
    const c = text[i]
    if (c === '{') {
      i++
      ws()
      if (text[i] === '}') i++
      else
        for (;;) {
          ws()
          const key = scanString()
          ws()
          if (text[i] !== ':') throw new Error('expected :')
          i++
          scanValue(`${path}${escapePathKey(key)}`)
          ws()
          if (text[i] === ',') {
            i++
            continue
          }
          if (text[i] === '}') {
            i++
            break
          }
          throw new Error('expected , or }')
        }
      spans.set(path, { start, end: i })
    } else if (c === '[') {
      i++
      ws()
      if (text[i] === ']') i++
      else {
        let idx = 0
        for (;;) {
          scanValue(`${path}[${idx++}]`)
          ws()
          if (text[i] === ',') {
            i++
            continue
          }
          if (text[i] === ']') {
            i++
            break
          }
          throw new Error('expected , or ]')
        }
      }
      spans.set(path, { start, end: i })
    } else if (c === '"') {
      scanString()
      spans.set(path, { start, end: i })
    } else {
      // number / true / false / null
      while (i < text.length && /[^\s,\]}]/.test(text[i])) i++
      spans.set(path, { start, end: i })
    }
  }

  try {
    scanValue('$')
    return spans
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const NODE_STYLE = {
  rowHeight: 18,
  headerHeight: 22,
  paddingX: 10,
  paddingY: 6,
  charWidth: 7.3, // approx for 12px monospace
  minWidth: 96,
  maxWidth: 340,
  hGap: 64,
  vGap: 14,
} as const

export interface LaidOutNode {
  node: GraphNode
  x: number
  y: number
  width: number
  height: number
}

export interface LaidOutEdge {
  id: string
  fromId: string
  toId: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface GraphLayout {
  nodes: LaidOutNode[]
  edges: LaidOutEdge[]
  width: number
  height: number
}

export function nodeSummary(node: GraphNode): string {
  if (node.kind === 'array') return `[${(node.value as JsonValue[]).length}]`
  if (node.kind === 'object') return `{${Object.keys(node.value as object).length}}`
  return node.rows[0]?.value ?? ''
}

export function measureNode(node: GraphNode, collapsed: boolean): { width: number; height: number } {
  const s = NODE_STYLE
  const hasHeader = node.label !== '' || node.kind !== 'value'
  const rows = node.kind === 'value' ? node.rows.length : collapsed || node.rows.length === 0 ? 0 : node.rows.length
  const headerText = `${node.label} ${nodeSummary(node)}`
  let maxChars = hasHeader ? headerText.length + 2 : 0
  if (rows > 0) {
    for (const r of node.rows) {
      maxChars = Math.max(maxChars, r.key.length + 2 + Math.min(r.value.length, MAX_TEXT + 2))
    }
  }
  const width = Math.min(s.maxWidth, Math.max(s.minWidth, maxChars * s.charWidth + s.paddingX * 2))
  const height =
    (hasHeader ? s.headerHeight : 0) + rows * s.rowHeight + (rows > 0 ? s.paddingY * 2 : hasHeader ? 0 : s.rowHeight)
  return { width, height: Math.max(height, s.headerHeight) }
}

/**
 * Left-to-right tidy tree layout over visible (non-collapsed) nodes.
 * Children stack vertically; parents center on their children's span.
 */
export function layoutGraph(graph: JsonGraph, collapsedIds: ReadonlySet<string>): GraphLayout {
  const s = NODE_STYLE
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const sizes = new Map<string, { width: number; height: number }>()
  const colWidth: number[] = []

  // Collect visible nodes and per-depth column widths
  const visible: GraphNode[] = []
  ;(function collect(id: string) {
    const node = byId.get(id)
    if (!node) return
    visible.push(node)
    const size = measureNode(node, collapsedIds.has(node.id))
    sizes.set(node.id, size)
    colWidth[node.depth] = Math.max(colWidth[node.depth] ?? 0, size.width)
    if (!collapsedIds.has(node.id)) node.childIds.forEach(collect)
  })(graph.rootId)

  const colX: number[] = []
  let acc = 0
  for (let d = 0; d < colWidth.length; d++) {
    colX[d] = acc
    acc += colWidth[d] + s.hGap
  }

  const pos = new Map<string, { x: number; y: number }>()
  let cursor = 0

  ;(function place(id: string): { top: number; bottom: number } {
    const node = byId.get(id)!
    const size = sizes.get(id)!
    const kids = collapsedIds.has(id) ? [] : node.childIds
    if (kids.length === 0) {
      const y = cursor
      cursor += size.height + s.vGap
      pos.set(id, { x: colX[node.depth], y })
      return { top: y, bottom: y + size.height }
    }
    let top = Infinity
    let bottom = -Infinity
    for (const kid of kids) {
      const ext = place(kid)
      top = Math.min(top, ext.top)
      bottom = Math.max(bottom, ext.bottom)
    }
    const y = (top + bottom) / 2 - size.height / 2
    pos.set(id, { x: colX[node.depth], y })
    cursor = Math.max(cursor, y + size.height + s.vGap)
    return { top: Math.min(top, y), bottom: Math.max(bottom, y + size.height) }
  })(graph.rootId)

  let width = 0
  let height = 0
  const nodes: LaidOutNode[] = visible.map((node) => {
    const { x, y } = pos.get(node.id)!
    const size = sizes.get(node.id)!
    width = Math.max(width, x + size.width)
    height = Math.max(height, y + size.height)
    return { node, x, y, ...size }
  })

  const laid = new Map(nodes.map((n) => [n.node.id, n]))
  const edges: LaidOutEdge[] = []
  for (const n of nodes) {
    if (collapsedIds.has(n.node.id)) continue
    for (const childId of n.node.childIds) {
      const c = laid.get(childId)
      if (!c) continue
      edges.push({
        id: `${n.node.id}-${childId}`,
        fromId: n.node.id,
        toId: childId,
        x1: n.x + n.width,
        y1: n.y + n.height / 2,
        x2: c.x,
        y2: c.y + c.height / 2,
      })
    }
  }

  return { nodes, edges, width, height }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function searchGraph(graph: JsonGraph, query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: string[] = []
  for (const node of graph.nodes) {
    const inLabel = node.label.toLowerCase().includes(q)
    const inRows = node.rows.some(
      (r) => r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q),
    )
    if (inLabel || inRows) hits.push(node.id)
  }
  return hits
}

/** Ancestor ids (exclusive) of a node — used to expand the path to a search hit. */
export function ancestorIds(graph: JsonGraph, id: string): string[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const out: string[] = []
  let cur = byId.get(id)?.parentId ?? null
  while (cur !== null) {
    out.push(cur)
    cur = byId.get(cur)?.parentId ?? null
  }
  return out
}

// ---------------------------------------------------------------------------
// Table view
// ---------------------------------------------------------------------------

export interface TableData {
  columns: string[]
  rows: string[][]
}

/** Renders an array node as a table when its items are objects or primitives. */
export function tableFromValue(value: JsonValue): TableData | null {
  if (!Array.isArray(value) || value.length === 0) return null
  if (value.every((v) => isPrimitive(v))) {
    return {
      columns: ['value'],
      rows: value.map((v) => [formatCell(v)]),
    }
  }
  if (!value.every((v) => v !== null && typeof v === 'object' && !Array.isArray(v))) return null
  const columns: string[] = []
  for (const item of value as Record<string, JsonValue>[]) {
    for (const key of Object.keys(item)) {
      if (!columns.includes(key)) columns.push(key)
    }
  }
  const rows = (value as Record<string, JsonValue>[]).map((item) =>
    columns.map((c) => (c in item ? formatCell(item[c]) : '')),
  )
  return { columns, rows }
}

function formatCell(v: JsonValue): string {
  if (v === null) return 'null'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
