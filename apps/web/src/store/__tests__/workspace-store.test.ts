// apps/web/src/store/__tests__/workspace-store.test.ts
import { act } from "react"

jest.mock("@/lib/workspace-api", () => ({
  listWorkspaces: jest.fn(),
  setActiveWorkspace: jest.fn(),
}))

jest.mock("@/lib/workspace-broadcast", () => ({
  broadcastWorkspaceChanged: jest.fn(),
  subscribeToWorkspaceBroadcast: jest.fn(),
  getWorkspaceBroadcast: jest.fn(),
}))

import * as api from "@/lib/workspace-api"
import * as broadcast from "@/lib/workspace-broadcast"
import { useWorkspaceStore } from "../workspace-store"

describe("workspace-store", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().clear()
    jest.clearAllMocks()
    // loadFromBackend fire-and-forgets setActiveWorkspace(...).catch — give it a promise.
    ;(api.setActiveWorkspace as jest.Mock).mockResolvedValue(undefined)
    // Reset the broadcast mock to return a no-op function
    ;(broadcast.subscribeToWorkspaceBroadcast as jest.Mock).mockReturnValue(() => {})
  })

  it("loadFromBackend hydrates workspaces + defaults active to first workspace", async () => {
    ;(api.listWorkspaces as jest.Mock).mockResolvedValue([
      { id: "w1", name: "Personal", slug: "personal-u1", is_personal: true, kind: "personal", ws_role: "admin" },
    ])

    await act(async () => {
      await useWorkspaceStore.getState().loadFromBackend()
    })

    const state = useWorkspaceStore.getState()
    expect(state.hydrated).toBe(true)
    expect(state.workspaces).toHaveLength(1)
    expect(state.activeWorkspaceId).toBe("w1")
  })

  it("setActiveWorkspace posts to backend, updates state", async () => {
    ;(api.setActiveWorkspace as jest.Mock).mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      workspaces: [{ id: "w1" } as any, { id: "w2" } as any],
      activeWorkspaceId: "w1", hydrated: true,
    })

    await act(async () => {
      await useWorkspaceStore.getState().setActiveWorkspace("w2")
    })

    expect(api.setActiveWorkspace).toHaveBeenCalledWith("w2")
    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe("w2")
  })

  it("setActiveWorkspace broadcasts workspace change", async () => {
    ;(api.setActiveWorkspace as jest.Mock).mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      workspaces: [{ id: "w1" } as any, { id: "w2" } as any],
      activeWorkspaceId: "w1", hydrated: true,
    })

    await act(async () => {
      await useWorkspaceStore.getState().setActiveWorkspace("w2")
    })

    expect(broadcast.broadcastWorkspaceChanged).toHaveBeenCalledWith("w2")
  })

  it("subscribeOnce only subscribes once", () => {
    ;(broadcast.subscribeToWorkspaceBroadcast as jest.Mock).mockClear()
    ;(broadcast.subscribeToWorkspaceBroadcast as jest.Mock).mockReturnValue(() => {})

    // Reset the flag so we can test subscribeOnce behavior
    useWorkspaceStore.setState({ _broadcastSubscribed: false })

    act(() => {
      useWorkspaceStore.getState().subscribeOnce()
      useWorkspaceStore.getState().subscribeOnce()
    })

    expect(broadcast.subscribeToWorkspaceBroadcast).toHaveBeenCalledTimes(1)
  })

  it("broadcast subscription ignores unchanged workspace ID", async () => {
    ;(api.listWorkspaces as jest.Mock).mockResolvedValue([])

    let capturedHandler: Function | null = null
    ;(broadcast.subscribeToWorkspaceBroadcast as jest.Mock).mockImplementation(
      (handler: Function) => {
        capturedHandler = handler
        return () => {}
      }
    )

    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: "w1", hydrated: true,
      _broadcastSubscribed: false,
    })

    let loadCount = 0
    ;(api.listWorkspaces as jest.Mock).mockImplementation(async () => {
      loadCount++
      return []
    })

    act(() => {
      useWorkspaceStore.getState().subscribeOnce()
    })

    // Simulate a broadcast message with same workspace ID
    await act(async () => {
      if (capturedHandler) {
        capturedHandler({ type: "workspace-changed", workspaceId: "w1" })
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    // loadFromBackend should not be called since workspace ID hasn't changed
    expect(loadCount).toBe(0)
  })

  it("broadcast subscription updates state on different workspace ID", async () => {
    ;(api.listWorkspaces as jest.Mock).mockResolvedValue([
      { id: "w1", is_personal: false } as any,
      { id: "w2", is_personal: false } as any,
    ])

    let capturedHandler: Function | null = null
    ;(broadcast.subscribeToWorkspaceBroadcast as jest.Mock).mockImplementation(
      (handler: Function) => {
        capturedHandler = handler
        return () => {}
      }
    )

    useWorkspaceStore.setState({
      workspaces: [],
      activeWorkspaceId: "w1", hydrated: true,
      _broadcastSubscribed: false,
    })

    act(() => {
      useWorkspaceStore.getState().subscribeOnce()
    })

    // Simulate a broadcast message with different workspace ID
    await act(async () => {
      if (capturedHandler) {
        capturedHandler({ type: "workspace-changed", workspaceId: "w2" })
      }
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const state = useWorkspaceStore.getState()
    expect(state.activeWorkspaceId).toBe("w2")
    expect(api.listWorkspaces).toHaveBeenCalled()
  })
})
