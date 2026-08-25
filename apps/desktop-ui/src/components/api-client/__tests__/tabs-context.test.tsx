jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

/**
 * Tests for TabsContext (tabs-context.tsx).
 *
 * Note: @testing-library/react is not installed in this project, and the Jest
 * testEnvironment is "jest-environment-node", so we cannot render React trees.
 * We test the exported logic (createNewTab, module exports) and the action/state
 * type contracts directly. The context wiring is validated by TypeScript at
 * build-time via tsc --noEmit.
 */

describe("tabs-context module exports", () => {
    it("exports TabsProvider, useTabs, useTabsActions, createNewTab", () => {
        const mod = require("../context/tabs-context")
        expect(typeof mod.TabsProvider).toBe("function")
        expect(typeof mod.useTabs).toBe("function")
        expect(typeof mod.useTabsActions).toBe("function")
        expect(typeof mod.createNewTab).toBe("function")
    })
})

describe("createNewTab", () => {
    it("creates a tab with the correct shape", () => {
        const { createNewTab } = require("../context/tabs-context")
        const tab = createNewTab()

        expect(typeof tab.id).toBe("string")
        expect(tab.id.length).toBeGreaterThan(0)
        expect(tab.name).toBe("New Request")
        expect(tab.method).toBe("GET")
        expect(tab.url).toBe("")
        expect(tab.response).toBeNull()
        expect(tab.isLoading).toBe(false)
        expect(Array.isArray(tab.params)).toBe(true)
        expect(Array.isArray(tab.headers)).toBe(true)
        expect(tab.body.type).toBe("none")
        expect(tab.auth.type).toBe("none")
    })

    it("creates tabs with unique IDs", () => {
        const { createNewTab } = require("../context/tabs-context")
        const tab1 = createNewTab()
        const tab2 = createNewTab()
        expect(tab1.id).not.toBe(tab2.id)
    })

    it("each tab gets fresh formData/urlEncoded item IDs", () => {
        const { createNewTab } = require("../context/tabs-context")
        const tab1 = createNewTab()
        const tab2 = createNewTab()
        // Body items also get unique IDs
        expect(tab1.body.formData![0].id).not.toBe(tab2.body.formData![0].id)
    })

    it("default tab has a single empty params row and headers row", () => {
        const { createNewTab } = require("../context/tabs-context")
        const tab = createNewTab()
        expect(tab.params).toHaveLength(1)
        expect(tab.params[0].key).toBe("")
        expect(tab.headers).toHaveLength(1)
        expect(tab.headers[0].key).toBe("")
    })

    it("default tab body has formData and urlEncoded arrays", () => {
        const { createNewTab } = require("../context/tabs-context")
        const tab = createNewTab()
        expect(Array.isArray(tab.body.formData)).toBe(true)
        expect(Array.isArray(tab.body.urlEncoded)).toBe(true)
        expect(tab.body.formData![0].valueType).toBe("text")
    })
})

describe("guard functions are exported", () => {
    it("useTabs is a function that guards context access", () => {
        const { useTabs } = require("../context/tabs-context")
        // It's a function — actual guard behavior requires a render environment
        expect(typeof useTabs).toBe("function")
    })

    it("useTabsActions is a function that guards context access", () => {
        const { useTabsActions } = require("../context/tabs-context")
        expect(typeof useTabsActions).toBe("function")
    })
})

describe("slimTabsForStorage", () => {
    const { createNewTab, slimTabsForStorage } = require("../context/tabs-context")
    const fat = () => {
        const t = createNewTab()
        t.response = { status: 200, statusText: "OK", headers: {}, body: "x".repeat(1000), time: 1, size: 1 }
        t.isLoading = true
        t.graphqlSchema = { types: [] }
        t.examples = [{ id: "e", name: "ex", capturedAt: 1, request: { method: "GET", url: "u", headers: [], body: t.body }, response: { status: 200, statusText: "OK", headers: {}, body: "big" } }]
        t.body.formData = [{ id: "f", key: "file", value: "", enabled: true, valueType: "file", fileName: "a.bin", fileContentBase64: "AAAA" }]
        return t
    }

    it("always drops runtime + refetchable state, keeps examples and file bytes", () => {
        const [s] = slimTabsForStorage([fat()])
        expect(s.response).toBeUndefined()
        expect(s.isLoading).toBeUndefined()
        expect(s.websocket).toBeUndefined()
        expect(s.graphqlSchema).toBeUndefined()
        expect(s.examples[0].response.body).toBe("big")
        expect(s.body.formData[0].fileContentBase64).toBe("AAAA")
    })

    it("aggressive mode also drops example bodies and file bytes but keeps metadata", () => {
        const [s] = slimTabsForStorage([fat()], true)
        expect(s.examples[0].name).toBe("ex")
        expect(s.examples[0].response.body).toBe("")
        expect(s.body.formData[0].fileName).toBe("a.bin")
        expect(s.body.formData[0].fileContentBase64).toBe("")
    })
})
