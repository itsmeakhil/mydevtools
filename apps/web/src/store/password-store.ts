import { create } from 'zustand'

export interface PasswordEntry {
    id: string
    service: string
    username: string
    password: string // decrypted, in-memory only
    url?: string
    notes?: string
    tags?: string[]
    createdAt: number
    updatedAt: number
}

interface PasswordStore {
    passwords: PasswordEntry[]
    isLoading: boolean

    setPasswords: (passwords: PasswordEntry[]) => void
    addPassword: (entry: PasswordEntry) => void
    updatePassword: (entry: PasswordEntry) => void
    deletePassword: (id: string) => void
    setLoading: (loading: boolean) => void
    /** Clear in-memory passwords (call on sign-out or when locking the vault). */
    clearPasswords: () => void
}

export const usePasswordStore = create<PasswordStore>((set) => ({
    passwords: [],
    isLoading: false,

    setPasswords: (passwords) => set({ passwords }),
    addPassword: (entry) => set((state) => ({ passwords: [...state.passwords, entry] })),
    updatePassword: (entry) =>
        set((state) => ({
            passwords: state.passwords.map((p) => (p.id === entry.id ? entry : p)),
        })),
    deletePassword: (id) =>
        set((state) => ({
            passwords: state.passwords.filter((p) => p.id !== id),
        })),
    setLoading: (loading) => set({ isLoading: loading }),
    clearPasswords: () => set({ passwords: [] }),
}))
