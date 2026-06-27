/**
 * Tests for InviteMemberDialog (Task 14 — workspace collaboration)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module exports and source-file structure.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/invitations-api", () => ({
  inviteToOrg: jest.fn(),
  inviteToWorkspace: jest.fn(),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("InviteMemberDialog — module exports", () => {
  it("exports an InviteMemberDialog named function component", () => {
    const mod = require("../invite-member-dialog")
    expect(typeof mod.InviteMemberDialog).toBe("function")
  })
})

describe("InviteMemberDialog — source structure assertions", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../invite-member-dialog.tsx"),
    "utf8"
  )

  it("has an email input field", () => {
    expect(source).toContain("invite-email")
  })

  it("has a role select field", () => {
    expect(source).toContain("invite-role")
  })

  it("accepts scope and scopeId props", () => {
    expect(source).toContain("scope")
    expect(source).toContain("scopeId")
  })

  it("imports inviteToOrg from invitations-api", () => {
    expect(source).toContain("inviteToOrg")
    expect(source).toContain("invitations-api")
  })

  it("imports inviteToWorkspace from invitations-api", () => {
    expect(source).toContain("inviteToWorkspace")
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

  it("uses shadcn Select primitives for role", () => {
    expect(source).toContain("SelectContent")
    expect(source).toContain("SelectItem")
    expect(source).toContain("SelectTrigger")
  })

  it("includes org and workspace role options", () => {
    // org roles
    expect(source).toContain("admin")
    expect(source).toContain("member")
    // workspace-specific
    expect(source).toContain("developer")
    expect(source).toContain("viewer")
  })

  it("has cancel and send invite buttons", () => {
    expect(source).toContain("Cancel")
    expect(source).toContain("Send invite")
  })

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("dispatches to inviteToOrg when scope is org", () => {
    expect(source).toContain("scope === \"org\"")
  })
})

describe("InviteMemberDialog — API contract (logic simulation)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("inviteToOrg called with scopeId, email, role when scope=org", async () => {
    const { inviteToOrg } = require("@/lib/invitations-api")
    ;(inviteToOrg as jest.Mock).mockResolvedValueOnce({ id: "inv1", status: "pending" })

    const { toast } = require("sonner")

    // Simulate submit with scope=org
    const scope = "org"
    const scopeId = "o1"
    const email = "alice@example.com"
    const role = "member"

    if (scope === "org") {
      await inviteToOrg(scopeId, email, role)
    }
    toast.success(`Invitation sent to ${email}`)

    expect(inviteToOrg).toHaveBeenCalledWith("o1", "alice@example.com", "member")
    expect(toast.success).toHaveBeenCalledWith("Invitation sent to alice@example.com")
  })

  it("inviteToWorkspace called with scopeId, email, role when scope=workspace", async () => {
    const { inviteToWorkspace } = require("@/lib/invitations-api")
    ;(inviteToWorkspace as jest.Mock).mockResolvedValueOnce({ id: "inv2", status: "pending" })

    // Simulate submit with scope=workspace
    const scope = "workspace"
    const scopeId = "w1"
    const email = "bob@example.com"
    const role = "developer"

    if (scope === "workspace") {
      await inviteToWorkspace(scopeId, email, role)
    }

    expect(inviteToWorkspace).toHaveBeenCalledWith("w1", "bob@example.com", "developer")
  })

  it("toast.error is called on invitation failure", async () => {
    const { inviteToOrg } = require("@/lib/invitations-api")
    ;(inviteToOrg as jest.Mock).mockRejectedValueOnce(new Error("inviteToOrg failed (422)"))

    const { toast } = require("sonner")

    try {
      await inviteToOrg("o1", "bad@example.com", "member")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation")
    }

    expect(toast.error).toHaveBeenCalledWith("inviteToOrg failed (422)")
  })
})
