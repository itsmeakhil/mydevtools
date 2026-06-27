import { backendFetch } from "./backend-auth"

export type DekWrapBlob = {
  wrappedDek: { encrypted: string; iv: string; senderPublicKey: string } | null
  wrappedDekVersion: number
}

const BASE = "/api/backend/workspaces-api"

export async function getWorkspaceDekWrap(workspaceId: string): Promise<DekWrapBlob> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(workspaceId)}/dek-wrap`)
  if (!res.ok) throw new Error(`getWorkspaceDekWrap failed (${res.status})`)
  return res.json()
}
