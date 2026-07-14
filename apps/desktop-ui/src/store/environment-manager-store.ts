import { create } from "zustand"

export interface EnvVariableRow {
    key: string
    value: string
}

export interface EnvSetEntry {
    id: string
    project: string
    environment: string
    variables: EnvVariableRow[]
    tags: string[]
    notes: string
    createdAt: number
    updatedAt: number
}

interface EnvironmentManagerStore {
    sets: EnvSetEntry[]
    isLoading: boolean

    setSets: (sets: EnvSetEntry[]) => void
    addSet: (entry: EnvSetEntry) => void
    updateSet: (entry: EnvSetEntry) => void
    deleteSet: (id: string) => void
    setLoading: (loading: boolean) => void
    clearSets: () => void
}

export const useEnvironmentManagerStore = create<EnvironmentManagerStore>((set) => ({
    sets: [],
    isLoading: false,

    setSets: (sets) => set({ sets }),
    addSet: (entry) => set((state) => ({ sets: [...state.sets, entry] })),
    updateSet: (entry) =>
        set((state) => ({
            sets: state.sets.map((s) => (s.id === entry.id ? entry : s)),
        })),
    deleteSet: (id) =>
        set((state) => ({
            sets: state.sets.filter((s) => s.id !== id),
        })),
    setLoading: (loading) => set({ isLoading: loading }),
    clearSets: () => set({ sets: [] }),
}))
