/**
 * Tests for workspace-dek-store.ts (Task 24 — Workspace DEK store)
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock workspace-dek-api and workspace-crypto; control user-keypair-store state.
 */

jest.mock("@/lib/workspace-dek-api", () => ({
  getWorkspaceDekWrap: jest.fn(),
}))

jest.mock("@/lib/workspace-crypto", () => ({
  unwrapDek: jest.fn(),
}))

import { useWorkspaceDekStore } from "../workspace-dek-store"
import { useUserKeypairStore } from "../user-keypair-store"
import * as dekApi from "@/lib/workspace-dek-api"
import * as workspaceCrypto from "@/lib/workspace-crypto"

const mockGetDekWrap = dekApi.getWorkspaceDekWrap as jest.Mock
const mockUnwrapDek = workspaceCrypto.unwrapDek as jest.Mock

function makeFakeCryptoKey(label = "fake-key"): CryptoKey {
  return {
    type: "secret",
    extractable: true,
    algorithm: { name: "AES-GCM" },
    usages: ["encrypt", "decrypt"],
    _label: label,
  } as unknown as CryptoKey
}

function makeFakePrivateKey(): CryptoKey {
  return {
    type: "private",
    extractable: false,
    algorithm: { name: "X25519" },
    usages: ["deriveBits"],
  } as unknown as CryptoKey
}

beforeEach(() => {
  useWorkspaceDekStore.getState().clear()
  useUserKeypairStore.getState().clear()
  jest.clearAllMocks()
})

// ── Initial state ──────────────────────────────────────────────────────────────

describe("useWorkspaceDekStore — initial state", () => {
  it("starts with an empty Map", () => {
    const { deks } = useWorkspaceDekStore.getState()
    expect(deks).toBeInstanceOf(Map)
    expect(deks.size).toBe(0)
  })
})

// ── getDek — no private key ────────────────────────────────────────────────────

describe("useWorkspaceDekStore — getDek", () => {
  it("returns null when no private key is set in the keypair store", async () => {
    // privateKey is null (default after clear)
    const result = await useWorkspaceDekStore.getState().getDek("ws-1")
    expect(result).toBeNull()
    expect(mockGetDekWrap).not.toHaveBeenCalled()
  })

  it("returns null when backend returns wrappedDek: null", async () => {
    useUserKeypairStore.getState().setKeypair("pub-key", makeFakePrivateKey())
    mockGetDekWrap.mockResolvedValueOnce({ wrappedDek: null, wrappedDekVersion: 1 })

    const result = await useWorkspaceDekStore.getState().getDek("ws-2")

    expect(result).toBeNull()
    expect(mockGetDekWrap).toHaveBeenCalledTimes(1)
    expect(mockGetDekWrap).toHaveBeenCalledWith("ws-2")
    expect(mockUnwrapDek).not.toHaveBeenCalled()
  })

  it("returns and caches the decrypted DEK on success", async () => {
    const privateKey = makeFakePrivateKey()
    useUserKeypairStore.getState().setKeypair("pub-key", privateKey)

    const fakeWrappedDek = { encrypted: "enc", iv: "iv", senderPublicKey: "spk" }
    const fakeDek = makeFakeCryptoKey("workspace-dek")

    mockGetDekWrap.mockResolvedValueOnce({ wrappedDek: fakeWrappedDek, wrappedDekVersion: 3 })
    mockUnwrapDek.mockResolvedValueOnce(fakeDek)

    const result = await useWorkspaceDekStore.getState().getDek("ws-3")

    expect(result).toBe(fakeDek)
    expect(mockUnwrapDek).toHaveBeenCalledWith(fakeWrappedDek, privateKey)

    // Verify it's been cached
    const { deks } = useWorkspaceDekStore.getState()
    const cached = deks.get("ws-3")
    expect(cached).toBeDefined()
    expect(cached!.key).toBe(fakeDek)
    expect(cached!.version).toBe(3)
  })

  it("returns the cached DEK on second call without re-hitting backend or unwrapDek", async () => {
    const privateKey = makeFakePrivateKey()
    useUserKeypairStore.getState().setKeypair("pub-key", privateKey)

    const fakeWrappedDek = { encrypted: "enc", iv: "iv", senderPublicKey: "spk" }
    const fakeDek = makeFakeCryptoKey("cached-dek")

    mockGetDekWrap.mockResolvedValueOnce({ wrappedDek: fakeWrappedDek, wrappedDekVersion: 1 })
    mockUnwrapDek.mockResolvedValueOnce(fakeDek)

    // First call — fetches and caches
    const first = await useWorkspaceDekStore.getState().getDek("ws-4")
    expect(first).toBe(fakeDek)
    expect(mockGetDekWrap).toHaveBeenCalledTimes(1)
    expect(mockUnwrapDek).toHaveBeenCalledTimes(1)

    // Second call — should return from cache
    const second = await useWorkspaceDekStore.getState().getDek("ws-4")
    expect(second).toBe(fakeDek)
    expect(mockGetDekWrap).toHaveBeenCalledTimes(1) // no additional call
    expect(mockUnwrapDek).toHaveBeenCalledTimes(1) // no additional call
  })
})

// ── clearWorkspace ─────────────────────────────────────────────────────────────

describe("useWorkspaceDekStore — clearWorkspace", () => {
  it("removes only the specified workspace entry, leaving others intact", async () => {
    const privateKey = makeFakePrivateKey()
    useUserKeypairStore.getState().setKeypair("pub-key", privateKey)

    const fakeDekA = makeFakeCryptoKey("dek-a")
    const fakeDekB = makeFakeCryptoKey("dek-b")

    mockGetDekWrap
      .mockResolvedValueOnce({ wrappedDek: { encrypted: "e", iv: "i", senderPublicKey: "s" }, wrappedDekVersion: 1 })
      .mockResolvedValueOnce({ wrappedDek: { encrypted: "e2", iv: "i2", senderPublicKey: "s2" }, wrappedDekVersion: 2 })
    mockUnwrapDek
      .mockResolvedValueOnce(fakeDekA)
      .mockResolvedValueOnce(fakeDekB)

    await useWorkspaceDekStore.getState().getDek("ws-a")
    await useWorkspaceDekStore.getState().getDek("ws-b")

    expect(useWorkspaceDekStore.getState().deks.size).toBe(2)

    useWorkspaceDekStore.getState().clearWorkspace("ws-a")

    const { deks } = useWorkspaceDekStore.getState()
    expect(deks.size).toBe(1)
    expect(deks.has("ws-a")).toBe(false)
    expect(deks.get("ws-b")?.key).toBe(fakeDekB)
  })

  it("is a no-op when the workspace is not in the cache", () => {
    // Start empty, clearWorkspace should not throw
    expect(() => useWorkspaceDekStore.getState().clearWorkspace("does-not-exist")).not.toThrow()
    expect(useWorkspaceDekStore.getState().deks.size).toBe(0)
  })
})

// ── clear ──────────────────────────────────────────────────────────────────────

describe("useWorkspaceDekStore — clear", () => {
  it("removes all entries from the cache", async () => {
    const privateKey = makeFakePrivateKey()
    useUserKeypairStore.getState().setKeypair("pub-key", privateKey)

    const fakeDek = makeFakeCryptoKey()
    mockGetDekWrap.mockResolvedValue({ wrappedDek: { encrypted: "e", iv: "i", senderPublicKey: "s" }, wrappedDekVersion: 1 })
    mockUnwrapDek.mockResolvedValue(fakeDek)

    await useWorkspaceDekStore.getState().getDek("ws-x")
    await useWorkspaceDekStore.getState().getDek("ws-y")
    expect(useWorkspaceDekStore.getState().deks.size).toBe(2)

    useWorkspaceDekStore.getState().clear()

    expect(useWorkspaceDekStore.getState().deks.size).toBe(0)
  })
})
