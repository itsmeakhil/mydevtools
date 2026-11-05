export type SplitNode =
  | { kind: "leaf"; id: string }
  | { kind: "split"; dir: "row" | "col"; children: SplitNode[]; sizes: number[] }

export const leaf = (id: string): SplitNode => ({ kind: "leaf", id })

const equal = (n: number) => Array.from({ length: n }, () => 100 / n)

export function splitAt(root: SplitNode, targetId: string, dir: "row" | "col", newId: string): SplitNode {
  if (root.kind === "leaf") {
    return root.id === targetId
      ? { kind: "split", dir, children: [root, leaf(newId)], sizes: [50, 50] }
      : root
  }
  // Same-direction split with the target as a direct child: insert a sibling.
  const idx = root.children.findIndex((c) => c.kind === "leaf" && c.id === targetId)
  if (idx >= 0 && root.dir === dir) {
    const children = [...root.children]
    children.splice(idx + 1, 0, leaf(newId))
    return { ...root, children, sizes: equal(children.length) }
  }
  return { ...root, children: root.children.map((c) => splitAt(c, targetId, dir, newId)) }
}

export function removeLeaf(root: SplitNode, id: string): SplitNode | null {
  if (root.kind === "leaf") return root.id === id ? null : root
  const kept: { node: SplitNode; size: number }[] = []
  root.children.forEach((c, i) => {
    const n = removeLeaf(c, id)
    if (n) kept.push({ node: n, size: root.sizes[i] })
  })
  if (kept.length === 0) return null
  if (kept.length === 1) return kept[0].node
  if (kept.length === root.children.length) return { ...root, children: kept.map((k) => k.node) }
  const total = kept.reduce((s, k) => s + k.size, 0) || 1
  return { ...root, children: kept.map((k) => k.node), sizes: kept.map((k) => (k.size / total) * 100) }
}

export function leafIds(root: SplitNode): string[] {
  return root.kind === "leaf" ? [root.id] : root.children.flatMap(leafIds)
}

/** `path` = child indices from root to the split whose sizes change. */
export function setSizes(root: SplitNode, path: number[], sizes: number[]): SplitNode {
  if (root.kind === "leaf") return root
  if (path.length === 0) return { ...root, sizes }
  const [i, ...rest] = path
  return { ...root, children: root.children.map((c, j) => (j === i ? setSizes(c, rest, sizes) : c)) }
}
