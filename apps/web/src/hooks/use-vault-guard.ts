"use client"

import { useMasterKeyStore } from "@/store/master-key-store"

/**
 * Read-only vault state for critical pages. Does NOT open the modal.
 * Render the locked placeholder, which has the user-triggered Unlock button.
 */
export function useVaultGuard() {
    const vaultStatus = useMasterKeyStore((s) => s.vaultStatus)
    const openVaultGate = useMasterKeyStore((s) => s.openVaultGate)

    return {
        status: vaultStatus,
        isUnlocked: vaultStatus === "unlocked",
        isRestoring: vaultStatus === "restoring",
        openVaultGate,
    }
}
