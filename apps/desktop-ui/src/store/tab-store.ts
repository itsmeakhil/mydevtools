'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppTab {
  path: string
}

// Routes that no longer exist. Persisted tabs pointing at them would render a
// dead chip with null content, so they are dropped on rehydrate.
const REMOVED_TAB_PATHS = new Set(['/app/sql-client', '/app/database-explorer'])

interface TabStore {
  tabs: AppTab[]
  activeTabPath: string | null
  openTab: (path: string) => void
  closeTab: (path: string) => void
  setActiveTab: (path: string) => void
  closeAllTabs: () => void
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
    }),
    {
      name: 'mdt-app-tabs',
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<TabStore>) }
        state.tabs = (state.tabs ?? []).filter(t => !REMOVED_TAB_PATHS.has(t.path))
        if (state.activeTabPath && REMOVED_TAB_PATHS.has(state.activeTabPath)) {
          state.activeTabPath = state.tabs[0]?.path ?? null
        }
        return state
      },
    }
  )
)
