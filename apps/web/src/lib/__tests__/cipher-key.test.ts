/**
 * cipher-key.test.ts
 *
 * Unit tests for getCipherKey() — the routing helper that selects either the
 * master key (personal workspace) or the workspace DEK (shared workspace).
 */

import { webcrypto } from "node:crypto"

// Polyfill globalThis.crypto for jest-environment-node
if (typeof globalThis.crypto === "undefined") {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    writable: true,
    configurable: true,
  })
} else if (!globalThis.crypto.subtle) {
  // @ts-expect-error — polyfill subtle on existing partial crypto
  globalThis.crypto.subtle = webcrypto.subtle
}

import { getCipherKey } from "@/lib/cipher-key"
import type { Workspace } from "@/lib/workspace-api"

// ── Helpers ────────────────────────────────────────────────────────────────────

async function makeKey(): Promise<CryptoKey> {
  return webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]) as Promise<CryptoKey>
}

function personalWs(overrides?: Partial<Workspace>): Workspace {
  return {
    id: "ws-personal-1",
    org_id: "org-1",
    name: "My Workspace",
    slug: "my-workspace",
    is_personal: true,
    kind: "personal",
    ws_role: "admin",
    ...overrides,
  }
}

function sharedWs(overrides?: Partial<Workspace>): Workspace {
  return {
    id: "ws-shared-1",
    org_id: "org-1",
    name: "Team Workspace",
    slug: "team-workspace",
    is_personal: false,
    kind: "shared",
    ws_role: "developer",
    ...overrides,
  }
}

// ── Mock workspace-dek-store ──────────────────────────────────────────────────

// We mock the entire module so getDek() is controlled in tests.
jest.mock("@/store/workspace-dek-store", () => ({
  useWorkspaceDekStore: {
    getState: jest.fn(),
  },
}))

import { useWorkspaceDekStore } from "@/store/workspace-dek-store"

// Helper to set the mock DEK returned by getDek()
function mockGetDek(impl: (id: string) => Promise<CryptoKey | null>) {
  ;(useWorkspaceDekStore.getState as jest.Mock).mockReturnValue({
    getDek: jest.fn(impl),
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("getCipherKey", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns null when workspace is null", async () => {
    const masterKey = await makeKey()
    const result = await getCipherKey(null, masterKey)
    expect(result).toBeNull()
  })

  it("returns masterKey for a personal workspace", async () => {
    const masterKey = await makeKey()
    const result = await getCipherKey(personalWs(), masterKey)
    expect(result).toBe(masterKey)
  })

  it("returns null for a personal workspace when masterKey is null", async () => {
    const result = await getCipherKey(personalWs(), null)
    expect(result).toBeNull()
  })

  it("calls getDek with the correct workspaceId for a shared workspace", async () => {
    const dekKey = await makeKey()
    const getDek = jest.fn().mockResolvedValue(dekKey)
    ;(useWorkspaceDekStore.getState as jest.Mock).mockReturnValue({ getDek })

    const ws = sharedWs({ id: "ws-shared-xyz" })
    const masterKey = await makeKey()

    const result = await getCipherKey(ws, masterKey)

    // Should have called getDek with the workspace id, not the master key path
    expect(getDek).toHaveBeenCalledTimes(1)
    expect(getDek).toHaveBeenCalledWith("ws-shared-xyz")
    expect(result).toBe(dekKey)
  })

  it("returns null for a shared workspace when DEK is not available", async () => {
    mockGetDek(async () => null)

    const ws = sharedWs({ id: "ws-no-dek" })
    const masterKey = await makeKey()

    const result = await getCipherKey(ws, masterKey)
    expect(result).toBeNull()
  })

  it("does NOT call getDek for a personal workspace", async () => {
    const getDek = jest.fn().mockResolvedValue(null)
    ;(useWorkspaceDekStore.getState as jest.Mock).mockReturnValue({ getDek })

    const masterKey = await makeKey()
    await getCipherKey(personalWs(), masterKey)

    expect(getDek).not.toHaveBeenCalled()
  })
})
