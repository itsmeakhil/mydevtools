// apps/web/src/store/__tests__/workspace-store.test.ts
import { act } from "react"
import { useWorkspaceStore } from "../workspace-store"

jest.mock("@/lib/workspace-api", () => ({
  listOrgs: jest.fn(),
  listWorkspaces: jest.fn(),
  setActiveWorkspace: jest.fn(),
}))

import * as api from "@/lib/workspace-api"

describe("workspace-store", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clear()
    jest.clearAllMocks()
  })

  it("loadFromBackend hydrates orgs + workspaces + defaults active to first workspace", async () => {
    ;(api.listOrgs as jest.Mock).mockResolvedValue([
      { id: "o1", name: "MyDevTools Cloud", slug: "mydevtools-cloud", kind: "system", org_role: "member" },
    ])
    ;(api.listWorkspaces as jest.Mock).mockResolvedValue([
      { id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1", is_personal: true, kind: "personal", ws_role: "admin" },
    ])

    await act(async () => {
      await useWorkspaceStore.getState().loadFromBackend()
    })

    const state = useWorkspaceStore.getState()
    expect(state.hydrated).toBe(true)
    expect(state.orgs).toHaveLength(1)
    expect(state.workspaces).toHaveLength(1)
    expect(state.activeWorkspaceId).toBe("w1")
  })

  it("setActiveWorkspace posts to backend, updates state", async () => {
    ;(api.setActiveWorkspace as jest.Mock).mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      orgs: [], workspaces: [{ id: "w1" } as any, { id: "w2" } as any],
      activeWorkspaceId: "w1", hydrated: true,
    })

    await act(async () => {
      await useWorkspaceStore.getState().setActiveWorkspace("w2")
    })

    expect(api.setActiveWorkspace).toHaveBeenCalledWith("w2")
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2")
  })
})
