/**
 * Tests for dek-rotation.ts (Task 31 — C-T12 — Client-side DEK re-encryption loop)
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock backendFetch, encryptEntry, decryptEntry; verify the loop
 * correctly calls decrypt → encrypt → PATCH for each entry and tracks progress.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

jest.mock("@/lib/workspace-crypto", () => ({
  encryptEntry: jest.fn(),
  decryptEntry: jest.fn(),
}))

import * as backendAuth from "@/lib/backend-auth"
import * as workspaceCrypto from "@/lib/workspace-crypto"
import { reencryptAllEntries, type RotationProgress } from "@/lib/dek-rotation"

const mockFetch = backendAuth.backendFetch as jest.Mock
const mockDecrypt = workspaceCrypto.decryptEntry as jest.Mock
const mockEncrypt = workspaceCrypto.encryptEntry as jest.Mock

// ── Helpers ────────────────────────────────────────────────────────────────────

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function notOk(status = 404): Response {
  return new Response(null, { status })
}

const OLD_DEK = { type: "secret", algorithm: { name: "AES-GCM" } } as unknown as CryptoKey
const NEW_DEK = { type: "secret", algorithm: { name: "AES-GCM" }, _new: true } as unknown as CryptoKey

const PASSWORD_LIST_URL = "/api/backend/password-manager/entries"
const ENV_LIST_URL = "/api/backend/environment-manager/sets"
const APIKEY_LIST_URL = "/api/backend/api-key-vault/entries"

/** Build a minimal entry for password/env/apiKeyVault tools. */
function makeEntry(id: string, encryptedData = "enc-abc", iv = "iv-xyz") {
  return { id, encryptedData, iv }
}

/** Setup: all three list endpoints return empty arrays by default. */
function setupEmptyTools() {
  mockFetch.mockImplementation((url: string) => {
    if (url === PASSWORD_LIST_URL || url === ENV_LIST_URL || url === APIKEY_LIST_URL) {
      return Promise.resolve(okJson([]))
    }
    return Promise.resolve(notOk(404))
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

// ── Module exports ─────────────────────────────────────────────────────────────

describe("dek-rotation — module exports", () => {
  it("exports reencryptAllEntries as a function", () => {
    expect(typeof reencryptAllEntries).toBe("function")
  })
})

// ── Happy-path: two entries ────────────────────────────────────────────────────

describe("reencryptAllEntries — happy path with two entries", () => {
  beforeEach(() => {
    const entries = [makeEntry("id-1", "enc-1", "iv-1"), makeEntry("id-2", "enc-2", "iv-2")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      // List passwords → two entries
      if (url === PASSWORD_LIST_URL && !init) {
        return Promise.resolve(okJson(entries))
      }
      // List env / apiKeyVault → empty
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) {
        return Promise.resolve(okJson([]))
      }
      // PATCH calls → 200
      if (init?.method === "PATCH") {
        return Promise.resolve(new Response(null, { status: 200 }))
      }
      return Promise.resolve(notOk(404))
    })

    mockDecrypt.mockImplementation((_dek: CryptoKey, blob: { encrypted: string }) =>
      Promise.resolve(`plain-${blob.encrypted}`),
    )
    mockEncrypt.mockImplementation((_dek: CryptoKey, plain: string) =>
      Promise.resolve({ encrypted: `re-${plain}`, iv: "new-iv" }),
    )
  })

  it("returns rotated=2 failed=0 when both entries succeed", async () => {
    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(result).toEqual({ rotated: 2, failed: 0 })
  })

  it("calls decryptEntry with OLD_DEK for each entry", async () => {
    await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(mockDecrypt).toHaveBeenCalledTimes(2)
    expect(mockDecrypt).toHaveBeenCalledWith(OLD_DEK, { encrypted: "enc-1", iv: "iv-1" })
    expect(mockDecrypt).toHaveBeenCalledWith(OLD_DEK, { encrypted: "enc-2", iv: "iv-2" })
  })

  it("calls encryptEntry with NEW_DEK for each entry", async () => {
    await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(mockEncrypt).toHaveBeenCalledTimes(2)
    expect(mockEncrypt).toHaveBeenCalledWith(NEW_DEK, "plain-enc-1")
    expect(mockEncrypt).toHaveBeenCalledWith(NEW_DEK, "plain-enc-2")
  })

  it("PATCHes each entry with the re-encrypted blob", async () => {
    await reencryptAllEntries(OLD_DEK, NEW_DEK)

    const patchCalls = mockFetch.mock.calls.filter(
      ([, init]: [string, RequestInit | undefined]) => init?.method === "PATCH",
    )
    expect(patchCalls).toHaveLength(2)

    const [url1, init1] = patchCalls[0]
    const [url2, init2] = patchCalls[1]

    expect(url1).toBe("/api/backend/password-manager/entries/id-1")
    expect(url2).toBe("/api/backend/password-manager/entries/id-2")

    expect(JSON.parse(init1.body as string)).toEqual({
      encryptedData: "re-plain-enc-1",
      iv: "new-iv",
    })
    expect(JSON.parse(init2.body as string)).toEqual({
      encryptedData: "re-plain-enc-2",
      iv: "new-iv",
    })
  })
})

// ── Failure handling: decryptEntry throws on one entry ─────────────────────────

describe("reencryptAllEntries — failure handling", () => {
  it("increments failed when decryptEntry throws, and continues other entries", async () => {
    const entries = [makeEntry("id-a"), makeEntry("id-b"), makeEntry("id-c")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt
      .mockResolvedValueOnce("plain-a") // id-a succeeds
      .mockRejectedValueOnce(new Error("decryption auth tag mismatch")) // id-b fails
      .mockResolvedValueOnce("plain-c") // id-c succeeds

    mockEncrypt.mockImplementation((_dek: CryptoKey, plain: string) =>
      Promise.resolve({ encrypted: `re-${plain}`, iv: "iv-new" }),
    )

    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(result.rotated).toBe(2)
    expect(result.failed).toBe(1)
  })

  it("increments failed when PATCH returns non-ok status", async () => {
    const entries = [makeEntry("id-x")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 500 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValueOnce("plain-x")
    mockEncrypt.mockResolvedValueOnce({ encrypted: "re-x", iv: "iv-x" })

    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(result.rotated).toBe(0)
    expect(result.failed).toBe(1)
  })

  it("increments failed when list endpoint returns non-ok", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === PASSWORD_LIST_URL) return Promise.resolve(notOk(503))
      return Promise.resolve(okJson([]))
    })

    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    // passwords list failed → +1 failed; env and apiKeyVault succeed (empty) → 0 rotated
    expect(result.failed).toBe(1)
    expect(result.rotated).toBe(0)
  })

  it("increments failed for entries missing required fields", async () => {
    const incompleteEntries = [
      { id: "id-1" }, // missing encryptedData and iv
      { id: "id-2", encryptedData: "enc", iv: "iv" }, // valid
    ]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(incompleteEntries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValueOnce("plain-2")
    mockEncrypt.mockResolvedValueOnce({ encrypted: "re-2", iv: "iv-new" })

    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(result.rotated).toBe(1)
    expect(result.failed).toBe(1)
  })

  it("handles entries using _id instead of id", async () => {
    const entries = [{ _id: "mongo-id-1", encryptedData: "enc-m", iv: "iv-m" }]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValueOnce("plain-m")
    mockEncrypt.mockResolvedValueOnce({ encrypted: "re-m", iv: "iv-new" })

    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(result.rotated).toBe(1)
    expect(result.failed).toBe(0)

    // PATCH URL must use the _id value
    const patchCalls = mockFetch.mock.calls.filter(
      ([, init]: [string, RequestInit | undefined]) => init?.method === "PATCH",
    )
    expect(patchCalls[0][0]).toBe("/api/backend/password-manager/entries/mongo-id-1")
  })
})

// ── Progress callback ─────────────────────────────────────────────────────────

describe("reencryptAllEntries — progress callback", () => {
  it("fires onProgress after each entry", async () => {
    const entries = [makeEntry("id-1"), makeEntry("id-2")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValue("plain")
    mockEncrypt.mockResolvedValue({ encrypted: "re", iv: "iv-new" })

    const progressCalls: RotationProgress[] = []
    await reencryptAllEntries(OLD_DEK, NEW_DEK, (p) => progressCalls.push({ ...p }))

    // Two entries in passwords; env and apiKeyVault are empty.
    // Progress fires once per entry (after processing).
    const passwordProgress = progressCalls.filter((p) => p.tool === "passwords")
    expect(passwordProgress).toHaveLength(2)
    expect(passwordProgress[0]).toEqual({ tool: "passwords", current: 1, total: 2 })
    expect(passwordProgress[1]).toEqual({ tool: "passwords", current: 2, total: 2 })
  })

  it("fires onProgress with correct total when list has 3 entries", async () => {
    const entries = [makeEntry("a"), makeEntry("b"), makeEntry("c")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === ENV_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === PASSWORD_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValue("plain")
    mockEncrypt.mockResolvedValue({ encrypted: "re", iv: "iv-x" })

    const totals: number[] = []
    await reencryptAllEntries(OLD_DEK, NEW_DEK, (p) => totals.push(p.total))

    expect(totals).toEqual([3, 3, 3])
  })

  it("fires onProgress even for failed entries (keeps count in sync)", async () => {
    const entries = [makeEntry("fail-entry"), makeEntry("ok-entry")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt
      .mockRejectedValueOnce(new Error("bad tag"))
      .mockResolvedValueOnce("plain-ok")

    mockEncrypt.mockResolvedValueOnce({ encrypted: "re-ok", iv: "iv-ok" })

    const currents: number[] = []
    await reencryptAllEntries(OLD_DEK, NEW_DEK, (p) => currents.push(p.current))

    // Both entries should have generated a progress call
    expect(currents).toEqual([1, 2])
  })

  it("does not fire onProgress when no callback is provided", async () => {
    setupEmptyTools()
    // Should not throw even when onProgress is undefined
    await expect(reencryptAllEntries(OLD_DEK, NEW_DEK)).resolves.toEqual({
      rotated: 0,
      failed: 0,
    })
  })
})

// ── Multi-tool coverage ────────────────────────────────────────────────────────

describe("reencryptAllEntries — multi-tool iteration", () => {
  it("iterates all three tools and aggregates counts", async () => {
    const passwordEntries = [makeEntry("pw-1")]
    const envEntries = [makeEntry("env-1"), makeEntry("env-2")]
    const apikeyEntries = [makeEntry("ak-1")]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(passwordEntries))
      if (url === ENV_LIST_URL && !init) return Promise.resolve(okJson(envEntries))
      if (url === APIKEY_LIST_URL && !init) return Promise.resolve(okJson(apikeyEntries))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValue("plain")
    mockEncrypt.mockResolvedValue({ encrypted: "re", iv: "iv-new" })

    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    // 1 + 2 + 1 = 4 total entries
    expect(result.rotated).toBe(4)
    expect(result.failed).toBe(0)
  })

  it("URL-encodes special characters in entry IDs", async () => {
    const entries = [{ id: "id with/slash", encryptedData: "enc", iv: "iv" }]

    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === PASSWORD_LIST_URL && !init) return Promise.resolve(okJson(entries))
      if ((url === ENV_LIST_URL || url === APIKEY_LIST_URL) && !init) return Promise.resolve(okJson([]))
      if (init?.method === "PATCH") return Promise.resolve(new Response(null, { status: 200 }))
      return Promise.resolve(notOk())
    })

    mockDecrypt.mockResolvedValueOnce("plain")
    mockEncrypt.mockResolvedValueOnce({ encrypted: "re", iv: "iv-new" })

    await reencryptAllEntries(OLD_DEK, NEW_DEK)

    const patchUrl = mockFetch.mock.calls.find(
      ([, init]: [string, RequestInit | undefined]) => init?.method === "PATCH",
    )?.[0]
    expect(patchUrl).toBe("/api/backend/password-manager/entries/id%20with%2Fslash")
  })

  it("returns rotated=0 failed=0 when all tools are empty", async () => {
    setupEmptyTools()
    const result = await reencryptAllEntries(OLD_DEK, NEW_DEK)
    expect(result).toEqual({ rotated: 0, failed: 0 })
  })
})
