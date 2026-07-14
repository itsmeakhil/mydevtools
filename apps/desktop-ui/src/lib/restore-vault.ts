import type { MasterVaultOut } from "@/lib/global-vault-api"

export type RestoreResult =
    | { status: "not-configured" }
    | { status: "locked"; vault: MasterVaultOut }
    | { status: "unlocked"; vault: MasterVaultOut; key: CryptoKey }
    | { status: "error"; message: string }

export interface RestoreDeps {
    loadMasterKey: () => Promise<CryptoKey | null>
    getMasterVaultOrNull: () => Promise<MasterVaultOut | null>
    verifyKey: (
        key: CryptoKey,
        encrypted: string,
        iv: string,
    ) => Promise<boolean>
    clearMasterKey: () => Promise<void>
}

export async function restoreVault(deps: RestoreDeps): Promise<RestoreResult> {
    try {
        const vault = await deps.getMasterVaultOrNull()
        if (!vault) return { status: "not-configured" }

        const savedKey = await deps.loadMasterKey()
        if (!savedKey) return { status: "locked", vault }

        const valid = await deps.verifyKey(
            savedKey,
            vault.verifier.encrypted,
            vault.verifier.iv,
        )
        if (!valid) {
            await deps.clearMasterKey()
            return { status: "locked", vault }
        }

        return { status: "unlocked", vault, key: savedKey }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Restore failed"
        return { status: "error", message }
    }
}
