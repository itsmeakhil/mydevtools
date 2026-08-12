import { create } from 'zustand'
import type { BreachResult } from '@/lib/hibp'

export interface PasswordEntry {
    id: string
    service: string
    username: string
    password: string // decrypted, in-memory only
    url?: string
    notes?: string
    tags?: string[]
    totpSecret?: string
    createdAt: number
    updatedAt: number
}

export type BreachStatus = 'idle' | 'checking' | 'done' | 'error'

interface PasswordStore {
    passwords: PasswordEntry[]
    isLoading: boolean

    // breach check state — keyed by entry id. A missing key means "not
    // checked"; an entry whose lookup failed is stored as `unknown`, never as
    // a zero count that would read as "safe".
    breachResults: Map<string, BreachResult>
    breachStatus: BreachStatus
    breachProgress: { checked: number; total: number }

    setPasswords: (passwords: PasswordEntry[]) => void
    addPassword: (entry: PasswordEntry) => void
    updatePassword: (entry: PasswordEntry) => void
    deletePassword: (id: string) => void
    setLoading: (loading: boolean) => void
    /** Clear in-memory passwords (call on sign-out or when locking the vault). */
    clearPasswords: () => void

    setBreachResults: (results: Map<string, BreachResult>) => void
    setBreachStatus: (status: BreachStatus) => void
    setBreachProgress: (checked: number, total: number) => void
    clearBreachResults: () => void
}

export const usePasswordStore = create<PasswordStore>((set) => ({
    passwords: [],
    isLoading: false,

    breachResults: new Map(),
    breachStatus: 'idle',
    breachProgress: { checked: 0, total: 0 },

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
    clearPasswords: () => set({ passwords: [], breachResults: new Map(), breachStatus: 'idle', breachProgress: { checked: 0, total: 0 } }),

    setBreachResults: (results) => set({ breachResults: results }),
    setBreachStatus: (status) => set({ breachStatus: status }),
    setBreachProgress: (checked, total) => set({ breachProgress: { checked, total } }),
    clearBreachResults: () => set({ breachResults: new Map(), breachStatus: 'idle', breachProgress: { checked: 0, total: 0 } }),
}))
