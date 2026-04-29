import { create } from "zustand"

export type VaultStatus = "unknown" | "not-configured" | "locked" | "unlocked"

interface MasterKeyStore {
    encryptionKey: CryptoKey | null
    isUnlocked: boolean
    vaultStatus: VaultStatus
    /** Controls the vault modal — set true when a critical app needs the key */
    vaultGateOpen: boolean

    setKey: (key: CryptoKey) => void
    clearKey: () => void
    setVaultStatus: (status: VaultStatus) => void
    openVaultGate: () => void
    closeVaultGate: () => void
}

export const useMasterKeyStore = create<MasterKeyStore>((set) => ({
    encryptionKey: null,
    isUnlocked: false,
    vaultStatus: "unknown",
    vaultGateOpen: false,

    setKey: (key) =>
        set({ encryptionKey: key, isUnlocked: true, vaultStatus: "unlocked", vaultGateOpen: false }),

    clearKey: () =>
        set({ encryptionKey: null, isUnlocked: false, vaultStatus: "unknown" }),

    setVaultStatus: (status) => set({ vaultStatus: status }),

    openVaultGate: () => set({ vaultGateOpen: true }),
    closeVaultGate: () => set({ vaultGateOpen: false }),
}))
