import {
  ancestorIds,
  collectSpans,
  jsonToGraph,
  layoutGraph,
  searchGraph,
  tableFromValue,
  HARD_NODE_CAP,
} from '@/lib/json-visualizer'

const SAMPLE = `{
  "name": "Ada",
  "active": true,
  "score": 9.5,
  "tags": ["math", "code"],
  "profile": { "age": 36, "city": "London" },
  "projects": [
    { "title": "Engine", "year": 1843 },
    { "title": "Notes", "year": 1842 }
  ]
}`

describe('jsonToGraph', () => {
  it('rejects empty and invalid input', () => {
    expect(jsonToGraph('').ok).toBe(false)
    expect(jsonToGraph('{ nope }').ok).toBe(false)
  })

  it('builds nodes for objects/arrays and rows for primitives', () => {
    const res = jsonToGraph(SAMPLE)
    if (!res.ok) throw new Error('expected ok')
    const { nodes, rootId } = res.graph
    const root = nodes.find((n) => n.id === rootId)!
    expect(root.kind).toBe('object')
    expect(root.rows.map((r) => r.key)).toEqual(['name', 'active', 'score'])
    // tags, profile, projects become child nodes
    expect(root.childIds).toHaveLength(3)
    const labels = root.childIds.map((id) => nodes.find((n) => n.id === id)!.label)
    expect(labels).toEqual(['tags', 'profile', 'projects'])
  })

  it('assigns JSONPath to every node, escaping odd keys', () => {
    const res = jsonToGraph('{"a b": {"x": 1}, "ok": [true]}')
    if (!res.ok) throw new Error('expected ok')
    const paths = res.graph.nodes.map((n) => n.path)
    expect(paths).toContain('$["a b"]')
    expect(paths).toContain('$.ok')
    expect(paths).toContain('$.ok[0]')
  })

  it('handles a primitive root', () => {
    const res = jsonToGraph('42')
    if (!res.ok) throw new Error('expected ok')
    expect(res.graph.nodes).toHaveLength(1)
    expect(res.graph.nodes[0].rows[0].value).toBe('42')
  })

  it('enforces the hard node cap', () => {
    const big = JSON.stringify(Array.from({ length: HARD_NODE_CAP + 10 }, (_, i) => [i]))
    const res = jsonToGraph(big)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.tooLarge).toBe(true)
  })
})

describe('collectSpans', () => {
  it('maps paths to source ranges', () => {
    const spans = collectSpans(SAMPLE)!
    expect(spans).not.toBeNull()
    const profile = spans.get('$.profile')!
    expect(SAMPLE.slice(profile.start, profile.end)).toBe('{ "age": 36, "city": "London" }')
    const tag0 = spans.get('$.tags[0]')!
    expect(SAMPLE.slice(tag0.start, tag0.end)).toBe('"math"')
  })

  it('handles escaped quotes in strings', () => {
    const text = '{"a": "he said \\"hi\\"", "b": 1}'
    const spans = collectSpans(text)!
    expect(spans.get('$.b')).toBeDefined()
  })
})

describe('layoutGraph', () => {
  it('places children to the right of parents without overlap', () => {
    const res = jsonToGraph(SAMPLE)
    if (!res.ok) throw new Error('expected ok')
    const layout = layoutGraph(res.graph, new Set())
    const byId = new Map(layout.nodes.map((n) => [n.node.id, n]))
    for (const edge of layout.edges) {
      expect(byId.get(edge.toId)!.x).toBeGreaterThan(byId.get(edge.fromId)!.x)
    }
    // siblings at the same depth must not overlap vertically
    const byDepth = new Map<number, typeof layout.nodes>()
    for (const n of layout.nodes) {
      const list = byDepth.get(n.node.depth) ?? []
      list.push(n)
      byDepth.set(n.node.depth, list)
    }
    for (const list of byDepth.values()) {
      const sorted = [...list].sort((a, b) => a.y - b.y)
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].y).toBeGreaterThanOrEqual(sorted[i - 1].y + sorted[i - 1].height)
      }
    }
  })

  it('hides collapsed subtrees', () => {
    const res = jsonToGraph(SAMPLE)
    if (!res.ok) throw new Error('expected ok')
    const full = layoutGraph(res.graph, new Set())
    const collapsed = layoutGraph(res.graph, new Set([res.graph.rootId]))
    expect(collapsed.nodes).toHaveLength(1)
    expect(full.nodes.length).toBeGreaterThan(1)
  })
})

describe('searchGraph / ancestorIds', () => {
  it('finds nodes by key and value and expands ancestry', () => {
    const res = jsonToGraph(SAMPLE)
    if (!res.ok) throw new Error('expected ok')
    const hits = searchGraph(res.graph, 'london')
    expect(hits).toHaveLength(1)
    const node = res.graph.nodes.find((n) => n.id === hits[0])!
    expect(node.path).toBe('$.profile')
    expect(ancestorIds(res.graph, node.id)).toEqual([res.graph.rootId])
  })
})

describe('tableFromValue', () => {
  it('builds a column union for arrays of objects', () => {
    const table = tableFromValue([
      { a: 1, b: 'x' },
      { b: 'y', c: true },
    ])!
    expect(table.columns).toEqual(['a', 'b', 'c'])
    expect(table.rows).toEqual([
      ['1', 'x', ''],
      ['', 'y', 'true'],
    ])
  })

  it('renders primitive arrays as a single column and rejects mixed arrays', () => {
    expect(tableFromValue([1, 2])!.columns).toEqual(['value'])
    expect(tableFromValue([1, { a: 1 }])).toBeNull()
    expect(tableFromValue({} as never)).toBeNull()
  })
})
