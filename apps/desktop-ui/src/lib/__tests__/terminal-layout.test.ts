import { leaf, splitAt, removeLeaf, leafIds, setSizes, type SplitNode } from "../terminal/layout"

describe("terminal layout", () => {
  it("splits a leaf into a 50/50 split", () => {
    expect(splitAt(leaf("a"), "a", "row", "b")).toEqual({
      kind: "split", dir: "row", children: [leaf("a"), leaf("b")], sizes: [50, 50],
    })
  })
  it("inserts a sibling in a same-dir split and renormalizes to 100", () => {
    const r = splitAt(splitAt(leaf("a"), "a", "row", "b"), "a", "row", "c") as Extract<SplitNode, { kind: "split" }>
    expect(leafIds(r)).toEqual(["a", "c", "b"])
    expect(r.sizes.reduce((x, y) => x + y, 0)).toBeCloseTo(100)
  })
  it("nests when the direction differs", () => {
    const r = splitAt(splitAt(leaf("a"), "a", "row", "b"), "b", "col", "c")
    expect(leafIds(r)).toEqual(["a", "b", "c"])
    expect((r as any).children[1].kind).toBe("split")
  })
  it("removeLeaf collapses a 2-child split", () => {
    expect(removeLeaf(splitAt(leaf("a"), "a", "row", "b"), "a")).toEqual(leaf("b"))
  })
  it("removing the only leaf gives null", () => {
    expect(removeLeaf(leaf("a"), "a")).toBeNull()
  })
  it("leafIds is depth-first left to right", () => {
    const t = splitAt(splitAt(splitAt(leaf("a"), "a", "row", "b"), "a", "col", "c"), "b", "col", "d")
    expect(leafIds(t)).toEqual(["a", "c", "b", "d"])
  })
  it("setSizes updates the split at path", () => {
    const t = splitAt(splitAt(leaf("a"), "a", "row", "b"), "b", "col", "c")
    const r = setSizes(t, [1], [30, 70]) as any
    expect(r.children[1].sizes).toEqual([30, 70])
    expect(setSizes(t, [], [20, 80])).toMatchObject({ sizes: [20, 80] })
  })
})
