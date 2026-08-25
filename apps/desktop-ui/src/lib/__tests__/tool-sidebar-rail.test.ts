/**
 * Pure logic behind the collapsed tool-sidebar rail. Kept out of the React
 * component because this project's Jest runs in the node environment with no
 * DOM harness.
 */
import {
  DEFAULT_SIDEBAR_WIDTH,
  RAIL_MAX_VISIBLE,
  clampSidebarWidth,
  emptyRailRegistry,
  flattenRail,
  isSidebarShortcut,
  railEntriesKey,
  registerRailGroup,
  splitRailEntries,
  unregisterRailGroup,
  type ToolSidebarRailEntry,
} from "../tool-sidebar-rail"

const entry = (id: string, over: Partial<ToolSidebarRailEntry> = {}): ToolSidebarRailEntry => ({
  id,
  label: id.toUpperCase(),
  ...over,
})

describe("rail registry", () => {
  it("keeps groups in registration order", () => {
    let reg = emptyRailRegistry()
    reg = registerRailGroup(reg, "security", [entry("weak")])
    reg = registerRailGroup(reg, "tags", [entry("work")])
    expect(reg.order).toEqual(["security", "tags"])
  })

  it("re-registering a group replaces its entries without reordering", () => {
    let reg = emptyRailRegistry()
    reg = registerRailGroup(reg, "a", [entry("one")])
    reg = registerRailGroup(reg, "b", [entry("two")])
    reg = registerRailGroup(reg, "a", [entry("three")])
    expect(reg.order).toEqual(["a", "b"])
    expect(reg.groups.a.map((e) => e.id)).toEqual(["three"])
  })

  it("unregistering drops the group and its slot in the order", () => {
    let reg = emptyRailRegistry()
    reg = registerRailGroup(reg, "a", [entry("one")])
    reg = registerRailGroup(reg, "b", [entry("two")])
    reg = unregisterRailGroup(reg, "a")
    expect(reg.order).toEqual(["b"])
    expect(reg.groups.a).toBeUndefined()
  })

  it("unregistering an unknown group returns the same object", () => {
    const reg = registerRailGroup(emptyRailRegistry(), "a", [entry("one")])
    expect(unregisterRailGroup(reg, "nope")).toBe(reg)
  })

  it("flattens groups in order and marks where each new group starts", () => {
    let reg = emptyRailRegistry()
    reg = registerRailGroup(reg, "a", [entry("one"), entry("two")])
    reg = registerRailGroup(reg, "b", [entry("three")])
    const flat = flattenRail(reg)
    expect(flat.map((e) => e.label)).toEqual(["ONE", "TWO", "THREE"])
    // The first entry overall does not start a group — nothing precedes it to
    // separate from, and a leading separator would draw a stray line.
    expect(flat.map((e) => !!e.groupStart)).toEqual([false, false, true])
  })

  it("skips empty groups so no stray separator appears", () => {
    let reg = emptyRailRegistry()
    reg = registerRailGroup(reg, "a", [entry("one")])
    reg = registerRailGroup(reg, "empty", [])
    reg = registerRailGroup(reg, "b", [entry("two")])
    const flat = flattenRail(reg)
    expect(flat.map((e) => e.label)).toEqual(["ONE", "TWO"])
    expect(flat.map((e) => !!e.groupStart)).toEqual([false, true])
  })

  it("namespaces ids by group so two groups can reuse an entry id", () => {
    let reg = emptyRailRegistry()
    reg = registerRailGroup(reg, "a", [entry("all")])
    reg = registerRailGroup(reg, "b", [entry("all")])
    const flat = flattenRail(reg)
    expect(new Set(flat.map((e) => e.id)).size).toBe(2)
  })
})

describe("splitRailEntries", () => {
  it("shows everything when the count fits", () => {
    const entries = Array.from({ length: RAIL_MAX_VISIBLE }, (_, i) => entry(`e${i}`))
    const { visible, overflow } = splitRailEntries(entries, RAIL_MAX_VISIBLE)
    expect(visible).toHaveLength(RAIL_MAX_VISIBLE)
    expect(overflow).toHaveLength(0)
  })

  it("reserves the last slot for the overflow button when it does not fit", () => {
    const entries = Array.from({ length: RAIL_MAX_VISIBLE + 1 }, (_, i) => entry(`e${i}`))
    const { visible, overflow } = splitRailEntries(entries, RAIL_MAX_VISIBLE)
    expect(visible).toHaveLength(RAIL_MAX_VISIBLE - 1)
    expect(overflow).toHaveLength(2)
    expect(overflow.map((e) => e.id)).toEqual([`e${RAIL_MAX_VISIBLE - 1}`, `e${RAIL_MAX_VISIBLE}`])
  })

  it("keeps an active entry visible by swapping it with the last visible slot", () => {
    const entries = Array.from({ length: RAIL_MAX_VISIBLE + 3 }, (_, i) =>
      entry(`e${i}`, { active: i === RAIL_MAX_VISIBLE + 2 }),
    )
    const { visible, overflow } = splitRailEntries(entries, RAIL_MAX_VISIBLE)
    expect(visible.some((e) => e.active)).toBe(true)
    expect(overflow.some((e) => e.active)).toBe(false)
  })
})

describe("railEntriesKey", () => {
  it("is stable across a rebuilt array with equal contents", () => {
    const a = [entry("one", { count: 3 }), entry("two")]
    const b = [entry("one", { count: 3 }), entry("two")]
    expect(railEntriesKey(a)).toBe(railEntriesKey(b))
  })

  it("changes when a count changes", () => {
    expect(railEntriesKey([entry("one", { count: 3 })])).not.toBe(
      railEntriesKey([entry("one", { count: 4 })]),
    )
  })

  it("changes when the active entry changes", () => {
    expect(railEntriesKey([entry("one", { active: true })])).not.toBe(
      railEntriesKey([entry("one")]),
    )
  })

  it("ignores handler identity so a fresh closure does not re-register", () => {
    expect(railEntriesKey([entry("one", { onSelect: () => {} })])).toBe(
      railEntriesKey([entry("one", { onSelect: () => {} })]),
    )
  })
})

describe("isSidebarShortcut", () => {
  const ev = (over: Partial<Parameters<typeof isSidebarShortcut>[0]> = {}) => ({
    code: "Backslash",
    metaKey: true,
    ctrlKey: false,
    target: null,
    ...over,
  })

  it("accepts cmd-backslash", () => {
    expect(isSidebarShortcut(ev())).toBe(true)
  })

  it("accepts ctrl-backslash", () => {
    expect(isSidebarShortcut(ev({ metaKey: false, ctrlKey: true }))).toBe(true)
  })

  it("rejects backslash with no modifier, so typing a backslash still works", () => {
    expect(isSidebarShortcut(ev({ metaKey: false, ctrlKey: false }))).toBe(false)
  })

  it("rejects another key with the modifier held", () => {
    expect(isSidebarShortcut(ev({ code: "KeyB" }))).toBe(false)
  })

  it("rejects the shortcut while focus is in a text field", () => {
    expect(isSidebarShortcut(ev({ target: { tagName: "INPUT" } }))).toBe(false)
    expect(isSidebarShortcut(ev({ target: { tagName: "TEXTAREA" } }))).toBe(false)
    expect(isSidebarShortcut(ev({ target: { tagName: "DIV", isContentEditable: true } }))).toBe(
      false,
    )
  })

  it("accepts the shortcut when focus is on a plain element", () => {
    expect(isSidebarShortcut(ev({ target: { tagName: "DIV" } }))).toBe(true)
  })
})

describe("clampSidebarWidth", () => {
  it("clamps below the minimum", () => {
    expect(clampSidebarWidth(199)).toBe(200)
  })

  it("passes the boundaries through", () => {
    expect(clampSidebarWidth(200)).toBe(200)
    expect(clampSidebarWidth(480)).toBe(480)
  })

  it("clamps above the maximum", () => {
    expect(clampSidebarWidth(481)).toBe(480)
  })

  it("falls back to the default for a non-finite width", () => {
    expect(clampSidebarWidth(Number.NaN)).toBe(DEFAULT_SIDEBAR_WIDTH)
  })

  it("rounds fractional drag positions", () => {
    expect(clampSidebarWidth(300.6)).toBe(301)
  })
})
