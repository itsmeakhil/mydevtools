import { create } from "zustand"
import { getWorkspaceDekWrap } from "@/lib/workspace-dek-api"
import { unwrapDek } from "@/lib/workspace-crypto"
import { useUserKeypairStore } from "@/store/user-keypair-store"

type CachedDek = { key: CryptoKey; version: number }

type State = {
  deks: Map<string, CachedDek>
}

type Actions = {
  getDek: (workspaceId: string) => Promise<CryptoKey | null>
  clear: () => void
  clearWorkspace: (workspaceId: string) => void
}

export const useWorkspaceDekStore = create<State & Actions>((set, get) => ({
  deks: new Map(),

  async getDek(workspaceId: string): Promise<CryptoKey | null> {
    const cached = get().deks.get(workspaceId)
    if (cached) return cached.key

    const privateKey = useUserKeypairStore.getState().privateKey
    if (!privateKey) return null

    const wrap = await getWorkspaceDekWrap(workspaceId)
    if (!wrap.wrappedDek) return null

    const dek = await unwrapDek(wrap.wrappedDek, privateKey)
    set((state) => {
      const next = new Map(state.deks)
      next.set(workspaceId, { key: dek, version: wrap.wrappedDekVersion })
      return { deks: next }
    })
    return dek
  },

  clear() {
    set({ deks: new Map() })
  },

  clearWorkspace(workspaceId: string) {
    set((state) => {
      if (!state.deks.has(workspaceId)) return state
      const next = new Map(state.deks)
      next.delete(workspaceId)
      return { deks: next }
    })
  },
}))

export const useCachedWorkspaceDek = (workspaceId: string | null): CryptoKey | null => {
  return useWorkspaceDekStore((s) => {
    if (!workspaceId) return null
    return s.deks.get(workspaceId)?.key ?? null
  })
}
