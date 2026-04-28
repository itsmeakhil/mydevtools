import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AutoCopyState {
  autoCopy: boolean
  setAutoCopy: (enabled: boolean) => void
}

export const useAutoCopyStore = create<AutoCopyState>()(
  persist(
    (set) => ({
      autoCopy: false,
      setAutoCopy: (enabled) => set({ autoCopy: enabled }),
    }),
    {
      name: 'auto-copy-storage',
    }
  )
)
