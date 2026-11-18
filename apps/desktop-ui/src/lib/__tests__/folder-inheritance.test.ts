import { applyFolderInheritance, findRequestAncestors, findRequestContext, withFolderDefaults } from "../folder-inheritance"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

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

    it("nearest ancestor's header wins over outer ones", () => {
        const out = applyFolderInheritance(req("r", "x"), [
            { defaultHeaders: [{ id: "1", key: "X-Env", value: "collection", active: true }] },
            { defaultHeaders: [{ id: "2", key: "x-env", value: "folder", active: true }] },
        ])
        expect(out.headers.map((h) => h.value)).toEqual(["folder"])
    })

    it("explicit inherit takes the nearest auth, or sends none when nothing is set", () => {
        const inherit = req("r", "x", { auth: { type: "inherit" } })
        const chain = [
            { defaultAuth: { type: "basic" as const, username: "col" } },
            { defaultAuth: { type: "bearer" as const, token: "folder" } },
        ]
        expect(applyFolderInheritance(inherit, chain).auth).toEqual({ type: "bearer", token: "folder" })
        expect(applyFolderInheritance(inherit, [chain[0]]).auth).toEqual({ type: "basic", username: "col" })
        expect(applyFolderInheritance(inherit, []).auth).toEqual({ type: "none" })
        expect(applyFolderInheritance(inherit, [{ defaultAuth: { type: "inherit" } }]).auth).toEqual({ type: "none" })
    })
})

describe("withFolderDefaults", () => {
    const r = req("r1", "x", { auth: { type: "inherit" }, preRequestScript: "// req" })
    const folder: CollectionFolder = { id: "f", name: "F", type: "folder", items: [r], preRequestScript: "// folder" }
    const collection: Collection = {
        id: "c", name: "C", items: [folder],
        defaultAuth: { type: "bearer", token: "{{token}}" },
        defaultHeaders: [{ id: "h", key: "X-App", value: "1", active: true }],
        preRequestScript: "// collection",
    }

    it("applies collection defaults as the root of the chain, live", () => {
        const out = withFolderDefaults({ ...r, source: { requestId: "r1" } }, [collection])
        expect(out.auth).toEqual({ type: "bearer", token: "{{token}}" })
        expect(out.headers.map((h) => h.key)).toEqual(["X-App"])
        expect(out.preRequestScript).toBe("// collection\n\n// folder\n\n// req")
        // Changing the collection changes the next send — nothing was copied.
        const edited = { ...collection, defaultAuth: { type: "basic" as const, username: "u" } }
        expect(withFolderDefaults({ ...r, source: { requestId: "r1" } }, [edited]).auth.type).toBe("basic")
    })

    it("a draft tab with inherit sends no auth", () => {
        expect(withFolderDefaults(r, [collection]).auth).toEqual({ type: "none" })
    })

    it("findRequestContext returns the collection and folder chain", () => {
        const ctx = findRequestContext([collection], "r1")
        expect(ctx?.collection.id).toBe("c")
        expect(ctx?.folders.map((f) => f.id)).toEqual(["f"])
        expect(findRequestContext([collection], "nope")).toBeNull()
    })
})
