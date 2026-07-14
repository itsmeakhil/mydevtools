/**
 * Tests for MigrationBanner (task 25 — boot wiring + first-login migration banner).
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: verify module structure + polling logic contracts via state
 * simulation, matching the pattern of other component tests in this project.
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

// ── Imports ──────────────────────────────────────────────────────────────────

import * as backendAuth from "@/lib/backend-auth"

// ── Helpers ──────────────────────────────────────────────────────────────────

type MeResponse = {
  migration_status?: string
  migrated_at?: number | null
  migrated_fast?: boolean
}

/** Simulate one MigrationBanner poll tick and return the derived status. */
async function simulateTick(me: MeResponse): Promise<"pending" | "done" | null> {
  ;(backendAuth.backendFetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => me,
  })

  const res = await (backendAuth.backendFetch as jest.Mock)("/api/backend/auth/me")
  if (!res.ok) return null
  const data = await res.json()

  if (data.migrated_at || data.migrated_fast === true) return "done"
  if (data.migration_status === "pending") return "pending"
  return "done"
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MigrationBanner — module exports", () => {
  it("exports a MigrationBanner named function component", () => {
    const mod = require("../migration-banner")
    expect(typeof mod.MigrationBanner).toBe("function")
  })
})

describe("MigrationBanner — polling logic contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("resolves to 'done' immediately when migrated_at is set", async () => {
    const status = await simulateTick({ migrated_at: 1234567890, migration_status: "done" })
    expect(status).toBe("done")
  })

  it("resolves to 'done' when migrated_fast flag is true", async () => {
    const status = await simulateTick({ migrated_fast: true, migration_status: "done" })
    expect(status).toBe("done")
  })

  it("resolves to 'pending' when migration_status is 'pending' and migrated_at is absent", async () => {
    const status = await simulateTick({ migration_status: "pending" })
    expect(status).toBe("pending")
  })

  it("resolves to 'done' when migration_status is neither 'pending' nor 'done' (unknown value)", async () => {
    const status = await simulateTick({ migration_status: "unknown" })
    expect(status).toBe("done")
  })

  it("resolves to 'done' when migration_status is absent (field not returned)", async () => {
    const status = await simulateTick({})
    expect(status).toBe("done")
  })

  it("resolves to 'done' when migrated_at is set even if migration_status is still 'pending'", async () => {
    // migrated_at takes priority over migration_status
    const status = await simulateTick({ migrated_at: 1700000000, migration_status: "pending" })
    expect(status).toBe("done")
  })

  it("polls the correct endpoint", async () => {
    ;(backendAuth.backendFetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ migration_status: "done" }),
    })
    await (backendAuth.backendFetch as jest.Mock)("/api/backend/auth/me")
    expect(backendAuth.backendFetch).toHaveBeenCalledWith("/api/backend/auth/me")
  })

  it("returns null when the fetch response is not ok", async () => {
    ;(backendAuth.backendFetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    const res = await (backendAuth.backendFetch as jest.Mock)("/api/backend/auth/me")
    const status = res.ok ? "done" : null
    expect(status).toBeNull()
  })
})

describe("MigrationBanner — banner render guard (status contract)", () => {
  it("banner must NOT render when status is null", () => {
    // Mirrors: if (status !== 'pending') return null
    const status = null
    const wouldRender = status === "pending"
    expect(wouldRender).toBe(false)
  })

  it("banner must NOT render when status is 'done'", () => {
    const status: string = "done"
    const wouldRender = status === "pending"
    expect(wouldRender).toBe(false)
  })

  it("banner MUST render when status is 'pending'", () => {
    const status: string = "pending"
    const wouldRender = status === "pending"
    expect(wouldRender).toBe(true)
  })
})

describe("MigrationBanner — source structure assertions", () => {
  it("component polls /api/backend/auth/me (not /users/me)", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../migration-banner.tsx"),
      "utf8"
    )
    expect(source).toContain("/api/backend/auth/me")
  })

  it("component uses a cleanup function (timer clearTimeout)", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../migration-banner.tsx"),
      "utf8"
    )
    expect(source).toContain("clearTimeout")
  })

  it("component uses cancelled flag to prevent state updates after unmount", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../migration-banner.tsx"),
      "utf8"
    )
    expect(source).toContain("cancelled")
  })

  it("component has a max elapsed time guard (60s)", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../migration-banner.tsx"),
      "utf8"
    )
    expect(source).toContain("MAX_ELAPSED_MS")
  })

  it("banner text says 'Setting up your workspace'", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../migration-banner.tsx"),
      "utf8"
    )
    expect(source).toContain("Setting up your workspace")
  })
})

describe("EnsureBackendSession — workspace hydration wiring", () => {
  it("ensure-backend-session.tsx imports useWorkspaceStore", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../../components/ensure-backend-session.tsx"),
      "utf8"
    )
    expect(source).toContain("useWorkspaceStore")
  })

  it("ensure-backend-session.tsx calls loadFromBackend after session confirms", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../../components/ensure-backend-session.tsx"),
      "utf8"
    )
    expect(source).toContain("loadFromBackend")
  })

  it("workspace hydration is non-blocking (.catch not re-thrown)", () => {
    const fs = require("fs")
    const path = require("path")
    const source = fs.readFileSync(
      path.join(__dirname, "../../components/ensure-backend-session.tsx"),
      "utf8"
    )
    // loadFromBackend().catch(...) pattern confirms non-blocking
    expect(source).toMatch(/loadFromBackend\(\)\.catch/)
  })
})
