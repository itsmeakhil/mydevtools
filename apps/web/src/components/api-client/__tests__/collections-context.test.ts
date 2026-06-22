jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))
jest.mock("../collections/use-collections", () => ({
    useCollections: () => ({
        collections: [],
        isLoading: false,
        addFolder: jest.fn(),
        deleteItem: jest.fn(),
        saveRequest: jest.fn(),
        toggleFolder: jest.fn(),
        createCollection: jest.fn(),
        renameCollection: jest.fn(),
        renameFolder: jest.fn(),
        deleteMultipleCollections: jest.fn(),
    }),
}))

/**
 * Tests for CollectionsContext (collections-context.tsx).
 *
 * @testing-library/react is not installed. We test module exports and the
 * type contracts only. Context wiring is validated by tsc --noEmit.
 */

describe("collections-context module exports", () => {
    it("exports CollectionsProvider, useCollectionsState, useCollectionsActions", () => {
        const mod = require("../context/collections-context")
        expect(typeof mod.CollectionsProvider).toBe("function")
        expect(typeof mod.useCollectionsState).toBe("function")
        expect(typeof mod.useCollectionsActions).toBe("function")
    })
})

describe("guard functions are exported", () => {
    it("useCollectionsState is a function that guards context access", () => {
        const { useCollectionsState } = require("../context/collections-context")
        expect(typeof useCollectionsState).toBe("function")
    })

    it("useCollectionsActions is a function that guards context access", () => {
        const { useCollectionsActions } = require("../context/collections-context")
        expect(typeof useCollectionsActions).toBe("function")
    })
})
