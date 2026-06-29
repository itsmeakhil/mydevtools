import { backendFetch } from "./backend-auth"
import type { Org, Workspace } from "./workspace-api"

const BASE = "/api/backend/workspaces-api"

export async function createOrg(name: string): Promise<Org> {
  const res = await backendFetch(`${BASE}/orgs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`createOrg failed (${res.status})`)
  return res.json()
}

export async function renameOrg(orgId: string, name: string): Promise<Org> {
  const res = await backendFetch(`${BASE}/orgs/${encodeURIComponent(orgId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`renameOrg failed (${res.status})`)
  return res.json()
}

export async function deleteOrg(orgId: string): Promise<void> {
  const res = await backendFetch(`${BASE}/orgs/${encodeURIComponent(orgId)}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`deleteOrg failed (${res.status})`)
}

export async function createWorkspace(orgId: string, name: string): Promise<Workspace> {
  const res = await backendFetch(`${BASE}/orgs/${encodeURIComponent(orgId)}/workspaces`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`createWorkspace failed (${res.status})`)
  return res.json()
}

export async function renameWorkspace(wsId: string, name: string): Promise<Workspace> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(wsId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error(`renameWorkspace failed (${res.status})`)
  return res.json()
}

export async function deleteWorkspace(wsId: string): Promise<void> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(wsId)}`, { method: "DELETE" })
  if (!res.ok) throw new Error(`deleteWorkspace failed (${res.status})`)
}
