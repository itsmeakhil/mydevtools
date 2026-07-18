import type { MasterVaultOut } from "@/lib/global-vault-api"

export type RestoreResult =
    | { status: "not-configured" }
    | { status: "locked"; vault: MasterVaultOut }
    | { status: "unlocked"; vault: MasterVaultOut; key: CryptoKey }
    | { status: "error"; message: string }

export interface RestoreDeps {
    getMasterVaultOrNull: () => Promise<MasterVaultOut | null>
    // Wipes any master key left in IndexedDB by an older build. The key is no
    // longer persisted across restarts (memory-only), so this is one-time cleanup.
    clearMasterKey: () => Promise<void>
}

// The master key is never persisted across app restarts — it lives only in the
// in-memory store while the app runs. So on boot a configured vault is always
// "locked" and the user must re-enter their master password.
export async function restoreVault(deps: RestoreDeps): Promise<RestoreResult> {
    try {
        const vault = await deps.getMasterVaultOrNull()
        if (!vault) return { status: "not-configured" }

        await deps.clearMasterKey()
        return { status: "locked", vault }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Restore failed"
        return { status: "error", message }
    }
}
