// Clears in-memory copies of workspace-scoped data whenever the active
// workspace changes, so no tool ever shows the previous workspace's data.
// IN-MEMORY ONLY — must never call actions that mutate backend data.
//
// Works together with the `key={activeWorkspaceId}` remount in client-layout:
// the remount re-runs every tool's load effect; these resets make sure
// in-memory decrypted data from the previous workspace is dropped.
import { useWorkspaceStore } from "@/store/workspace-store"
import { usePasswordStore } from "@/store/password-store"
import { useEnvironmentManagerStore } from "@/store/environment-manager-store"
import { useApiKeyVaultStore } from "@/store/api-key-vault-store"

let initialized = false
let prevWorkspaceId: string | null = null

export function initWorkspaceScopeReset() {
  if (initialized) return
  initialized = true

  prevWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId

  useWorkspaceStore.subscribe((state) => {
    const next = state.activeWorkspaceId
    if (next === prevWorkspaceId) return
    const isRealSwitch = prevWorkspaceId !== null && next !== null
    prevWorkspaceId = next
    if (!isRealSwitch) return // initial hydration, not a switch

    // Secret tools: in-memory decrypted data — drop it at the scope boundary.
    usePasswordStore.getState().clearPasswords()
    useEnvironmentManagerStore.getState().clearSets()
    useApiKeyVaultStore.getState().clearEntries()
  })
}
