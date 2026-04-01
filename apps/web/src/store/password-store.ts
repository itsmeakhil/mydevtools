
import { create } from 'zustand'

export interface PasswordEntry {
    id: string
    service: string
    username: string
    password: string // Decrypted
    url?: string
    notes?: string
    tags?: string[]
    createdAt: number
    updatedAt: number
}

interface PasswordStore {
    isUnlocked: boolean
    encryptionKey: CryptoKey | null
    passwords: PasswordEntry[]
    isLoading: boolean

    setKey: (key: CryptoKey) => void
    lockVault: () => void
    setPasswords: (passwords: PasswordEntry[]) => void
    addPassword: (entry: PasswordEntry) => void
    updatePassword: (entry: PasswordEntry) => void
    deletePassword: (id: string) => void
    setLoading: (loading: boolean) => void
}

export const usePasswordStore = create<PasswordStore>((set) => ({
    isUnlocked: false,
    encryptionKey: null,
    passwords: [],
    isLoading: false,

    setKey: (key) => set({ encryptionKey: key, isUnlocked: true }),
    lockVault: () => set({ encryptionKey: null, isUnlocked: false, passwords: [] }),
    setPasswords: (passwords) => set({ passwords }),
    addPassword: (entry) => set((state) => ({ passwords: [...state.passwords, entry] })),
    updatePassword: (entry) => set((state) => ({
        passwords: state.passwords.map((p) => (p.id === entry.id ? entry : p))
    })),
    deletePassword: (id) => set((state) => ({
        passwords: state.passwords.filter((p) => p.id !== id)
    })),
    setLoading: (loading) => set({ isLoading: loading }),
}))
