import type { Collection, CollectionFolder, CollectionRequest } from "@/components/api-client/types"

export type TreeItem = CollectionFolder | CollectionRequest

export const isFolder = (item: TreeItem): item is CollectionFolder => "type" in item && item.type === "folder"

/** Where an item sits: parent folder id (null = collection root) and its index there. */
export interface Location {
    collectionId: string
    parentId: string | null
    index: number
}

export function locate(collections: Collection[], itemId: string): Location | null {
    const walk = (items: TreeItem[], parentId: string | null, collectionId: string): Location | null => {
        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.id === itemId) return { collectionId, parentId, index: i }
            if (isFolder(item)) {
                const hit = walk(item.items, item.id, collectionId)
                if (hit) return hit
            }
        }
        return null
    }
    for (const c of collections) {
        const hit = walk(c.items, null, c.id)
        if (hit) return hit
    }
    return null
}

export function findItem(items: TreeItem[], itemId: string): TreeItem | null {
    for (const item of items) {
        if (item.id === itemId) return item
        if (isFolder(item)) {
            const hit = findItem(item.items, itemId)
            if (hit) return hit
        }
    }
    return null
}

/** Insert `item` at `index` (clamped) under `parentId` (null = root). */
export function insertAt(items: TreeItem[], parentId: string | null, index: number, item: TreeItem): TreeItem[] {
    if (parentId === null) {
        const next = [...items]
        next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
        return next
    }
    return items.map((it) =>
        !isFolder(it) ? it
            : it.id === parentId ? { ...it, isOpen: true, items: insertAt(it.items, null, index, item) }
                : { ...it, items: insertAt(it.items, parentId, index, item) },
    )
}

export function removeItem(items: TreeItem[], itemId: string): TreeItem[] {
    return items
        .filter((it) => it.id !== itemId)
        .map((it) => (isFolder(it) ? { ...it, items: removeItem(it.items, itemId) } : it))
}

/**
 * Same semantics as the backend `move` op: remove, then insert at `index` in
 * the post-removal list. Null when the move is impossible (unknown item, or a
 * folder into itself / its own subtree).
 */
export function moveWithin(items: TreeItem[], itemId: string, parentId: string | null, index: number): TreeItem[] | null {
    const item = findItem(items, itemId)
    if (!item) return null
    if (parentId !== null && (parentId === itemId || (isFolder(item) && findItem(item.items, parentId)))) return null
    return insertAt(removeItem(items, itemId), parentId, index, item)
}

/** Deep copy with fresh ids on the item and every descendant. */
export function cloneWithNewIds<T extends TreeItem>(item: T, name = item.name): T {
    const copy = { ...item, id: crypto.randomUUID(), name } as T
    if (isFolder(copy)) copy.items = copy.items.map((child) => cloneWithNewIds(child))
    return copy
}

/**
 * Search: keep requests whose name / URL / method match, every folder whose
 * name matches (with its whole subtree), and the folders leading to a hit —
 * forced open so the hits are visible.
 */
export function filterTree(items: TreeItem[], query: string): TreeItem[] {
    const q = query.trim().toLowerCase()
    if (!q) return items
    const out: TreeItem[] = []
    for (const item of items) {
        if (isFolder(item)) {
            if (item.name.toLowerCase().includes(q)) {
                out.push({ ...item, isOpen: true })
                continue
            }
            const kids = filterTree(item.items, q)
            if (kids.length > 0) out.push({ ...item, isOpen: true, items: kids })
        } else if ([item.name, item.url, item.method].some((s) => s?.toLowerCase().includes(q))) {
            out.push(item)
        }
    }
    return out
}

export type DropPosition = "before" | "after" | "inside"

/**
 * Where a drop lands, as the backend `move` op wants it (post-removal index).
 * Null for a no-op or impossible drop.
 */
export function resolveDrop(
    collections: Collection[],
    draggedId: string,
    target: { itemId: string; position: DropPosition } | { collectionId: string },
): Location | null {
    const from = locate(collections, draggedId)
    if (!from) return null
    let to: Location
    if ("collectionId" in target) {
        const col = collections.find((c) => c.id === target.collectionId)
        if (!col) return null
        to = { collectionId: col.id, parentId: null, index: col.items.length }
    } else {
        if (target.itemId === draggedId) return null
        const at = locate(collections, target.itemId)
        if (!at) return null
        if (target.position === "inside") {
            const folder = findItem(collections.find((c) => c.id === at.collectionId)!.items, target.itemId)
            if (!folder || !isFolder(folder)) return null
            to = { collectionId: at.collectionId, parentId: folder.id, index: folder.items.length }
        } else {
            to = { ...at, index: at.index + (target.position === "after" ? 1 : 0) }
        }
    }
    // Same list: indices after the dragged item shift down once it's removed.
    if (to.collectionId === from.collectionId && to.parentId === from.parentId && to.index > from.index) to.index -= 1
    if (to.collectionId === from.collectionId && to.parentId === from.parentId && to.index === from.index) return null
    return to
}

/** "Move to…" destinations: every collection root and folder, minus the item's own subtree. */
export function moveDestinations(collections: Collection[], itemId: string): Array<{ collectionId: string; parentId: string | null; label: string; depth: number }> {
    const out: Array<{ collectionId: string; parentId: string | null; label: string; depth: number }> = []
    const walk = (items: TreeItem[], collectionId: string, depth: number) => {
        for (const it of items) {
            if (!isFolder(it) || it.id === itemId) continue
            out.push({ collectionId, parentId: it.id, label: it.name, depth })
            walk(it.items, collectionId, depth + 1)
        }
    }
    for (const c of collections) {
        out.push({ collectionId: c.id, parentId: null, label: c.name, depth: 0 })
        walk(c.items, c.id, 1)
    }
    return out
}
