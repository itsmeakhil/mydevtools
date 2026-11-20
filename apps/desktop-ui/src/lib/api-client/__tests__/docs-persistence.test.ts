import { parseCollection, serializeCollection } from "../file-store"
import { isTabDirty, requestFingerprint } from "../saved-request"
import { createNewTab } from "@/components/api-client/context/tabs-context"
import { importPostmanCollection } from "@/lib/import/postman"
import { exportPostmanCollection } from "@/lib/export/postman"
import { parseBruRequest } from "@/lib/import/bruno"
import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

const req = (over: Partial<CollectionRequest> = {}): CollectionRequest => ({
    id: "r1", name: "Get user", method: "GET", url: "https://api.test/users/1",
    params: [], headers: [], body: { type: "none", content: "" }, auth: { type: "none" }, ...over,
})

const col = (): Collection => ({
    id: "c1", name: "API", description: "# API\nCollection docs",
    items: [
        { id: "f1", name: "Users", type: "folder", description: "Folder docs", items: [req({ description: "Fetch **one** user" })] },
        req({ id: "r2", name: "Health" }),
    ],
})

describe("docs persistence", () => {
    it("round-trips descriptions through folder YAML and omits empty ones", () => {
        const files = serializeCollection(col())
        const { collection } = parseCollection(files)
        const folder = collection.items[0] as CollectionFolder
        expect(collection.description).toBe("# API\nCollection docs")
        expect(folder.description).toBe("Folder docs")
        expect((folder.items[0] as CollectionRequest).description).toBe("Fetch **one** user")
        const health = files.find((f) => f.content.includes("name: Health"))!.content
        expect(health).not.toContain("description")
    })

    it("a docs edit marks a saved tab dirty", () => {
        const tab = { ...createNewTab(), source: { requestId: "r1" } }
        const saved = { ...tab, savedFingerprint: requestFingerprint(tab) }
        expect(isTabDirty({ ...saved, description: "new docs" })).toBe(true)
    })

    it("maps Postman descriptions (string and {content}) both ways", () => {
        const imported = importPostmanCollection({
            info: { name: "P", description: { content: "Coll docs", type: "text/markdown" } },
            item: [{ name: "F", description: "Folder docs", item: [{ name: "R", request: { method: "GET", url: "https://x.test", description: "Req docs" } }] }],
        })
        const folder = imported.items[0] as CollectionFolder
        expect(imported.description).toBe("Coll docs")
        expect(folder.description).toBe("Folder docs")
        expect((folder.items[0] as CollectionRequest).description).toBe("Req docs")

        const out = JSON.parse(exportPostmanCollection(imported))
        expect(out.info.description).toBe("Coll docs")
        expect(out.item[0].description).toBe("Folder docs")
        expect(out.item[0].item[0].request.description).toBe("Req docs")
    })

    it("imports a Bruno docs block", () => {
        const r = parseBruRequest(`meta {\n  name: R\n  type: http\n}\n\nget {\n  url: https://x.test\n}\n\ndocs {\n  # Title\n  Some *docs*\n}\n`)
        expect(r.description).toBe("# Title\nSome *docs*")
    })
})
