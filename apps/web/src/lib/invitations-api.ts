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
  token: string
  expires_at: number
  created_at: number
}

const BASE = "/api/backend/workspaces-api"

/** Extract FastAPI's `{detail: "..."}` so toasts show the real reason. */
async function readDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: string }
    if (body?.detail) return body.detail
  } catch {
    /* not JSON */
  }
  return `${fallback} (${res.status})`
}

export async function inviteToOrg(
  orgId: string,
  email: string,
  role: string,
  extras?: { workspaceId?: string; workspaceRole?: string },
): Promise<Invitation> {
  const body: Record<string, unknown> = { email, role }
  if (extras?.workspaceId) {
    body.workspace_id = extras.workspaceId
    body.workspace_role = extras.workspaceRole
  }
  const res = await backendFetch(`${BASE}/orgs/${encodeURIComponent(orgId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readDetail(res, "inviteToOrg failed"))
  return res.json()
}

export async function inviteToWorkspace(wsId: string, email: string, role: string): Promise<Invitation> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(wsId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  })
  if (!res.ok) throw new Error(await readDetail(res, "inviteToWorkspace failed"))
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
