// apps/web/src/lib/workspace-api.ts
import { backendFetch } from "./backend-auth"

export type Org = {
  id: string
  name: string
  slug: string
  kind: "system" | "user"
  org_role: "owner" | "admin" | "member" | "viewer"
}

export type WorkspaceEncryption = {
  scheme: string
  dekFingerprint: string
  createdAt: number
  rotatedAt: number | null
  // Set after a member is removed; cleared on the next rotation. Signals admins
  // to rotate the shared key to revoke the removed member's access.
  rotationRequired?: boolean
}

export type Workspace = {
  id: string
  org_id: string
  name: string
  slug: string
  is_personal: boolean
  kind: "personal" | "shared"
  ws_role: "admin" | "developer" | "viewer"
  settings?: { encryption: WorkspaceEncryption | null }
}

const BASE = "/api/backend/workspaces-api"

export async function listOrgs(): Promise<Org[]> {
  const res = await backendFetch(`${BASE}/orgs`)
  if (!res.ok) throw new Error(`listOrgs failed (${res.status})`)
  return res.json()
}

export async function listWorkspaces(orgId?: string): Promise<Workspace[]> {
  const url = orgId ? `${BASE}/workspaces?org_id=${encodeURIComponent(orgId)}` : `${BASE}/workspaces`
  const res = await backendFetch(url)
  if (!res.ok) throw new Error(`listWorkspaces failed (${res.status})`)
  return res.json()
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`getWorkspace failed (${res.status})`)
  return res.json()
}

export async function setActiveWorkspace(id: string): Promise<void> {
  const res = await backendFetch(`${BASE}/workspaces/active`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace_id: id }),
  })
  if (!res.ok) throw new Error(`setActiveWorkspace failed (${res.status})`)
}
