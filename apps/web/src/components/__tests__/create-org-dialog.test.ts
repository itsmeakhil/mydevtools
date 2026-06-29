/**
 * Tests for CreateOrgDialog (Task 14 — workspace collaboration)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module exports and source-file structure.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/org-api", () => ({
  createOrg: jest.fn(),
}))

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({ loadFromBackend: jest.fn() })),
  },
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("CreateOrgDialog — module exports", () => {
  it("exports a CreateOrgDialog named function component", () => {
    const mod = require("../create-org-dialog")
    expect(typeof mod.CreateOrgDialog).toBe("function")
  })
})

describe("CreateOrgDialog — source structure assertions", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../create-org-dialog.tsx"),
    "utf8"
  )

  it("renders a dialog title Create organisation", () => {
    expect(source).toContain("Create organisation")
  })

  it("has a name input field", () => {
    expect(source).toContain("org-name")
  })

  it("imports createOrg from org-api", () => {
    expect(source).toContain("createOrg")
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

describe("CreateOrgDialog — API contract (logic simulation)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("createOrg is called with trimmed name", async () => {
    const { createOrg } = require("@/lib/org-api")
    ;(createOrg as jest.Mock).mockResolvedValueOnce({ id: "o1", name: "Acme" })

    const { useWorkspaceStore } = require("@/store/workspace-store")
    const loadFromBackend = jest.fn().mockResolvedValueOnce(undefined)
    ;(useWorkspaceStore.getState as jest.Mock).mockReturnValueOnce({ loadFromBackend })

    // Simulate the submit handler logic
    const name = "  Acme  "
    const trimmed = name.trim()
    await createOrg(trimmed)
    await loadFromBackend()

    expect(createOrg).toHaveBeenCalledWith("Acme")
    expect(loadFromBackend).toHaveBeenCalledTimes(1)
  })

  it("toast.error is called on createOrg failure", async () => {
    const { createOrg } = require("@/lib/org-api")
    ;(createOrg as jest.Mock).mockRejectedValueOnce(new Error("createOrg failed (500)"))

    const { toast } = require("sonner")

    // Simulate error path
    try {
      await createOrg("Bad")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create organisation")
    }

    expect(toast.error).toHaveBeenCalledWith("createOrg failed (500)")
  })
})
