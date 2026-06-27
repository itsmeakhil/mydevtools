import { hasPermission, ENCRYPTED_TOOLS, TOOL_PERMISSIONS } from "../workspace-rbac"

describe("workspace-rbac", () => {
  it("admin role has all permissions on every tool", () => {
    for (const tool of Object.keys(TOOL_PERMISSIONS)) {
      for (const perm of ["read", "write", "delete", "admin"] as const) {
        expect(hasPermission({ ws_role: "admin", is_personal: false } as any, tool, perm)).toBe(true)
      }
    }
  })

  it("viewer can only read plaintext tools", () => {
    for (const tool of Object.keys(TOOL_PERMISSIONS)) {
      const expected = ENCRYPTED_TOOLS.has(tool) ? false : true
      expect(hasPermission({ ws_role: "viewer", is_personal: false } as any, tool, "read")).toBe(expected)
      expect(hasPermission({ ws_role: "viewer", is_personal: false } as any, tool, "write")).toBe(false)
    }
  })

  it("personal workspace bypasses matrix", () => {
    expect(hasPermission({ ws_role: "viewer", is_personal: true } as any, "password-manager", "admin")).toBe(true)
  })

  it("encrypted tools blocked in shared workspace for every role", () => {
    for (const tool of ENCRYPTED_TOOLS) {
      for (const role of ["admin", "developer", "viewer"] as const) {
        expect(hasPermission({ ws_role: role, is_personal: false } as any, tool, "read")).toBe(false)
      }
    }
  })
})
