import { backendFetch } from "./backend-auth"

export type DekWrapBlob = {
  wrappedDek: { encrypted: string; iv: string; senderPublicKey: string } | null
  wrappedDekVersion: number
}

export type MemberPublicKey = { uid: string; email: string | null; publicKey: string | null }

export type RotateDekPayload = {
  dekFingerprint: string
  wraps: { uid: string; wrapped: { encrypted: string; iv: string; senderPublicKey: string } }[]
}

const BASE = "/api/backend/workspaces-api"

export async function getWorkspaceDekWrap(workspaceId: string): Promise<DekWrapBlob> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(workspaceId)}/dek-wrap`)
  if (!res.ok) throw new Error(`getWorkspaceDekWrap failed (${res.status})`)
  return res.json()
}

export async function listMemberPublicKeys(workspaceId: string): Promise<MemberPublicKey[]> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(workspaceId)}/member-publickeys`)
  if (!res.ok) throw new Error(`listMemberPublicKeys failed (${res.status})`)
  return res.json()
}

export async function rotateDek(workspaceId: string, payload: RotateDekPayload): Promise<void> {
  const res = await backendFetch(`${BASE}/workspaces/${encodeURIComponent(workspaceId)}/rotate-dek`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`rotateDek failed (${res.status})`)
}
