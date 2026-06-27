import { backendFetch } from "./backend-auth"

export type Member = {
  uid: string
  email: string | null
  display_name: string | null
  role: string
  since: number
}

const BASE = "/api/backend/workspaces-api"

export async function listOrgMembers(orgId: string): Promise<Member[]> {
  const res = await backendFetch(`${BASE}/orgs/${encodeURIComponent(orgId)}/members`)
  if (!res.ok) throw new Error(`listOrgMembers failed (${res.status})`)
  return res.json()
}

export async function changeOrgRole(orgId: string, uid: string, role: string): Promise<Member> {
  const res = await backendFetch(
    `${BASE}/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(uid)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
  )
  if (!res.ok) throw new Error(`changeOrgRole failed (${res.status})`)
  return res.json()
}

export async function removeOrgMember(orgId: string, uid: string): Promise<void> {
  const res = await backendFetch(
    `${BASE}/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(uid)}`,
    { method: "DELETE" },
  )
  if (!res.ok) throw new Error(`removeOrgMember failed (${res.status})`)
}

export async function listWorkspaceMembers(wsId: string): Promise<Member[]> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(wsId)}/members`)
  if (!res.ok) throw new Error(`listWorkspaceMembers failed (${res.status})`)
  return res.json()
}

export async function changeWorkspaceRole(wsId: string, uid: string, role: string): Promise<Member> {
  const res = await backendFetch(
    `${BASE}/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(uid)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
  )
  if (!res.ok) throw new Error(`changeWorkspaceRole failed (${res.status})`)
  return res.json()
}

export async function removeWorkspaceMember(wsId: string, uid: string): Promise<void> {
  const res = await backendFetch(
    `${BASE}/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(uid)}`,
    { method: "DELETE" },
  )
  if (!res.ok) throw new Error(`removeWorkspaceMember failed (${res.status})`)
}
