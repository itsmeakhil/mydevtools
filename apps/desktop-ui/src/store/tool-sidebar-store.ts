import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clampSidebarWidth } from '@/lib/tool-sidebar-rail'

interface ToolSidebarState {
  /**
   * Desktop collapse state keyed by tool id. A missing key means "open" — the
   * default — so a tool that has never been collapsed stores nothing.
   */
  collapsed: Record<string, boolean>
  /**
   * Panel width in px keyed by tool id. A missing key means the 256px default,
   * so a tool the user never dragged stores nothing.
   */
  width: Record<string, number>
  setCollapsed: (toolId: string, collapsed: boolean) => void
  toggle: (toolId: string) => void
  setWidth: (toolId: string, px: number) => void
  resetWidth: (toolId: string) => void
}

export const useToolSidebarStore = create<ToolSidebarState>()(
  persist(
    (set) => ({
      collapsed: {},
      width: {},
      setCollapsed: (toolId, collapsed) =>
        set((s) => ({ collapsed: { ...s.collapsed, [toolId]: collapsed } })),
      toggle: (toolId) =>
        set((s) => ({ collapsed: { ...s.collapsed, [toolId]: !s.collapsed[toolId] } })),
      setWidth: (toolId, px) =>
        set((s) => ({ width: { ...s.width, [toolId]: clampSidebarWidth(px) } })),
      resetWidth: (toolId) =>
        set((s) => {
          const width = { ...s.width }
          delete width[toolId]
          return { width }
        }),
    }),
    // No version bump needed: `persist` shallow-merges the stored object over
    // the initializer's, and payloads written before `width` existed simply have
    // no such key, so the `{}` default survives.
    { name: 'tool-sidebar-storage' },
  ),
)
