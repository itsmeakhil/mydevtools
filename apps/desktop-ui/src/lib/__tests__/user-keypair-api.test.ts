/**
 * Tests for user-keypair-api.ts (Workspaces E2EE).
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock the Rust bridge, not the fetch helper, so the assertions cover
 * the whole path the wrapped private key travels: `/api/backend/...` →
 * `normalizeBackendPath` → `localApi("/api/v1/...")`. Getting that mapping
 * wrong is what would leave an existing vault undecryptable.
 */

jest.mock("@/lib/desktop/is-desktop", () => ({
  isDesktop: () => true,
}))

jest.mock("@/lib/desktop/bridge", () => {
  const actual = jest.requireActual("@/lib/desktop/bridge")
  return { ...actual, localApi: jest.fn() }
})

import { localApi } from "@/lib/desktop/bridge"
import { getKeypair, setKeypair } from "@/lib/user-keypair-api"
import type { KeypairBlob } from "@/lib/user-keypair-api"

const mockLocalApi = localApi as jest.Mock

function okJson(body: unknown) {
  return { status: 200, body: JSON.stringify(body) }
}

beforeEach(() => {
  jest.clearAllMocks()
})

const LOCAL_PATH = "/api/v1/workspaces-api/users/me/keypair"

const sampleBlob: KeypairBlob = {
  publicKey: "SPKI_BASE64",
  privateKeyEncrypted: { encrypted: "ENC_BASE64", iv: "IV_BASE64" },
  salt: "SALT_BASE64",
  createdAt: 1700000000,
}

describe("getKeypair", () => {
  it("reads the local store at the normalized path and returns the blob", async () => {
    mockLocalApi.mockResolvedValueOnce(okJson(sampleBlob))

    const result = await getKeypair()

    const [method, path] = mockLocalApi.mock.calls[0]
    expect(method).toBe("GET")
    expect(path).toBe(LOCAL_PATH)
    expect(result).toEqual(sampleBlob)
  })

  it("returns null when the stored body is null (no keypair yet)", async () => {
    mockLocalApi.mockResolvedValueOnce(okJson(null))

    expect(await getKeypair()).toBeNull()
  })

  it("returns null on 404", async () => {
    mockLocalApi.mockResolvedValueOnce({ status: 404, body: "" })

    expect(await getKeypair()).toBeNull()
  })

  it("throws when the store reports a failure", async () => {
    mockLocalApi.mockResolvedValueOnce({ status: 500, body: "" })

    await expect(getKeypair()).rejects.toThrow("getKeypair failed (500)")
  })
})

describe("setKeypair", () => {
  it("writes the blob to the local store at the normalized path", async () => {
    mockLocalApi.mockResolvedValueOnce({ status: 204, body: "" })

    await setKeypair(sampleBlob)

    const [method, path, body] = mockLocalApi.mock.calls[0]
    expect(method).toBe("POST")
    expect(path).toBe(LOCAL_PATH)
    expect(JSON.parse(body)).toEqual(sampleBlob)
  })

  it("throws when the store reports a failure", async () => {
    mockLocalApi.mockResolvedValueOnce({ status: 409, body: "" })

    await expect(setKeypair(sampleBlob)).rejects.toThrow("setKeypair failed (409)")
  })
})
