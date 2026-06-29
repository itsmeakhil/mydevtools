/**
 * Tests for user-keypair-api.ts (Task 23 — Workspaces E2EE).
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock backendFetch, assert URL + method + body shape.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

import * as backendAuth from "@/lib/backend-auth"
import { getKeypair, setKeypair } from "@/lib/user-keypair-api"
import type { KeypairBlob } from "@/lib/user-keypair-api"

const mockFetch = backendAuth.backendFetch as jest.Mock

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function okEmpty(status = 204): Response {
  return new Response(null, { status })
}

beforeEach(() => {
  jest.clearAllMocks()
})

const BASE = "/api/backend/workspaces-api"

const sampleBlob: KeypairBlob = {
  publicKey: "SPKI_BASE64",
  privateKeyEncrypted: { encrypted: "ENC_BASE64", iv: "IV_BASE64" },
  salt: "SALT_BASE64",
  createdAt: 1700000000,
}

describe("getKeypair", () => {
  it("GETs /users/me/keypair and returns the blob", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleBlob))

    const result = await getKeypair()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/users/me/keypair`)
    expect(init).toBeUndefined()
    expect(result).toEqual(sampleBlob)
  })

  it("returns null when response body is null (no keypair yet)", async () => {
    mockFetch.mockResolvedValueOnce(okJson(null))

    const result = await getKeypair()

    expect(result).toBeNull()
  })

  it("returns null on HTTP 404", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))

    const result = await getKeypair()

    expect(result).toBeNull()
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(getKeypair()).rejects.toThrow("getKeypair failed (500)")
  })
})

describe("setKeypair", () => {
  it("POSTs the blob to /users/me/keypair", async () => {
    mockFetch.mockResolvedValueOnce(okEmpty(204))

    await setKeypair(sampleBlob)

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/users/me/keypair`)
    expect(init.method).toBe("POST")
    expect(init.headers?.["Content-Type"]).toBe("application/json")
    expect(JSON.parse(init.body)).toEqual(sampleBlob)
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 409 }))
    await expect(setKeypair(sampleBlob)).rejects.toThrow("setKeypair failed (409)")
  })
})
