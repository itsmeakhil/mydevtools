import { create } from "zustand"
import type { MasterVaultOut } from "@/lib/global-vault-api"

export type VaultStatus =
    | "restoring"
    | "not-configured"
    | "locked"
    | "unlocked"

interface MasterKeyStore {
    encryptionKey: CryptoKey | null
    vaultStatus: VaultStatus
    vault: MasterVaultOut | null
    restoreError: string | null
    isUnlocked: boolean
    vaultGateOpen: boolean

    setKey: (key: CryptoKey) => void
    clearKey: () => void
    setVaultStatus: (status: VaultStatus) => void
    setVault: (vault: MasterVaultOut | null) => void
    setRestoreError: (err: string | null) => void
    openVaultGate: () => void
    closeVaultGate: () => void
}

export const useMasterKeyStore = create<MasterKeyStore>((set) => ({
    encryptionKey: null,
    vaultStatus: "restoring",
    vault: null,
    restoreError: null,
    isUnlocked: false,
    vaultGateOpen: false,

    setKey: (key) =>
        set({
            encryptionKey: key,
            vaultStatus: "unlocked",
            isUnlocked: true,
            vaultGateOpen: false,
            restoreError: null,
        }),

    clearKey: () =>
        set({
            encryptionKey: null,
            vaultStatus: "restoring",
            isUnlocked: false,
            vault: null,
            restoreError: null,
            vaultGateOpen: false,
        }),

    setVaultStatus: (status) =>
        set({ vaultStatus: status, isUnlocked: status === "unlocked" }),

    setVault: (vault) => set({ vault }),

    setRestoreError: (err) => set({ restoreError: err }),

    openVaultGate: () => set({ vaultGateOpen: true }),
    closeVaultGate: () => set({ vaultGateOpen: false }),
}))
