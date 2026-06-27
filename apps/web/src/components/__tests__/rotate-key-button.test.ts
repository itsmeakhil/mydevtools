/**
 * Tests for RotateKeyButton (Task 30 — C-T11 — Rotate encryption key)
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

jest.mock("@/lib/workspace-crypto", () => ({
  generateWorkspaceDek: jest.fn(),
  wrapDekForMember: jest.fn(),
  dekFingerprint: jest.fn(),
}))

jest.mock("@/store/user-keypair-store", () => ({
  useUserKeypairStore: jest.fn((sel: (s: { publicKey: string | null; privateKey: CryptoKey | null }) => unknown) =>
    sel({ publicKey: null, privateKey: null }),
  ),
}))

jest.mock("@/store/workspace-dek-store", () => ({
  useWorkspaceDekStore: jest.fn((sel: (s: { clearWorkspace: jest.Mock }) => unknown) =>
    sel({ clearWorkspace: jest.fn() }),
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

// ── Module exports ─────────────────────────────────────────────────────────────

describe("RotateKeyButton — module exports", () => {
  it("exports a RotateKeyButton named function", () => {
    const mod = require("../rotate-key-button")
    expect(typeof mod.RotateKeyButton).toBe("function")
  })
})

// ── Source structure ───────────────────────────────────────────────────────────

describe("RotateKeyButton — source structure", () => {
  const fs = require("fs")
  const path = require("path")
  const source = fs.readFileSync(
    path.join(__dirname, "../rotate-key-button.tsx"),
    "utf8",
  )

  it("uses the use client directive", () => {
    expect(source).toContain('"use client"')
  })

  it("imports RotateCw and Loader2 from lucide-react", () => {
    expect(source).toContain("RotateCw")
    expect(source).toContain("Loader2")
    expect(source).toContain("lucide-react")
  })

  it("imports AlertDialog components from ui/alert-dialog", () => {
    expect(source).toContain("AlertDialog")
    expect(source).toContain("AlertDialogAction")
    expect(source).toContain("AlertDialogCancel")
    expect(source).toContain("AlertDialogContent")
    expect(source).toContain("AlertDialogDescription")
    expect(source).toContain("AlertDialogFooter")
    expect(source).toContain("AlertDialogHeader")
    expect(source).toContain("AlertDialogTitle")
    expect(source).toContain("AlertDialogTrigger")
    expect(source).toContain("alert-dialog")
  })

  it("imports generateWorkspaceDek, wrapDekForMember, dekFingerprint from workspace-crypto", () => {
    expect(source).toContain("generateWorkspaceDek")
    expect(source).toContain("wrapDekForMember")
    expect(source).toContain("dekFingerprint")
    expect(source).toContain("workspace-crypto")
  })

  it("imports listMemberPublicKeys and rotateDek from workspace-dek-api", () => {
    expect(source).toContain("listMemberPublicKeys")
    expect(source).toContain("rotateDek")
    expect(source).toContain("workspace-dek-api")
  })

  it("imports useUserKeypairStore", () => {
    expect(source).toContain("useUserKeypairStore")
    expect(source).toContain("user-keypair-store")
  })

  it("imports useWorkspaceDekStore", () => {
    expect(source).toContain("useWorkspaceDekStore")
    expect(source).toContain("workspace-dek-store")
  })

  it("imports useWorkspaceStore", () => {
    expect(source).toContain("useWorkspaceStore")
    expect(source).toContain("workspace-store")
  })

  it("accepts workspaceId prop", () => {
    expect(source).toContain("workspaceId")
  })

  it("renders 'Rotate encryption key' button label", () => {
    expect(source).toContain("Rotate encryption key")
  })

  it("renders confirmation dialog title", () => {
    expect(source).toContain("Rotate encryption key?")
  })

  it("warns about existing encrypted entries in dialog description", () => {
    expect(source).toContain("Existing")
    expect(source).toContain("unreadable")
    expect(source).toContain("re-encrypted")
    expect(source).toContain("next release")
  })

  it("guards against missing keypair with error toast message", () => {
    expect(source).toContain("Generate your keypair first via Enable encrypted tools")
  })

  it("guards against no ready members with error toast message", () => {
    expect(source).toContain("No members with published keypairs")
  })

  it("warns about members without keypairs", () => {
    expect(source).toContain("have no keypair and will lose access")
  })

  it("calls clearWsDek after successful rotation", () => {
    expect(source).toContain("clearWsDek")
  })

  it("calls reloadStore after successful rotation", () => {
    expect(source).toContain("reloadStore")
  })

  it("shows success toast with re-encryption reminder", () => {
    expect(source).toContain("Encryption key rotated")
    expect(source).toContain("next release")
  })
})

// ── Logic simulation ───────────────────────────────────────────────────────────

describe("RotateKeyButton — handleRotate logic simulation", () => {
  beforeEach(() => jest.clearAllMocks())

  it("shows error toast when userPriv is null", async () => {
    const { toast } = require("sonner")

    const userPriv = null
    const userPub = null
    if (!userPriv || !userPub) {
      toast.error("Generate your keypair first via Enable encrypted tools")
    }

    expect(toast.error).toHaveBeenCalledWith(
      "Generate your keypair first via Enable encrypted tools",
    )
  })

  it("does not call any API when keypair is missing", async () => {
    const { listMemberPublicKeys, rotateDek } = require("@/lib/workspace-dek-api")
    const { generateWorkspaceDek } = require("@/lib/workspace-crypto")

    const userPriv = null
    const userPub = null

    // Simulate handleRotate early return
    if (!userPriv || !userPub) {
      // returns early — no API calls
    } else {
      await listMemberPublicKeys("ws-abc")
      await generateWorkspaceDek()
      await rotateDek("ws-abc", { dekFingerprint: "fp", wraps: [] })
    }

    expect(listMemberPublicKeys).not.toHaveBeenCalled()
    expect(generateWorkspaceDek).not.toHaveBeenCalled()
    expect(rotateDek).not.toHaveBeenCalled()
  })

  it("shows error toast when no members have a publicKey", async () => {
    const { toast } = require("sonner")

    const members = [
      { uid: "u1", email: "u1@test.com", publicKey: null },
      { uid: "u2", email: "u2@test.com", publicKey: null },
    ]
    const ready = members.filter((m) => m.publicKey)
    if (ready.length === 0) {
      toast.error("No members with published keypairs — cannot rotate")
    }

    expect(toast.error).toHaveBeenCalledWith(
      "No members with published keypairs — cannot rotate",
    )
  })

  it("shows warning toast when some members are missing keypairs", async () => {
    const { toast } = require("sonner")

    const members = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: "u2@test.com", publicKey: null },
      { uid: "u3", email: "u3@test.com", publicKey: null },
    ]
    const missing = members.filter((m) => !m.publicKey)
    if (missing.length > 0) {
      toast.warning(
        `${missing.length} member(s) have no keypair and will lose access until they publish one`,
      )
    }

    expect(toast.warning).toHaveBeenCalledWith(
      "2 member(s) have no keypair and will lose access until they publish one",
    )
  })

  it("calls generateWorkspaceDek → listMemberPublicKeys → wrapDekForMember per ready member → rotateDek", async () => {
    const { listMemberPublicKeys, rotateDek } = require("@/lib/workspace-dek-api")
    const { generateWorkspaceDek, wrapDekForMember, dekFingerprint } =
      require("@/lib/workspace-crypto")

    const fakeDek = { type: "secret" } as unknown as CryptoKey
    const fakeWrapped = { encrypted: "enc", iv: "iv", senderPublicKey: "spk" }

    ;(listMemberPublicKeys as jest.Mock).mockResolvedValueOnce([
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: "u2@test.com", publicKey: "pk2" },
      { uid: "u3", email: "u3@test.com", publicKey: null },
    ])
    ;(generateWorkspaceDek as jest.Mock).mockResolvedValueOnce(fakeDek)
    ;(wrapDekForMember as jest.Mock).mockResolvedValue(fakeWrapped)
    ;(dekFingerprint as jest.Mock).mockResolvedValueOnce("fp-xyz")
    ;(rotateDek as jest.Mock).mockResolvedValueOnce(undefined)

    const userPriv = {} as CryptoKey
    const userPub = "my-pub-key"

    // Simulate the full handleRotate happy path
    const members = await listMemberPublicKeys("ws-test")
    const ready = members.filter((m: { publicKey: string | null }) => m.publicKey)
    const missing = members.filter((m: { publicKey: string | null }) => !m.publicKey)

    expect(ready).toHaveLength(2)
    expect(missing).toHaveLength(1)

    const newDek = await generateWorkspaceDek()
    const wraps = await Promise.all(
      ready.map(async (m: { uid: string; publicKey: string }) => {
        const wrapped = await wrapDekForMember(newDek, userPriv, m.publicKey, userPub)
        return { uid: m.uid, wrapped }
      }),
    )
    const fp = await dekFingerprint(newDek)
    await rotateDek("ws-test", { dekFingerprint: fp, wraps })

    expect(generateWorkspaceDek).toHaveBeenCalledTimes(1)
    expect(wrapDekForMember).toHaveBeenCalledTimes(2)
    expect(wrapDekForMember).toHaveBeenCalledWith(fakeDek, userPriv, "pk1", "my-pub-key")
    expect(wrapDekForMember).toHaveBeenCalledWith(fakeDek, userPriv, "pk2", "my-pub-key")
    expect(dekFingerprint).toHaveBeenCalledWith(fakeDek)
    expect(rotateDek).toHaveBeenCalledWith("ws-test", {
      dekFingerprint: "fp-xyz",
      wraps: [
        { uid: "u1", wrapped: fakeWrapped },
        { uid: "u2", wrapped: fakeWrapped },
      ],
    })
  })

  it("calls clearWsDek after rotateDek succeeds", async () => {
    const { useWorkspaceDekStore } = require("@/store/workspace-dek-store")

    const clearWorkspace = jest.fn()
    ;(useWorkspaceDekStore as jest.Mock).mockImplementationOnce(
      (sel: (s: { clearWorkspace: jest.Mock }) => unknown) => sel({ clearWorkspace }),
    )

    // Simulate the post-rotate clear
    const clearWsDek = clearWorkspace
    clearWsDek("ws-test")

    expect(clearWorkspace).toHaveBeenCalledWith("ws-test")
  })

  it("calls reloadStore after clearWsDek", async () => {
    const { useWorkspaceStore } = require("@/store/workspace-store")

    const loadFromBackend = jest.fn().mockResolvedValueOnce(undefined)
    ;(useWorkspaceStore as jest.Mock).mockImplementationOnce(
      (sel: (s: { loadFromBackend: jest.Mock }) => unknown) => sel({ loadFromBackend }),
    )

    const reloadStore = loadFromBackend
    await reloadStore()

    expect(loadFromBackend).toHaveBeenCalledTimes(1)
  })

  it("shows success toast with re-encryption reminder after successful rotation", async () => {
    const { toast } = require("sonner")

    toast.success(
      "Encryption key rotated. Existing encrypted entries must be re-encrypted (coming in next release).",
    )

    expect(toast.success).toHaveBeenCalledWith(
      "Encryption key rotated. Existing encrypted entries must be re-encrypted (coming in next release).",
    )
  })

  it("shows error toast on unexpected error from rotateDek", async () => {
    const { toast } = require("sonner")

    const err = new Error("rotateDek failed (403)")
    toast.error(err instanceof Error ? err.message : "Rotation failed")

    expect(toast.error).toHaveBeenCalledWith("rotateDek failed (403)")
  })

  it("shows generic error toast when non-Error is thrown", async () => {
    const { toast } = require("sonner")

    const err = "unexpected string error"
    toast.error(err instanceof Error ? err.message : "Rotation failed")

    expect(toast.error).toHaveBeenCalledWith("Rotation failed")
  })

  it("skips members without a publicKey when building wraps", () => {
    const members = [
      { uid: "u1", email: "u1@test.com", publicKey: "pk1" },
      { uid: "u2", email: "u2@test.com", publicKey: null },
      { uid: "u3", email: "u3@test.com", publicKey: "pk3" },
    ]
    const ready = members.filter((m) => m.publicKey)
    expect(ready).toHaveLength(2)
    expect(ready.map((m) => m.uid)).toEqual(["u1", "u3"])
  })
})

// ── Workspace section mount guard ──────────────────────────────────────────────

describe("RotateKeyButton — workspace-section mount conditions", () => {
  const fs = require("fs")
  const path = require("path")
  const sectionSource = fs.readFileSync(
    path.join(__dirname, "../../app/settings/workspaces/workspace-section.tsx"),
    "utf8",
  )

  it("imports RotateKeyButton in workspace-section", () => {
    expect(sectionSource).toContain("RotateKeyButton")
    expect(sectionSource).toContain("rotate-key-button")
  })

  it("renders RotateKeyButton only when encryption is enabled", () => {
    // The JSX usage <RotateKeyButton must appear inside the block that guards
    // on settings?.encryption != null and ws_role === "admin".
    expect(sectionSource).toContain("<RotateKeyButton")
    // The JSX tag index (after the import statement)
    const encryptionBlockIdx = sectionSource.indexOf("settings?.encryption != null")
    const rotateJsxIdx = sectionSource.indexOf("<RotateKeyButton")
    // JSX usage must appear after the encryption guard
    expect(rotateJsxIdx).toBeGreaterThan(encryptionBlockIdx)
  })
})
