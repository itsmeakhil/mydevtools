/**
 * Metadata-level test: this project's Jest runs in the node environment with no
 * DOM harness, so we assert the memo contract rather than rendered output —
 * same approach as api-client/__tests__/collection-item.memo.test.tsx.
 */
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }))

describe("RailButton memo", () => {
  it("is wrapped in React.memo with a custom comparator", () => {
    const { RailButton } = require("../tool-sidebar-rail")
    expect(RailButton.$$typeof).toBe(Symbol.for("react.memo"))
    expect(RailButton.compare).toBeInstanceOf(Function)
  })

  it("skips re-render when the displayed props are unchanged", () => {
    const { RailButton } = require("../tool-sidebar-rail")
    const compare = RailButton.compare as (a: never, b: never) => boolean
    const base = {
      entry: { id: "tags", label: "Tags", count: 3, active: false },
      accent: { bg: "bg-blue-500/10", text: "text-blue-500" },
      onActivate: () => {},
    }
    const same = { ...base, entry: { ...base.entry }, onActivate: () => {} }
    expect(compare(base as never, same as never)).toBe(true)
  })

  it("re-renders when active or count changes", () => {
    const { RailButton } = require("../tool-sidebar-rail")
    const compare = RailButton.compare as (a: never, b: never) => boolean
    const base = {
      entry: { id: "tags", label: "Tags", count: 3, active: false },
      accent: { bg: "bg-blue-500/10", text: "text-blue-500" },
      onActivate: () => {},
    }
    expect(
      compare(base as never, { ...base, entry: { ...base.entry, active: true } } as never),
    ).toBe(false)
    expect(compare(base as never, { ...base, entry: { ...base.entry, count: 4 } } as never)).toBe(
      false,
    )
  })
})
