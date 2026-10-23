"use client"

import * as React from "react"
import { Collection } from "../types"
import { useCollections } from "../collections/use-collections"
import { useEnvironmentsActions } from "./environments-context"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────

type CollectionsState = {
    collections: Collection[]
    isLoading: boolean
}

type CollectionsActions = {
    addFolder: (parentId: string, name: string) => Promise<string | void>
    deleteItem: (itemId: string) => Promise<void>
    saveRequest: (parentId: string, request: import("../types").CollectionRequest) => Promise<void>
    toggleFolder: (folderId: string) => Promise<void>
    createCollection: (name: string) => Promise<Collection | void>
    renameCollection: (collectionId: string, name: string) => Promise<void>
    renameFolder: (folderId: string, name: string) => Promise<void>
    patchFolder: (folderId: string, patch: Partial<import("../types").CollectionFolder>) => Promise<void>
    deleteMultipleCollections: (ids: string[]) => Promise<void>
    importCollection: (incoming: Collection) => Promise<Collection | null>
    /** Desktop only: open (or initialize) a folder of YAML files as a git-friendly collection, or import a Bruno folder. */
    openFolderCollection: () => Promise<Collection | null>
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
        patchFolder,
        deleteMultipleCollections,
        importCollection,
        openFolderCollection,
    } = useCollections()
    const { addEnvironment, updateEnvironment } = useEnvironmentsActions()

    // A Bruno folder brings its environments along; they live in the sibling
    // environments context, so they are created here rather than in the hook.
    const openFolderCollectionWithEnvs = async (): Promise<Collection | null> => {
        const opened = await openFolderCollection()
        if (!opened) return null
        try {
            for (const env of opened.environments) {
                const envId = await addEnvironment(env.name)
                if (envId) await updateEnvironment(envId, { variables: env.variables })
            }
        } catch (e) {
            toast.error(`Imported the collection, but not its environments: ${e instanceof Error ? e.message : String(e)}`)
        }
        return opened.collection
    }

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
            patchFolder,
            deleteMultipleCollections,
            importCollection,
            openFolderCollection: openFolderCollectionWithEnvs,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [addFolder, deleteItem, saveRequest, toggleFolder, createCollection, renameCollection, renameFolder, patchFolder, deleteMultipleCollections, importCollection, openFolderCollection, addEnvironment, updateEnvironment]
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
