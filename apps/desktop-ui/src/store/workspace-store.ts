// apps/web/src/store/workspace-store.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  listWorkspaces,
  setActiveWorkspace as setActiveAPI,
  type Workspace,
} from "@/lib/workspace-api"
import {
  broadcastWorkspaceChanged,
  subscribeToWorkspaceBroadcast,
} from "@/lib/workspace-broadcast"

type State = {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  hydrated: boolean
  _broadcastSubscribed: boolean
}

type Actions = {
  loadFromBackend: () => Promise<void>
  setActiveWorkspace: (workspaceId: string) => Promise<void>
  clear: () => void
  subscribeOnce: () => void
}

function pickDefault(workspaces: Workspace[]): string | null {
  const personal = workspaces.find((w) => w.is_personal)
  return personal?.id ?? workspaces[0]?.id ?? null
}

export const useWorkspaceStore = create<State & Actions>()(
  persist(
    (set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  hydrated: false,
  _broadcastSubscribed: false,

  async loadFromBackend() {
    const workspaces = await listWorkspaces()
    const current = get().activeWorkspaceId
    const stillValid = current && workspaces.some((w) => w.id === current)
    const resolvedId = stillValid ? current : pickDefault(workspaces)
    set({
      workspaces,
      activeWorkspaceId: resolvedId,
      hydrated: true,
    })
    // Sync the backend's ACTIVE_WS cookie with the resolved id — otherwise on
    // reload the UI shows workspace X (from localStorage) while scoped API calls
    // hit workspace Y (from a stale/missing cookie). Fire-and-forget; cookie
    // mismatch is non-fatal during the round trip.
    if (resolvedId) {
      setActiveAPI(resolvedId).catch(() => {})
    }
  },

  async setActiveWorkspace(workspaceId: string) {
    // Optimistic — flip UI immediately, then persist the cookie server-side.
    // If the API fails (403/network), roll back so the switcher reflects truth.
    const prev = get().activeWorkspaceId
    set({ activeWorkspaceId: workspaceId })
    try {
      await setActiveAPI(workspaceId)
      broadcastWorkspaceChanged(workspaceId)
    } catch (e) {
      set({ activeWorkspaceId: prev })
      throw e
    }
  },

  clear() {
    set({ workspaces: [], activeWorkspaceId: null, hydrated: false })
  },

  subscribeOnce() {
    const alreadySubscribed = get()._broadcastSubscribed
    if (alreadySubscribed) return

    set({ _broadcastSubscribed: true })

    subscribeToWorkspaceBroadcast(async (msg) => {
      if (msg.type === "workspace-changed") {
        const currentId = get().activeWorkspaceId
        if (currentId === msg.workspaceId) return
        set({ activeWorkspaceId: msg.workspaceId })
        await get().loadFromBackend()
      }
    })
  },
}),
    {
      name: "mdt-workspace-store",
      // Persist the active id AND the workspace list. The list is still fetched
      // fresh by loadFromBackend() on mount, but caching it means useActiveWorkspace()
      // resolves immediately (and offline) instead of returning null until that
      // async fetch lands — otherwise sidebar pins (which RBAC-filter against the
      // active workspace) intermittently disappear while the dashboard still shows them.
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        workspaces: state.workspaces,
      }),
    },
  ),
)

// Initialize broadcast subscription on module load. Client only — on the
// server this set() would make persist warn that localStorage is unavailable.
if (typeof window !== "undefined") {
  useWorkspaceStore.getState().subscribeOnce()
}

export const useActiveWorkspace = (): Workspace | null => {
  return useWorkspaceStore((s) => {
    if (!s.activeWorkspaceId) return null
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? null
  })
}

export const useWorkspaceById = (id: string): Workspace | null => {
  return useWorkspaceStore((s) => s.workspaces.find((w) => w.id === id) ?? null)
}
