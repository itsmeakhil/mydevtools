/**
 * Tests for invitations-api.ts (Task 14 — workspace collaboration)
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock backendFetch, assert URL + method + body shape.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

import * as backendAuth from "@/lib/backend-auth"
import {
  inviteToOrg,
  inviteToWorkspace,
  listPending,
  acceptInvitation,
  revokeInvitation,
} from "@/lib/invitations-api"

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

const sampleInvitation = {
  id: "inv1",
  org_id: "o1",
  workspace_id: null,
  invited_email: "bob@example.com",
  invited_uid: null,
  invited_role_org: "member" as const,
  invited_role_ws: null,
  status: "pending" as const,
  expires_at: 1800000000,
  created_at: 1700000000,
}

describe("invitations-api — inviteToOrg", () => {
  it("POSTs to /orgs/{orgId}/members with email and role", async () => {
    mockFetch.mockResolvedValueOnce(okJson(sampleInvitation))

    const result = await inviteToOrg("o1", "bob@example.com", "member")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1/members`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ email: "bob@example.com", role: "member" })
    expect(result).toEqual(sampleInvitation)
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 409 }))
    await expect(inviteToOrg("o1", "x@y.com", "member")).rejects.toThrow("inviteToOrg failed (409)")
  })
})

describe("invitations-api — inviteToWorkspace", () => {
  it("POSTs to /workspaces/{wsId}/members with email and role", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...sampleInvitation, workspace_id: "w1" }))

    const result = await inviteToWorkspace("w1", "bob@example.com", "developer")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/workspaces/w1/members`)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual({ email: "bob@example.com", role: "developer" })
    expect(result.workspace_id).toBe("w1")
  })
})

describe("invitations-api — listPending", () => {
  it("GETs /invitations/pending and returns array", async () => {
    mockFetch.mockResolvedValueOnce(okJson([sampleInvitation]))

    const result = await listPending()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/invitations/pending`)
    expect(init).toBeUndefined()
    expect(result).toEqual([sampleInvitation])
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }))
    await expect(listPending()).rejects.toThrow("listPending failed (401)")
  })
})

describe("invitations-api — acceptInvitation", () => {
  it("POSTs to /invitations/{token}/accept", async () => {
    const accepted = { org_id: "o1", workspace_id: null }
    mockFetch.mockResolvedValueOnce(okJson(accepted))

    const result = await acceptInvitation("tok123")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/invitations/tok123/accept`)
    expect(init.method).toBe("POST")
    expect(result).toEqual(accepted)
  })

  it("encodes token in URL", async () => {
    mockFetch.mockResolvedValueOnce(okJson({}))
    await acceptInvitation("tok/with/slash").catch(() => {})
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain("tok%2Fwith%2Fslash")
  })
})

describe("invitations-api — revokeInvitation", () => {
  it("POSTs to /invitations/{token}/revoke", async () => {
    mockFetch.mockResolvedValueOnce(okEmpty(204))

    await revokeInvitation("tok456")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/invitations/tok456/revoke`)
    expect(init.method).toBe("POST")
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(revokeInvitation("badtok")).rejects.toThrow("revokeInvitation failed (404)")
  })
})
