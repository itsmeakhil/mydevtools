"use client"

import * as React from "react"
import { Collection, CollectionFolder, CollectionRequest } from "../types"
import { toast } from "sonner"
import { auth } from "@/database/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { backendFetch } from "@/lib/backend-auth"
import { broadcastApiClientUpdate, useApiClientSyncListener } from "@/lib/api-client-sync"

const STORAGE_KEY = "api-client-collections"

function sortCollections(cols: Collection[]) {
    return [...cols].sort((a, b) => a.name.localeCompare(b.name))
}

export function useCollections() {
    const [user, loading] = useAuthState(auth)
    const [collections, setCollections] = React.useState<Collection[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const migrationRanRef = React.useRef(false)

    React.useEffect(() => {
        if (!user) migrationRanRef.current = false
    }, [user])

    const authedFetch = React.useCallback(
        async (path: string, init?: RequestInit) => {
            if (!user) throw new Error("Not authenticated")
            const res = await backendFetch(path, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    ...(init?.headers || {}),
                },
            })
            if (!res.ok) {
                const text = await res.text().catch(() => "")
                throw new Error(text || `Request failed (${res.status})`)
            }
            return res
        },
        [user]
    )

    const reload = React.useCallback(async () => {
        if (!user) return
        try {
            const res = await authedFetch("/api/backend/api-client/collections", { method: "GET" })
            const cols = sortCollections((await res.json()) as Collection[])
            setCollections(cols)
        } catch (error) {
            console.error("Error fetching collections:", error)
        }
    }, [user, authedFetch])

    // Load collections from backend
    React.useEffect(() => {
        if (loading) return
        if (!user) {
            setCollections([])
            setIsLoading(false)
            return
        }

        let cancelled = false
        ;(async () => {
            try {
                setIsLoading(true)
                const res = await authedFetch("/api/backend/api-client/collections", { method: "GET" })
                const cols = sortCollections((await res.json()) as Collection[])
                if (!cancelled) setCollections(cols)
            } catch (error) {
                console.error("Error fetching collections:", error)
                toast.error("Failed to load collections")
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [user, loading, authedFetch])

    // Refetch when another tab broadcasts a collections mutation.
    useApiClientSyncListener("collections", () => { void reload() })

    // Migration: localStorage → backend once per browser (when server has no collections yet)
    React.useEffect(() => {
        const migrateData = async () => {
            if (loading || !user || isLoading || migrationRanRef.current) return
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return
            if (collections.length > 0) return

            migrationRanRef.current = true
            try {
                const localCollections: Collection[] = JSON.parse(stored)
                const migrated: Collection[] = []
                for (const col of localCollections) {
                    const res = await authedFetch("/api/backend/api-client/collections", {
                        method: "POST",
                        body: JSON.stringify({ name: col.name }),
                    })
                    const created = (await res.json()) as Collection
                    if (col.items?.length) {
                        const patchRes = await authedFetch(`/api/backend/api-client/collections/${created.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ items: col.items }),
                        })
                        migrated.push((await patchRes.json()) as Collection)
                    } else {
                        migrated.push(created)
                    }
                }
                // Order matters: reconcile state from the server-confirmed result first,
                // THEN drop the local copy. If the tab closes mid-flight after removeItem
                // but before the state update, the user loses their data.
                setCollections(sortCollections(migrated))
                localStorage.removeItem(STORAGE_KEY)
                toast.success("Migrated local collections to cloud")
            } catch (e) {
                migrationRanRef.current = false
                console.error("Migration failed", e)
            }
        }

        void migrateData()
    }, [user, loading, isLoading, collections.length, authedFetch])

    // Helper: send a delta and reconcile server response (source of truth)
    const applyDelta = React.useCallback(
        async (collectionId: string, ops: object[]): Promise<Collection> => {
            const res = await authedFetch(
                `/api/backend/api-client/collections/${collectionId}/items:apply-delta`,
                {
                    method: "POST",
                    body: JSON.stringify({ ops }),
                }
            )
            const body = (await res.json()) as { collection: Collection }
            return body.collection
        },
        [authedFetch]
    )

    const addFolder = async (parentId: string, name: string) => {
        if (!user) return

        const newFolder: CollectionFolder = {
            id: crypto.randomUUID(),
            name,
            type: "folder",
            items: [],
            isOpen: true,
        }

        const targetCollection = collections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        // Optimistic update
        const prev = collections
        const optimisticItems = targetCollection.id === parentId
            ? [...targetCollection.items, newFolder]
            : addItemToParent(targetCollection.items, parentId, newFolder)
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: optimisticItems } : c
            ))
        )

        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "add", parent_id: parentId, item: newFolder },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
        } catch (e) {
            setCollections(prev)
            console.error("Error adding folder", e)
            toast.error("Failed to add folder")
        }
    }

    const deleteItem = async (itemId: string) => {
        if (!user) return

        // Find collection containing item
        const targetCollection = collections.find(c =>
            c.items.some(i => i.id === itemId) || findItemInCollection(c.items, itemId)
        )

        // If not found in items, maybe it IS the collection?
        if (!targetCollection) {
            const colToDelete = collections.find(c => c.id === itemId)
            if (colToDelete) {
                const prev = collections
                setCollections((cur) => cur.filter((c) => c.id !== itemId))
                try {
                    await authedFetch(`/api/backend/api-client/collections/${itemId}`, { method: "DELETE" })
                    broadcastApiClientUpdate("collections")
                    toast.success("Collection deleted")
                } catch (e) {
                    setCollections(prev)
                    console.error("Error deleting collection", e)
                    toast.error("Failed to delete collection")
                }
            }
            return
        }

        // Optimistic update
        const prev = collections
        const optimisticItems = deleteFromItems(targetCollection.items, itemId)
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: optimisticItems } : c
            ))
        )

        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "delete", item_id: itemId },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
        } catch (e) {
            setCollections(prev)
            console.error("Error deleting item", e)
            toast.error("Failed to delete item")
        }
    }

    const saveRequest = async (parentId: string, request: CollectionRequest) => {
        if (!user) return

        const targetCollection = collections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        // Optimistic update
        const prev = collections
        const optimisticItems = targetCollection.id === parentId
            ? [...targetCollection.items, request]
            : addItemToParent(targetCollection.items, parentId, request)
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: optimisticItems } : c
            ))
        )

        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "add", parent_id: parentId, item: request },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
            toast.success("Request saved")
        } catch (e) {
            setCollections(prev)
            console.error("Error saving request", e)
            toast.error("Failed to save request")
        }
    }

    const toggleFolder = async (folderId: string) => {
        if (!user) return

        const targetCollection = collections.find(c => findItemInCollection(c.items, folderId))
        if (!targetCollection) return

        // Optimistic update (toggle is purely local UX — we still persist to avoid drift)
        const prev = collections
        const optimisticItems = toggleInItems(targetCollection.items, folderId)
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: optimisticItems } : c
            ))
        )

        // Find the current isOpen value to send the patch
        const folder = findFolder(targetCollection.items, folderId)
        if (!folder) return

        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "update", item_id: folderId, patch: { isOpen: !folder.isOpen } },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
        } catch (e) {
            setCollections(prev)
            console.error("Error toggling folder", e)
        }
    }

    /**
     * Generic folder patch — used by the folder-defaults dialog to set
     * defaultHeaders / preRequestScript / testScript / defaultAuth.
     * Applies optimistically against state, reconciles from the delta result.
     */
    const patchFolder = async (folderId: string, patch: Partial<CollectionFolder>) => {
        if (!user) return
        const targetCollection = collections.find((c) => findItemInCollection(c.items, folderId))
        if (!targetCollection) return
        const prev = collections
        const patchInItems = (items: (CollectionFolder | CollectionRequest)[]): (CollectionFolder | CollectionRequest)[] =>
            items.map((item) => {
                if ("type" in item && item.type === "folder") {
                    if (item.id === folderId) return { ...item, ...patch }
                    return { ...item, items: patchInItems(item.items) }
                }
                return item
            })
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: patchInItems(c.items) } : c
            ))
        )
        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "update", item_id: folderId, patch },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
            toast.success("Folder defaults saved")
        } catch (e) {
            setCollections(prev)
            console.error("Error patching folder", e)
            toast.error("Failed to save folder defaults")
        }
    }

    const renameFolder = async (folderId: string, name: string) => {
        if (!user) return

        const targetCollection = collections.find(c => findItemInCollection(c.items, folderId))
        if (!targetCollection) return

        // Optimistic update
        const prev = collections
        const optimisticItems = renameFolderInItems(targetCollection.items, folderId, name)
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: optimisticItems } : c
            ))
        )

        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "update", item_id: folderId, patch: { name } },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
        } catch (e) {
            setCollections(prev)
            console.error("Error renaming folder", e)
            toast.error("Failed to rename folder")
        }
    }

    // Helper functions
    const findFolder = (items: (CollectionFolder | CollectionRequest)[], folderId: string): CollectionFolder | null => {
        for (const item of items) {
            if (item.id === folderId && "type" in item && item.type === "folder") return item as CollectionFolder
            if ("type" in item && item.type === "folder") {
                const found = findFolder(item.items, folderId)
                if (found) return found
            }
        }
        return null
    }

    const findItemInCollection = (items: (CollectionFolder | CollectionRequest)[], targetId: string): boolean => {
        for (const item of items) {
            if (item.id === targetId) return true
            if ("type" in item && item.type === "folder") {
                if (findItemInCollection(item.items, targetId)) return true
            }
        }
        return false
    }

    const addItemToParent = (
        items: (CollectionFolder | CollectionRequest)[],
        parentId: string,
        newItem: CollectionFolder | CollectionRequest
    ): (CollectionFolder | CollectionRequest)[] => {
        return items.map((item) => {
            if ("type" in item && item.type === "folder") {
                if (item.id === parentId) {
                    return { ...item, items: [...item.items, newItem], isOpen: true }
                }
                return { ...item, items: addItemToParent(item.items, parentId, newItem) }
            }
            return item
        })
    }

    const deleteFromItems = (
        items: (CollectionFolder | CollectionRequest)[],
        itemId: string
    ): (CollectionFolder | CollectionRequest)[] => {
        return items
            .filter((item) => item.id !== itemId)
            .map((item) => {
                if ("type" in item && item.type === "folder") {
                    return { ...item, items: deleteFromItems(item.items, itemId) }
                }
                return item
            })
    }

    const renameFolderInItems = (
        items: (CollectionFolder | CollectionRequest)[],
        folderId: string,
        name: string
    ): (CollectionFolder | CollectionRequest)[] => {
        return items.map((item) => {
            if ("type" in item && item.type === "folder") {
                if (item.id === folderId) return { ...item, name }
                return { ...item, items: renameFolderInItems(item.items, folderId, name) }
            }
            return item
        })
    }

    const toggleInItems = (
        items: (CollectionFolder | CollectionRequest)[],
        folderId: string
    ): (CollectionFolder | CollectionRequest)[] => {
        return items.map((item) => {
            if ("type" in item && item.type === "folder") {
                if (item.id === folderId) {
                    return { ...item, isOpen: !item.isOpen }
                }
                return { ...item, items: toggleInItems(item.items, folderId) }
            }
            return item
        })
    }

    /**
     * Bulk-import a collection (Postman / HAR / OpenAPI conversion output).
     * Creates the collection on the server, then PATCHes its items in one shot.
     * Cheaper than fan-out applyDelta for hundreds of converted requests.
     */
    const importCollection = async (incoming: Collection): Promise<Collection | null> => {
        if (!user) return null
        try {
            const res = await authedFetch("/api/backend/api-client/collections", {
                method: "POST",
                body: JSON.stringify({ name: incoming.name }),
            })
            const created = (await res.json()) as Collection
            let final = created
            if (incoming.items.length > 0) {
                const patchRes = await authedFetch(`/api/backend/api-client/collections/${created.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ items: incoming.items }),
                })
                final = (await patchRes.json()) as Collection
            }
            setCollections((prev) => sortCollections([...prev, final]))
            broadcastApiClientUpdate("collections")
            toast.success(`Imported "${incoming.name}"`)
            return final
        } catch (e) {
            console.error("Error importing collection", e)
            toast.error("Failed to import collection")
            return null
        }
    }

    // Add a way to create a new root collection
    const createCollection = async (name: string) => {
        if (!user) return
        try {
            const res = await authedFetch("/api/backend/api-client/collections", {
                method: "POST",
                body: JSON.stringify({ name }),
            })
            const created = (await res.json()) as Collection
            setCollections((prev) => sortCollections([...prev, created]))
            broadcastApiClientUpdate("collections")
            toast.success("Collection created")
        } catch (e) {
            console.error("Error creating collection", e)
            toast.error("Failed to create collection")
        }
    }

    const renameCollection = async (collectionId: string, name: string) => {
        if (!user) return
        const prev = collections
        // Optimistic update
        setCollections((cur) =>
            sortCollections(cur.map((c) => (c.id === collectionId ? { ...c, name } : c)))
        )
        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${collectionId}`, {
                method: "PATCH",
                body: JSON.stringify({ name }),
            })
            const updated = (await res.json()) as Collection
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
            toast.success("Collection renamed")
        } catch (e) {
            setCollections(prev)
            console.error("Error renaming collection", e)
            toast.error("Failed to rename collection")
        }
    }

    const deleteMultipleCollections = async (ids: string[]) => {
        if (!user) return
        if (ids.length === 0) return

        try {
            // Use Promise.allSettled to handle partial failures gracefully
            const deleteResults = await Promise.allSettled(
                ids.map((id) =>
                    authedFetch(`/api/backend/api-client/collections/${id}`, { method: "DELETE" })
                )
            )

            const successfulIds: string[] = []
            const failedIds: string[] = []

            deleteResults.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    if (result.value.ok) {
                        successfulIds.push(ids[index])
                    } else {
                        failedIds.push(ids[index])
                    }
                } else {
                    failedIds.push(ids[index])
                }
            })

            // Remove successfully deleted collections from state
            if (successfulIds.length > 0) {
                setCollections((prev) => prev.filter((c) => !successfulIds.includes(c.id)))
                broadcastApiClientUpdate("collections")
            }

            // Handle results with appropriate feedback
            if (failedIds.length === 0) {
                // All successful
                toast.success(ids.length === 1 ? "Collection deleted" : `${ids.length} collections deleted`)
            } else if (successfulIds.length === 0) {
                // All failed
                console.error("Failed to delete collections:", failedIds)
                toast.error(ids.length === 1 ? "Failed to delete collection" : "Failed to delete collections")
                throw new Error("All collections failed to delete")
            } else {
                // Partial failure
                const failedNames = failedIds
                    .map(id => collections.find(c => c.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")
                console.error("Partial failure deleting collections:", failedIds)
                toast.error(`Deleted ${successfulIds.length} of ${ids.length} collections. Failed: ${failedNames || "unknown"}`)
                throw new Error(`Partial failure: ${failedIds.length} collections failed to delete`)
            }
        } catch (error) {
            console.error("Failed to delete collections:", error)
            if (!(error instanceof Error) || !error.message.includes("Partial failure")) {
                toast.error("Failed to delete collections")
            }
            throw error // Re-throw so caller knows deletion failed
        }
    }

    return {
        collections,
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
        isLoading
    }
}
