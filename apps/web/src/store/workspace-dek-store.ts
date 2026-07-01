import { create } from "zustand"
import { getWorkspaceDekWrap } from "@/lib/workspace-dek-api"
import { unwrapDek, dekFingerprint } from "@/lib/workspace-crypto"
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
    const privateKey = useUserKeypairStore.getState().privateKey
    if (!privateKey) return null

    // Always fetch the current wrap so we detect rotations. Reuse the cached key
    // only when the server's version still matches (M-2: stale-cache after
    // rotation would decrypt-fail or write under a dead key).
    const wrap = await getWorkspaceDekWrap(workspaceId)
    if (!wrap.wrappedDek) return null

    const cached = get().deks.get(workspaceId)
    if (cached && cached.version === wrap.wrappedDekVersion) return cached.key

    const dek = await unwrapDek(wrap.wrappedDek, privateKey)

    // M-1: verify the unwrapped DEK matches the workspace's published fingerprint
    // before trusting it. A tampered/substituted wrap (buggy or malicious sender)
    // would otherwise silently yield a DEK divergent from the rest of the team.
    if (wrap.expectedFingerprint) {
      const fp = await dekFingerprint(dek)
      if (fp !== wrap.expectedFingerprint) {
        throw new Error(
          "Workspace key verification failed: unwrapped DEK does not match the workspace fingerprint.",
        )
      }
    }

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
