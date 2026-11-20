import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"
import {
    cloneWithNewIds,
    filterTree,
    moveDestinations,
    moveWithin,
    resolveDrop,
    type TreeItem,
} from "../collection-tree"

const req = (id: string, name = id, url = `https://api.test/${id}`, method: CollectionRequest["method"] = "GET") =>
    ({ id, name, url, method, params: [], headers: [], body: { type: "none", content: "" }, auth: { type: "none" } }) as CollectionRequest
const folder = (id: string, items: TreeItem[], name = id): CollectionFolder => ({ id, name, type: "folder", items, isOpen: false })
const ids = (items: TreeItem[]): unknown[] => items.map((i) => ("type" in i && i.type === "folder" ? [i.id, ids(i.items)] : i.id))

// c1: [a, F[b, G[c]], d]   c2: [e]
const cols = (): Collection[] => [
    { id: "c1", name: "One", items: [req("a"), folder("F", [req("b"), folder("G", [req("c")], "Gamma")]), req("d")] },
    { id: "c2", name: "Two", items: [req("e", "Login", "https://auth.test/login", "POST")] },
]

describe("filterTree", () => {
    it("keeps hits and the opened folders leading to them", () => {
        const out = filterTree(cols()[0].items, "c")
        expect(ids(out)).toEqual([["F", [["G", ["c"]]]]])
        expect((out[0] as CollectionFolder).isOpen).toBe(true)
    })

    it("matches URL and method, and keeps a matching folder whole", () => {
        expect(ids(filterTree(cols()[1].items, "post"))).toEqual(["e"])
        expect(ids(filterTree(cols()[1].items, "auth.test"))).toEqual(["e"])
        expect(ids(filterTree(cols()[0].items, "gamm"))).toEqual([["F", [["G", ["c"]]]]])
    })

    it("returns the tree untouched for an empty query", () => {
        const items = cols()[0].items
        expect(filterTree(items, "  ")).toBe(items)
    })
})

describe("cloneWithNewIds", () => {
    it("renames the root and gives every node a fresh id", () => {
        const f = cols()[0].items[1] as CollectionFolder
        const copy = cloneWithNewIds(f, "F copy")
        expect(copy.name).toBe("F copy")
        const all = (i: TreeItem): string[] => [i.id, ...("type" in i && i.type === "folder" ? i.items.flatMap(all) : [])]
        expect(all(copy).filter((id) => all(f).includes(id))).toEqual([])
        expect(all(copy)).toHaveLength(4)
        expect(f.name).toBe("F")
    })
})

describe("moveWithin", () => {
    it("moves into a folder and back to the root", () => {
        const items = cols()[0].items
        const inG = moveWithin(items, "a", "G", 0)!
        expect(ids(inG)).toEqual([["F", ["b", ["G", ["a", "c"]]]], "d"])
        expect(ids(moveWithin(inG, "a", null, 2)!)).toEqual([["F", ["b", ["G", ["c"]]]], "d", "a"])
    })

    it("refuses a folder into its own subtree", () => {
        expect(moveWithin(cols()[0].items, "F", "G", 0)).toBeNull()
        expect(moveWithin(cols()[0].items, "F", "F", 0)).toBeNull()
    })
})

describe("resolveDrop", () => {
    it("uses post-removal indices within the same list", () => {
        expect(resolveDrop(cols(), "a", { itemId: "d", position: "after" })).toEqual({ collectionId: "c1", parentId: null, index: 2 })
        expect(resolveDrop(cols(), "d", { itemId: "a", position: "before" })).toEqual({ collectionId: "c1", parentId: null, index: 0 })
    })

    it("drops inside folders, on other collections, and ignores no-ops", () => {
        expect(resolveDrop(cols(), "a", { itemId: "G", position: "inside" })).toEqual({ collectionId: "c1", parentId: "G", index: 1 })
        expect(resolveDrop(cols(), "a", { collectionId: "c2" })).toEqual({ collectionId: "c2", parentId: null, index: 1 })
        expect(resolveDrop(cols(), "a", { itemId: "F", position: "before" })).toBeNull()
        expect(resolveDrop(cols(), "a", { itemId: "a", position: "after" })).toBeNull()
        expect(resolveDrop(cols(), "a", { itemId: "d", position: "inside" })).toBeNull()
    })
})

describe("moveDestinations", () => {
    it("lists roots and folders but not the moved folder's subtree", () => {
        expect(moveDestinations(cols(), "F").map((d) => d.parentId ?? d.collectionId)).toEqual(["c1", "c2"])
        expect(moveDestinations(cols(), "a").map((d) => [d.parentId ?? d.collectionId, d.depth])).toEqual([
            ["c1", 0], ["F", 1], ["G", 2], ["c2", 0],
        ])
    })
})
