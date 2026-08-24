/**
 * Tests for tool-sidebar-store.ts — per-tool collapse state behind ToolSidebarLayout.
 */
import { useToolSidebarStore } from "../tool-sidebar-store"

beforeEach(() => {
  useToolSidebarStore.setState({ collapsed: {}, width: {} })
})

describe("tool-sidebar-store", () => {
  it("treats an unseen tool as open", () => {
    expect(useToolSidebarStore.getState().collapsed["notes"]).toBeUndefined()
  })

  it("collapses and reopens a tool", () => {
    const { setCollapsed } = useToolSidebarStore.getState()
    setCollapsed("notes", true)
    expect(useToolSidebarStore.getState().collapsed["notes"]).toBe(true)
    setCollapsed("notes", false)
    expect(useToolSidebarStore.getState().collapsed["notes"]).toBe(false)
  })

  it("toggle flips from the open default and back", () => {
    const { toggle } = useToolSidebarStore.getState()
    toggle("bookmarks")
    expect(useToolSidebarStore.getState().collapsed["bookmarks"]).toBe(true)
    toggle("bookmarks")
    expect(useToolSidebarStore.getState().collapsed["bookmarks"]).toBe(false)
  })

  it("keeps tools independent", () => {
    const { setCollapsed } = useToolSidebarStore.getState()
    setCollapsed("notes", true)
    expect(useToolSidebarStore.getState().collapsed["s3-drive"]).toBeUndefined()
  })

  it("has no stored width until one is set", () => {
    expect(useToolSidebarStore.getState().width["notes"]).toBeUndefined()
  })

  it("stores a width per tool", () => {
    useToolSidebarStore.getState().setWidth("notes", 320)
    expect(useToolSidebarStore.getState().width["notes"]).toBe(320)
    expect(useToolSidebarStore.getState().width["bookmarks"]).toBeUndefined()
  })

  it("clamps a stored width to the allowed range", () => {
    const { setWidth } = useToolSidebarStore.getState()
    setWidth("notes", 50)
    expect(useToolSidebarStore.getState().width["notes"]).toBe(200)
    setWidth("notes", 5000)
    expect(useToolSidebarStore.getState().width["notes"]).toBe(480)
  })

  it("resetWidth clears the key so the default applies again", () => {
    useToolSidebarStore.getState().setWidth("notes", 320)
    useToolSidebarStore.getState().resetWidth("notes")
    expect(useToolSidebarStore.getState().width["notes"]).toBeUndefined()
  })

  it("width and collapse are independent", () => {
    const { setWidth, setCollapsed } = useToolSidebarStore.getState()
    setWidth("notes", 320)
    setCollapsed("notes", true)
    expect(useToolSidebarStore.getState().width["notes"]).toBe(320)
    expect(useToolSidebarStore.getState().collapsed["notes"]).toBe(true)
  })
})
