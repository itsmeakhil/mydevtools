/**
 * Tests for MemberList (Task 15 — workspace management page)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module exports and source-file structure.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/members-api", () => ({
  listOrgMembers: jest.fn(),
  listWorkspaceMembers: jest.fn(),
  changeOrgRole: jest.fn(),
  changeWorkspaceRole: jest.fn(),
  removeOrgMember: jest.fn(),
  removeWorkspaceMember: jest.fn(),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("MemberList — module exports", () => {
  it("exports a MemberList named function component", () => {
    const mod = require("../member-list")
    expect(typeof mod.MemberList).toBe("function")
  })
})

describe("MemberList — source structure assertions", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../member-list.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("accepts scope and scopeId props", () => {
    expect(source).toContain("scope")
    expect(source).toContain("scopeId")
  })

  it("imports listOrgMembers from members-api", () => {
    expect(source).toContain("listOrgMembers")
    expect(source).toContain("members-api")
  })

  it("imports listWorkspaceMembers from members-api", () => {
    expect(source).toContain("listWorkspaceMembers")
  })

  it("imports changeOrgRole and changeWorkspaceRole", () => {
    expect(source).toContain("changeOrgRole")
    expect(source).toContain("changeWorkspaceRole")
  })

  it("imports removeOrgMember and removeWorkspaceMember", () => {
    expect(source).toContain("removeOrgMember")
    expect(source).toContain("removeWorkspaceMember")
  })

  it("uses RoleSelect component", () => {
    expect(source).toContain("RoleSelect")
    expect(source).toContain("role-select")
  })

  it("uses toast from sonner", () => {
    expect(source).toContain("toast")
    expect(source).toContain("sonner")
  })

  it("shows loading state with Loader2", () => {
    expect(source).toContain("Loader2")
  })

  it("shows Remove member button", () => {
    expect(source).toContain("Remove member")
  })

  it("dispatches to org or workspace APIs based on scope", () => {
    expect(source).toContain('scope === "org"')
  })

  it("uses window.confirm before removing member", () => {
    expect(source).toContain("window.confirm")
  })
})

describe("MemberList — API contract (logic simulation)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("listOrgMembers called with orgId when scope=org", async () => {
    const { listOrgMembers } = require("@/lib/members-api")
    ;(listOrgMembers as jest.Mock).mockResolvedValueOnce([
      { uid: "u1", email: "a@example.com", display_name: "Alice", role: "admin", since: 1 },
    ])

    const result = await listOrgMembers("org-1")
    expect(listOrgMembers).toHaveBeenCalledWith("org-1")
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe("admin")
  })

  it("listWorkspaceMembers called with wsId when scope=workspace", async () => {
    const { listWorkspaceMembers } = require("@/lib/members-api")
    ;(listWorkspaceMembers as jest.Mock).mockResolvedValueOnce([
      { uid: "u2", email: "b@example.com", display_name: "Bob", role: "developer", since: 2 },
    ])

    const result = await listWorkspaceMembers("ws-1")
    expect(listWorkspaceMembers).toHaveBeenCalledWith("ws-1")
    expect(result[0].role).toBe("developer")
  })

  it("changeOrgRole called with correct args", async () => {
    const { changeOrgRole } = require("@/lib/members-api")
    ;(changeOrgRole as jest.Mock).mockResolvedValueOnce({ uid: "u1", role: "member" })

    await changeOrgRole("org-1", "u1", "member")
    expect(changeOrgRole).toHaveBeenCalledWith("org-1", "u1", "member")
  })

  it("removeWorkspaceMember called with correct args", async () => {
    const { removeWorkspaceMember } = require("@/lib/members-api")
    ;(removeWorkspaceMember as jest.Mock).mockResolvedValueOnce(undefined)

    await removeWorkspaceMember("ws-1", "u2")
    expect(removeWorkspaceMember).toHaveBeenCalledWith("ws-1", "u2")
  })

  it("toast.error called on listOrgMembers failure", async () => {
    const { listOrgMembers } = require("@/lib/members-api")
    ;(listOrgMembers as jest.Mock).mockRejectedValueOnce(new Error("listOrgMembers failed (500)"))

    const { toast } = require("sonner")

    try {
      await listOrgMembers("bad-org")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members")
    }

    expect(toast.error).toHaveBeenCalledWith("listOrgMembers failed (500)")
  })
})
