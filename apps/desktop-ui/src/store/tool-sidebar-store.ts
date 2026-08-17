import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ToolSidebarState {
  /**
   * Desktop collapse state keyed by tool id. A missing key means "open" — the
   * default — so a tool that has never been collapsed stores nothing.
   */
  collapsed: Record<string, boolean>
  setCollapsed: (toolId: string, collapsed: boolean) => void
  toggle: (toolId: string) => void
}

export const useToolSidebarStore = create<ToolSidebarState>()(
  persist(
    (set) => ({
      collapsed: {},
      setCollapsed: (toolId, collapsed) =>
        set((s) => ({ collapsed: { ...s.collapsed, [toolId]: collapsed } })),
      toggle: (toolId) =>
        set((s) => ({ collapsed: { ...s.collapsed, [toolId]: !s.collapsed[toolId] } })),
    }),
    { name: 'tool-sidebar-storage' },
  ),
)
