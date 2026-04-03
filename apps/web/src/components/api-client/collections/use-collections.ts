"use client"

import * as React from "react"
import { Collection, CollectionFolder, CollectionRequest } from "../types"
import { toast } from "sonner"
import { auth } from "@/database/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { backendFetch } from "@/lib/backend-auth"

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
                toast.success("Migrated local collections to cloud")
                localStorage.removeItem(STORAGE_KEY)
                setCollections(sortCollections(migrated))
            } catch (e) {
                migrationRanRef.current = false
                console.error("Migration failed", e)
            }
        }

        void migrateData()
    }, [user, loading, isLoading, collections.length, authedFetch])

    const addFolder = async (parentId: string, name: string) => {
        if (!user) return

        const newFolder: CollectionFolder = {
            id: crypto.randomUUID(),
            name,
            type: "folder",
            items: [],
            isOpen: true,
        }

        // Find the collection containing this parentId
        // Since we store root collections as documents, we need to find which doc to update.
        // parentId could be the collection ID itself or a folder ID inside it.

        const targetCollection = collections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        let updatedItems: (CollectionFolder | CollectionRequest)[]
        if (targetCollection.id === parentId) {
            updatedItems = [...targetCollection.items, newFolder]
        } else {
            updatedItems = addItemToParent(targetCollection.items, parentId, newFolder)
        }

        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${targetCollection.id}`, {
                method: "PATCH",
                body: JSON.stringify({ items: updatedItems }),
            })
            const updated = (await res.json()) as Collection
            setCollections((prev) => sortCollections(prev.map((c) => (c.id === updated.id ? updated : c))))
        } catch (e) {
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
            // Check if itemId is a collection ID
            const colToDelete = collections.find(c => c.id === itemId)
            if (colToDelete) {
                try {
                    await authedFetch(`/api/backend/api-client/collections/${itemId}`, { method: "DELETE" })
                    setCollections((prev) => prev.filter((c) => c.id !== itemId))
                    toast.success("Collection deleted")
                } catch (e) {
                    console.error("Error deleting collection", e)
                    toast.error("Failed to delete collection")
                }
            }
            return
        }

        const updatedItems = deleteFromItems(targetCollection.items, itemId)

        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${targetCollection.id}`, {
                method: "PATCH",
                body: JSON.stringify({ items: updatedItems }),
            })
            const updated = (await res.json()) as Collection
            setCollections((prev) => sortCollections(prev.map((c) => (c.id === updated.id ? updated : c))))
        } catch (e) {
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

        // Check if parentId is the collection itself
        let updatedItems: (CollectionFolder | CollectionRequest)[]
        if (targetCollection.id === parentId) {
            updatedItems = [...targetCollection.items, request]
        } else {
            updatedItems = addItemToParent(targetCollection.items, parentId, request)
        }

        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${targetCollection.id}`, {
                method: "PATCH",
                body: JSON.stringify({ items: updatedItems }),
            })
            const updated = (await res.json()) as Collection
            setCollections((prev) => sortCollections(prev.map((c) => (c.id === updated.id ? updated : c))))
            toast.success("Request saved")
        } catch (e) {
            console.error("Error saving request", e)
            toast.error("Failed to save request")
        }
    }

    const toggleFolder = async (folderId: string) => {
        if (!user) return

        const targetCollection = collections.find(c => findItemInCollection(c.items, folderId))
        if (!targetCollection) return

        const updatedItems = toggleInItems(targetCollection.items, folderId)

        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${targetCollection.id}`, {
                method: "PATCH",
                body: JSON.stringify({ items: updatedItems }),
            })
            const updated = (await res.json()) as Collection
            setCollections((prev) => sortCollections(prev.map((c) => (c.id === updated.id ? updated : c))))
        } catch (e) {
            console.error("Error toggling folder", e)
        }
    }

    // Helper functions
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
            toast.success("Collection created")
        } catch (e) {
            console.error("Error creating collection", e)
            toast.error("Failed to create collection")
        }
    }

    const renameCollection = async (collectionId: string, name: string) => {
        if (!user) return
        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${collectionId}`, {
                method: "PATCH",
                body: JSON.stringify({ name }),
            })
            const updated = (await res.json()) as Collection
            setCollections((prev) => sortCollections(prev.map((c) => (c.id === updated.id ? updated : c))))
            toast.success("Collection renamed")
        } catch (e) {
            console.error("Error renaming collection", e)
            toast.error("Failed to rename collection")
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
        isLoading
    }
}
