/**
 * Tests for workspace-dek-api.ts (Task 24 — Workspace DEK store)
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock backendFetch, assert URL shape and return type.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

import * as backendAuth from "@/lib/backend-auth"
import { getWorkspaceDekWrap } from "@/lib/workspace-dek-api"
import type { DekWrapBlob } from "@/lib/workspace-dek-api"

const mockFetch = backendAuth.backendFetch as jest.Mock

const BASE = "/api/backend/workspaces-api"

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("getWorkspaceDekWrap", () => {
  it("GETs the correct URL for a workspace ID", async () => {
    const payload: DekWrapBlob = {
      wrappedDek: { encrypted: "enc", iv: "iv", senderPublicKey: "spk" },
      wrappedDekVersion: 1,
    }
    mockFetch.mockResolvedValueOnce(okJson(payload))

    await getWorkspaceDekWrap("ws-abc")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/workspaces/ws-abc/dek-wrap`)
  })

  it("URL-encodes workspace IDs that contain special characters", async () => {
    const payload: DekWrapBlob = { wrappedDek: null, wrappedDekVersion: 0 }
    mockFetch.mockResolvedValueOnce(okJson(payload))

    await getWorkspaceDekWrap("ws/with spaces")

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toBe(`${BASE}/workspaces/ws%2Fwith%20spaces/dek-wrap`)
  })

  it("returns the parsed DekWrapBlob on success", async () => {
    const payload: DekWrapBlob = {
      wrappedDek: { encrypted: "abc", iv: "def", senderPublicKey: "ghi" },
      wrappedDekVersion: 7,
    }
    mockFetch.mockResolvedValueOnce(okJson(payload))

    const result = await getWorkspaceDekWrap("ws-1")

    expect(result).toEqual(payload)
    expect(result.wrappedDek).not.toBeNull()
    expect(result.wrappedDekVersion).toBe(7)
  })

  it("returns a DekWrapBlob with wrappedDek: null when backend has no DEK", async () => {
    const payload: DekWrapBlob = { wrappedDek: null, wrappedDekVersion: 0 }
    mockFetch.mockResolvedValueOnce(okJson(payload))

    const result = await getWorkspaceDekWrap("ws-no-dek")

    expect(result.wrappedDek).toBeNull()
    expect(result.wrappedDekVersion).toBe(0)
  })

  it("throws when the response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(getWorkspaceDekWrap("ws-missing")).rejects.toThrow(
      "getWorkspaceDekWrap failed (404)"
    )
  })

  it("throws on a 403 response", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(getWorkspaceDekWrap("ws-forbidden")).rejects.toThrow(
      "getWorkspaceDekWrap failed (403)"
    )
  })
})
