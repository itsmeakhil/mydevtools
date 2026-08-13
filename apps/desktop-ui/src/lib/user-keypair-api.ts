import { apiFetch } from "./desktop/api-fetch"

export type KeypairBlob = {
  publicKey: string
  privateKeyEncrypted: { encrypted: string; iv: string }
  salt: string
  createdAt: number
}

const BASE = "/api/backend/workspaces-api"

export async function getKeypair(): Promise<KeypairBlob | null> {
  const res = await apiFetch(`${BASE}/users/me/keypair`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getKeypair failed (${res.status})`)
  const body = await res.json()
  return body
}

export async function setKeypair(blob: KeypairBlob): Promise<void> {
  const res = await apiFetch(`${BASE}/users/me/keypair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(blob),
  })
  if (!res.ok) throw new Error(`setKeypair failed (${res.status})`)
}
