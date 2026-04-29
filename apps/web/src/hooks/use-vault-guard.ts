"use client"

import { useEffect } from "react"
import { useMasterKeyStore } from "@/store/master-key-store"

/**
 * Call this in any page that requires the vault to be unlocked.
 * Opens the vault modal if the key isn't already in memory.
 * Returns isUnlocked + openVaultGate so the page can render a locked placeholder with a re-open button.
 */
export function useVaultGuard() {
    const { isUnlocked, openVaultGate, closeVaultGate } = useMasterKeyStore()

    useEffect(() => {
        if (!isUnlocked) {
            openVaultGate()
        }
        return () => {
            closeVaultGate()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return { isUnlocked, openVaultGate }
}
