import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface BookmarkStore {
    // State
    bookmarks: Bookmark[]
    folders: BookmarkFolder[]
    selectedFolderId: string | null // null = all bookmarks, 'uncategorized' = no folder
    searchQuery: string
    viewMode: 'grid' | 'list'
    isLoading: boolean

    // Bookmark actions
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
    importBookmarks: (bookmarks: Bookmark[], folders: BookmarkFolder[]) => void
    clearAll: () => void
}

// Helper to get all descendant folder IDs
const getDescendantFolderIds = (folderId: string, folders: BookmarkFolder[]): string[] => {
    const children = folders.filter(f => f.parentId === folderId)
    return children.flatMap(child => [child.id, ...getDescendantFolderIds(child.id, folders)])
}

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

            // Bookmark actions
            addBookmark: (bookmark) => set((state) => ({
                bookmarks: [...state.bookmarks, bookmark]
            })),

            updateBookmark: (bookmark) => set((state) => ({
                bookmarks: state.bookmarks.map((b) =>
                    b.id === bookmark.id ? { ...bookmark, updatedAt: Date.now() } : b
                )
            })),

            deleteBookmark: (id) => set((state) => ({
                bookmarks: state.bookmarks.filter((b) => b.id !== id)
            })),

            moveBookmark: (bookmarkId, folderId) => set((state) => ({
                bookmarks: state.bookmarks.map((b) =>
                    b.id === bookmarkId ? { ...b, folderId, updatedAt: Date.now() } : b
                )
            })),

            // Folder actions
            addFolder: (folder) => set((state) => ({
                folders: [...state.folders, folder]
            })),

            updateFolder: (folder) => set((state) => ({
                folders: state.folders.map((f) =>
                    f.id === folder.id ? folder : f
                )
            })),

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
            },

            toggleFolderExpanded: (id) => set((state) => ({
                folders: state.folders.map((f) =>
                    f.id === id ? { ...f, isExpanded: !f.isExpanded } : f
                )
            })),

            // UI actions
            setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),
            setSearchQuery: (query) => set({ searchQuery: query }),
            setViewMode: (mode) => set({ viewMode: mode }),
            setLoading: (loading) => set({ isLoading: loading }),

            // Bulk actions
            importBookmarks: (newBookmarks, newFolders) => set((state) => ({
                bookmarks: [...state.bookmarks, ...newBookmarks],
                folders: [...state.folders, ...newFolders]
            })),

            clearAll: () => set({ bookmarks: [], folders: [] })
        }),
        {
            name: 'bookmark-storage',
            partialize: (state) => ({
                bookmarks: state.bookmarks,
                folders: state.folders,
                viewMode: state.viewMode
            })
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
