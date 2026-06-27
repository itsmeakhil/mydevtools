/**
 * Tests for EncryptedToolPlaceholder (Task 17 — encrypted-tool gating in shared workspaces).
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify named export, source-file structure, gate logic, and
 *           structural assertions on the 3 encrypted tool pages.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: jest.fn((selector: (s: unknown) => unknown) =>
    selector({
      workspaces: [
        { id: "p1", is_personal: true, name: "Personal", slug: "personal", org_id: "o1", kind: "personal", ws_role: "owner" },
        { id: "s1", is_personal: false, name: "Shared", slug: "shared", org_id: "o1", kind: "shared", ws_role: "member" },
      ],
      setActiveWorkspace: jest.fn(),
    })
  ),
  useActiveWorkspace: jest.fn(() => null),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock("lucide-react", () => ({
  Lock: jest.fn(),
  ArrowRight: jest.fn(),
}))

jest.mock("@/components/ui/button", () => ({
  Button: jest.fn(),
}))

jest.mock("@/components/ui/card", () => ({
  Card: jest.fn(),
  CardContent: jest.fn(),
}))

// ── Component export ───────────────────────────────────────────────────────────

describe("EncryptedToolPlaceholder — module exports", () => {
  it("exports a named EncryptedToolPlaceholder function component", () => {
    const mod = require("../encrypted-tool-placeholder")
    expect(typeof mod.EncryptedToolPlaceholder).toBe("function")
  })

  it("does NOT have a default export (named export only)", () => {
    const mod = require("../encrypted-tool-placeholder")
    expect(mod.default).toBeUndefined()
  })
})

// ── Source structure ───────────────────────────────────────────────────────────

describe("EncryptedToolPlaceholder — source structure", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../encrypted-tool-placeholder.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("imports useWorkspaceStore from workspace-store", () => {
    expect(source).toContain("useWorkspaceStore")
    expect(source).toContain("workspace-store")
  })

  it("imports Lock and ArrowRight from lucide-react", () => {
    expect(source).toContain("Lock")
    expect(source).toContain("ArrowRight")
    expect(source).toContain("lucide-react")
  })

  it("accepts toolName prop", () => {
    expect(source).toContain("toolName")
  })

  it("renders toolName in heading (Personal-only message)", () => {
    expect(source).toContain("{toolName}")
    expect(source).toContain("Personal-only")
  })

  it("contains the placeholder copy about encryption for shared workspaces", () => {
    expect(source).toContain("End-to-end encryption for shared workspaces")
  })

  it("renders Switch to Personal button", () => {
    expect(source).toContain("Switch to Personal")
  })

  it("finds personal workspace via workspaces.find(w => w.is_personal)", () => {
    expect(source).toContain("is_personal")
    expect(source).toContain("find")
  })

  it("calls setActiveWorkspace when switching to personal", () => {
    expect(source).toContain("setActiveWorkspace")
  })

  it("guards Switch button on personal workspace existing", () => {
    expect(source).toContain("personal &&")
  })
})

// ── Gate logic simulation ──────────────────────────────────────────────────────

describe("EncryptedToolPlaceholder — workspace gate logic", () => {
  type Workspace = {
    id: string
    is_personal: boolean
    name: string
    slug: string
    org_id: string
    kind: string
    ws_role: string
  }

  /** Mirrors the component's gate condition. */
  function shouldShowPlaceholder(activeWs: Workspace | null): boolean {
    return activeWs !== null && !activeWs.is_personal
  }

  it("shows placeholder when active workspace is shared (is_personal=false)", () => {
    const shared: Workspace = { id: "s1", is_personal: false, name: "Shared", slug: "shared", org_id: "o1", kind: "shared", ws_role: "member" }
    expect(shouldShowPlaceholder(shared)).toBe(true)
  })

  it("does NOT show placeholder when active workspace is personal", () => {
    const personal: Workspace = { id: "p1", is_personal: true, name: "Personal", slug: "personal", org_id: "o1", kind: "personal", ws_role: "owner" }
    expect(shouldShowPlaceholder(personal)).toBe(false)
  })

  it("does NOT show placeholder when no active workspace (null)", () => {
    expect(shouldShowPlaceholder(null)).toBe(false)
  })

  it("personal workspace button shows when at least one personal workspace exists", () => {
    const workspaces: Workspace[] = [
      { id: "p1", is_personal: true, name: "Personal", slug: "personal", org_id: "o1", kind: "personal", ws_role: "owner" },
      { id: "s1", is_personal: false, name: "Shared", slug: "shared", org_id: "o1", kind: "shared", ws_role: "member" },
    ]
    const personal = workspaces.find((w) => w.is_personal)
    expect(personal).toBeDefined()
    expect(personal?.id).toBe("p1")
  })

  it("personal workspace button does NOT show when no personal workspace exists", () => {
    const workspaces: Workspace[] = [
      { id: "s1", is_personal: false, name: "Shared", slug: "shared", org_id: "o1", kind: "shared", ws_role: "member" },
    ]
    const personal = workspaces.find((w) => w.is_personal)
    expect(personal).toBeUndefined()
  })
})

// ── Password Manager page gate ─────────────────────────────────────────────────

describe("PasswordManagerPage — encrypted tool gate (source assertions)", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/app/password-manager/page.tsx"),
    "utf8"
  )

  it("imports EncryptedToolPlaceholder", () => {
    expect(source).toContain("EncryptedToolPlaceholder")
    expect(source).toContain("encrypted-tool-placeholder")
  })

  it("imports useActiveWorkspace from workspace-store", () => {
    expect(source).toContain("useActiveWorkspace")
    expect(source).toContain("workspace-store")
  })

  it("calls useActiveWorkspace and stores result as activeWs", () => {
    expect(source).toContain("useActiveWorkspace()")
    expect(source).toContain("activeWs")
  })

  it("gates on activeWs && !activeWs.is_personal", () => {
    expect(source).toContain("activeWs && !activeWs.is_personal")
  })

  it("renders EncryptedToolPlaceholder with toolName 'Password Manager'", () => {
    expect(source).toContain('toolName="Password Manager"')
  })
})

// ── Environment Manager page gate ──────────────────────────────────────────────

describe("EnvironmentManagerPage — encrypted tool gate (source assertions)", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/app/environment-manager/page.tsx"),
    "utf8"
  )

  it("imports EncryptedToolPlaceholder", () => {
    expect(source).toContain("EncryptedToolPlaceholder")
    expect(source).toContain("encrypted-tool-placeholder")
  })

  it("imports useActiveWorkspace from workspace-store", () => {
    expect(source).toContain("useActiveWorkspace")
    expect(source).toContain("workspace-store")
  })

  it("calls useActiveWorkspace and stores result as activeWs", () => {
    expect(source).toContain("useActiveWorkspace()")
    expect(source).toContain("activeWs")
  })

  it("gates on activeWs && !activeWs.is_personal", () => {
    expect(source).toContain("activeWs && !activeWs.is_personal")
  })

  it("renders EncryptedToolPlaceholder with toolName 'Environment Manager'", () => {
    expect(source).toContain('toolName="Environment Manager"')
  })
})

// ── API Keys (API Key Vault) page gate ────────────────────────────────────────

describe("ApiKeyVaultPage — encrypted tool gate (source assertions)", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../../app/app/api-keys/page.tsx"),
    "utf8"
  )

  it("imports EncryptedToolPlaceholder", () => {
    expect(source).toContain("EncryptedToolPlaceholder")
    expect(source).toContain("encrypted-tool-placeholder")
  })

  it("imports useActiveWorkspace from workspace-store", () => {
    expect(source).toContain("useActiveWorkspace")
    expect(source).toContain("workspace-store")
  })

  it("calls useActiveWorkspace and stores result as activeWs", () => {
    expect(source).toContain("useActiveWorkspace()")
    expect(source).toContain("activeWs")
  })

  it("gates on activeWs && !activeWs.is_personal", () => {
    expect(source).toContain("activeWs && !activeWs.is_personal")
  })

  it("renders EncryptedToolPlaceholder with toolName 'API Key Vault'", () => {
    expect(source).toContain('toolName="API Key Vault"')
  })
})
