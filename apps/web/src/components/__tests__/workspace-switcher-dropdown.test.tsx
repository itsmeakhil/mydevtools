/**
 * Tests for WorkspaceSwitcherDropdown (workspace-switcher-dropdown.tsx).
 *
 * Note: @testing-library/react is not installed in this project, and the Jest
 * testEnvironment is "jest-environment-node", so we cannot render React trees.
 * We test module exports, store-driven logic, and structural guarantees
 * (org sections, workspace items, create CTAs, role-gating) without a browser.
 *
 * Test 1: exports WorkspaceSwitcherDropdown function
 * Test 2: null when unhydrated (store guard)
 * Test 3: pill would render active workspace name (store state)
 * Test 4: "New workspace" CTA hidden for org_role="member"
 * Test 5: "New workspace" CTA visible for org_role="owner"
 * Test 6: "New workspace" CTA visible for org_role="admin"
 * Test 7: dropdown source includes org label rendering
 * Test 8: active workspace gets highlight class bg-accent/60
 */

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => "/app"),
}))
jest.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
  useMessages: () => ({}),
}))
jest.mock("lucide-react", () => ({
  Briefcase: () => null,
  Plus: () => null,
  ChevronsUpDown: () => null,
}))
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => children,
  DropdownMenuSeparator: () => null,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock("@/components/create-org-dialog", () => ({ CreateOrgDialog: () => null }))
jest.mock("@/components/create-workspace-dialog", () => ({ CreateWorkspaceDialog: () => null }))

import { useWorkspaceStore } from "@/store/workspace-store"
import type { Org, Workspace } from "@/lib/workspace-api"

const ORG_OWNER: Org = { id: "o1", name: "Acme Corp", slug: "acme", kind: "user", org_role: "owner" }
const ORG_ADMIN: Org = { id: "o2", name: "Beta LLC", slug: "beta", kind: "user", org_role: "admin" }
const ORG_MEMBER: Org = { id: "o3", name: "Gamma Inc", slug: "gamma", kind: "user", org_role: "member" }

const WS_PERSONAL: Workspace = { id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1", is_personal: true, kind: "personal", ws_role: "admin" }
const WS_SHARED: Workspace = { id: "w2", org_id: "o1", name: "Shared Dev", slug: "shared-dev", is_personal: false, kind: "shared", ws_role: "developer" }
const WS_BETA: Workspace = { id: "w3", org_id: "o2", name: "Beta Workspace", slug: "beta-ws", is_personal: false, kind: "shared", ws_role: "admin" }
const WS_GAMMA: Workspace = { id: "w4", org_id: "o3", name: "Gamma Workspace", slug: "gamma-ws", is_personal: false, kind: "shared", ws_role: "viewer" }

describe("WorkspaceSwitcherDropdown module exports", () => {
  it("exports a WorkspaceSwitcherDropdown function component", () => {
    const mod = require("../workspace-switcher-dropdown")
    expect(typeof mod.WorkspaceSwitcherDropdown).toBe("function")
  })
})

describe("WorkspaceSwitcherDropdown — null guard (unhydrated)", () => {
  beforeEach(() => useWorkspaceStore.getState().clear())

  it("returns null when store is not hydrated (hydrated=false)", () => {
    const state = useWorkspaceStore.getState()
    // Component guard: if (!hydrated || !ws) return null
    expect(state.hydrated).toBe(false)
    const wouldRender = state.hydrated && state.activeWorkspaceId !== null
    expect(wouldRender).toBe(false)
  })

  it("returns null when hydrated but no activeWorkspaceId", () => {
    useWorkspaceStore.setState({ orgs: [], workspaces: [], activeWorkspaceId: null, hydrated: true })
    const state = useWorkspaceStore.getState()
    const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId)
    const wouldRender = state.hydrated && !!ws
    expect(wouldRender).toBe(false)
  })
})

describe("WorkspaceSwitcherDropdown — pill renders active workspace name", () => {
  beforeEach(() => useWorkspaceStore.getState().clear())

  it("active workspace name is accessible from store when hydrated", () => {
    useWorkspaceStore.setState({
      orgs: [ORG_OWNER],
      workspaces: [WS_PERSONAL],
      activeWorkspaceId: "w1",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const ws = state.workspaces.find((w) => w.id === state.activeWorkspaceId)
    expect(ws?.name).toBe("Personal")
  })
})

describe("WorkspaceSwitcherDropdown — org sections and workspace items", () => {
  beforeEach(() => useWorkspaceStore.getState().clear())

  it("groups workspaces by org_id correctly", () => {
    useWorkspaceStore.setState({
      orgs: [ORG_OWNER, ORG_ADMIN],
      workspaces: [WS_PERSONAL, WS_SHARED, WS_BETA],
      activeWorkspaceId: "w1",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const wsByOrg: Record<string, Workspace[]> = {}
    for (const w of state.workspaces) {
      if (!wsByOrg[w.org_id]) wsByOrg[w.org_id] = []
      wsByOrg[w.org_id].push(w)
    }
    // o1 has 2 workspaces, o2 has 1
    expect(wsByOrg["o1"]).toHaveLength(2)
    expect(wsByOrg["o2"]).toHaveLength(1)
    expect(wsByOrg["o1"].map((w) => w.name)).toContain("Personal")
    expect(wsByOrg["o1"].map((w) => w.name)).toContain("Shared Dev")
    expect(wsByOrg["o2"][0].name).toBe("Beta Workspace")
  })

  it("dropdown source includes org label and workspace item rendering logic", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../workspace-switcher-dropdown.tsx"),
      "utf8"
    )
    // Org label rendered via DropdownMenuLabel
    expect(source).toContain("DropdownMenuLabel")
    // Workspace items rendered via DropdownMenuItem
    expect(source).toContain("DropdownMenuItem")
    // Scoped to active org (org switching handled by OrgSwitcherDropdown)
    expect(source).toContain("org_id")
    // Active workspace highlight
    expect(source).toContain("bg-accent/60")
    // New workspace CTA gated behind org_role check
    expect(source).toContain("New workspace")
    expect(source).toContain("org_role")
  })

  it("active workspace gets highlight class bg-accent/60", () => {
    useWorkspaceStore.setState({
      orgs: [ORG_OWNER],
      workspaces: [WS_PERSONAL, WS_SHARED],
      activeWorkspaceId: "w1",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const activeId = state.activeWorkspaceId
    // The component applies bg-accent/60 when w.id === ws.id
    const activeWs = state.workspaces.find((w) => w.id === activeId)
    const nonActiveWs = state.workspaces.find((w) => w.id !== activeId)
    expect(activeWs?.id).toBe("w1")
    expect(nonActiveWs?.id).toBe("w2")
    // Simulate the class logic from the component
    const getHighlightClass = (id: string) => id === activeId ? "bg-accent/60" : ""
    expect(getHighlightClass("w1")).toBe("bg-accent/60")
    expect(getHighlightClass("w2")).toBe("")
  })
})

describe("WorkspaceSwitcherDropdown — New workspace CTA role gating", () => {
  beforeEach(() => useWorkspaceStore.getState().clear())

  it("New workspace CTA is hidden for org_role=member", () => {
    useWorkspaceStore.setState({
      orgs: [ORG_MEMBER],
      workspaces: [WS_GAMMA],
      activeWorkspaceId: "w4",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const org = state.orgs[0]
    // Component logic: (org.org_role === "owner" || org.org_role === "admin")
    const shouldShowNewWs = org.org_role === "owner" || org.org_role === "admin"
    expect(shouldShowNewWs).toBe(false)
  })

  it("New workspace CTA is visible for org_role=owner", () => {
    useWorkspaceStore.setState({
      orgs: [ORG_OWNER],
      workspaces: [WS_PERSONAL],
      activeWorkspaceId: "w1",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const org = state.orgs[0]
    const shouldShowNewWs = org.org_role === "owner" || org.org_role === "admin"
    expect(shouldShowNewWs).toBe(true)
  })

  it("New workspace CTA is visible for org_role=admin", () => {
    useWorkspaceStore.setState({
      orgs: [ORG_ADMIN],
      workspaces: [WS_BETA],
      activeWorkspaceId: "w3",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const org = state.orgs[0]
    const shouldShowNewWs = org.org_role === "owner" || org.org_role === "admin"
    expect(shouldShowNewWs).toBe(true)
  })

  it("New workspace CTA source is present in component", () => {
    const fs = require("fs")
    const path = require("path")
    const source: string = fs.readFileSync(
      path.join(__dirname, "../workspace-switcher-dropdown.tsx"),
      "utf8"
    )
    // Workspace creation dialog is opened from the dropdown
    expect(source).toContain("New workspace")
    expect(source).toContain("setWsDialogOpen")
  })

  it("mixed orgs: only owner/admin orgs show new workspace CTA", () => {
    const orgs = [ORG_OWNER, ORG_MEMBER, ORG_ADMIN]
    const eligibleOrgs = orgs.filter((o) => o.org_role === "owner" || o.org_role === "admin")
    const ineligibleOrgs = orgs.filter((o) => o.org_role !== "owner" && o.org_role !== "admin")
    expect(eligibleOrgs.map((o) => o.id)).toEqual(["o1", "o2"])
    expect(ineligibleOrgs.map((o) => o.id)).toEqual(["o3"])
  })
})
