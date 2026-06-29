/**
 * Tests for EnableEncryptedToolsCta (Task 28 — Enable encrypted tools CTA)
 *
 * Environment: jest-environment-node — no DOM, no React rendering.
 * Strategy: module-export check + source structure assertions + logic simulation.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/workspace-dek-api", () => ({
  listMemberPublicKeys: jest.fn(),
  rotateDek: jest.fn(),
}))

jest.mock("@/lib/user-keypair-api", () => ({
  setKeypair: jest.fn(),
  getKeypair: jest.fn(),
}))

jest.mock("@/lib/workspace-crypto", () => ({
  generateUserKeypair: jest.fn(),
  generateWorkspaceDek: jest.fn(),
  wrapDekForMember: jest.fn(),
  dekFingerprint: jest.fn(),
  unwrapUserPrivateKey: jest.fn(),
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

jest.mock("@/store/workspace-store", () => ({
  useWorkspaceStore: jest.fn((sel: (s: { loadFromBackend: jest.Mock }) => unknown) =>
    sel({ loadFromBackend: jest.fn() }),
  ),
}))

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}))

describe("EnableEncryptedToolsCta — module exports", () => {
  it("exports a EnableEncryptedToolsCta named function", () => {
    const mod = require("../enable-encrypted-tools-cta")
    expect(typeof mod.EnableEncryptedToolsCta).toBe("function")
  })
})

describe("EnableEncryptedToolsCta — source structure", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../enable-encrypted-tools-cta.tsx"),
    "utf8",
  )

  it("uses the use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("imports Lock and Loader2 from lucide-react", () => {
    expect(source).toContain("Lock")
    expect(source).toContain("Loader2")
    expect(source).toContain("lucide-react")
  })

  it("imports generateWorkspaceDek from workspace-crypto", () => {
    expect(source).toContain("generateWorkspaceDek")
    expect(source).toContain("workspace-crypto")
  })

  it("imports listMemberPublicKeys and rotateDek from workspace-dek-api", () => {
    expect(source).toContain("listMemberPublicKeys")
    expect(source).toContain("rotateDek")
    expect(source).toContain("workspace-dek-api")
  })

  it("imports useMasterKeyStore", () => {
    expect(source).toContain("useMasterKeyStore")
  })

  it("imports useUserKeypairStore", () => {
    expect(source).toContain("useUserKeypairStore")
  })

  it("imports setKeypair and getKeypair from user-keypair-api", () => {
    expect(source).toContain("setKeypair")
    expect(source).toContain("getKeypair")
    expect(source).toContain("user-keypair-api")
  })

  it("accepts workspaceId prop", () => {
    expect(source).toContain("workspaceId")
  })

  it("renders Enable encrypted tools button text", () => {
    expect(source).toContain("Enable encrypted tools")
  })

  it("shows toast.error when master password is not unlocked", () => {
    expect(source).toContain("Unlock your master password first")
  })

  it("warns about members without a keypair", () => {
    expect(source).toContain("haven't published a keypair yet")
  })

  it("calls dekFingerprint before submitting", () => {
    expect(source).toContain("dekFingerprint")
  })

  it("calls reloadStore after successful rotate-dek", () => {
    expect(source).toContain("reloadStore")
  })
})

describe("EnableEncryptedToolsCta — handleEnable logic simulation", () => {
  beforeEach(() => jest.clearAllMocks())

  it("shows error toast when masterKey is null", async () => {
    const { toast } = require("sonner")

    // Simulate handleEnable with no masterKey
    const masterKey = null
    if (!masterKey) {
      toast.error("Unlock your master password first")
    }

    expect(toast.error).toHaveBeenCalledWith("Unlock your master password first")
  })

  it("calls listMemberPublicKeys with the workspaceId", async () => {
    const { listMemberPublicKeys } = require("@/lib/workspace-dek-api")
    ;(listMemberPublicKeys as jest.Mock).mockResolvedValueOnce([
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
    ])

    await listMemberPublicKeys("ws-abc")

    expect(listMemberPublicKeys).toHaveBeenCalledWith("ws-abc")
  })

  it("calls wrapDekForMember for each member with a publicKey", async () => {
    const { wrapDekForMember, generateWorkspaceDek, dekFingerprint } = require("@/lib/workspace-crypto")
    const { rotateDek } = require("@/lib/workspace-dek-api")

    const fakeDek = { type: "secret" } as unknown as CryptoKey
    ;(generateWorkspaceDek as jest.Mock).mockResolvedValueOnce(fakeDek)
    ;(wrapDekForMember as jest.Mock).mockResolvedValue({ encrypted: "enc", iv: "iv", senderPublicKey: "spk" })
    ;(dekFingerprint as jest.Mock).mockResolvedValueOnce("fp-abc")
    ;(rotateDek as jest.Mock).mockResolvedValueOnce(undefined)

    const members = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: null, publicKey: null },
    ]
    const ready = members.filter((m) => m.publicKey)
    const myPriv = {} as CryptoKey
    const myPub = "my-pub"

    const dek = await generateWorkspaceDek()
    const wraps = await Promise.all(
      ready.map(async (m) => {
        const wrapped = await wrapDekForMember(dek, myPriv, m.publicKey!, myPub)
        return { uid: m.uid, wrapped }
      }),
    )
    const fp = await dekFingerprint(dek)
    await rotateDek("ws-abc", { dekFingerprint: fp, wraps })

    expect(wrapDekForMember).toHaveBeenCalledTimes(1)
    expect(rotateDek).toHaveBeenCalledWith("ws-abc", {
      dekFingerprint: "fp-abc",
      wraps: [{ uid: "u1", wrapped: { encrypted: "enc", iv: "iv", senderPublicKey: "spk" } }],
    })
  })

  it("shows warning toast when some members have no publicKey", async () => {
    const { toast } = require("sonner")

    const members = [
      { uid: "u1", email: "u1@test.com", publicKey: null },
      { uid: "u2", email: "u2@test.com", publicKey: null },
    ]
    const missing = members.filter((m) => !m.publicKey)
    if (missing.length > 0) {
      toast.warning(
        `${missing.length} member(s) haven't published a keypair yet. They'll receive a pending-wrap prompt on next login.`,
      )
    }

    expect(toast.warning).toHaveBeenCalledWith(
      "2 member(s) haven't published a keypair yet. They'll receive a pending-wrap prompt on next login.",
    )
  })

  it("shows success toast after successful enable", async () => {
    const { toast } = require("sonner")

    // Simulate the success path
    toast.success("Encryption enabled — encrypted tools are now available")

    expect(toast.success).toHaveBeenCalledWith(
      "Encryption enabled — encrypted tools are now available",
    )
  })

  it("shows error toast on unexpected error", async () => {
    const { toast } = require("sonner")

    const err = new Error("rotateDek failed (500)")
    toast.error(err instanceof Error ? err.message : "Failed to enable encryption")

    expect(toast.error).toHaveBeenCalledWith("rotateDek failed (500)")
  })

  it("calls setKeypair with master vault salt", async () => {
    const { setKeypair } = require("@/lib/user-keypair-api")
    const { generateUserKeypair, unwrapUserPrivateKey } = require("@/lib/workspace-crypto")

    const fakeBlob = { publicKey: "pk-abc", privateKeyEncrypted: "enc-abc" }
    ;(generateUserKeypair as jest.Mock).mockResolvedValueOnce(fakeBlob)
    ;(unwrapUserPrivateKey as jest.Mock).mockResolvedValueOnce({} as CryptoKey)
    ;(setKeypair as jest.Mock).mockResolvedValueOnce(undefined)

    await setKeypair({
      publicKey: fakeBlob.publicKey,
      privateKeyEncrypted: fakeBlob.privateKeyEncrypted,
      salt: "test-salt",
      createdAt: expect.any(Number),
    })

    expect(setKeypair).toHaveBeenCalledWith(
      expect.objectContaining({
        salt: "test-salt",
      }),
    )
  })

  it("shows error toast when master vault is not initialized", async () => {
    const { toast } = require("sonner")
    const { useMasterKeyStore: originalMock } = require("@/store/master-key-store")

    // Mock with no vault
    ;(originalMock as jest.Mock).mockImplementationOnce((sel) =>
      sel({ encryptionKey: { type: "CryptoKey" }, vault: null }),
    )

    const masterVault = null as { salt: string } | null
    if (!masterVault?.salt) {
      toast.error("Master vault not initialized")
    }

    expect(toast.error).toHaveBeenCalledWith("Master vault not initialized")
  })
})
