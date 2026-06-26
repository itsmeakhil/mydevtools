// apps/web/src/store/workspace-store.ts
import { create } from "zustand"
import {
  listOrgs,
  listWorkspaces,
  setActiveWorkspace as setActiveAPI,
  type Org,
  type Workspace,
} from "@/lib/workspace-api"

type State = {
  orgs: Org[]
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  hydrated: boolean
}

type Actions = {
  loadFromBackend: () => Promise<void>
  setActiveWorkspace: (workspaceId: string) => Promise<void>
  clear: () => void
}

function pickDefault(workspaces: Workspace[]): string | null {
  const personal = workspaces.find((w) => w.is_personal)
  return personal?.id ?? workspaces[0]?.id ?? null
}

export const useWorkspaceStore = create<State & Actions>((set, get) => ({
  orgs: [],
  workspaces: [],
  activeWorkspaceId: null,
  hydrated: false,

  async loadFromBackend() {
    const [orgs, workspaces] = await Promise.all([listOrgs(), listWorkspaces()])
    const current = get().activeWorkspaceId
    const stillValid = current && workspaces.some((w) => w.id === current)
    set({
      orgs,
      workspaces,
      activeWorkspaceId: stillValid ? current : pickDefault(workspaces),
      hydrated: true,
    })
  },

  async setActiveWorkspace(workspaceId: string) {
    await setActiveAPI(workspaceId)
    set({ activeWorkspaceId: workspaceId })
  },

  clear() {
    set({ orgs: [], workspaces: [], activeWorkspaceId: null, hydrated: false })
  },
}))

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
