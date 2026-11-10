import { createNewTab } from "@/components/api-client/context/tabs-context"
import type { ApiRequestState, Collection, CollectionRequest } from "@/components/api-client/types"
import { isTabDirty, requestFingerprint, savePatch } from "../saved-request"
import { withFolderDefaults } from "../../folder-inheritance"

const linked = (patch: Partial<ApiRequestState> = {}): ApiRequestState => {
    const tab = { ...createNewTab(), url: "https://api.test/users", source: { requestId: "r1" }, ...patch }
    return { ...tab, savedFingerprint: requestFingerprint(tab) }
}

describe("isTabDirty", () => {
    it("is false for drafts and freshly loaded/saved tabs", () => {
        expect(isTabDirty(createNewTab())).toBe(false)
        expect(isTabDirty(linked())).toBe(false)
    })

    it("flips on a request edit and back when the edit is undone", () => {
        const tab = linked()
        const edited = { ...tab, url: "https://api.test/other" }
        expect(isTabDirty(edited)).toBe(true)
        expect(isTabDirty({ ...edited, url: tab.url })).toBe(false)
    })

    it("ignores runtime state, refreshed OAuth tokens and stripped file bytes", () => {
        const tab = linked({
            auth: { type: "oauth2", oauth2: { accessToken: "a" } as never },
            body: { type: "form-data", content: "", formData: [{ id: "f", key: "file", value: "", active: true, valueType: "file", fileName: "a.bin", fileContentBase64: "AAAA" }] },
        })
        expect(isTabDirty({ ...tab, isLoading: true, response: { status: 200 } as never })).toBe(false)
        expect(isTabDirty({ ...tab, auth: { type: "oauth2", oauth2: { accessToken: "b", expiresAt: 1 } as never } })).toBe(false)
        expect(isTabDirty({ ...tab, body: { ...tab.body, formData: [{ ...tab.body.formData![0], fileContentBase64: "" }] } })).toBe(false)
    })
})

describe("savePatch", () => {
    it("restores file bytes the tab lost from the stored request, never blanks them", () => {
        const file = { id: "f", key: "file", value: "", active: true, valueType: "file" as const, fileName: "a.bin" }
        const tab = linked({ body: { type: "form-data", content: "", formData: [{ ...file, fileContentBase64: "" }] } })
        const stored = { id: "r1", body: { type: "form-data", content: "", formData: [{ ...file, fileContentBase64: "AAAA" }] } } as CollectionRequest
        expect(savePatch(tab, stored).body.formData![0].fileContentBase64).toBe("AAAA")
    })

    it("does not write examples or comments", () => {
        const patch = savePatch(linked({ examples: [], comments: [] }), undefined)
        expect("examples" in patch).toBe(false)
        expect("comments" in patch).toBe(false)
    })
})

describe("withFolderDefaults", () => {
    const req: CollectionRequest = { ...createNewTab(), id: "r1", headers: [], preRequestScript: "own()" }
    const collections: Collection[] = [{
        id: "c1",
        name: "C",
        items: [{ id: "fo", name: "F", type: "folder", items: [req], defaultHeaders: [{ id: "h", key: "X-Team", value: "a", active: true }], preRequestScript: "folder()" }],
    } as Collection]

    it("merges the source request's folder defaults without touching the tab", () => {
        const tab: ApiRequestState = { ...createNewTab(), headers: [], preRequestScript: "own()", source: { requestId: "r1" } }
        const sent = withFolderDefaults(tab, collections)
        expect(sent.headers.map((h) => h.key)).toEqual(["X-Team"])
        expect(sent.preRequestScript).toBe("folder()\n\nown()")
        expect(tab.headers).toEqual([])
    })

    it("returns drafts unchanged", () => {
        const tab = createNewTab()
        expect(withFolderDefaults(tab, collections)).toBe(tab)
    })
})
