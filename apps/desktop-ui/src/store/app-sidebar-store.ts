'use client'

import { create } from 'zustand'

const KEY = 'mdt-app-sidebar-collapsed'

interface AppSidebarStore {
  collapsed: boolean
  /** Read the saved choice. Call after mount: the prerender has no storage, and
   *  reading it during the first render would cause a hydration mismatch. */
  hydrate: () => void
  toggle: () => void
}

export const useAppSidebarStore = create<AppSidebarStore>((set, get) => ({
  collapsed: false,
  hydrate: () => {
    try {
      set({ collapsed: localStorage.getItem(KEY) === '1' })
    } catch {}
  },
  toggle: () => {
    const collapsed = !get().collapsed
    set({ collapsed })
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0')
    } catch {}
  },
}))
