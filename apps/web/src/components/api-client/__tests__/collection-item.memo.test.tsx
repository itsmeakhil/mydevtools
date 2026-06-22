jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

// This test file validates that CollectionItem is memoized with proper prop comparison.
// It verifies the memo comparator behavior by directly testing the compare function
// with identical and different props.

describe("CollectionItem memo", () => {
    it("skips re-render when props are referentially equal", () => {
        const { CollectionItem } = require("../collections/collection-item")

        // Verify CollectionItem is wrapped in React.memo
        expect(CollectionItem.$$typeof).toBe(Symbol.for("react.memo"))

        // Extract the custom comparator function
        const compare = CollectionItem.compare as (a: any, b: any) => boolean
        expect(compare).toBeInstanceOf(Function)

        // Create base props matching the CollectionItemProps interface
        const baseProps = {
            item: { id: "folder-1", name: "Root", type: "folder", items: [], isOpen: false },
            level: 0,
            onToggle: () => {},
            onDelete: () => {},
            onRenameFolder: () => {},
            onAddFolder: () => {},
            onLoadRequest: () => {},
        }

        // Test 1: Identical props (same object references) should skip re-render
        expect(compare(baseProps, baseProps)).toBe(true)

        // Test 2: Changed item id should trigger re-render
        const changedItem = { ...baseProps, item: { ...baseProps.item, id: "folder-2" } }
        expect(compare(baseProps, changedItem)).toBe(false)

        // Test 3: Changed handler reference should trigger re-render
        const changedHandler = { ...baseProps, onToggle: () => {} }
        expect(compare(baseProps, changedHandler)).toBe(false)

        // Test 4: Changed level should trigger re-render
        const changedLevel = { ...baseProps, level: 1 }
        expect(compare(baseProps, changedLevel)).toBe(false)
    })
})
