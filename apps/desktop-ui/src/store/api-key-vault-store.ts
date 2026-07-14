import { create } from "zustand"

export type ApiKeyEnv = "development" | "staging" | "production"

export interface ApiKeyEntry {
    id: string
    name: string
    apiKey: string
    secret: string
    env: ApiKeyEnv
    notes: string
    createdAt: number
    updatedAt: number
}

interface ApiKeyVaultStore {
    entries: ApiKeyEntry[]
    isLoading: boolean

    setEntries: (entries: ApiKeyEntry[]) => void
    addEntry: (entry: ApiKeyEntry) => void
    updateEntry: (entry: ApiKeyEntry) => void
    deleteEntry: (id: string) => void
    setLoading: (loading: boolean) => void
    clearEntries: () => void
}

export const useApiKeyVaultStore = create<ApiKeyVaultStore>((set) => ({
    entries: [],
    isLoading: false,

    setEntries: (entries) => set({ entries }),
    addEntry: (entry) => set((state) => ({ entries: [entry, ...state.entries] })),
    updateEntry: (entry) =>
        set((state) => ({
            entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
        })),
    deleteEntry: (id) =>
        set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
        })),
    setLoading: (loading) => set({ isLoading: loading }),
    clearEntries: () => set({ entries: [] }),
}))
