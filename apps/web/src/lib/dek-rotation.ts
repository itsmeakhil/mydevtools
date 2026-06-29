/**
 * dek-rotation.ts
 *
 * Client-side re-encryption loop for workspace DEK rotation.
 *
 * Called AFTER rotateDek() succeeds (Phase 2 of rotation).
 * Iterates every encrypted entry across all encrypted tools in the workspace,
 * decrypts with the OLD DEK, re-encrypts with the NEW DEK, and PATCHes back.
 *
 * The server cannot perform this operation because it never has access to the
 * plaintext DEK — the client holds the only copy.
 */

import { encryptEntry, decryptEntry } from "./workspace-crypto"
import { backendFetch } from "./backend-auth"

type Endpoint = {
  list: string
  patch: (id: string) => string
  encryptedField: "encryptedData" | "encrypted"
  ivField: "iv"
}

const ENCRYPTED_TOOL_ENDPOINTS: { [tool: string]: Endpoint } = {
  passwords: {
    list: "/api/backend/password-manager/entries",
    patch: (id) => `/api/backend/password-manager/entries/${encodeURIComponent(id)}`,
    encryptedField: "encryptedData",
    ivField: "iv",
  },
  environment: {
    list: "/api/backend/environment-manager/sets",
    patch: (id) => `/api/backend/environment-manager/sets/${encodeURIComponent(id)}`,
    encryptedField: "encryptedData",
    ivField: "iv",
  },
  apiKeyVault: {
    list: "/api/backend/api-key-vault/entries",
    patch: (id) => `/api/backend/api-key-vault/entries/${encodeURIComponent(id)}`,
    encryptedField: "encryptedData",
    ivField: "iv",
  },
}

export type RotationProgress = {
  tool: string
  current: number
  total: number
}

/**
 * Re-encrypt every encrypted entry in the workspace from oldDek to newDek.
 *
 * Iterates across all tools (passwords, environment sets, API key vault).
 * For each entry: decrypt with oldDek → re-encrypt with newDek → PATCH.
 *
 * @param oldDek  The DEK that was active before rotateDek() was called.
 * @param newDek  The freshly generated DEK now active on the server.
 * @param onProgress  Optional callback fired after each entry attempt.
 * @returns Object with total rotated (success) and failed counts.
 */
export async function reencryptAllEntries(
  oldDek: CryptoKey,
  newDek: CryptoKey,
  onProgress?: (p: RotationProgress) => void,
): Promise<{ rotated: number; failed: number }> {
  let rotated = 0
  let failed = 0

  for (const [tool, endpoint] of Object.entries(ENCRYPTED_TOOL_ENDPOINTS)) {
    try {
      const listRes = await backendFetch(endpoint.list)
      if (!listRes.ok) {
        failed += 1
        continue
      }
      const entries: { id?: string; _id?: string; [k: string]: unknown }[] = await listRes.json()
      const total = entries.length
      let current = 0
      for (const entry of entries) {
        const id = (entry.id ?? entry._id) as string
        const encrypted = entry[endpoint.encryptedField] as string
        const iv = entry[endpoint.ivField] as string
        if (!id || !encrypted || !iv) {
          failed += 1
          current += 1
          onProgress?.({ tool, current, total })
          continue
        }
        try {
          const plain = await decryptEntry(oldDek, { encrypted, iv })
          const reblob = await encryptEntry(newDek, plain)
          const patchRes = await backendFetch(endpoint.patch(id), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              [endpoint.encryptedField]: reblob.encrypted,
              [endpoint.ivField]: reblob.iv,
            }),
          })
          if (patchRes.ok) {
            rotated += 1
          } else {
            failed += 1
          }
        } catch {
          failed += 1
        }
        current += 1
        onProgress?.({ tool, current, total })
      }
    } catch {
      failed += 1
    }
  }

  return { rotated, failed }
}
