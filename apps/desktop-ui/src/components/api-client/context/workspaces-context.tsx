"use client"

import * as React from "react"
import { useWorkspaces, type Workspace } from "../use-workspaces"

interface WorkspacesContext {
    workspaces: Workspace[]
    activeId: string | null
    setActiveId: (id: string | null) => void
    createWorkspace: (name: string) => Promise<Workspace | null>
    renameWorkspace: (id: string, name: string) => Promise<void>
    deleteWorkspace: (id: string) => Promise<void>
    isLoading: boolean
    reload: () => Promise<void>
}

const Ctx = React.createContext<WorkspacesContext | null>(null)

export function WorkspacesProvider({ children }: { children: React.ReactNode }) {
    const v = useWorkspaces()
    return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

export function useWorkspacesContext(): WorkspacesContext {
    const ctx = React.useContext(Ctx)
    if (!ctx) throw new Error("useWorkspacesContext requires WorkspacesProvider")
    return ctx
}
