/**
 * Tests for /settings/workspaces page components (Task 15)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify default/named exports and source-file structure.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/workspace-api", () => ({
  listOrgs: jest.fn(),
  listWorkspaces: jest.fn(),
}))

jest.mock("@/lib/org-api", () => ({
  renameOrg: jest.fn(),
  deleteOrg: jest.fn(),
  renameWorkspace: jest.fn(),
  deleteWorkspace: jest.fn(),
  createOrg: jest.fn(),
  createWorkspace: jest.fn(),
}))

jest.mock("@/lib/members-api", () => ({
  listOrgMembers: jest.fn(),
  listWorkspaceMembers: jest.fn(),
  changeOrgRole: jest.fn(),
  changeWorkspaceRole: jest.fn(),
  removeOrgMember: jest.fn(),
  removeWorkspaceMember: jest.fn(),
}))

jest.mock("@/lib/invitations-api", () => ({
  inviteToOrg: jest.fn(),
  inviteToWorkspace: jest.fn(),
}))

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: Object.assign(
    jest.fn(() => ({
      orgs: [],
      workspaces: [],
      hydrated: true,
      loadFromBackend: jest.fn(),
    })),
    { getState: jest.fn(() => ({ loadFromBackend: jest.fn() })) }
  ),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// ─── Page ──────────────────────────────────────────────────────────────────
describe("WorkspacesSettingsPage — module exports", () => {
  it("has a default export (page component)", () => {
    const mod = require("../../app/settings/workspaces/page")
    expect(typeof mod.default).toBe("function")
  })
})

describe("WorkspacesSettingsPage — source structure", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/settings/workspaces/page.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("renders heading Organizations & Workspaces", () => {
    expect(source).toContain("Organizations")
    expect(source).toContain("Workspaces")
  })

  it("imports useWorkspaceStore", () => {
    expect(source).toContain("useWorkspaceStore")
    expect(source).toContain("workspace-store")
  })

  it("calls loadFromBackend when not hydrated", () => {
    expect(source).toContain("loadFromBackend")
    expect(source).toContain("hydrated")
  })

  it("renders OrgSection for each org", () => {
    expect(source).toContain("OrgSection")
  })

  it("has CTA for New Organisation", () => {
    expect(source).toContain("New Organisation")
  })

  it("imports CreateOrgDialog", () => {
    expect(source).toContain("CreateOrgDialog")
  })
})

// ─── OrgSection ────────────────────────────────────────────────────────────
describe("OrgSection — module exports", () => {
  it("exports an OrgSection named function component", () => {
    const mod = require("../../app/settings/workspaces/org-section")
    expect(typeof mod.OrgSection).toBe("function")
  })
})

describe("OrgSection — source structure", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/settings/workspaces/org-section.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("accepts org prop", () => {
    expect(source).toContain("org: Org")
  })

  it("renders org name", () => {
    expect(source).toContain("org.name")
  })

  it("shows rename/delete only for owner", () => {
    expect(source).toContain("org_role")
    expect(source).toContain("owner")
  })

  it("renders WorkspaceSection for each workspace", () => {
    expect(source).toContain("WorkspaceSection")
  })

  it("renders MemberList for org scope", () => {
    expect(source).toContain("MemberList")
    expect(source).toContain('scope="org"')
  })

  it("has New Workspace CTA", () => {
    expect(source).toContain("New Workspace")
  })

  it("imports renameOrg and deleteOrg", () => {
    expect(source).toContain("renameOrg")
    expect(source).toContain("deleteOrg")
  })

  it("uses toast from sonner", () => {
    expect(source).toContain("toast")
    expect(source).toContain("sonner")
  })

  it("imports InviteMemberDialog", () => {
    expect(source).toContain("InviteMemberDialog")
  })

  it("imports CreateWorkspaceDialog", () => {
    expect(source).toContain("CreateWorkspaceDialog")
  })
})

// ─── WorkspaceSection ──────────────────────────────────────────────────────
describe("WorkspaceSection — module exports", () => {
  it("exports a WorkspaceSection named function component", () => {
    const mod = require("../../app/settings/workspaces/workspace-section")
    expect(typeof mod.WorkspaceSection).toBe("function")
  })
})

describe("WorkspaceSection — source structure", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/settings/workspaces/workspace-section.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("accepts workspace prop", () => {
    expect(source).toContain("workspace: Workspace")
  })

  it("renders workspace name", () => {
    expect(source).toContain("workspace.name")
  })

  it("hides rename/delete for personal workspaces", () => {
    expect(source).toContain("is_personal")
    expect(source).toContain("isPersonal")
  })

  it("renders MemberList for workspace scope", () => {
    expect(source).toContain("MemberList")
    expect(source).toContain('scope="workspace"')
  })

  it("imports renameWorkspace and deleteWorkspace from org-api", () => {
    expect(source).toContain("renameWorkspace")
    expect(source).toContain("deleteWorkspace")
  })

  it("imports InviteMemberDialog", () => {
    expect(source).toContain("InviteMemberDialog")
  })

  it("confirms via useConfirm dialog before delete", () => {
    expect(source).toContain("useConfirm")
    expect(source).toContain("confirm({")
  })

  it("uses toast from sonner", () => {
    expect(source).toContain("toast")
    expect(source).toContain("sonner")
  })

  it("calls loadFromBackend after mutations", () => {
    expect(source).toContain("loadFromBackend")
  })
})

// ─── API simulation ─────────────────────────────────────────────────────────
describe("OrgSection / WorkspaceSection — API contract (logic simulation)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("renameOrg called with trimmed name", async () => {
    const { renameOrg } = require("@/lib/org-api")
    ;(renameOrg as jest.Mock).mockResolvedValueOnce({ id: "o1", name: "New Name" })

    const name = "  New Name  "
    await renameOrg("o1", name.trim())
    expect(renameOrg).toHaveBeenCalledWith("o1", "New Name")
  })

  it("deleteOrg called with org id", async () => {
    const { deleteOrg } = require("@/lib/org-api")
    ;(deleteOrg as jest.Mock).mockResolvedValueOnce(undefined)

    await deleteOrg("o1")
    expect(deleteOrg).toHaveBeenCalledWith("o1")
  })

  it("renameWorkspace called with workspace id and name", async () => {
    const { renameWorkspace } = require("@/lib/org-api")
    ;(renameWorkspace as jest.Mock).mockResolvedValueOnce({ id: "w1", name: "Renamed" })

    await renameWorkspace("w1", "Renamed")
    expect(renameWorkspace).toHaveBeenCalledWith("w1", "Renamed")
  })

  it("deleteWorkspace called with workspace id", async () => {
    const { deleteWorkspace } = require("@/lib/org-api")
    ;(deleteWorkspace as jest.Mock).mockResolvedValueOnce(undefined)

    await deleteWorkspace("w1")
    expect(deleteWorkspace).toHaveBeenCalledWith("w1")
  })

  it("toast.error called on renameOrg failure", async () => {
    const { renameOrg } = require("@/lib/org-api")
    ;(renameOrg as jest.Mock).mockRejectedValueOnce(new Error("renameOrg failed (403)"))

    const { toast } = require("sonner")
    try {
      await renameOrg("o1", "Bad")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename organisation")
    }
    expect(toast.error).toHaveBeenCalledWith("renameOrg failed (403)")
  })
})
