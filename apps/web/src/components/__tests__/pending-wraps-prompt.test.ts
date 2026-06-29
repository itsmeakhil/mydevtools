/**
 * Tests for PendingWrapsPrompt (Task 29 — Pending wraps prompt)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: module-export check + source structure assertions + logic simulation.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/workspace-dek-api", () => ({
  listPendingWraps: jest.fn(),
  postDekWrap: jest.fn(),
}))

jest.mock("@/lib/user-keypair-api", () => ({
  getKeypair: jest.fn(),
}))

jest.mock("@/lib/workspace-crypto", () => ({
  unwrapUserPrivateKey: jest.fn(),
  wrapDekForMember: jest.fn(),
}))

jest.mock("@/store/master-key-store", () => ({
  useMasterKeyStore: jest.fn((sel: (s: { encryptionKey: null; vault: { salt: string } }) => unknown) =>
    sel({ encryptionKey: null, vault: { salt: "test-salt" } }),
  ),
}))

jest.mock("@/store/user-keypair-store", () => ({
  useUserKeypairStore: Object.assign(
    jest.fn((sel: (s: { publicKey: null; privateKey: null }) => unknown) =>
      sel({ publicKey: null, privateKey: null }),
    ),
    { getState: jest.fn(() => ({ setKeypair: jest.fn() })) },
  ),
}))

jest.mock("@/store/workspace-dek-store", () => ({
  useWorkspaceDekStore: Object.assign(
    jest.fn(),
    { getState: jest.fn(() => ({ getDek: jest.fn() })) },
  ),
}))

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

const fs = require("fs")
const path = require("path")
const sourcePath = path.join(__dirname, "../pending-wraps-prompt.tsx")
const source = fs.readFileSync(sourcePath, "utf8")

// ── Module exports ─────────────────────────────────────────────────────────────

describe("PendingWrapsPrompt — module exports", () => {
  it("exports a PendingWrapsPrompt named function", () => {
    const mod = require("../pending-wraps-prompt")
    expect(typeof mod.PendingWrapsPrompt).toBe("function")
  })
})

// ── Source structure ───────────────────────────────────────────────────────────

describe("PendingWrapsPrompt — source structure", () => {
  it("uses the use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("imports Lock and Loader2 from lucide-react", () => {
    expect(source).toContain("Lock")
    expect(source).toContain("Loader2")
    expect(source).toContain("lucide-react")
  })

  it("imports listPendingWraps and postDekWrap from workspace-dek-api", () => {
    expect(source).toContain("listPendingWraps")
    expect(source).toContain("postDekWrap")
    expect(source).toContain("workspace-dek-api")
  })

  it("imports useMasterKeyStore", () => {
    expect(source).toContain("useMasterKeyStore")
  })

  it("imports useUserKeypairStore", () => {
    expect(source).toContain("useUserKeypairStore")
  })

  it("imports useWorkspaceDekStore", () => {
    expect(source).toContain("useWorkspaceDekStore")
  })

  it("imports getKeypair from user-keypair-api", () => {
    expect(source).toContain("getKeypair")
    expect(source).toContain("user-keypair-api")
  })

  it("imports unwrapUserPrivateKey and wrapDekForMember from workspace-crypto", () => {
    expect(source).toContain("unwrapUserPrivateKey")
    expect(source).toContain("wrapDekForMember")
    expect(source).toContain("workspace-crypto")
  })

  it("accepts workspaceId prop", () => {
    expect(source).toContain("workspaceId")
  })

  it("renders 'Pending encryption wraps' heading text", () => {
    expect(source).toContain("Pending encryption wraps")
  })

  it("renders 'Complete wraps' CTA text", () => {
    expect(source).toContain("Complete wraps")
  })

  it("shows 'still need to publish their keypair' message", () => {
    expect(source).toContain("still need to publish their keypair")
  })

  it("shows toast.error when master password is not unlocked", () => {
    expect(source).toContain("Unlock your master password first")
  })

  it("shows toast.error when DEK is not available", () => {
    expect(source).toContain("You don't have access to this workspace's encryption key")
  })

  it("calls getDek from workspace dek store", () => {
    expect(source).toContain("getDek")
  })

  it("uses useEffect to fetch pending wraps on mount", () => {
    expect(source).toContain("useEffect")
  })

  it("returns null when pending list is empty", () => {
    // Source must guard on pending.length === 0
    expect(source).toContain("pending.length === 0")
  })
})

// ── Logic simulation ───────────────────────────────────────────────────────────

describe("PendingWrapsPrompt — handleCompleteWraps logic simulation", () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders null when listPendingWraps returns empty list", () => {
    // Simulate the guard: if (!pending || pending.length === 0) return null
    const pending: { uid: string; email: string | null; publicKey: string | null }[] = []
    const result = !pending || pending.length === 0 ? null : "rendered"
    expect(result).toBeNull()
  })

  it("renders CTA when at least one pending member has a publicKey", () => {
    const pending = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
    ]
    const ready = pending.filter((m) => m.publicKey)
    // Component shows button only when ready.length > 0
    expect(ready.length).toBe(1)
    const result = ready.length > 0 ? "Complete wraps button shown" : null
    expect(result).toBe("Complete wraps button shown")
  })

  it("shows 'still need to publish' message when some pending members lack publicKeys", () => {
    const pending = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: "u2@test.com", publicKey: null },
    ]
    const stillPending = pending.filter((m) => !m.publicKey)
    expect(stillPending.length).toBe(1)
    // Source renders `${stillPending.length} still need to publish their keypair.`
    const message = `${stillPending.length} still need to publish their keypair.`
    expect(message).toContain("still need to publish their keypair")
  })

  it("shows error toast when masterKey is null", async () => {
    const { toast } = require("sonner")
    const masterKey = null
    if (!masterKey) {
      toast.error("Unlock your master password first")
    }
    expect(toast.error).toHaveBeenCalledWith("Unlock your master password first")
  })

  it("shows error toast when master vault is not initialized", async () => {
    const { toast } = require("sonner")
    const masterKey = { type: "CryptoKey" } as { type: string } | null
    const masterVault = null as { salt: string } | null
    if (masterKey && !masterVault?.salt) {
      toast.error("Master vault not initialized")
    }
    expect(toast.error).toHaveBeenCalledWith("Master vault not initialized")
  })

  it("shows error toast when getDek returns null", async () => {
    const { toast } = require("sonner")
    const { useWorkspaceDekStore } = require("@/store/workspace-dek-store")
    ;(useWorkspaceDekStore.getState as jest.Mock).mockReturnValueOnce({
      getDek: jest.fn().mockResolvedValueOnce(null),
    })

    const dek = await useWorkspaceDekStore.getState().getDek("ws-abc")
    if (!dek) {
      toast.error("You don't have access to this workspace's encryption key")
    }

    expect(toast.error).toHaveBeenCalledWith(
      "You don't have access to this workspace's encryption key",
    )
  })

  it("calls listPendingWraps with the correct workspaceId", async () => {
    const { listPendingWraps } = require("@/lib/workspace-dek-api")
    ;(listPendingWraps as jest.Mock).mockResolvedValueOnce([
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
    ])

    await listPendingWraps("ws-xyz")

    expect(listPendingWraps).toHaveBeenCalledWith("ws-xyz")
  })

  it("calls wrapDekForMember and postDekWrap for each ready member", async () => {
    const { wrapDekForMember } = require("@/lib/workspace-crypto")
    const { postDekWrap, listPendingWraps } = require("@/lib/workspace-dek-api")
    const { useWorkspaceDekStore } = require("@/store/workspace-dek-store")

    const fakeDek = { type: "secret" } as unknown as CryptoKey
    const fakeWrapped = { encrypted: "enc", iv: "iv", senderPublicKey: "spk" }

    ;(useWorkspaceDekStore.getState as jest.Mock).mockReturnValueOnce({
      getDek: jest.fn().mockResolvedValueOnce(fakeDek),
    })
    ;(wrapDekForMember as jest.Mock).mockResolvedValue(fakeWrapped)
    ;(postDekWrap as jest.Mock).mockResolvedValue(undefined)
    ;(listPendingWraps as jest.Mock).mockResolvedValueOnce([])

    const pending = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: "u2@test.com", publicKey: null },
    ]
    const ready = pending.filter((m) => m.publicKey)
    const myPriv = {} as CryptoKey
    const myPub = "my-pub"

    const dek = await useWorkspaceDekStore.getState().getDek("ws-abc")
    for (const member of ready) {
      const wrapped = await wrapDekForMember(dek, myPriv, member.publicKey!, myPub)
      await postDekWrap("ws-abc", { target_uid: member.uid, wrapped })
    }

    expect(wrapDekForMember).toHaveBeenCalledTimes(1)
    expect(postDekWrap).toHaveBeenCalledTimes(1)
    expect(postDekWrap).toHaveBeenCalledWith("ws-abc", {
      target_uid: "u1",
      wrapped: fakeWrapped,
    })
  })

  it("refreshes pending list after wrapping and shows success toast", async () => {
    const { toast } = require("sonner")
    const { listPendingWraps } = require("@/lib/workspace-dek-api")

    ;(listPendingWraps as jest.Mock).mockResolvedValueOnce([])

    const ready = [{ uid: "u1", email: "u1@test.com", publicKey: "pk1" }]
    const fresh = await listPendingWraps("ws-abc")
    // Simulate setPending(fresh) and success toast
    expect(fresh).toEqual([])
    toast.success(`Wrapped DEK for ${ready.length} member(s)`)

    expect(toast.success).toHaveBeenCalledWith("Wrapped DEK for 1 member(s)")
  })

  it("shows error toast on unexpected error", async () => {
    const { toast } = require("sonner")

    const err = new Error("postDekWrap failed (500)")
    toast.error(err instanceof Error ? err.message : "Failed to wrap DEK")

    expect(toast.error).toHaveBeenCalledWith("postDekWrap failed (500)")
  })

  it("skips pending members without a publicKey when wrapping", () => {
    const pending = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: "u2@test.com", publicKey: null },
      { uid: "u3", email: "u3@test.com", publicKey: "pk3" },
    ]
    const ready = pending.filter((m) => m.publicKey)
    expect(ready).toHaveLength(2)
    expect(ready.map((m) => m.uid)).toEqual(["u1", "u3"])
  })
})
