import { create } from "zustand"
import { persist } from "zustand/middleware"
import { auth } from "@/database/firebase"

const BACKEND_BASE_URL: string =
    process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:8000"

export interface Bookmark {
    id: string
    title: string
    url: string
    description?: string
    favicon?: string
    tags: string[]
    folderId: string | null // null means root level / uncategorized
    createdAt: number
    updatedAt: number
}

export interface BookmarkFolder {
    id: string
    name: string
    parentId: string | null // null means root level
    color?: string
    icon?: string
    createdAt: number
    isExpanded?: boolean
}

type BookmarkOut = {
    id: string
    title: string
    url: string
    description?: string
    favicon?: string
    tags: string[]
    folderId?: string | null
    createdAt: number
    updatedAt: number
}

type BookmarkFolderOut = {
    id: string
    name: string
    parentId?: string | null
    color?: string
    icon?: string
    createdAt: number
    isExpanded?: boolean
}

type BookmarkSnapshotOut = {
    bookmarks: BookmarkOut[]
    folders: BookmarkFolderOut[]
}

type ProxyResponse = {
    status: number
    statusText: string
    headers: Record<string, string>
    body: string
    isBase64: boolean
    time: number
    size: number
    error?: string
}

interface BookmarkStore {
    // State
    bookmarks: Bookmark[]
    folders: BookmarkFolder[]
    selectedFolderId: string | null // null = all bookmarks, 'uncategorized' = no folder
    searchQuery: string
    viewMode: 'grid' | 'list'
    isLoading: boolean
    hasSynced: boolean

    // Bookmark actions
    syncFromBackend: (force?: boolean) => Promise<void>
    addBookmark: (bookmark: Bookmark) => void
    updateBookmark: (bookmark: Bookmark) => void
    deleteBookmark: (id: string) => void
    moveBookmark: (bookmarkId: string, folderId: string | null) => void

    // Folder actions
    addFolder: (folder: BookmarkFolder) => void
    updateFolder: (folder: BookmarkFolder) => void
    deleteFolder: (id: string) => void
    toggleFolderExpanded: (id: string) => void

    // UI actions
    setSelectedFolder: (folderId: string | null) => void
    setSearchQuery: (query: string) => void
    setViewMode: (mode: 'grid' | 'list') => void
    setLoading: (loading: boolean) => void

    // Bulk actions
    importBookmarks: (bookmarks: Bookmark[], folders: BookmarkFolder[]) => Promise<void>
    clearAll: () => Promise<void>
}

// Helper to get all descendant folder IDs
const getDescendantFolderIds = (folderId: string, folders: BookmarkFolder[]): string[] => {
    const children = folders.filter(f => f.parentId === folderId)
    return children.flatMap(child => [child.id, ...getDescendantFolderIds(child.id, folders)])
}

const proxyRequest = async <T,>(
    method: string,
    path: string,
    body?: unknown
): Promise<T> => {
    const currentUser = auth.currentUser
    if (!currentUser) throw new Error("Not authenticated.")

    const idToken = await currentUser.getIdToken()
    const url = new URL(path, BACKEND_BASE_URL).toString()

    const headersObj: Record<string, string> = {
        Authorization: `Bearer ${idToken}`,
    }

    const proxyBody = body !== undefined ? JSON.stringify(body) : undefined
    if (proxyBody !== undefined && method !== "GET" && method !== "HEAD") {
        headersObj["Content-Type"] = "application/json"
    }

    const proxyRes = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            url,
            method,
            headers: headersObj,
            body: proxyBody,
        }),
    })

    const proxyData = (await proxyRes.json()) as ProxyResponse
    if (proxyData.status < 200 || proxyData.status >= 300) {
        throw new Error(proxyData.body || proxyData.statusText || proxyData.error || "Request failed")
    }

    if (!proxyData.body) {
        return undefined as T
    }

    try {
        return JSON.parse(proxyData.body) as T
    } catch {
        return proxyData.body as unknown as T
    }
}

let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncInFlight: Promise<void> | null = null

const mapBookmarkOut = (out: BookmarkOut): Bookmark => ({
    id: out.id,
    title: out.title,
    url: out.url,
    description: out.description,
    favicon: out.favicon,
    tags: Array.isArray(out.tags) ? out.tags : [],
    folderId: out.folderId ?? null,
    createdAt: out.createdAt,
    updatedAt: out.updatedAt,
})

const mapFolderOut = (out: BookmarkFolderOut): BookmarkFolder => ({
    id: out.id,
    name: out.name,
    parentId: out.parentId ?? null,
    color: out.color,
    icon: out.icon,
    createdAt: out.createdAt,
    isExpanded: out.isExpanded ?? false,
})

export const useBookmarkStore = create<BookmarkStore>()(
    persist(
        (set, get) => ({
            // Initial state
            bookmarks: [],
            folders: [],
            selectedFolderId: null,
            searchQuery: '',
            viewMode: 'grid',
            isLoading: false,
            hasSynced: false,

            syncFromBackend: async (force = false) => {
                if (!force && get().hasSynced) return
                if (syncInFlight) return syncInFlight

                syncInFlight = (async () => {
                    try {
                        set({ isLoading: true })
                        const snapshot = await proxyRequest<BookmarkSnapshotOut>("GET", "/api/v1/bookmarks/snapshot")
                        set({
                            bookmarks: snapshot.bookmarks.map(mapBookmarkOut),
                            folders: snapshot.folders.map(mapFolderOut),
                            isLoading: false,
                            hasSynced: true,
                        })
                    } catch (e) {
                        console.error("[Bookmarks] syncFromBackend failed:", e)
                        set({ isLoading: false })
                    } finally {
                        syncInFlight = null
                    }
                })()

                return syncInFlight
            },

            // Bookmark actions
            addBookmark: (bookmark) => {
                set((state) => ({
                    // Upsert by id to avoid duplicates if an import happens.
                    bookmarks: [
                        ...state.bookmarks.filter((b) => b.id !== bookmark.id),
                        bookmark,
                    ],
                }))

                void (async () => {
                    try {
                        const created = await proxyRequest<BookmarkOut>("POST", "/api/v1/bookmarks", {
                            id: bookmark.id,
                            title: bookmark.title,
                            url: bookmark.url,
                            description: bookmark.description,
                            favicon: bookmark.favicon,
                            tags: bookmark.tags,
                            folderId: bookmark.folderId,
                        })
                        set((state) => ({
                            bookmarks: state.bookmarks.map((b) => (b.id === created.id ? mapBookmarkOut(created) : b)),
                        }))
                        if (!get().hasSynced) return
                    } catch (e) {
                        console.error("[Bookmarks] addBookmark failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            updateBookmark: (bookmark) => {
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) => (b.id === bookmark.id ? { ...bookmark } : b)),
                }))

                void (async () => {
                    try {
                        const updated = await proxyRequest<BookmarkOut>(
                            "PATCH",
                            `/api/v1/bookmarks/${bookmark.id}`,
                            {
                                title: bookmark.title,
                                url: bookmark.url,
                                description: bookmark.description,
                                favicon: bookmark.favicon,
                                tags: bookmark.tags,
                                folderId: bookmark.folderId,
                            }
                        )
                        set((state) => ({
                            bookmarks: state.bookmarks.map((b) => (b.id === updated.id ? mapBookmarkOut(updated) : b)),
                        }))
                    } catch (e) {
                        console.error("[Bookmarks] updateBookmark failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            deleteBookmark: (id) => {
                set((state) => ({
                    bookmarks: state.bookmarks.filter((b) => b.id !== id),
                }))

                void (async () => {
                    try {
                        await proxyRequest<void>("DELETE", `/api/v1/bookmarks/${id}`)
                    } catch (e) {
                        console.error("[Bookmarks] deleteBookmark failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            moveBookmark: (bookmarkId, folderId) => {
                set((state) => ({
                    bookmarks: state.bookmarks.map((b) => (b.id === bookmarkId ? { ...b, folderId } : b)),
                }))

                void (async () => {
                    try {
                        const moved = await proxyRequest<BookmarkOut>(
                            "PATCH",
                            `/api/v1/bookmarks/${bookmarkId}/move`,
                            { folderId }
                        )
                        set((state) => ({
                            bookmarks: state.bookmarks.map((b) => (b.id === moved.id ? mapBookmarkOut(moved) : b)),
                        }))
                    } catch (e) {
                        console.error("[Bookmarks] moveBookmark failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            // Folder actions
            addFolder: (folder) => {
                set((state) => ({
                    folders: [
                        ...state.folders.filter((f) => f.id !== folder.id),
                        folder,
                    ],
                }))

                void (async () => {
                    try {
                        const created = await proxyRequest<BookmarkFolderOut>("POST", "/api/v1/bookmark-folders", {
                            id: folder.id,
                            name: folder.name,
                            parentId: folder.parentId,
                            color: folder.color,
                            icon: folder.icon,
                            isExpanded: folder.isExpanded ?? false,
                        })
                        set((state) => ({
                            folders: state.folders.map((f) => (f.id === created.id ? mapFolderOut(created) : f)),
                        }))
                    } catch (e) {
                        console.error("[Bookmarks] addFolder failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            updateFolder: (folder) => {
                set((state) => ({
                    folders: state.folders.map((f) => (f.id === folder.id ? { ...folder } : f)),
                }))

                void (async () => {
                    try {
                        const updated = await proxyRequest<BookmarkFolderOut>(
                            "PATCH",
                            `/api/v1/bookmark-folders/${folder.id}`,
                            {
                                name: folder.name,
                                parentId: folder.parentId,
                                color: folder.color,
                                icon: folder.icon,
                                isExpanded: folder.isExpanded,
                            }
                        )
                        set((state) => ({
                            folders: state.folders.map((f) => (f.id === updated.id ? mapFolderOut(updated) : f)),
                        }))
                    } catch (e) {
                        console.error("[Bookmarks] updateFolder failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            deleteFolder: (id) => {
                const { folders, bookmarks } = get()
                // Get all descendant folder IDs
                const descendantIds = getDescendantFolderIds(id, folders)
                const allFolderIds = [id, ...descendantIds]

                set({
                    // Remove the folder and all descendants
                    folders: folders.filter((f) => !allFolderIds.includes(f.id)),
                    // Move bookmarks from deleted folders to uncategorized
                    bookmarks: bookmarks.map((b) =>
                        allFolderIds.includes(b.folderId || '') ? { ...b, folderId: null } : b
                    )
                })

                void (async () => {
                    try {
                        await proxyRequest<void>("DELETE", `/api/v1/bookmark-folders/${id}`)
                    } catch (e) {
                        console.error("[Bookmarks] deleteFolder failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            toggleFolderExpanded: (id) => {
                const current = get().folders.find((f) => f.id === id)
                const nextExpanded = !(current?.isExpanded ?? false)

                set((state) => ({
                    folders: state.folders.map((f) => (f.id === id ? { ...f, isExpanded: nextExpanded } : f)),
                }))

                void (async () => {
                    try {
                        const updated = await proxyRequest<BookmarkFolderOut>(
                            "PATCH",
                            `/api/v1/bookmark-folders/${id}/expanded`,
                            { isExpanded: nextExpanded }
                        )
                        set((state) => ({
                            folders: state.folders.map((f) => (f.id === updated.id ? mapFolderOut(updated) : f)),
                        }))
                    } catch (e) {
                        console.error("[Bookmarks] toggleFolderExpanded failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            // UI actions
            setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setViewMode: (mode) => set({ viewMode: mode }),
            setLoading: (loading) => set({ isLoading: loading }),

            // Bulk actions
            importBookmarks: (newBookmarks, newFolders) => {
                // Optimistic upsert by id.
                set((state) => {
                    const bmMap = new Map(state.bookmarks.map((b) => [b.id, b]))
                    newBookmarks.forEach((b) => bmMap.set(b.id, b))

                    const folderMap = new Map(state.folders.map((f) => [f.id, f]))
                    newFolders.forEach((f) => folderMap.set(f.id, f))

                    return {
                        bookmarks: Array.from(bmMap.values()),
                        folders: Array.from(folderMap.values()),
                    }
                })
                return (async () => {
                    try {
                        await proxyRequest<void>("POST", "/api/v1/bookmarks/import", {
                            bookmarks: newBookmarks,
                            folders: newFolders,
                        })
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    } catch (e) {
                        console.error("[Bookmarks] importBookmarks failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },

            clearAll: () => {
                set({ bookmarks: [], folders: [] })
                return (async () => {
                    try {
                        await proxyRequest<void>("POST", "/api/v1/bookmarks/clear-all")
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 300)
                    } catch (e) {
                        console.error("[Bookmarks] clearAll failed:", e)
                        if (syncTimer) clearTimeout(syncTimer)
                        syncTimer = setTimeout(() => {
                            void get().syncFromBackend(true)
                        }, 500)
                    }
                })()
            },
        }),
        {
            name: "bookmark-storage-v2",
            partialize: (state) => ({
                selectedFolderId: state.selectedFolderId,
                viewMode: state.viewMode,
            }),
        }
    )
)

// Selector hooks for filtered bookmarks
export const useFilteredBookmarks = () => {
    const { bookmarks, folders, selectedFolderId, searchQuery } = useBookmarkStore()

    return bookmarks.filter((bookmark) => {
        // Filter by folder
        if (selectedFolderId === 'uncategorized') {
            if (bookmark.folderId !== null) return false
        } else if (selectedFolderId !== null) {
            // Include bookmarks from selected folder and all its descendants
            const descendantIds = getDescendantFolderIds(selectedFolderId, folders)
            const validFolderIds = [selectedFolderId, ...descendantIds]
            if (!validFolderIds.includes(bookmark.folderId || '')) return false
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const matchesTitle = bookmark.title.toLowerCase().includes(query)
            const matchesUrl = bookmark.url.toLowerCase().includes(query)
            const matchesDescription = bookmark.description?.toLowerCase().includes(query)
            const matchesTags = bookmark.tags.some(tag => tag.toLowerCase().includes(query))
            if (!matchesTitle && !matchesUrl && !matchesDescription && !matchesTags) {
                return false
            }
        }

        return true
    })
}

// Get all unique tags
export const useAllTags = () => {
    const { bookmarks } = useBookmarkStore()
    const allTags = bookmarks.flatMap(b => b.tags)
    return [...new Set(allTags)].sort()
}

// Get folder by ID
export const useFolderById = (id: string | null) => {
    const { folders } = useBookmarkStore()
    return folders.find(f => f.id === id)
}

// Get child folders
export const useChildFolders = (parentId: string | null) => {
    const { folders } = useBookmarkStore()
    return folders.filter(f => f.parentId === parentId)
}

// Get bookmark count for a folder (including descendants)
export const useFolderBookmarkCount = (folderId: string | null) => {
    const { bookmarks, folders } = useBookmarkStore()

    if (folderId === null) {
        return bookmarks.length
    }

    if (folderId === 'uncategorized') {
        return bookmarks.filter(b => b.folderId === null).length
    }

    const descendantIds = getDescendantFolderIds(folderId, folders)
    const validFolderIds = [folderId, ...descendantIds]
    return bookmarks.filter(b => validFolderIds.includes(b.folderId || '')).length
}
