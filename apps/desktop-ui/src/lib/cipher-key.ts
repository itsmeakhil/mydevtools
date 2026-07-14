import type { Workspace } from "./workspace-api"

/**
 * Returns the active cipher key to use for encryption / decryption.
 *
 * Workspaces are single-user (personal) — the cipher key is always the master
 * key (AES-GCM derived from the user's master password via PBKDF2). Returns null
 * until a workspace and master key are both available; callers must check and
 * fall back to placeholder rendering.
 */
export async function getCipherKey(
  workspace: Workspace | null,
  masterKey: CryptoKey | null,
): Promise<CryptoKey | null> {
  if (!workspace) return null
  return masterKey
}
