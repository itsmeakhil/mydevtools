/**
 * use-cipher-key.test.ts
 *
 * Structural tests for the shared useCipherKey module.
 *
 * The hook is a thin wrapper around getCipherKey (already covered by
 * cipher-key.test.ts).  These tests verify:
 *   1. The module exports a function named useCipherKey.
 *   2. password-manager's encryption-context re-exports the same function
 *      (no drift between the two entry-points).
 *
 * Runtime behaviour (useEffect / state) requires a React testing env and is
 * out of scope for jest-environment-node; getCipherKey integration is covered
 * in cipher-key.test.ts.
 */

// ── Module-level mock stubs required by the hook's transitive imports ─────────

jest.mock("@/store/workspace-store", () => ({
  useActiveWorkspace: jest.fn(() => null),
}))

jest.mock("@/store/master-key-store", () => ({
  useMasterKeyStore: jest.fn(() => null),
}))

jest.mock("@/lib/cipher-key", () => ({
  getCipherKey: jest.fn(async () => null),
}))

// React hooks use useState / useEffect — stub them out so the import doesn't
// blow up in a non-DOM environment.
jest.mock("react", () => ({
  useState: jest.fn(() => [null, jest.fn()]),
  useEffect: jest.fn(),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useCipherKey shared module", () => {
  it("exports a function named useCipherKey", async () => {
    const mod = await import("@/lib/use-cipher-key")
    expect(typeof mod.useCipherKey).toBe("function")
  })

  it("encryption-context re-exports the identical useCipherKey function", async () => {
    const shared = await import("@/lib/use-cipher-key")
    const ctx = await import("@/components/password-manager/encryption-context")
    expect(ctx.useCipherKey).toBe(shared.useCipherKey)
  })
})
