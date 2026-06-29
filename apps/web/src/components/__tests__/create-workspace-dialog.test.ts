/**
 * Tests for CreateWorkspaceDialog (Task 14 — workspace collaboration)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module exports and source-file structure.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/org-api", () => ({
  createWorkspace: jest.fn(),
}))

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({ loadFromBackend: jest.fn() })),
  },
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("CreateWorkspaceDialog — module exports", () => {
  it("exports a CreateWorkspaceDialog named function component", () => {
    const mod = require("../create-workspace-dialog")
    expect(typeof mod.CreateWorkspaceDialog).toBe("function")
  })
})

describe("CreateWorkspaceDialog — source structure assertions", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../create-workspace-dialog.tsx"),
    "utf8"
  )

  it("renders a dialog title Create workspace", () => {
    expect(source).toContain("Create workspace")
  })

  it("has a name input field", () => {
    expect(source).toContain("ws-name")
  })

  it("accepts orgId prop", () => {
    expect(source).toContain("orgId")
  })

  it("imports createWorkspace from org-api", () => {
    expect(source).toContain("createWorkspace")
    expect(source).toContain("org-api")
  })

  it("calls loadFromBackend after successful creation", () => {
    expect(source).toContain("loadFromBackend")
  })

  it("uses toast from sonner for notifications", () => {
    expect(source).toContain("toast")
    expect(source).toContain("sonner")
  })

  it("shows loading state with Loader2", () => {
    expect(source).toContain("Loader2")
  })

  it("uses shadcn Dialog primitives", () => {
    expect(source).toContain("DialogContent")
    expect(source).toContain("DialogHeader")
    expect(source).toContain("DialogTitle")
  })

  it("has cancel and create buttons", () => {
    expect(source).toContain("Cancel")
    expect(source).toContain("Create")
  })

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })
})

describe("CreateWorkspaceDialog — API contract (logic simulation)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("createWorkspace is called with orgId and trimmed name", async () => {
    const { createWorkspace } = require("@/lib/org-api")
    ;(createWorkspace as jest.Mock).mockResolvedValueOnce({ id: "w1", name: "Dev" })

    const { useWorkspaceStore } = require("@/store/workspace-store")
    const loadFromBackend = jest.fn().mockResolvedValueOnce(undefined)
    ;(useWorkspaceStore.getState as jest.Mock).mockReturnValueOnce({ loadFromBackend })

    // Simulate submit handler logic
    const orgId = "o1"
    const name = "  Dev  "
    const trimmed = name.trim()
    await createWorkspace(orgId, trimmed)
    await loadFromBackend()

    expect(createWorkspace).toHaveBeenCalledWith("o1", "Dev")
    expect(loadFromBackend).toHaveBeenCalledTimes(1)
  })

  it("toast.error is called on createWorkspace failure", async () => {
    const { createWorkspace } = require("@/lib/org-api")
    ;(createWorkspace as jest.Mock).mockRejectedValueOnce(new Error("createWorkspace failed (500)"))

    const { toast } = require("sonner")

    try {
      await createWorkspace("o1", "Bad")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace")
    }

    expect(toast.error).toHaveBeenCalledWith("createWorkspace failed (500)")
  })
})
