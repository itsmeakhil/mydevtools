/**
 * IndexedDB-backed cache for large response bodies.
 *
 * Tabs strip `response` before persisting to localStorage (a 5MB quota would
 * be blown by one big body). This sidecar stores the full response keyed by
 * tab id so reloads can rehydrate it. Last write per tab wins; old entries
 * trimmed once the store exceeds N entries.
 */

import type { ApiResponse } from "@/components/api-client/types"

const DB_NAME = "mdt-api-client-cache"
const STORE = "responses"
const DB_VERSION = 1
const MAX_ENTRIES = 200

interface CachedRecord {
    tabId: string
    response: ApiResponse
    timestamp: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB unavailable"))
    }
    if (dbPromise) return dbPromise
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE)) {
                const os = db.createObjectStore(STORE, { keyPath: "tabId" })
                os.createIndex("ts", "timestamp")
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error("IDB open failed"))
    })
    return dbPromise
}

async function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await openDb()
    return db.transaction(STORE, mode).objectStore(STORE)
}

function awaitRequest<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error ?? new Error("IDB request failed"))
    })
}

export async function putCachedResponse(tabId: string, response: ApiResponse): Promise<void> {
    try {
        const store = await tx("readwrite")
        await awaitRequest(store.put({ tabId, response, timestamp: Date.now() } as CachedRecord))
        await trimToCap()
    } catch { /* cache miss is non-fatal */ }
}

export async function getCachedResponse(tabId: string): Promise<ApiResponse | null> {
    try {
        const store = await tx("readonly")
        const rec = await awaitRequest(store.get(tabId) as IDBRequest<CachedRecord | undefined>)
        return rec ? rec.response : null
    } catch { return null }
}

export async function deleteCachedResponse(tabId: string): Promise<void> {
    try {
        const store = await tx("readwrite")
        await awaitRequest(store.delete(tabId))
    } catch { /* noop */ }
}

async function trimToCap(): Promise<void> {
    try {
        const store = await tx("readwrite")
        const count = await awaitRequest(store.count())
        if (count <= MAX_ENTRIES) return
        const cursor = store.index("ts").openCursor()
        let toDelete = count - MAX_ENTRIES
        await new Promise<void>((resolve) => {
            cursor.onsuccess = () => {
                const c = cursor.result
                if (!c || toDelete <= 0) { resolve(); return }
                c.delete()
                toDelete--
                c.continue()
            }
            cursor.onerror = () => resolve()
        })
    } catch { /* noop */ }
}

export async function clearAll(): Promise<void> {
    try {
        const store = await tx("readwrite")
        await awaitRequest(store.clear())
    } catch { /* noop */ }
}
