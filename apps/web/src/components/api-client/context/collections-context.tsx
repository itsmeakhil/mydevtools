"use client"

import * as React from "react"
import { Collection } from "../types"
import { useCollections } from "../collections/use-collections"

// ── Types ──────────────────────────────────────────────────────────────────

type CollectionsState = {
    collections: Collection[]
    isLoading: boolean
}

type CollectionsActions = {
    addFolder: (parentId: string, name: string) => Promise<void>
    deleteItem: (itemId: string) => Promise<void>
    saveRequest: (parentId: string, request: import("../types").CollectionRequest) => Promise<void>
    toggleFolder: (folderId: string) => Promise<void>
    createCollection: (name: string) => Promise<void>
    renameCollection: (collectionId: string, name: string) => Promise<void>
    renameFolder: (folderId: string, name: string) => Promise<void>
    deleteMultipleCollections: (ids: string[]) => Promise<void>
}

// ── Contexts ───────────────────────────────────────────────────────────────

const CollectionsStateCtx = React.createContext<CollectionsState | null>(null)
const CollectionsActionsCtx = React.createContext<CollectionsActions | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
    const {
        collections,
        isLoading,
        addFolder,
        deleteItem,
        saveRequest,
        toggleFolder,
        createCollection,
        renameCollection,
        renameFolder,
        deleteMultipleCollections,
    } = useCollections()

    const state = React.useMemo<CollectionsState>(
        () => ({ collections, isLoading }),
        [collections, isLoading]
    )

    // NOTE: The action functions returned by useCollections() are NOT wrapped in
    // useCallback inside the hook — they close over `collections` and `user` state
    // so they are re-created on every render. We therefore list each one as a dep
    // so the actions context value is stable when nothing changed, but stays fresh
    // when the hook re-creates the functions (e.g. after auth state updates).
    const actions = React.useMemo<CollectionsActions>(
        () => ({
            addFolder,
            deleteItem,
            saveRequest,
            toggleFolder,
            createCollection,
            renameCollection,
            renameFolder,
            deleteMultipleCollections,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [addFolder, deleteItem, saveRequest, toggleFolder, createCollection, renameCollection, renameFolder, deleteMultipleCollections]
    )

    return (
        <CollectionsStateCtx.Provider value={state}>
            <CollectionsActionsCtx.Provider value={actions}>
                {children}
            </CollectionsActionsCtx.Provider>
        </CollectionsStateCtx.Provider>
    )
}

// ── Consumer hooks ─────────────────────────────────────────────────────────

export function useCollectionsState(): CollectionsState {
    const v = React.useContext(CollectionsStateCtx)
    if (!v) throw new Error("useCollectionsState must be used within a CollectionsProvider")
    return v
}

export function useCollectionsActions(): CollectionsActions {
    const v = React.useContext(CollectionsActionsCtx)
    if (!v) throw new Error("useCollectionsActions must be used within a CollectionsProvider")
    return v
}
