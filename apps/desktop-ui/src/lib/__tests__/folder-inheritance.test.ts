import { applyFolderInheritance, findRequestAncestors } from "../folder-inheritance"
import type { CollectionFolder, CollectionRequest } from "@/components/api-client/types"

const req = (id: string, name: string, over: Partial<CollectionRequest> = {}): CollectionRequest => ({
    id,
    name,
    method: "GET",
    url: "https://x",
    params: [],
    headers: [],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    ...over,
})

describe("findRequestAncestors", () => {
    it("returns [] for root-level request", () => {
        const r = req("r1", "root")
        expect(findRequestAncestors([r], "r1")).toEqual([])
    })

    it("returns folder chain for nested request", () => {
        const r = req("r1", "deep")
        const inner: CollectionFolder = { id: "f2", name: "inner", type: "folder", items: [r] }
        const outer: CollectionFolder = { id: "f1", name: "outer", type: "folder", items: [inner] }
        const chain = findRequestAncestors([outer], "r1")
        expect(chain?.map((c) => c.id)).toEqual(["f1", "f2"])
    })

    it("returns null when request not found", () => {
        expect(findRequestAncestors([], "missing")).toBeNull()
    })
})

describe("applyFolderInheritance", () => {
    it("prepends ancestor headers; request-level wins on key collision", () => {
        const ancestors: CollectionFolder[] = [{
            id: "f1", name: "Root", type: "folder", items: [],
            defaultHeaders: [
                { id: "a", key: "X-Root", value: "1", active: true },
                { id: "b", key: "X-Trace", value: "from-root", active: true },
            ],
        }]
        const r = req("r1", "x", {
            headers: [{ id: "c", key: "X-Trace", value: "from-req", active: true }],
        })
        const out = applyFolderInheritance(r, ancestors)
        expect(out.headers.map((h) => `${h.key}=${h.value}`)).toEqual([
            "X-Trace=from-req",  // request keeps its own
            "X-Root=1",          // ancestor adds new key
        ])
    })

    it("inherits ancestor auth only when request auth is none", () => {
        const ancestor: CollectionFolder = {
            id: "f1", name: "Root", type: "folder", items: [],
            defaultAuth: { type: "bearer", token: "shared" },
        }
        const noneReq = applyFolderInheritance(req("r", "x", { auth: { type: "none" } }), [ancestor])
        expect(noneReq.auth).toEqual({ type: "bearer", token: "shared" })

        const overrideReq = applyFolderInheritance(
            req("r", "x", { auth: { type: "bearer", token: "own" } }),
            [ancestor],
        )
        expect(overrideReq.auth).toEqual({ type: "bearer", token: "own" })
    })

    it("concatenates ancestor scripts before the request's own", () => {
        const ancestor: CollectionFolder = {
            id: "f1", name: "Root", type: "folder", items: [],
            preRequestScript: "// pre-root",
            testScript: "// test-root",
        }
        const out = applyFolderInheritance(
            req("r", "x", { preRequestScript: "// pre-req", testScript: "// test-req" }),
            [ancestor],
        )
        expect(out.preRequestScript).toBe("// pre-root\n\n// pre-req")
        expect(out.testScript).toBe("// test-root\n\n// test-req")
    })

    it("is a no-op when ancestor chain is empty", () => {
        const r = req("r", "x")
        expect(applyFolderInheritance(r, [])).toBe(r)
    })
})
