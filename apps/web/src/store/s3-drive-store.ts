import { create } from "zustand"
import type { S3ConnectionOut, S3Credentials, S3ObjectItem } from "@/lib/s3-drive-api"

export type DecryptedConnection = {
    id: string
    name: string
    provider: string
    credentials: S3Credentials
    encryptedData: string
    iv: string
    createdAt: number
    updatedAt: number
}

interface S3DriveStore {
    connections: DecryptedConnection[]
    activeConnectionId: string | null
    currentPrefix: string
    objects: S3ObjectItem[]
    prefixes: string[]
    isLoading: boolean
    isTruncated: boolean
    nextContinuationToken?: string
    selectedKeys: Set<string>

    setConnections: (connections: DecryptedConnection[]) => void
    addConnection: (connection: DecryptedConnection) => void
    updateConnection: (id: string, connection: Partial<DecryptedConnection>) => void
    removeConnection: (id: string) => void
    setActiveConnection: (id: string | null) => void
    setCurrentPrefix: (prefix: string) => void
    setObjects: (objects: S3ObjectItem[], prefixes: string[], isTruncated: boolean, nextToken?: string) => void
    setLoading: (loading: boolean) => void
    toggleSelectKey: (key: string) => void
    clearSelection: () => void
    selectAll: () => void
}

export const useS3DriveStore = create<S3DriveStore>((set, get) => ({
    connections: [],
    activeConnectionId: null,
    currentPrefix: "",
    objects: [],
    prefixes: [],
    isLoading: false,
    isTruncated: false,
    nextContinuationToken: undefined,
    selectedKeys: new Set(),

    setConnections: (connections) => set({ connections }),

    addConnection: (connection) =>
        set((s) => ({ connections: [...s.connections, connection] })),

    updateConnection: (id, connection) =>
        set((s) => ({
            connections: s.connections.map((c) => (c.id === id ? { ...c, ...connection } : c)),
        })),

    removeConnection: (id) =>
        set((s) => ({
            connections: s.connections.filter((c) => c.id !== id),
            activeConnectionId: s.activeConnectionId === id ? null : s.activeConnectionId,
        })),

    setActiveConnection: (id) => set({ activeConnectionId: id, currentPrefix: "", objects: [], prefixes: [], selectedKeys: new Set() }),

    setCurrentPrefix: (prefix) => set({ currentPrefix: prefix, selectedKeys: new Set() }),

    setObjects: (objects, prefixes, isTruncated, nextToken) =>
        set({ objects, prefixes, isTruncated, nextContinuationToken: nextToken }),

    setLoading: (loading) => set({ isLoading: loading }),

    toggleSelectKey: (key) =>
        set((s) => {
            const next = new Set(s.selectedKeys)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return { selectedKeys: next }
        }),

    clearSelection: () => set({ selectedKeys: new Set() }),

    selectAll: () =>
        set((s) => {
            const allKeys = [
                ...s.prefixes,
                ...s.objects.map((o) => o.key),
            ]
            return { selectedKeys: new Set(allKeys) }
        }),
}))
