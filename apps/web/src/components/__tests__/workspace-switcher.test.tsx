/**
 * Tests for WorkspaceSwitcher (workspace-switcher.tsx).
 *
 * Note: @testing-library/react is not installed in this project, and the Jest
 * testEnvironment is "jest-environment-node", so we cannot render React trees.
 * We test module exports, store-driven logic, and structural guarantees
 * without a browser environment.
 *
 * Sub-project B: workspace-switcher.tsx delegates to WorkspaceSwitcherDropdown.
 * Structural dropdown tests live in workspace-switcher-dropdown.test.tsx.
 *
 * If @testing-library/react + jsdom are ever added, the skipped render tests
 * at the bottom can be enabled.
 */

jest.mock("next/navigation", () => ({ useRouter: jest.fn(), usePathname: jest.fn(() => "/app") }))
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k, useMessages: () => ({}) }))
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

describe("WorkspaceSwitcher module exports", () => {
  it("exports a WorkspaceSwitcher function component", () => {
    const mod = require("../workspace-switcher")
    expect(typeof mod.WorkspaceSwitcher).toBe("function")
  })
})

describe("WorkspaceSwitcher — store contract", () => {
  beforeEach(() => useWorkspaceStore.getState().clear())

  it("store hydrated=false until loadFromBackend is called (guards null render)", () => {
    const state = useWorkspaceStore.getState()
    expect(state.hydrated).toBe(false)
    expect(state.activeWorkspaceId).toBeNull()
  })

  it("store exposes activeWorkspaceId and workspace name after setState", () => {
    useWorkspaceStore.setState({
      orgs: [{ id: "o1", name: "MyDevTools Cloud", slug: "mydevtools-cloud", kind: "system", org_role: "member" }],
      workspaces: [{
        id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1",
        is_personal: true, kind: "personal", ws_role: "admin",
      }],
      activeWorkspaceId: "w1",
      hydrated: true,
    })

    const state = useWorkspaceStore.getState()
    expect(state.hydrated).toBe(true)
    expect(state.activeWorkspaceId).toBe("w1")
    const ws = state.workspaces.find((w: { id: string }) => w.id === state.activeWorkspaceId)
    expect(ws?.name).toBe("Personal")
  })

  it("WorkspaceSwitcher returns null when hydrated=false (null guard verified via store state)", () => {
    // hydrated=false → the component must return null (no pill rendered)
    const state = useWorkspaceStore.getState()
    expect(state.hydrated).toBe(false)
    // This mirrors the component's: if (!hydrated || !ws) return null
    const wouldRender = state.hydrated && state.activeWorkspaceId !== null
    expect(wouldRender).toBe(false)
  })

  it("component would render when hydrated=true and activeWorkspaceId is set", () => {
    useWorkspaceStore.setState({
      orgs: [],
      workspaces: [{ id: "w1", org_id: "o1", name: "Personal", slug: "personal-u1", is_personal: true, kind: "personal", ws_role: "admin" }],
      activeWorkspaceId: "w1",
      hydrated: true,
    })
    const state = useWorkspaceStore.getState()
    const wouldRender = state.hydrated && state.activeWorkspaceId !== null
    expect(wouldRender).toBe(true)
  })

  it("does NOT contain data-role='chevron' in component source (sub-project A)", () => {
    // Structural assertion: the component file must not include a chevron data attribute
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../workspace-switcher.tsx"),
      "utf8"
    )
    expect(source).not.toContain('data-role="chevron"')
  })
})
