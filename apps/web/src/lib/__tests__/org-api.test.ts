/**
 * Tests for org-api.ts (Task 14 — workspace collaboration)
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock backendFetch, assert URL + method + body shape.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

import * as backendAuth from "@/lib/backend-auth"
import {
  createOrg,
  renameOrg,
  deleteOrg,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
} from "@/lib/org-api"

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

describe("org-api — createOrg", () => {
  it("POSTs to /orgs with correct body and returns parsed org", async () => {
    const org = { id: "o1", name: "Acme", slug: "acme", kind: "user", org_role: "owner" }
    mockFetch.mockResolvedValueOnce(okJson(org))

    const result = await createOrg("Acme")

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ name: "Acme" })
    expect(result).toEqual(org)
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 422 }))
    await expect(createOrg("Bad")).rejects.toThrow("createOrg failed (422)")
  })
})

describe("org-api — renameOrg", () => {
  it("PATCHes /orgs/{id} with name", async () => {
    const org = { id: "o1", name: "Renamed", slug: "renamed", kind: "user", org_role: "owner" }
    mockFetch.mockResolvedValueOnce(okJson(org))

    const result = await renameOrg("o1", "Renamed")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ name: "Renamed" })
    expect(result).toEqual(org)
  })

  it("encodes orgId in URL", async () => {
    mockFetch.mockResolvedValueOnce(okJson({}))
    await renameOrg("org/with/slashes", "X").catch(() => {})
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("org%2Fwith%2Fslashes")
  })
})

describe("org-api — deleteOrg", () => {
  it("DELETEs /orgs/{id}", async () => {
    mockFetch.mockResolvedValueOnce(okEmpty(204))

    await deleteOrg("o1")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1`)
    expect(init.method).toBe("DELETE")
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(deleteOrg("o1")).rejects.toThrow("deleteOrg failed (403)")
  })
})

describe("org-api — createWorkspace", () => {
  it("POSTs to /orgs/{orgId}/workspaces with name", async () => {
    const ws = { id: "w1", org_id: "o1", name: "Dev", slug: "dev", is_personal: false, kind: "shared", ws_role: "admin" }
    mockFetch.mockResolvedValueOnce(okJson(ws))

    const result = await createWorkspace("o1", "Dev")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1/workspaces`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ name: "Dev" })
    expect(result).toEqual(ws)
  })
})

describe("org-api — renameWorkspace", () => {
  it("PATCHes /workspaces/{id} with name", async () => {
    const ws = { id: "w1", name: "Renamed" }
    mockFetch.mockResolvedValueOnce(okJson(ws))

    await renameWorkspace("w1", "Renamed")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/workspaces/w1`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ name: "Renamed" })
  })
})

describe("org-api — deleteWorkspace", () => {
  it("DELETEs /workspaces/{id}", async () => {
    mockFetch.mockResolvedValueOnce(okEmpty(204))

    await deleteWorkspace("w1")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/workspaces/w1`)
    expect(init.method).toBe("DELETE")
  })
})
