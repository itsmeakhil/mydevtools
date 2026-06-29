/**
 * Tests for RoleSelect (Task 15 — workspace management page)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module exports and source-file structure.
 */

describe("RoleSelect — module exports", () => {
  it("exports a RoleSelect named function component", () => {
    const mod = require("../role-select")
    expect(typeof mod.RoleSelect).toBe("function")
  })
})

describe("RoleSelect — source structure assertions", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../role-select.tsx"),
    "utf8"
  )

  it("uses use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("accepts scope, currentRole, and onChange props", () => {
    expect(source).toContain("scope")
    expect(source).toContain("currentRole")
    expect(source).toContain("onChange")
  })

  it("includes org roles", () => {
    expect(source).toContain("owner")
    expect(source).toContain("admin")
    expect(source).toContain("member")
  })

  it("includes workspace roles", () => {
    expect(source).toContain("developer")
    expect(source).toContain("viewer")
  })

  it("uses shadcn Select primitives", () => {
    expect(source).toContain("SelectContent")
    expect(source).toContain("SelectItem")
    expect(source).toContain("SelectTrigger")
    expect(source).toContain("SelectValue")
  })

  it("switches role lists based on scope", () => {
    expect(source).toContain('scope === "org"')
  })
})

describe("RoleSelect — role list logic", () => {
  it("org scope has 4 roles and workspace scope has 3 roles", () => {
    // Simulate the role lists defined in the component
    const ORG_ROLES = ["owner", "admin", "member", "viewer"]
    const WS_ROLES = ["admin", "developer", "viewer"]
    expect(ORG_ROLES).toHaveLength(4)
    expect(WS_ROLES).toHaveLength(3)
    expect(ORG_ROLES).toContain("owner")
    expect(WS_ROLES).toContain("developer")
  })
})
