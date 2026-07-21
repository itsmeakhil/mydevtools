"use client"

import * as React from "react"
import { Collection, CollectionFolder, CollectionRequest } from "../types"
import { toast } from "sonner"
import { auth } from "@/database/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { backendFetch } from "@/lib/backend-auth"
import { broadcastApiClientUpdate, useApiClientSyncListener } from "@/lib/api-client-sync"
import { isDesktop } from "@/lib/desktop/is-desktop"
import { diffFiles, newManifest, parseCollection, serializeCollection, MANIFEST_FILE } from "@/lib/api-client/file-store"

const STORAGE_KEY = "api-client-collections"
/** Registered folder-collection paths (desktop only — paths are machine-local). */
const FILE_REGISTRY_KEY = "api-client-file-collections"

function sortCollections(cols: Collection[]) {
    return [...cols].sort((a, b) => a.name.localeCompare(b.name))
}

function readFileRegistry(): string[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(FILE_REGISTRY_KEY) ?? "[]")
        return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : []
    } catch {
        return []
    }
}

function writeFileRegistry(paths: string[]) {
    localStorage.setItem(FILE_REGISTRY_KEY, JSON.stringify(paths))
}

/** Carry UI-only open/closed state (stripped from disk) across reloads, by folder id. */
function applyOpenState(prev: Collection | undefined, next: Collection): Collection {
    if (!prev) return next
    const openIds = new Set<string>()
    const collect = (items: Collection["items"]) => {
        for (const item of items) {
            if ("type" in item && item.type === "folder") {
                if (item.isOpen) openIds.add(item.id)
                collect(item.items)
            }
        }
    }
    collect(prev.items)
    const apply = (items: Collection["items"]): Collection["items"] =>
        items.map((item) =>
            "type" in item && item.type === "folder"
                ? { ...item, isOpen: openIds.has(item.id), items: apply(item.items) }
                : item
        )
    return { ...next, items: apply(next.items) }
}

export function useCollections() {
    const [user, loading] = useAuthState(auth)
    const [collections, setCollections] = React.useState<Collection[]>([])
    const [fileCollections, setFileCollections] = React.useState<Collection[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const migrationRanRef = React.useRef(false)
    /** Paths already toasted about, so a failing folder doesn't re-toast on every window focus. */
    const failedFilePathsRef = React.useRef(new Set<string>())

    // DB collections + folder-backed collections, one list for consumers.
    const allCollections = React.useMemo(
        () => sortCollections([...collections, ...fileCollections]),
        [collections, fileCollections]
    )

    /** (Re-)read every registered folder collection from disk. Desktop only. */
    const reloadFileCollections = React.useCallback(async () => {
        if (!isDesktop()) return
        const paths = readFileRegistry()
        if (paths.length === 0) {
            setFileCollections((cur) => (cur.length === 0 ? cur : []))
            return
        }
        const { readCollectionFiles, allowCollectionDir } = await import("@/lib/desktop/collection-files")
        const loaded: Collection[] = []
        for (const path of paths) {
            try {
                await allowCollectionDir(path)
                const { collection, warnings } = parseCollection(await readCollectionFiles(path))
                warnings.forEach((w) => console.warn(`[file-collection] ${path}: ${w}`))
                loaded.push({ ...collection, source: { kind: "file", path } })
                failedFilePathsRef.current.delete(path)
            } catch (e) {
                console.error(`Failed to read folder collection at ${path}`, e)
                if (!failedFilePathsRef.current.has(path)) {
                    failedFilePathsRef.current.add(path)
                    toast.error(`Couldn't read folder collection: ${path}`)
                }
            }
        }
        setFileCollections((cur) => {
            const next = loaded.map((col) => applyOpenState(cur.find((c) => c.id === col.id), col))
            return JSON.stringify(next) === JSON.stringify(cur) ? cur : next
        })
    }, [])

    // Load folder collections on mount and when the window regains focus
    // (catches git pulls / external editor changes — no file watcher in v1).
    React.useEffect(() => {
        if (!isDesktop()) return
        void reloadFileCollections()
        const onFocus = () => void reloadFileCollections()
        window.addEventListener("focus", onFocus)
        return () => window.removeEventListener("focus", onFocus)
    }, [reloadFileCollections])

    /**
     * Persist a mutated folder collection: swap state optimistically, then write
     * only the changed files (deterministic serializer ⇒ no-op edits write nothing).
     * On write failure the previous state is restored — never silently drop edits.
     */
    const mutateFileCollection = async (
        target: Collection,
        nextItems: Collection["items"],
        patch?: Partial<Collection>
    ): Promise<boolean> => {
        const next = { ...target, ...patch, items: nextItems }
        setFileCollections((cur) => cur.map((c) => (c.id === target.id ? next : c)))
        try {
            const { writes, deletes } = diffFiles(serializeCollection(target), serializeCollection(next))
            if (writes.length > 0 || deletes.length > 0) {
                const { writeCollectionFiles } = await import("@/lib/desktop/collection-files")
                await writeCollectionFiles(target.source!.path, writes, deletes)
            }
            return true
        } catch (e) {
            setFileCollections((cur) => cur.map((c) => (c.id === target.id ? target : c)))
            console.error("Error writing folder collection", e)
            toast.error(`Failed to write collection files: ${e instanceof Error ? e.message : String(e)}`)
            return false
        }
    }

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
        const newFolder: CollectionFolder = {
            id: crypto.randomUUID(),
            name,
            type: "folder",
            items: [],
            isOpen: true,
        }

        const targetCollection = allCollections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        if (targetCollection.source) {
            const nextItems = targetCollection.id === parentId
                ? [...targetCollection.items, newFolder]
                : addItemToParent(targetCollection.items, parentId, newFolder)
            const ok = await mutateFileCollection(targetCollection, nextItems)
            return ok ? newFolder.id : undefined
        }

        if (!user) return

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
            return newFolder.id
        } catch (e) {
            setCollections(prev)
            console.error("Error adding folder", e)
            toast.error("Failed to add folder")
        }
    }

    const deleteItem = async (itemId: string) => {
        // Find collection containing item
        const targetCollection = allCollections.find(c =>
            c.items.some(i => i.id === itemId) || findItemInCollection(c.items, itemId)
        )

        if (targetCollection?.source) {
            await mutateFileCollection(targetCollection, deleteFromItems(targetCollection.items, itemId))
            return
        }

        // Deleting a folder collection = forget it, never touch the user's files.
        const fileCol = fileCollections.find((c) => c.id === itemId)
        if (fileCol?.source) {
            writeFileRegistry(readFileRegistry().filter((p) => p !== fileCol.source!.path))
            setFileCollections((cur) => cur.filter((c) => c.id !== itemId))
            toast.success("Folder collection removed from list (files kept)")
            return
        }

        if (!user) return

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
        const targetCollection = allCollections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return

        if (targetCollection.source) {
            const nextItems = targetCollection.id === parentId
                ? [...targetCollection.items, request]
                : addItemToParent(targetCollection.items, parentId, request)
            if (await mutateFileCollection(targetCollection, nextItems)) toast.success("Request saved")
            return
        }

        if (!user) return

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
        const targetCollection = allCollections.find(c => findItemInCollection(c.items, folderId))
        if (!targetCollection) return

        if (targetCollection.source) {
            // isOpen is UI-only and stripped from disk — pure state change.
            setFileCollections((cur) =>
                cur.map((c) => (c.id === targetCollection.id ? { ...c, items: toggleInItems(c.items, folderId) } : c))
            )
            return
        }

        if (!user) return

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
        const targetCollection = allCollections.find((c) => findItemInCollection(c.items, folderId))
        if (!targetCollection) return
        const patchInItems = (items: (CollectionFolder | CollectionRequest)[]): (CollectionFolder | CollectionRequest)[] =>
            items.map((item) => {
                if ("type" in item && item.type === "folder") {
                    if (item.id === folderId) return { ...item, ...patch }
                    return { ...item, items: patchInItems(item.items) }
                }
                return item
            })

        if (targetCollection.source) {
            if (await mutateFileCollection(targetCollection, patchInItems(targetCollection.items))) {
                toast.success("Folder defaults saved")
            }
            return
        }

        if (!user) return
        const prev = collections
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
        const targetCollection = allCollections.find(c => findItemInCollection(c.items, folderId))
        if (!targetCollection) return

        if (targetCollection.source) {
            await mutateFileCollection(targetCollection, renameFolderInItems(targetCollection.items, folderId, name))
            return
        }

        if (!user) return

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
            return created
        } catch (e) {
            console.error("Error creating collection", e)
            toast.error("Failed to create collection")
        }
    }

    const renameCollection = async (collectionId: string, name: string) => {
        const fileCol = fileCollections.find((c) => c.id === collectionId)
        if (fileCol) {
            if (await mutateFileCollection(fileCol, fileCol.items, { name })) {
                toast.success("Collection renamed")
            }
            return
        }

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
        if (ids.length === 0) return

        // Folder collections: forget only, never delete the user's files.
        const fileIds = new Set(fileCollections.filter((c) => ids.includes(c.id)).map((c) => c.id))
        if (fileIds.size > 0) {
            const removedPaths = new Set(
                fileCollections.filter((c) => fileIds.has(c.id)).map((c) => c.source!.path)
            )
            writeFileRegistry(readFileRegistry().filter((p) => !removedPaths.has(p)))
            setFileCollections((cur) => cur.filter((c) => !fileIds.has(c.id)))
            ids = ids.filter((id) => !fileIds.has(id))
            if (ids.length === 0) {
                toast.success("Folder collections removed from list (files kept)")
                return
            }
        }

        if (!user) return

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

    /**
     * Pick a folder and open it as a file-backed collection. A folder with a
     * `collection.yaml` is opened as-is; a folder without one is initialized
     * (name = folder basename). Desktop only.
     */
    const openFolderCollection = async (): Promise<Collection | null> => {
        if (!isDesktop()) return null
        try {
            const { pickFolder, readCollectionFiles, writeCollectionFiles } = await import(
                "@/lib/desktop/collection-files"
            )
            const path = await pickFolder()
            if (!path) return null

            const registry = readFileRegistry()
            if (registry.includes(path)) {
                toast.info("This folder collection is already open")
                return fileCollections.find((c) => c.source?.path === path) ?? null
            }

            let col: Collection
            const entries = await readCollectionFiles(path)
            if (entries.some((e) => e.relPath === MANIFEST_FILE)) {
                const { collection, warnings } = parseCollection(entries)
                warnings.forEach((w) => console.warn(`[file-collection] ${path}: ${w}`))
                col = { ...collection, source: { kind: "file", path } }
            } else {
                const name = path.split(/[/\\]/).filter(Boolean).pop() || "Collection"
                const manifest = newManifest(name)
                await writeCollectionFiles(path, [{ relPath: MANIFEST_FILE, content: manifest.content }], [])
                col = { id: manifest.id, name, items: [], source: { kind: "file", path } }
            }

            writeFileRegistry([...registry, path])
            setFileCollections((cur) => [...cur.filter((c) => c.id !== col.id), col])
            toast.success(`Opened folder collection "${col.name}"`)
            return col
        } catch (e) {
            console.error("Error opening folder collection", e)
            toast.error(`Couldn't open folder as collection: ${e instanceof Error ? e.message : String(e)}`)
            return null
        }
    }

    return {
        collections: allCollections,
        openFolderCollection,
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
