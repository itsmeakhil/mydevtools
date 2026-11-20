"use client"

import * as React from "react"
import { Collection, CollectionFolder, CollectionRequest } from "../types"
import { toast } from "sonner"
import useAuth from "@/utils/useAuth"
import { apiFetch } from "@/lib/desktop/api-fetch"
import { broadcastApiClientUpdate, useApiClientSyncListener } from "@/lib/api-client-sync"
import { isDesktop } from "@/lib/desktop/is-desktop"
import { countLiteralAuthSecrets, diffFiles, newManifest, parseCollection, serializeCollection, MANIFEST_FILE } from "@/lib/api-client/file-store"
import { moveCollectionSecretsToVault } from "@/lib/api-client/move-to-vault"
import { cloneWithNewIds, findItem, insertAt, locate, moveWithin, removeItem, type Location } from "@/lib/api-client/collection-tree"
import { useCipherKey } from "@/lib/use-cipher-key"
import { importBrunoFolder } from "@/lib/import/bruno"
import { BrunoWriteError, readBrunoLink, serializeBrunoCollection } from "@/lib/import/bruno-write"
import { useTranslations } from "next-intl"
import type { Environment } from "../use-environments"

const STORAGE_KEY = "api-client-collections"
// Root-level manifest only: a nested bruno.json (e.g. a vendored sample) is not this folder's identity.
const BRUNO_MANIFEST = /^(bruno\.json|opencollection\.yml)$/
/** Files read for a folder collection — ours (`*.yaml`) or Bruno (`*.bru`, `*.yml`, `bruno.json`). */
const isCollectionFile = (name: string) => /\.(ya?ml|bru)$/.test(name) || name === "bruno.json"

function sortCollections(cols: Collection[]) {
    return [...cols].sort((a, b) => a.name.localeCompare(b.name))
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
    const { user, loading } = useAuth()
    const [collections, setCollections] = React.useState<Collection[]>([])
    const [fileCollections, setFileCollections] = React.useState<Collection[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const migrationRanRef = React.useRef(false)
    /** Paths already toasted about, so a failing folder doesn't re-toast on every window focus. */
    const failedFilePathsRef = React.useRef(new Set<string>())
    /** Collections already warned about literal credentials — once per session is enough. */
    const secretWarnedRef = React.useRef(new Set<string>())
    const cipherKey = useCipherKey()
    const tf = useTranslations("ApiClient.fileSync")
    const tc = useTranslations("ApiClient.collectionToasts")
    type FileSyncKey = Parameters<typeof tf>[0]
    /** Why a live-linked Bruno write was refused (or failed), in the user's language. */
    const brunoWriteMessage = (e: unknown): string => {
        if (!(e instanceof BrunoWriteError)) return tf("errors.writeFailed", { reason: e instanceof Error ? e.message : String(e) })
        const partKey = `parts.${e.params.part}` as FileSyncKey
        const part = e.params.part ? (tf.has(partKey) ? tf(partKey) : e.params.part) : ""
        return tf(`errors.${e.code}` as FileSyncKey, { name: e.params.name ?? "", part })
    }
    // Latest file collections for toast-action callbacks (they outlive the closing render).
    const fileCollectionsRef = React.useRef(fileCollections)
    fileCollectionsRef.current = fileCollections

    // DB collections + folder-backed collections, one list for consumers.
    const allCollections = React.useMemo(
        () => sortCollections([...collections, ...fileCollections]),
        [collections, fileCollections]
    )

    /** (Re-)read every registered folder collection from disk. Desktop only. */
    const reloadFileCollections = React.useCallback(async () => {
        if (!isDesktop()) return
        const { readCollectionFiles, allowCollectionDir, loadCollectionRegistry } = await import(
            "@/lib/desktop/collection-files"
        )
        const paths = await loadCollectionRegistry()
        if (paths.length === 0) {
            setFileCollections((cur) => (cur.length === 0 ? cur : []))
            return
        }
        const loaded: Collection[] = []
        for (const path of paths) {
            try {
                await allowCollectionDir(path)
                const files = await readCollectionFiles(path, isCollectionFile)
                if (files.some((e) => e.relPath === MANIFEST_FILE)) {
                    const { collection, warnings } = parseCollection(files.filter((e) => e.relPath.endsWith(".yaml")))
                    warnings.forEach((w) => console.warn(`[file-collection] ${path}: ${w}`))
                    loaded.push({ ...collection, source: { kind: "file", path } })
                } else if (files.some((e) => BRUNO_MANIFEST.test(e.relPath))) {
                    // Previous id map keeps ids (and open tabs' links) stable across reloads.
                    const prev = fileCollectionsRef.current.find((c) => c.source?.path === path)?.source
                    const { collection, link } = readBrunoLink(path, files, prev?.kind === "bruno" ? prev.pathOf : undefined)
                    loaded.push({ ...collection, source: { kind: "bruno", path, ...link } })
                } else {
                    throw new Error("no collection.yaml or bruno.json")
                }
                failedFilePathsRef.current.delete(path)
            } catch (e) {
                console.error(`Failed to read folder collection at ${path}`, e)
                if (!failedFilePathsRef.current.has(path)) {
                    failedFilePathsRef.current.add(path)
                    toast.error(tc("readFolderFailed", { path }))
                }
            }
        }
        setFileCollections((cur) => {
            const next = loaded.map((col) => applyOpenState(cur.find((c) => c.id === col.id), col))
            return JSON.stringify(next) === JSON.stringify(cur) ? cur : next
        })
    }, [])

    React.useEffect(() => {
        if (isDesktop()) void reloadFileCollections()
    }, [reloadFileCollections])

    // Reload when files change on disk (git pull, external editor). Our own writes
    // fire events too; a reload that matches state is a no-op, and the hold after
    // a write just avoids re-reading mid-save.
    // ponytail: any change re-reads every folder collection; per-root reload if many get slow.
    const ownWriteUntilRef = React.useRef(0)
    const watchKey = fileCollections.map((c) => c.source!.path).sort().join("\n")
    React.useEffect(() => {
        if (!isDesktop() || !watchKey) return
        let cancelled = false
        let stop: (() => void) | undefined
        let timer: ReturnType<typeof setTimeout> | undefined
        const schedule = () => {
            clearTimeout(timer)
            timer = setTimeout(() => void reloadFileCollections(), Math.max(0, ownWriteUntilRef.current - Date.now()))
        }
        const onFocus = () => void reloadFileCollections()
        import("@/lib/desktop/collection-files")
            .then(({ watchCollectionDirs }) => watchCollectionDirs(watchKey.split("\n"), schedule))
            .then((s) => (cancelled ? s() : (stop = s)))
            .catch((e) => {
                // No watcher (permission/platform) — fall back to reloading on focus.
                console.warn("[file-collection] watch unavailable, reloading on focus instead", e)
                if (!cancelled) window.addEventListener("focus", onFocus)
            })
        return () => {
            cancelled = true
            clearTimeout(timer)
            stop?.()
            window.removeEventListener("focus", onFocus)
        }
    }, [watchKey, reloadFileCollections])

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
        const src = target.source
        if (src?.kind === "bruno") {
            // Live-linked Bruno folder: diff against the disk snapshot, then adopt the
            // written files as the new snapshot. Refusals restore the previous state.
            try {
                const { files, pathOf } = serializeBrunoCollection(next, src)
                const prev = Object.entries(src.files).map(([relPath, content]) => ({ relPath, content }))
                const { writes, deletes } = diffFiles(prev, files)
                if (writes.length > 0 || deletes.length > 0) {
                    const { writeCollectionFiles } = await import("@/lib/desktop/collection-files")
                    ownWriteUntilRef.current = Date.now() + 60_000
                    try {
                        await writeCollectionFiles(src.path, writes, deletes)
                    } finally {
                        ownWriteUntilRef.current = Date.now() + 500
                    }
                }
                const snapshot = Object.fromEntries(files.map((f) => [f.relPath, f.content]))
                setFileCollections((cur) => cur.map((c) => (c.id === target.id ? { ...next, source: { ...src, files: snapshot, pathOf } } : c)))
                return true
            } catch (e) {
                setFileCollections((cur) => cur.map((c) => (c.id === target.id ? target : c)))
                if (!(e instanceof BrunoWriteError)) console.error("Error writing Bruno collection", e)
                toast.error(brunoWriteMessage(e), { duration: 10000 })
                return false
            }
        }
        // Literal credentials are redacted by the serializer (never written to git-able
        // files) — tell the user once so a "missing" token isn't a mystery, and offer
        // to move them into the encrypted vault (rewrites fields to {{vault.*}} tokens).
        if (!secretWarnedRef.current.has(target.id) && countLiteralAuthSecrets(next) > 0) {
            secretWarnedRef.current.add(target.id)
            toast.warning(
                tc("secretsWarning", { token: "{{vault.NAME}}" }),
                {
                    duration: 10000,
                    action: {
                        label: tc("moveToVault"),
                        onClick: () => void moveFileCollectionSecrets(target.id),
                    },
                }
            )
        }
        try {
            const { writes, deletes } = diffFiles(serializeCollection(target), serializeCollection(next))
            if (writes.length > 0 || deletes.length > 0) {
                const { writeCollectionFiles } = await import("@/lib/desktop/collection-files")
                ownWriteUntilRef.current = Date.now() + 60_000
                try {
                    await writeCollectionFiles(target.source!.path, writes, deletes)
                } finally {
                    ownWriteUntilRef.current = Date.now() + 500
                }
            }
            return true
        } catch (e) {
            setFileCollections((cur) => cur.map((c) => (c.id === target.id ? target : c)))
            console.error("Error writing folder collection", e)
            toast.error(tc("writeFilesFailed", { message: e instanceof Error ? e.message : String(e) }))
            return false
        }
    }

    /** Toast action: move every literal credential in a folder collection into the vault. */
    const moveFileCollectionSecrets = async (collectionId: string) => {
        const target = fileCollectionsRef.current.find((c) => c.id === collectionId)
        if (!target) return
        try {
            const { collection: moved, moved: count } = await moveCollectionSecretsToVault(target, cipherKey)
            if (count === 0) return
            if (await mutateFileCollection(target, moved.items)) {
                toast.success(tc("movedToVault", { count }))
            }
        } catch (e) {
            console.error("Error moving credentials to vault", e)
            toast.error(e instanceof Error ? e.message : tc("moveToVaultFailed"))
        }
    }

    React.useEffect(() => {
        if (!user) migrationRanRef.current = false
    }, [user])

    const authedFetch = React.useCallback(
        async (path: string, init?: RequestInit) => {
            if (!user) throw new Error("Not authenticated")
            const res = await apiFetch(path, {
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
                toast.error(tc("loadFailed"))
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
            toast.error(tc("addFolderFailed"))
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
            const { loadCollectionRegistry, saveCollectionRegistry } = await import("@/lib/desktop/collection-files")
            await saveCollectionRegistry((await loadCollectionRegistry()).filter((p) => p !== fileCol.source!.path))
            setFileCollections((cur) => cur.filter((c) => c.id !== itemId))
            toast.success(tc("folderRemoved"))
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
                    toast.success(tc("deleted", { count: 1 }))
                } catch (e) {
                    setCollections(prev)
                    console.error("Error deleting collection", e)
                    toast.error(tc("deleteFailed", { count: 1 }))
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
            toast.error(tc("deleteItemFailed"))
        }
    }

    const saveRequest = async (parentId: string, request: CollectionRequest): Promise<boolean> => {
        const targetCollection = allCollections.find(c =>
            c.id === parentId || findItemInCollection(c.items, parentId)
        )

        if (!targetCollection) return false

        if (targetCollection.source) {
            const nextItems = targetCollection.id === parentId
                ? [...targetCollection.items, request]
                : addItemToParent(targetCollection.items, parentId, request)
            const ok = await mutateFileCollection(targetCollection, nextItems)
            if (ok) toast.success(tc("requestSaved"))
            return ok
        }

        if (!user) return false

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
            toast.success(tc("requestSaved"))
            return true
        } catch (e) {
            setCollections(prev)
            console.error("Error saving request", e)
            toast.error(tc("saveFailed"))
            return false
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
     * Shallow-patch one folder or request in place, wherever it sits.
     * Applies optimistically against state, reconciles from the delta result.
     * Resolves true only once the change is persisted.
     */
    const patchItem = async (
        itemId: string,
        patch: Partial<CollectionFolder> | Partial<CollectionRequest>,
        messages: { ok: string; fail: string },
    ): Promise<boolean> => {
        const targetCollection = allCollections.find((c) => findItemInCollection(c.items, itemId))
        if (!targetCollection) return false
        const patchInItems = (items: (CollectionFolder | CollectionRequest)[]): (CollectionFolder | CollectionRequest)[] =>
            items.map((item) => {
                if (item.id === itemId) return { ...item, ...patch } as CollectionFolder | CollectionRequest
                if ("type" in item && item.type === "folder") return { ...item, items: patchInItems(item.items) }
                return item
            })

        if (targetCollection.source) {
            const ok = await mutateFileCollection(targetCollection, patchInItems(targetCollection.items))
            if (ok) toast.success(messages.ok)
            return ok
        }

        if (!user) return false
        const prev = collections
        setCollections((cur) =>
            sortCollections(cur.map((c) =>
                c.id === targetCollection.id ? { ...c, items: patchInItems(c.items) } : c
            ))
        )
        try {
            const updated = await applyDelta(targetCollection.id, [
                { type: "update", item_id: itemId, patch },
            ])
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
            toast.success(messages.ok)
            return true
        } catch (e) {
            setCollections(prev)
            console.error("Error patching collection item", e)
            toast.error(messages.fail)
            return false
        }
    }

    /** Folder-defaults dialog: defaultHeaders / preRequestScript / testScript / defaultAuth. */
    const patchFolder = async (folderId: string, patch: Partial<CollectionFolder>) => {
        await patchItem(folderId, patch, { ok: "Folder defaults saved", fail: "Failed to save folder defaults" })
    }

    /** ⌘S on a tab opened from a collection: overwrite that request in place. */
    const updateRequest = (requestId: string, patch: Partial<CollectionRequest>) =>
        patchItem(requestId, patch, { ok: "Request saved", fail: "Failed to save request" })

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
            toast.error(tc("renameFolderFailed"))
        }
    }

    /**
     * Persist a new item tree for one collection: folder collections rewrite
     * their files; DB collections apply `ops` optimistically and reconcile.
     * Rollback is per-collection so a two-step cross-collection move never
     * reverts the half that already landed.
     */
    const commitItems = async (target: Collection, nextItems: Collection["items"], ops: object[], failMsg: string): Promise<boolean> => {
        if (target.source) return mutateFileCollection(target, nextItems)
        if (!user) return false
        setCollections((cur) => sortCollections(cur.map((c) => (c.id === target.id ? { ...c, items: nextItems } : c))))
        try {
            const updated = await applyDelta(target.id, ops)
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
            return true
        } catch (e) {
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === target.id ? target : c))))
            console.error(failMsg, e)
            toast.error(failMsg)
            return false
        }
    }

    /** Replace one collection's item tree in a single commit (OpenAPI "Sync from spec"). */
    const replaceItems = (collectionId: string, nextItems: Collection["items"], ops: object[], failMsg: string): Promise<boolean> => {
        const target = allCollections.find((c) => c.id === collectionId)
        return target ? commitItems(target, nextItems, ops, failMsg) : Promise.resolve(false)
    }

    /** Copy a request or folder (fresh ids throughout) right below the original. */
    const duplicateItem = async (itemId: string, name: string, failMsg: string): Promise<boolean> => {
        const at = locate(allCollections, itemId)
        const target = at && allCollections.find((c) => c.id === at.collectionId)
        const original = target && findItem(target.items, itemId)
        if (!at || !target || !original) return false
        const copy = cloneWithNewIds(original, name)
        const index = at.index + 1
        return commitItems(target, insertAt(target.items, at.parentId, index, copy), [
            { type: "add", parent_id: at.parentId, item: copy, position: index },
        ], failMsg)
    }

    /** Copy a whole collection as a new DB collection (a folder collection's copy lives in the app). */
    const duplicateCollection = async (collectionId: string, name: string): Promise<Collection | null> => {
        const source = allCollections.find((c) => c.id === collectionId)
        if (!source) return null
        return importCollection({ id: "", name, items: source.items.map((i) => cloneWithNewIds(i)) }, true)
    }

    /** Drag/drop and "Move to…": within a collection (backend `move` op) or across collections. */
    const moveItem = async (itemId: string, to: Location, failMsg: string): Promise<boolean> => {
        const from = locate(allCollections, itemId)
        const src = from && allCollections.find((c) => c.id === from.collectionId)
        const dest = allCollections.find((c) => c.id === to.collectionId)
        if (!from || !src || !dest) return false
        if (src.id === dest.id) {
            const next = moveWithin(src.items, itemId, to.parentId, to.index)
            return next !== null && commitItems(src, next, [
                { type: "move", item_id: itemId, new_parent_id: to.parentId, new_index: to.index },
            ], failMsg)
        }
        const item = findItem(src.items, itemId)!
        // Add first, then remove: a failure in between leaves a copy, never a loss.
        if (!await commitItems(dest, insertAt(dest.items, to.parentId, to.index, item), [
            { type: "add", parent_id: to.parentId, item, position: to.index },
        ], failMsg)) return false
        return commitItems(src, removeItem(src.items, itemId), [{ type: "delete", item_id: itemId }], failMsg)
    }

    /** Assign a DB collection to a workspace (null = no workspace). Folder collections have none. */
    const setCollectionWorkspace = async (collectionId: string, workspace: string | null, failMsg: string) => {
        if (!user) return
        const prev = collections.find((c) => c.id === collectionId)
        if (!prev) return
        setCollections((cur) => cur.map((c) => (c.id === collectionId ? { ...c, workspace: workspace ?? undefined } : c)))
        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${collectionId}`, {
                method: "PATCH",
                body: JSON.stringify({ workspace }),
            })
            const updated = (await res.json()) as Collection
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
        } catch (e) {
            setCollections((cur) => cur.map((c) => (c.id === collectionId ? prev : c)))
            console.error(failMsg, e)
            toast.error(failMsg)
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
    const importCollection = async (incoming: Collection, quiet = false): Promise<Collection | null> => {
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
            if (!quiet) toast.success(tc("imported", { name: incoming.name }))
            return final
        } catch (e) {
            console.error("Error importing collection", e)
            toast.error(tc("importFailed"))
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
            toast.success(tc("created"))
            return created
        } catch (e) {
            console.error("Error creating collection", e)
            toast.error(tc("createFailed"))
        }
    }

    /** Patch collection-level fields (name, defaults, variables) on a DB or folder collection. */
    const patchCollection = async (
        collectionId: string,
        patch: Partial<Collection>,
        messages: { ok: string; fail: string } = { ok: "Collection saved", fail: "Failed to save collection" },
    ) => {
        const fileCol = fileCollections.find((c) => c.id === collectionId)
        if (fileCol) {
            if (await mutateFileCollection(fileCol, fileCol.items, patch)) {
                toast.success(messages.ok)
            }
            return
        }

        if (!user) return
        const prev = collections
        // Optimistic update
        setCollections((cur) =>
            sortCollections(cur.map((c) => (c.id === collectionId ? { ...c, ...patch } : c)))
        )
        try {
            const res = await authedFetch(`/api/backend/api-client/collections/${collectionId}`, {
                method: "PATCH",
                body: JSON.stringify(patch),
            })
            const updated = (await res.json()) as Collection
            setCollections((cur) => sortCollections(cur.map((c) => (c.id === updated.id ? updated : c))))
            broadcastApiClientUpdate("collections")
            toast.success(messages.ok)
        } catch (e) {
            setCollections(prev)
            console.error(messages.fail, e)
            toast.error(messages.fail)
        }
    }

    const renameCollection = (collectionId: string, name: string) =>
        patchCollection(collectionId, { name }, { ok: "Collection renamed", fail: "Failed to rename collection" })

    const deleteMultipleCollections = async (ids: string[]) => {
        if (ids.length === 0) return

        // Folder collections: forget only, never delete the user's files.
        const fileIds = new Set(fileCollections.filter((c) => ids.includes(c.id)).map((c) => c.id))
        if (fileIds.size > 0) {
            const removedPaths = new Set(
                fileCollections.filter((c) => fileIds.has(c.id)).map((c) => c.source!.path)
            )
            const { loadCollectionRegistry, saveCollectionRegistry } = await import("@/lib/desktop/collection-files")
            await saveCollectionRegistry((await loadCollectionRegistry()).filter((p) => !removedPaths.has(p)))
            setFileCollections((cur) => cur.filter((c) => !fileIds.has(c.id)))
            ids = ids.filter((id) => !fileIds.has(id))
            if (ids.length === 0) {
                toast.success(tc("foldersRemoved"))
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
                toast.success(tc("deleted", { count: ids.length }))
            } else if (successfulIds.length === 0) {
                // All failed
                console.error("Failed to delete collections:", failedIds)
                toast.error(tc("deleteFailed", { count: ids.length }))
                throw new Error("All collections failed to delete")
            } else {
                // Partial failure
                const failedNames = failedIds
                    .map(id => collections.find(c => c.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")
                console.error("Partial failure deleting collections:", failedIds)
                toast.error(tc("partialDelete", { done: successfulIds.length, total: ids.length, names: failedNames || "?" }))
                throw new Error(`Partial failure: ${failedIds.length} collections failed to delete`)
            }
        } catch (error) {
            console.error("Failed to delete collections:", error)
            if (!(error instanceof Error) || !error.message.includes("Partial failure")) {
                toast.error(tc("deleteFailed", { count: ids.length }))
            }
            throw error // Re-throw so caller knows deletion failed
        }
    }

    /**
     * Pick a folder and open it as a file-backed collection. A folder with a
     * `collection.yaml` is opened as-is; a Bruno collection (`bruno.json` /
     * `opencollection.yml`) is live-linked — edits write back to its files
     * (`mode: "copy"` imports it as a regular collection instead, leaving the
     * folder untouched); any other folder is initialized (name = folder
     * basename). Desktop only.
     */
    const openFolderCollection = async (mode: "link" | "copy" = "link"): Promise<{ collection: Collection; environments: Environment[] } | null> => {
        if (!isDesktop()) return null
        try {
            const { pickFolder, readCollectionFiles, writeCollectionFiles, loadCollectionRegistry, saveCollectionRegistry } =
                await import("@/lib/desktop/collection-files")
            const path = await pickFolder()
            if (!path) return null

            const files = await readCollectionFiles(path, isCollectionFile)
            const isBruno = !files.some((e) => e.relPath === MANIFEST_FILE) && files.some((e) => BRUNO_MANIFEST.test(e.relPath))
            if (mode === "copy") {
                if (!isBruno) {
                    toast.error(tf("notBruno"))
                    return null
                }
                // Shallowest first: the importer roots at the first manifest it finds,
                // and the walk can reach a nested bruno.json before the root one.
                const byDepth = [...files].sort((a, b) => a.relPath.split("/").length - b.relPath.split("/").length)
                const { collection, environments } = importBrunoFolder(byDepth.map((e) => ({ path: e.relPath, text: e.content })))
                const created = await importCollection(collection)
                return created ? { collection: created, environments } : null
            }

            const registry = await loadCollectionRegistry()
            if (registry.includes(path)) {
                toast.info(tc("alreadyOpen"))
                const open = fileCollections.find((c) => c.source?.path === path)
                return open ? { collection: open, environments: [] } : null
            }

            if (isBruno) {
                const { collection, link, environments } = readBrunoLink(path, files)
                const col: Collection = { ...collection, source: { kind: "bruno", path, ...link } }
                await saveCollectionRegistry([...registry, path])
                setFileCollections((cur) => [...cur.filter((c) => c.id !== col.id), col])
                if (link.readOnly) toast.info(tf("readOnlyOpenCollection"), { duration: 10000 })
                else toast.success(tf("linked", { name: col.name }))
                return { collection: col, environments }
            }

            let col: Collection
            const entries = files.filter((e) => e.relPath.endsWith(".yaml"))
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

            await saveCollectionRegistry([...registry, path])
            setFileCollections((cur) => [...cur.filter((c) => c.id !== col.id), col])
            toast.success(tc("opened", { name: col.name }))
            return { collection: col, environments: [] }
        } catch (e) {
            console.error("Error opening folder collection", e)
            toast.error(tc("openFailed", { message: e instanceof Error ? e.message : String(e) }))
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
        patchCollection,
        renameFolder,
        patchFolder,
        updateRequest,
        deleteMultipleCollections,
        importCollection,
        duplicateItem,
        duplicateCollection,
        moveItem,
        replaceItems,
        setCollectionWorkspace,
        isLoading
    }
}
