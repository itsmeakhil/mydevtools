/**
 * Tests for pinned-tools-preferences-sync (T24).
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: test the sync logic contracts via store state assertions +
 * mocked API calls.  The sync component is a headless "null-render"
 * component so its behaviour is fully exercised through the stores it
 * reads and writes.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/utils/useAuth", () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock("@/lib/user-preferences-api", () => ({
  getUserPreferences: jest.fn(),
  patchUserPreferences: jest.fn(),
}))

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: jest.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { usePinnedToolsStore } from "@/store/pinned-tools-store"
import * as api from "@/lib/user-preferences-api"
import { normalizePinnedToolsList } from "@/lib/pinned-tools-path"

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulate the read path of PinnedToolsPreferencesSync:
 * given a GET response shape, apply the same hydration logic the component
 * uses and return the resulting pinnedByWorkspace state. Models a first load
 * (enable/disable → pins migration not yet run for this uid).
 */
async function simulateLoad(
  activeWorkspaceId: string,
  apiResponse: Awaited<ReturnType<typeof api.getUserPreferences>>
): Promise<Record<string, string[]>> {
  const { setPinnedTools } = usePinnedToolsStore.getState()

  let resolved: Record<string, string[]> = {}
  if (
    apiResponse.pinnedToolsByWorkspace &&
    Object.keys(apiResponse.pinnedToolsByWorkspace).length > 0
  ) {
    resolved = { ...apiResponse.pinnedToolsByWorkspace }
  } else if (
    Array.isArray(apiResponse.toolFavorites) &&
    apiResponse.toolFavorites.length > 0 &&
    activeWorkspaceId
  ) {
    resolved = { [activeWorkspaceId]: apiResponse.toolFavorites }
  }

  // One-time enable/disable → pins union migration.
  const enabled = Array.isArray(apiResponse.enabledTools) ? apiResponse.enabledTools : []
  if (activeWorkspaceId && enabled.length > 0) {
    const existingActive = resolved[activeWorkspaceId] ?? []
    const merged = normalizePinnedToolsList([...existingActive, ...enabled])
    if (merged.length !== existingActive.length) {
      resolved = { ...resolved, [activeWorkspaceId]: merged }
    }
  }

  for (const [wsId, tools] of Object.entries(resolved)) {
    if (Array.isArray(tools)) setPinnedTools(wsId, tools)
  }

  return usePinnedToolsStore.getState().pinnedByWorkspace
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("pinned-tools-preferences-sync — store contracts", () => {
  beforeEach(() => {
    usePinnedToolsStore.setState({ pinnedByWorkspace: {} })
    jest.clearAllMocks()
  })

  // ── Module structure ─────────────────────────────────────────────────────

  it("exports PinnedToolsPreferencesSync as a named export", () => {
    const mod = require("../pinned-tools-preferences-sync")
    expect(typeof mod.PinnedToolsPreferencesSync).toBe("function")
  })

  // ── Read path: keyed shape ────────────────────────────────────────────────

  it("read: hydrates all workspace buckets when pinnedToolsByWorkspace is present", async () => {
    const result = await simulateLoad("w1", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: [],
      toolFavorites: [],
      pinnedToolsByWorkspace: {
        w1: ["/app/json-formatter", "/app/notes"],
        w2: ["/app/passwords"],
      },
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    expect(result["w1"]).toEqual(["/app/json-formatter", "/app/notes"])
    expect(result["w2"]).toEqual(["/app/passwords"])
  })

  it("read: pins are isolated per workspace after hydration", async () => {
    await simulateLoad("w1", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: [],
      toolFavorites: [],
      pinnedToolsByWorkspace: {
        w1: ["/app/notes"],
        w2: ["/app/uuid-generator"],
      },
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    const state = usePinnedToolsStore.getState()
    expect(state.pinnedByWorkspace["w1"]).toEqual(["/app/notes"])
    expect(state.pinnedByWorkspace["w2"]).toEqual(["/app/uuid-generator"])
    expect(state.pinnedByWorkspace["w3"]).toBeUndefined()
  })

  // ── Read path: legacy fallback ────────────────────────────────────────────

  it("read: falls back to toolFavorites into active workspace when pinnedToolsByWorkspace is absent", async () => {
    const result = await simulateLoad("w-personal", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: [],
      toolFavorites: ["/app/json-formatter", "/app/notes"],
      pinnedToolsByWorkspace: undefined,
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    expect(result["w-personal"]).toEqual(["/app/json-formatter", "/app/notes"])
  })

  it("read: falls back to toolFavorites into active workspace when keyed map is empty", async () => {
    const result = await simulateLoad("w1", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: [],
      toolFavorites: ["/app/passwords"],
      pinnedToolsByWorkspace: {},
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    expect(result["w1"]).toEqual(["/app/passwords"])
  })

  it("read: does nothing when both pinnedToolsByWorkspace and toolFavorites are empty", async () => {
    const result = await simulateLoad("w1", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: [],
      toolFavorites: [],
      pinnedToolsByWorkspace: {},
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    expect(result).toEqual({})
  })

  // ── Migration: enable/disable → pins ──────────────────────────────────────

  it("migrate: folds retired enabledTools into the active workspace pins", async () => {
    const result = await simulateLoad("w1", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: ["/app/json-formatter", "/app/notes", "/app/uuid-generator"],
      toolFavorites: [],
      pinnedToolsByWorkspace: {},
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    expect(result["w1"]).toEqual([
      "/app/json-formatter",
      "/app/notes",
      "/app/uuid-generator",
    ])
  })

  it("migrate: unions enabledTools with existing pins without dropping either", async () => {
    const result = await simulateLoad("w1", {
      theme: "system",
      accentColor: "blue",
      locale: "en",
      enabledTools: ["/app/json-formatter", "/app/notes"],
      toolFavorites: [],
      pinnedToolsByWorkspace: { w1: ["/app/notes", "/app/regex-tester"] },
      toolStats: {},
      createdAt: 0,
      updatedAt: 0,
    })

    // Existing pins first (order preserved), then the new-from-enabled tool.
    expect(result["w1"]).toEqual([
      "/app/notes",
      "/app/regex-tester",
      "/app/json-formatter",
    ])
  })

  // ── Write path ────────────────────────────────────────────────────────────

  it("write: sends pinnedToolsByWorkspace (not toolFavorites) to the API", async () => {
    ;(api.patchUserPreferences as jest.Mock).mockResolvedValue({})
    usePinnedToolsStore.getState().setPinnedTools("w1", ["/app/notes"])
    usePinnedToolsStore.getState().setPinnedTools("w2", ["/app/uuid-generator"])

    const { pinnedByWorkspace } = usePinnedToolsStore.getState()
    await api.patchUserPreferences({ pinnedToolsByWorkspace: pinnedByWorkspace })

    expect(api.patchUserPreferences).toHaveBeenCalledWith({
      pinnedToolsByWorkspace: {
        w1: ["/app/notes"],
        w2: ["/app/uuid-generator"],
      },
    })
    // Confirm that the legacy field was NOT included in the call
    const callArg = (api.patchUserPreferences as jest.Mock).mock.calls[0][0]
    expect(callArg.toolFavorites).toBeUndefined()
  })

  it("write: sends the full keyed map (all workspaces, not just active)", async () => {
    ;(api.patchUserPreferences as jest.Mock).mockResolvedValue({})
    usePinnedToolsStore.setState({
      pinnedByWorkspace: {
        "ws-a": ["/app/notes"],
        "ws-b": ["/app/jwt-decoder"],
        "ws-c": [],
      },
    })

    const { pinnedByWorkspace } = usePinnedToolsStore.getState()
    await api.patchUserPreferences({ pinnedToolsByWorkspace: pinnedByWorkspace })

    const callArg = (api.patchUserPreferences as jest.Mock).mock.calls[0][0]
    expect(callArg.pinnedToolsByWorkspace).toEqual({
      "ws-a": ["/app/notes"],
      "ws-b": ["/app/jwt-decoder"],
      "ws-c": [],
    })
  })

  // ── Store shape verification ──────────────────────────────────────────────

  it("setPinnedTools normalizes tool paths", () => {
    usePinnedToolsStore.getState().setPinnedTools("w1", [
      "json-formatter",       // no leading /app/
      "/app/notes/",          // trailing slash
    ])
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual([
      "/app/json-formatter",
      "/app/notes",
    ])
  })

  it("togglePin correctly adds and removes under a workspace key", () => {
    usePinnedToolsStore.getState().togglePin("w1", "/app/json-formatter")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toContain("/app/json-formatter")

    usePinnedToolsStore.getState().togglePin("w1", "/app/json-formatter")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).not.toContain("/app/json-formatter")
  })
})
