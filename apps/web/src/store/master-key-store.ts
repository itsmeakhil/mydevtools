import { create } from "zustand"

export type VaultStatus = "unknown" | "not-configured" | "locked" | "unlocked"

interface MasterKeyStore {
    /** The derived AES-GCM key held only in memory — never serialised. */
    encryptionKey: CryptoKey | null
    isUnlocked: boolean
    /**
     * Cached result of the backend vault-status check so child routes don't
     * have to re-fetch when navigating between pages in the same session.
     */
    vaultStatus: VaultStatus

    setKey: (key: CryptoKey) => void
    /** Wipe the in-memory key without touching IndexedDB (call clearMasterKey separately). */
    clearKey: () => void
    setVaultStatus: (status: VaultStatus) => void
}

export const useMasterKeyStore = create<MasterKeyStore>((set) => ({
    encryptionKey: null,
    isUnlocked: false,
    vaultStatus: "unknown",

    setKey: (key) =>
        set({ encryptionKey: key, isUnlocked: true, vaultStatus: "unlocked" }),

    clearKey: () =>
        set({ encryptionKey: null, isUnlocked: false, vaultStatus: "unknown" }),

    setVaultStatus: (status) => set({ vaultStatus: status }),
}))
