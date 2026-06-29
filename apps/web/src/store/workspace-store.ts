// apps/web/src/store/workspace-store.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  listOrgs,
  listWorkspaces,
  setActiveWorkspace as setActiveAPI,
  type Org,
  type Workspace,
} from "@/lib/workspace-api"
import {
  broadcastWorkspaceChanged,
  subscribeToWorkspaceBroadcast,
} from "@/lib/workspace-broadcast"

type State = {
  orgs: Org[]
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  hydrated: boolean
  _broadcastSubscribed: boolean
}

type Actions = {
  loadFromBackend: () => Promise<void>
  setActiveWorkspace: (workspaceId: string) => Promise<void>
  setActiveOrg: (orgId: string) => Promise<void>
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
  orgs: [],
  workspaces: [],
  activeWorkspaceId: null,
  hydrated: false,
  _broadcastSubscribed: false,

  async loadFromBackend() {
    const [orgs, workspaces] = await Promise.all([listOrgs(), listWorkspaces()])
    const current = get().activeWorkspaceId
    const stillValid = current && workspaces.some((w) => w.id === current)
    const resolvedId = stillValid ? current : pickDefault(workspaces)
    set({
      orgs,
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

  async setActiveOrg(orgId: string) {
    // Pick a workspace in that org — prefer the user's personal workspace there,
    // else the first one. The active-workspace switch is what flips the org too.
    const { workspaces, activeWorkspaceId } = get()
    const inOrg = workspaces.filter((w) => w.org_id === orgId)
    if (inOrg.length === 0) return
    const current = workspaces.find((w) => w.id === activeWorkspaceId)
    if (current?.org_id === orgId) return
    const target = inOrg.find((w) => w.is_personal) ?? inOrg[0]
    await get().setActiveWorkspace(target.id)
  },

  clear() {
    set({ orgs: [], workspaces: [], activeWorkspaceId: null, hydrated: false })
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
      // Persist ONLY the active workspace id so reloads keep the user's choice.
      // Orgs/workspaces lists come fresh from backend on every mount.
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    },
  ),
)

// Initialize broadcast subscription on module load
useWorkspaceStore.getState().subscribeOnce()

export const useActiveWorkspace = (): Workspace | null => {
  return useWorkspaceStore((s) => {
    if (!s.activeWorkspaceId) return null
    return s.workspaces.find((w) => w.id === s.activeWorkspaceId) ?? null
  })
}

export const useActiveOrg = (): Org | null => {
  return useWorkspaceStore((s) => {
    const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId)
    if (!ws) return null
    return s.orgs.find((o) => o.id === ws.org_id) ?? null
  })
}

export const useWorkspaceById = (id: string): Workspace | null => {
  return useWorkspaceStore((s) => s.workspaces.find((w) => w.id === id) ?? null)
}
