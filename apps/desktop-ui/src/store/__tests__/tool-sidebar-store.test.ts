/**
 * Tests for tool-sidebar-store.ts — per-tool collapse state behind ToolSidebarLayout.
 */
import { useToolSidebarStore } from "../tool-sidebar-store"

beforeEach(() => {
  useToolSidebarStore.setState({ collapsed: {} })
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
})
