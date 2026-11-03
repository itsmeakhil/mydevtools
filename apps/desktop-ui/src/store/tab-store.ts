'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getRouteConfig } from '@/lib/route-config'

export interface AppTab {
  path: string
}

// Persisted tabs for tools that have since been removed would render a dead
// chip with null content, so any path without a route config is dropped on
// rehydrate (covers every future removal, not a hand-kept list).
const isLiveTab = (path: string) => !!getRouteConfig(path)

export function dropDeadTabs<T extends Pick<TabStore, 'tabs' | 'activeTabPath'>>(state: T): T {
  const tabs = (state.tabs ?? []).filter(t => isLiveTab(t.path))
  const activeTabPath =
    state.activeTabPath && !isLiveTab(state.activeTabPath) ? tabs[0]?.path ?? null : state.activeTabPath
  return { ...state, tabs, activeTabPath }
}

interface TabStore {
  tabs: AppTab[]
  activeTabPath: string | null
  openTab: (path: string) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  closeAllTabs: () => void
  moveTab: (fromPath: string, toPath: string) => void
}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabPath: null,

      openTab: (path: string) => {
        const { tabs } = get()
        const exists = tabs.find(t => t.path === path)
        if (!exists) {
          set({ tabs: [...tabs, { path }], activeTabPath: path })
        } else {
          set({ activeTabPath: path })
        }
      },

      closeTab: (path: string) => {
        const { tabs, activeTabPath } = get()
        const idx = tabs.findIndex(t => t.path === path)
        const newTabs = tabs.filter(t => t.path !== path)

        let newActive = activeTabPath
        if (activeTabPath === path) {
          newActive = newTabs[idx]?.path ?? newTabs[Math.max(0, idx - 1)]?.path ?? null
        }

        set({ tabs: newTabs, activeTabPath: newActive })
      },

      setActiveTab: (path: string) => set({ activeTabPath: path }),

      closeAllTabs: () => set({ tabs: [], activeTabPath: null }),

      // Drag-reorder: pull the dragged tab out and drop it at the target's slot.
      moveTab: (fromPath: string, toPath: string) => {
        const { tabs } = get()
        const from = tabs.findIndex(t => t.path === fromPath)
        const to = tabs.findIndex(t => t.path === toPath)
        if (from === -1 || to === -1 || from === to) return
        const next = [...tabs]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        set({ tabs: next })
      },
    }),
    {
      name: 'mdt-app-tabs',
      merge: (persisted, current) => dropDeadTabs({ ...current, ...(persisted as Partial<TabStore>) }),
    }
  )
)
