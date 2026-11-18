import { JsonPathError, queryJsonPath } from "../jsonpath"

const doc = {
    data: [
        { id: 1, user: { email: "a@x.io" }, tags: ["x", "y"] },
        { id: 2, user: { email: "b@x.io" }, tags: [] },
        { id: 3, user: { email: "c@x.io" } },
    ],
    meta: { total: 3, "page-size": 50, next: null },
    items: [10, 20, 30],
}

const q = (path: string) => queryJsonPath(doc, path).value

describe("queryJsonPath", () => {
    it("returns the root for $", () => {
        expect(queryJsonPath(doc, "$")).toEqual({ value: doc, definite: true })
    })

    it("resolves definite paths to a single value", () => {
        expect(q("$.meta.total")).toBe(3)
        expect(q("$.items[0]")).toBe(10)
        expect(q("$.items[-1]")).toBe(30)
        expect(q("$['meta']['page-size']")).toBe(50)
        expect(q('$["meta"].next')).toBeNull()
        expect(q("$.data[1].user.email")).toBe("b@x.io")
    })

    it("returns undefined for a definite miss, not a crash", () => {
        expect(q("$.meta.missing")).toBeUndefined()
        expect(q("$.items[9]")).toBeUndefined()
        expect(q("$.meta.total.deeper")).toBeUndefined()
        expect(q("$.items.foo")).toBeUndefined()
    })

    it("collects wildcards into an array", () => {
        expect(q("$.data[*].id")).toEqual([1, 2, 3])
        expect(q("$.data.*.id")).toEqual([1, 2, 3])
        expect(q("$.meta.*")).toEqual([3, 50, null])
        expect(q("$.data[*].tags[*]")).toEqual(["x", "y"])
    })

    it("supports recursive descent", () => {
        expect(q("$..email")).toEqual(["a@x.io", "b@x.io", "c@x.io"])
        expect(q("$..id")).toEqual([1, 2, 3])
        expect(q("$..[0]")).toEqual([doc.data[0], "x", 10])
    })

    it("supports unions", () => {
        expect(q("$.items[0,2]")).toEqual([10, 30])
        expect(q("$.meta['total','next']")).toEqual([3, null])
        expect(q("$.items[0,99]")).toEqual([10])
    })

    it("accepts paths without the leading $", () => {
        expect(q("meta.total")).toBe(3)
        expect(q(".items[1]")).toBe(20)
        expect(q("[\"items\"][2]")).toBe(30)
    })

    it("ignores prototype keys", () => {
        expect(q("$.constructor")).toBeUndefined()
        expect(q("$.data[*].toString")).toEqual([])
    })

    it("throws JsonPathError on bad or unsupported syntax", () => {
        for (const bad of ["$.items[0", "$.data[?(@.id>1)]", "$.items[0:2]", "$..", "$ .x", "$.[*]x"]) {
            expect(() => queryJsonPath(doc, bad)).toThrow(JsonPathError)
        }
    })
})
