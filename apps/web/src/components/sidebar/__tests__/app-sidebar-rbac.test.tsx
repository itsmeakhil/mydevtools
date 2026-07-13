/**
 * Structural (Jest node-env) tests for sidebar RBAC helpers.
 * No DOM / React Testing Library required.
 */
import { buildPinnedNavItems } from "../app-sidebar.helpers"
import { sidebarUrlToToolSlug } from "@/lib/sidebar-tool-slug"
import type { Workspace } from "@/lib/workspace-api"

// ─── Factories ────────────────────────────────────────────────────────────────

function makeSharedWs(role: Workspace["ws_role"]): Workspace {
  return {
    id: "ws-1",
    name: "Shared WS",
    slug: "shared-ws",
    is_personal: false,
    kind: "shared",
    ws_role: role,
  }
}

function makePersonalWs(): Workspace {
  return {
    id: "ws-personal",
    name: "Personal",
    slug: "personal",
    is_personal: true,
    kind: "personal",
    ws_role: "admin",
  }
}

// ─── sidebarUrlToToolSlug ─────────────────────────────────────────────────────

describe("sidebarUrlToToolSlug", () => {
  it("extracts slug from /app/<slug>", () => {
    expect(sidebarUrlToToolSlug("/app/notes")).toBe("notes")
    expect(sidebarUrlToToolSlug("/app/password-manager")).toBe("password-manager")
    expect(sidebarUrlToToolSlug("/app/api-client")).toBe("api-client")
  })

  it("returns null for non-/app URLs", () => {
    expect(sidebarUrlToToolSlug("/dashboard")).toBeNull()
    expect(sidebarUrlToToolSlug("/settings")).toBeNull()
    expect(sidebarUrlToToolSlug("")).toBeNull()
  })

  it("ignores sub-paths beyond the first segment", () => {
    // /app/break-room/2048 → slug is "break-room"
    expect(sidebarUrlToToolSlug("/app/break-room/2048")).toBe("break-room")
  })
})

// ─── buildPinnedNavItems ──────────────────────────────────────────────────────

describe("buildPinnedNavItems", () => {
  it("returns empty array when pinnedTools is empty", () => {
    const result = buildPinnedNavItems([], makeSharedWs("viewer"))
    expect(result).toHaveLength(0)
  })

  it("returns empty array when activeWs is null", () => {
    const result = buildPinnedNavItems(["/app/notes"], null)
    expect(result).toHaveLength(0)
  })

  it("viewer can see plaintext tool (notes) in shared workspace", () => {
    const result = buildPinnedNavItems(["/app/notes"], makeSharedWs("viewer"))
    const urls = result.map((l) => String(l.url))
    expect(urls).toContain("/app/notes")
  })

  it("viewer sees encrypted tool (password-manager) in personal workspace (matrix bypass)", () => {
    const result = buildPinnedNavItems(
      ["/app/password-manager"],
      makePersonalWs(),
    )
    const urls = result.map((l) => String(l.url))
    expect(urls).toContain("/app/password-manager")
  })

  it("viewer CANNOT see encrypted tool (password-manager) in shared workspace", () => {
    const result = buildPinnedNavItems(
      ["/app/password-manager"],
      makeSharedWs("viewer"),
    )
    const urls = result.map((l) => String(l.url))
    expect(urls).not.toContain("/app/password-manager")
  })

  it("admin CANNOT see encrypted tool (password-manager) in shared workspace", () => {
    // Encrypted tools are blocked for ALL roles in shared workspaces (ENCRYPTED_ROW)
    const result = buildPinnedNavItems(
      ["/app/password-manager"],
      makeSharedWs("admin"),
    )
    const urls = result.map((l) => String(l.url))
    expect(urls).not.toContain("/app/password-manager")
  })

  it("filters out gated tool but keeps allowed tool in the same pinned list", () => {
    const pinned = ["/app/notes", "/app/password-manager"]
    const result = buildPinnedNavItems(pinned, makeSharedWs("viewer"))
    const urls = result.map((l) => String(l.url))
    expect(urls).toContain("/app/notes")
    expect(urls).not.toContain("/app/password-manager")
  })

  it("admin can see all plaintext tools (notes) in shared workspace", () => {
    const result = buildPinnedNavItems(["/app/notes"], makeSharedWs("admin"))
    const urls = result.map((l) => String(l.url))
    expect(urls).toContain("/app/notes")
  })

  it("does not mutate the pin list — unknown URL returns empty", () => {
    // Pinning a URL that has no sidebar entry produces nothing
    const result = buildPinnedNavItems(["/app/nonexistent-tool"], makeSharedWs("admin"))
    expect(result).toHaveLength(0)
  })
})
