import { backendFetch } from "./backend-auth"

export type Invitation = {
  id: string
  org_id: string
  workspace_id: string | null
  invited_email: string
  invited_uid: string | null
  invited_role_org: "owner" | "admin" | "member" | "viewer" | null
  invited_role_ws: "admin" | "developer" | "viewer" | null
  status: "pending" | "accepted" | "revoked" | "expired" | "wrapping_pending"
  expires_at: number
  created_at: number
}

const BASE = "/api/backend/workspaces-api"

export async function inviteToOrg(orgId: string, email: string, role: string): Promise<Invitation> {
  const res = await backendFetch(`${BASE}/orgs/${encodeURIComponent(orgId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  })
  if (!res.ok) throw new Error(`inviteToOrg failed (${res.status})`)
  return res.json()
}

export async function inviteToWorkspace(wsId: string, email: string, role: string): Promise<Invitation> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(wsId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  })
  if (!res.ok) throw new Error(`inviteToWorkspace failed (${res.status})`)
  return res.json()
}

export async function listPending(): Promise<Invitation[]> {
  const res = await backendFetch(`${BASE}/invitations/pending`)
  if (!res.ok) throw new Error(`listPending failed (${res.status})`)
  return res.json()
}

export async function acceptInvitation(token: string): Promise<{ org_id: string; workspace_id: string | null }> {
  const res = await backendFetch(`${BASE}/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(`acceptInvitation failed (${res.status})`)
  return res.json()
}

export async function revokeInvitation(token: string): Promise<void> {
  const res = await backendFetch(`${BASE}/invitations/${encodeURIComponent(token)}/revoke`, {
    method: "POST",
  })
  if (!res.ok) throw new Error(`revokeInvitation failed (${res.status})`)
}
