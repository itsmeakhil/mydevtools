import type { Workspace } from "./workspace-api"
import { useWorkspaceDekStore } from "@/store/workspace-dek-store"

/**
 * Returns the active cipher key to use for encryption / decryption.
 * - Personal workspace → master key (existing flow from sub-project A).
 * - Shared workspace with initialized encryption → workspace DEK from store.
 * - Shared workspace without encryption (Phase B state) → returns null;
 *   callers must check and fall back to placeholder rendering.
 */
export async function getCipherKey(
  workspace: Workspace | null,
  masterKey: CryptoKey | null,
): Promise<CryptoKey | null> {
  if (!workspace) return null
  if (workspace.is_personal) return masterKey
  // Shared workspace — use workspace DEK
  return useWorkspaceDekStore.getState().getDek(workspace.id)
}
