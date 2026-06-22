import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  normalizePinnedToolPath,
  normalizePinnedToolsList,
} from '@/lib/pinned-tools-path'

interface PinnedToolsStore {
  pinnedTools: string[]
  setPinnedTools: (tools: string[]) => void
  togglePin: (toolUrl: string) => void
}

export const usePinnedToolsStore = create<PinnedToolsStore>()(
  persist(
    (set) => ({
      pinnedTools: [],
      setPinnedTools: (tools) =>
        set({ pinnedTools: normalizePinnedToolsList(tools) }),
      togglePin: (toolUrl) =>
        set((state) => {
          const list = normalizePinnedToolsList(state.pinnedTools)
          const key = normalizePinnedToolPath(toolUrl)
          const has = list.includes(key)
          return {
            pinnedTools: has
              ? list.filter((url) => url !== key)
              : [...list, key],
          }
        }),
    }),
    {
      name: 'pinned-tools-storage',
      version: 1,
      // migrate only runs when stored `version` is a number and !== options.version.
      // Legacy entries often omit version, so normalization must happen in merge too.
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<PinnedToolsStore>
        const raw = Array.isArray(p.pinnedTools)
          ? p.pinnedTools
          : currentState.pinnedTools
        return {
          ...currentState,
          ...p,
          pinnedTools: normalizePinnedToolsList(raw),
        }
      },
      migrate: (persistedState) => {
        const p = (persistedState ?? {}) as Partial<PinnedToolsStore>
        const raw = Array.isArray(p.pinnedTools) ? p.pinnedTools : []
        return {
          ...p,
          pinnedTools: normalizePinnedToolsList(raw),
        } as never
      },
    }
  )
)

/** Returns true once the persisted state has finished rehydrating from storage. */
export function usePinnedToolsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => usePinnedToolsStore.persist.hasHydrated())
  useEffect(() => {
    if (usePinnedToolsStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = usePinnedToolsStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])
  return hydrated
}
