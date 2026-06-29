// apps/web/src/store/__tests__/pinned-tools-store.test.ts
//
// Note: testEnvironment is "jest-environment-node" — no DOM, no React rendering.
// Assertions are purely against Zustand state via getState() after action calls.
// This mirrors the pattern established in workspace-store.test.ts (T21) and
// workspace-switcher.test.tsx (T22).

import { usePinnedToolsStore } from "../pinned-tools-store"

describe("pinned-tools-store v2 shape", () => {
  beforeEach(() => {
    usePinnedToolsStore.setState({ pinnedByWorkspace: {} })
  })

  it("toggle adds and removes a pin under the workspace key", () => {
    usePinnedToolsStore.getState().togglePin("w1", "/app/json-formatter")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual(["/app/json-formatter"])
    usePinnedToolsStore.getState().togglePin("w1", "/app/json-formatter")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual([])
  })

  it("setPinnedTools normalizes paths", () => {
    usePinnedToolsStore.getState().setPinnedTools("w1", ["json-formatter", "/app/passwords/"])
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual([
      "/app/json-formatter",
      "/app/passwords",
    ])
  })

  it("pins are isolated across workspaces", () => {
    usePinnedToolsStore.getState().togglePin("w1", "/app/passwords")
    usePinnedToolsStore.getState().togglePin("w2", "/app/notes")
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w1"]).toEqual(["/app/passwords"])
    expect(usePinnedToolsStore.getState().pinnedByWorkspace["w2"]).toEqual(["/app/notes"])
  })
})
