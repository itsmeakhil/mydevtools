/**
 * Tests for members-api.ts (Task 14 — workspace collaboration)
 *
 * Environment: jest-environment-node — no DOM.
 * Strategy: mock backendFetch, assert URL + method + body shape.
 */

jest.mock("@/lib/backend-auth", () => ({
  backendFetch: jest.fn(),
}))

import * as backendAuth from "@/lib/backend-auth"
import {
  listOrgMembers,
  changeOrgRole,
  removeOrgMember,
  listWorkspaceMembers,
  changeWorkspaceRole,
  removeWorkspaceMember,
} from "@/lib/members-api"

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

const sampleMember = { uid: "u1", email: "alice@example.com", display_name: "Alice", role: "admin", since: 1700000000 }

describe("members-api — listOrgMembers", () => {
  it("GETs /orgs/{orgId}/members and returns array", async () => {
    mockFetch.mockResolvedValueOnce(okJson([sampleMember]))

    const result = await listOrgMembers("o1")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1/members`)
    expect(init).toBeUndefined()
    expect(result).toEqual([sampleMember])
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(listOrgMembers("o1")).rejects.toThrow("listOrgMembers failed (403)")
  })
})

describe("members-api — changeOrgRole", () => {
  it("PATCHes /orgs/{orgId}/members/{uid} with role", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...sampleMember, role: "viewer" }))

    const result = await changeOrgRole("o1", "u1", "viewer")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1/members/u1`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ role: "viewer" })
    expect(result.role).toBe("viewer")
  })
})

describe("members-api — removeOrgMember", () => {
  it("DELETEs /orgs/{orgId}/members/{uid}", async () => {
    mockFetch.mockResolvedValueOnce(okEmpty(204))

    await removeOrgMember("o1", "u1")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/orgs/o1/members/u1`)
    expect(init.method).toBe("DELETE")
  })

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(removeOrgMember("o1", "u1")).rejects.toThrow("removeOrgMember failed (404)")
  })
})

describe("members-api — listWorkspaceMembers", () => {
  it("GETs /workspaces/{wsId}/members and returns array", async () => {
    mockFetch.mockResolvedValueOnce(okJson([sampleMember]))

    const result = await listWorkspaceMembers("w1")

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/workspaces/w1/members`)
    expect(result).toEqual([sampleMember])
  })
})

describe("members-api — changeWorkspaceRole", () => {
  it("PATCHes /workspaces/{wsId}/members/{uid} with role", async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...sampleMember, role: "developer" }))

    const result = await changeWorkspaceRole("w1", "u1", "developer")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/workspaces/w1/members/u1`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body)).toEqual({ role: "developer" })
    expect(result.role).toBe("developer")
  })
})

describe("members-api — removeWorkspaceMember", () => {
  it("DELETEs /workspaces/{wsId}/members/{uid}", async () => {
    mockFetch.mockResolvedValueOnce(okEmpty(204))

    await removeWorkspaceMember("w1", "u1")

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe(`${BASE}/workspaces/w1/members/u1`)
    expect(init.method).toBe("DELETE")
  })
})
