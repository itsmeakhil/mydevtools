"use client"

import * as React from "react"
import useAuth from "@/utils/useAuth"
import { apiFetch } from "@/lib/desktop/api-fetch"
import { toast } from "sonner"

export interface Workspace {
    id: string
    name: string
    created_at: number
}

const ACTIVE_KEY = "api-client-active-workspace"

export function useWorkspaces() {
    const { user, loading: loadingUser } = useAuth()
    const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    // Persist active workspace selection across reloads.
    React.useEffect(() => {
        if (typeof window === "undefined") return
        const stored = localStorage.getItem(ACTIVE_KEY)
        if (stored) setActiveId(stored)
    }, [])
    React.useEffect(() => {
        if (typeof window === "undefined") return
        try {
            if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
            else localStorage.removeItem(ACTIVE_KEY)
        } catch { /* noop */ }
    }, [activeId])

    const reload = React.useCallback(async () => {
        if (!user) return
        try {
            const res = await apiFetch("/api/backend/api-client/workspaces")
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            setWorkspaces(await res.json())
        } catch (e) {
            console.error("Workspace fetch failed", e)
        } finally {
            setIsLoading(false)
        }
    }, [user])

    React.useEffect(() => {
        if (loadingUser) return
        if (!user) { setWorkspaces([]); setIsLoading(false); return }
        void reload()
    }, [user, loadingUser, reload])

    const createWorkspace = async (name: string): Promise<Workspace | null> => {
        if (!user) return null
        try {
            const res = await apiFetch("/api/backend/api-client/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const created = await res.json() as Workspace
            setWorkspaces((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
            toast.success(`Workspace "${name}" created`)
            return created
        } catch (e) {
            toast.error(`Create failed: ${(e as Error).message}`)
            return null
        }
    }

    const renameWorkspace = async (id: string, name: string) => {
        if (!user) return
        try {
            const res = await apiFetch(`/api/backend/api-client/workspaces/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const updated = await res.json() as Workspace
            setWorkspaces((prev) =>
                prev.map((w) => (w.id === id ? updated : w)).sort((a, b) => a.name.localeCompare(b.name)),
            )
        } catch (e) {
            toast.error(`Rename failed: ${(e as Error).message}`)
        }
    }

    const deleteWorkspace = async (id: string) => {
        if (!user) return
        try {
            const res = await apiFetch(`/api/backend/api-client/workspaces/${id}`, { method: "DELETE" })
            if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
            setWorkspaces((prev) => prev.filter((w) => w.id !== id))
            if (activeId === id) setActiveId(null)
            toast.success("Workspace deleted (collections reset to default)")
        } catch (e) {
            toast.error(`Delete failed: ${(e as Error).message}`)
        }
    }

    return {
        workspaces,
        activeId,
        setActiveId,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
        isLoading,
        reload,
    }
}
