import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PinnedToolsStore {
  pinnedTools: string[]
  setPinnedTools: (tools: string[]) => void
  togglePin: (toolUrl: string) => void
}

export const usePinnedToolsStore = create<PinnedToolsStore>()(
  persist(
    (set) => ({
      pinnedTools: [],
      setPinnedTools: (tools) => set({ pinnedTools: tools }),
      togglePin: (toolUrl) =>
        set((state) => ({
          pinnedTools: state.pinnedTools.includes(toolUrl)
            ? state.pinnedTools.filter((url) => url !== toolUrl)
            : [...state.pinnedTools, toolUrl],
        })),
    }),
    { name: 'pinned-tools-storage' }
  )
)
