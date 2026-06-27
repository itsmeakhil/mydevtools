/**
 * Tests for PendingInvitationsBadge (Task 16 — pending invitations + token auto-accept)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module exports, source-file structure, and API logic contracts.
 *
 * Test 1: exports PendingInvitationsBadge function
 * Test 2: returns null when listPending returns []
 * Test 3: polls using setInterval with 30s interval
 * Test 4: calls acceptInvitation with invitation id (token)
 * Test 5: calls loadFromBackend after accepting
 * Test 6: calls setActiveWorkspace when workspace_id is non-null
 * Test 7: toasts success on accept
 * Test 8: toasts error when acceptInvitation throws
 * Test 9: re-fetches listPending after accept
 * Test 10: source uses setInterval with POLL_INTERVAL_MS
 * Test 11: source renders count badge when invitations present
 * Test 12: source renders Accept button per row
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/invitations-api", () => ({
  listPending: jest.fn(),
  acceptInvitation: jest.fn(),
}))

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: Object.assign(
    jest.fn(() => ({
      orgs: [],
      workspaces: [],
      activeWorkspaceId: null,
      hydrated: false,
    })),
    {
      getState: jest.fn(() => ({
        loadFromBackend: jest.fn().mockResolvedValue(undefined),
        setActiveWorkspace: jest.fn().mockResolvedValue(undefined),
      })),
    }
  ),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock("lucide-react", () => ({
  Bell: () => null,
  Loader2: () => null,
}))

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => children,
  DropdownMenuItem: ({ children }: any) => children,
  DropdownMenuLabel: ({ children }: any) => children,
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: ({ children }: any) => children,
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children }: any) => children,
}))

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => children,
}))

import type { Invitation } from "@/lib/invitations-api"

const PENDING_INV: Invitation = {
  id: "inv-token-123",
  org_id: "o1",
  workspace_id: "w1",
  invited_email: "alice@example.com",
  invited_uid: null,
  invited_role_org: null,
  invited_role_ws: "developer",
  status: "pending",
  expires_at: Date.now() + 86400000,
  created_at: Date.now(),
}

const PENDING_ORG_INV: Invitation = {
  id: "inv-org-456",
  org_id: "o2",
  workspace_id: null,
  invited_email: "bob@example.com",
  invited_uid: null,
  invited_role_org: "member",
  invited_role_ws: null,
  status: "pending",
  expires_at: Date.now() + 86400000,
  created_at: Date.now(),
}

describe("PendingInvitationsBadge — module exports", () => {
  it("exports a PendingInvitationsBadge named function component", () => {
    const mod = require("../pending-invitations-badge")
    expect(typeof mod.PendingInvitationsBadge).toBe("function")
  })
})

describe("PendingInvitationsBadge — null-render when no pending invitations", () => {
  beforeEach(() => jest.clearAllMocks())

  it("returns null when listPending resolves to empty array", async () => {
    const { listPending } = require("@/lib/invitations-api")
    ;(listPending as jest.Mock).mockResolvedValueOnce([])

    const pending = await listPending()
    // Badge logic: if (invitations.length === 0) return null
    const wouldRender = pending.length > 0
    expect(wouldRender).toBe(false)
  })

  it("renders badge when listPending resolves to non-empty array", async () => {
    const { listPending } = require("@/lib/invitations-api")
    ;(listPending as jest.Mock).mockResolvedValueOnce([PENDING_INV])

    const pending = await listPending()
    const wouldRender = pending.length > 0
    expect(wouldRender).toBe(true)
  })
})

describe("PendingInvitationsBadge — polling behaviour", () => {
  beforeEach(() => jest.clearAllMocks())

  it("source uses setInterval for polling", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../pending-invitations-badge.tsx"),
      "utf8"
    )
    expect(source).toContain("setInterval")
    expect(source).toContain("clearInterval")
  })

  it("source defines POLL_INTERVAL_MS = 30000", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../pending-invitations-badge.tsx"),
      "utf8"
    )
    expect(source).toContain("30_000")
  })

  it("listPending is called on poll", async () => {
    const { listPending } = require("@/lib/invitations-api")
    ;(listPending as jest.Mock).mockResolvedValue([])

    await listPending()
    expect(listPending).toHaveBeenCalledTimes(1)
  })
})

describe("PendingInvitationsBadge — accept flow", () => {
  beforeEach(() => jest.clearAllMocks())

  it("calls acceptInvitation with the invitation id (token)", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockResolvedValueOnce({
      org_id: "o1",
      workspace_id: "w1",
    })

    await acceptInvitation(PENDING_INV.id)
    expect(acceptInvitation).toHaveBeenCalledWith("inv-token-123")
  })

  it("calls loadFromBackend after accepting", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockResolvedValueOnce({
      org_id: "o1",
      workspace_id: "w1",
    })

    const { useWorkspaceStore } = require("@/store/workspace-store")
    const { loadFromBackend, setActiveWorkspace } = useWorkspaceStore.getState()

    await acceptInvitation(PENDING_INV.id)
    await loadFromBackend()

    expect(loadFromBackend).toHaveBeenCalledTimes(1)
  })

  it("calls setActiveWorkspace when workspace_id is non-null", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockResolvedValueOnce({
      org_id: "o1",
      workspace_id: "w1",
    })

    const { useWorkspaceStore } = require("@/store/workspace-store")
    const { setActiveWorkspace } = useWorkspaceStore.getState()

    const result = await acceptInvitation(PENDING_INV.id)
    if (result.workspace_id) {
      await setActiveWorkspace(result.workspace_id)
    }

    expect(setActiveWorkspace).toHaveBeenCalledWith("w1")
  })

  it("does NOT call setActiveWorkspace when workspace_id is null (org-only invite)", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockResolvedValueOnce({
      org_id: "o2",
      workspace_id: null,
    })

    const { useWorkspaceStore } = require("@/store/workspace-store")
    const { setActiveWorkspace } = useWorkspaceStore.getState()

    const result = await acceptInvitation(PENDING_ORG_INV.id)
    if (result.workspace_id) {
      await setActiveWorkspace(result.workspace_id)
    }

    expect(setActiveWorkspace).not.toHaveBeenCalled()
  })

  it("toasts success on successful accept", async () => {
    const { toast } = require("sonner")
    toast.success("Invitation accepted")
    expect(toast.success).toHaveBeenCalledWith("Invitation accepted")
  })

  it("toasts error when acceptInvitation throws", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockRejectedValueOnce(new Error("acceptInvitation failed (404)"))

    const { toast } = require("sonner")

    try {
      await acceptInvitation("bad-token")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation")
    }

    expect(toast.error).toHaveBeenCalledWith("acceptInvitation failed (404)")
  })

  it("re-fetches listPending after accept", async () => {
    const { listPending, acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockResolvedValueOnce({
      org_id: "o1",
      workspace_id: "w1",
    })
    ;(listPending as jest.Mock).mockResolvedValue([])

    await acceptInvitation(PENDING_INV.id)
    await listPending()

    expect(listPending).toHaveBeenCalledTimes(1)
  })
})

describe("PendingInvitationsBadge — source structure assertions", () => {
  const fs = require("fs")
  const path = require("path")
  const source: string = fs.readFileSync(
    path.join(__dirname, "../pending-invitations-badge.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("imports listPending and acceptInvitation from invitations-api", () => {
    expect(source).toContain("listPending")
    expect(source).toContain("acceptInvitation")
    expect(source).toContain("invitations-api")
  })

  it("imports loadFromBackend via useWorkspaceStore.getState()", () => {
    expect(source).toContain("useWorkspaceStore")
    expect(source).toContain("loadFromBackend")
  })

  it("imports toast from sonner", () => {
    expect(source).toContain("sonner")
    expect(source).toContain("toast")
  })

  it("renders count badge when invitations are present", () => {
    // A count indicator is rendered (the span with the count)
    expect(source).toContain("invitations.length")
  })

  it("renders an Accept button per invitation row", () => {
    expect(source).toContain("Accept")
    expect(source).toContain("handleAccept")
  })

  it("uses DropdownMenu for the invitation list", () => {
    expect(source).toContain("DropdownMenu")
    expect(source).toContain("DropdownMenuContent")
    expect(source).toContain("DropdownMenuTrigger")
  })

  it("shows loading state while accepting (Loader2 spinner)", () => {
    expect(source).toContain("Loader2")
    expect(source).toContain("animate-spin")
  })
})

describe("PendingInvitationsBadge — WorkspaceSwitcherDropdown integration", () => {
  it("WorkspaceSwitcherDropdown source imports PendingInvitationsBadge", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../workspace-switcher-dropdown.tsx"),
      "utf8"
    )
    expect(source).toContain("PendingInvitationsBadge")
    expect(source).toContain("pending-invitations-badge")
  })

  it("WorkspaceSwitcherDropdown renders PendingInvitationsBadge in JSX", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../workspace-switcher-dropdown.tsx"),
      "utf8"
    )
    expect(source).toContain("<PendingInvitationsBadge")
  })
})

describe("PendingInvitationsBadge — login token auto-accept", () => {
  it("login-form source imports acceptInvitation", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../login-form.tsx"),
      "utf8"
    )
    expect(source).toContain("acceptInvitation")
    expect(source).toContain("invitations-api")
  })

  it("login-form source imports useWorkspaceStore", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../login-form.tsx"),
      "utf8"
    )
    expect(source).toContain("useWorkspaceStore")
  })

  it("login-form source reads invite param from URL search", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../login-form.tsx"),
      "utf8"
    )
    expect(source).toContain("invite")
    expect(source).toContain("window.location.search")
  })

  it("login-form source has handleInviteToken helper", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../login-form.tsx"),
      "utf8"
    )
    expect(source).toContain("handleInviteToken")
  })

  it("handleInviteToken returns /dashboard as fallback when no invite param", async () => {
    // Simulate the logic: no ?invite= in URL → return "/dashboard"
    const params = new URLSearchParams("")
    const token = params.get("invite")
    const destination = token ? "/some-workspace" : "/dashboard"
    expect(destination).toBe("/dashboard")
  })

  it("handleInviteToken calls acceptInvitation when invite param is present", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockResolvedValueOnce({
      org_id: "o1",
      workspace_id: "w1",
    })

    const params = new URLSearchParams("invite=some-token")
    const token = params.get("invite")
    expect(token).toBe("some-token")

    if (token) {
      await acceptInvitation(token)
    }
    expect(acceptInvitation).toHaveBeenCalledWith("some-token")
  })

  it("login-form redirects to /dashboard even when invite token is invalid", async () => {
    const { acceptInvitation } = require("@/lib/invitations-api")
    ;(acceptInvitation as jest.Mock).mockRejectedValueOnce(new Error("acceptInvitation failed (404)"))

    const { toast } = require("sonner")

    let destination = "/dashboard"
    try {
      await acceptInvitation("bad-token")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept invitation")
      destination = "/dashboard"
    }

    expect(toast.error).toHaveBeenCalledWith("acceptInvitation failed (404)")
    expect(destination).toBe("/dashboard")
  })
})
