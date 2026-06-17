"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import {
    IconSearch,
    IconPlus,
    IconLayoutGrid,
    IconList,
    IconUpload,
    IconDownload,
    IconFolderPlus,
    IconX,
    IconDotsVertical,
    IconCheck,
    IconTrash,
    IconLoader2
} from "@tabler/icons-react"
import { useBookmarkStore, useFilteredBookmarks, useAllTags } from "@/store/bookmark-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { useIsMobile } from "@/components/hooks/use-mobile"
import FolderTree from "./folder-tree"
import BookmarkGrid from "./bookmark-grid"
import AddBookmarkDialog from "./add-bookmark-dialog"
import ImportDialog from "./import-dialog"
import AddFolderDialog from "./add-folder-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { exportBookmarksToHTML, exportBookmarksToJSON } from "@/lib/bookmark-parser"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export default function BookmarksManager() {
    const t = useTranslations("Bookmarks.manager")
    const isMobile = useIsMobile()
    const [showSidebar, setShowSidebar] = useState(!isMobile)
    const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [isAddFolderOpen, setIsAddFolderOpen] = useState(false)
    const [editingBookmark, setEditingBookmark] = useState<string | null>(null)
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<string>>(new Set())
    const [sortBy, setSortBy] = useState<"recent" | "alphabetical">("recent")
    const [showAllTags, setShowAllTags] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const bookmarkScrollRef = useRef<HTMLDivElement>(null)

    const {
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        bookmarks,
        folders,
        selectedFolderId,
        setSelectedFolder,
        deleteBookmark
    } = useBookmarkStore()

    const filteredBookmarks = useFilteredBookmarks()
    const allTags = useAllTags()

    const handleExportHTML = useCallback(() => {
        const html = exportBookmarksToHTML(bookmarks, folders)
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'bookmarks.html'
        a.click()
        URL.revokeObjectURL(url)
    }, [bookmarks, folders])

    const handleExportJSON = useCallback(() => {
        const json = exportBookmarksToJSON(bookmarks, folders)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'bookmarks.json'
        a.click()
        URL.revokeObjectURL(url)
    }, [bookmarks, folders])

    const handleEditBookmark = useCallback((id: string) => {
        setEditingBookmark(id)
        setIsAddBookmarkOpen(true)
    }, [])

    const handleCloseAddBookmark = useCallback(() => {
        setIsAddBookmarkOpen(false)
        setEditingBookmark(null)
    }, [])

    const selectedFolderName = selectedFolderId === null
        ? t("allBookmarks")
        : selectedFolderId === 'uncategorized'
            ? t("uncategorized")
            : folders.find(f => f.id === selectedFolderId)?.name || t("unknownFolder")

    const displayedBookmarks = useMemo(() => {
        const list = [...filteredBookmarks]
        if (sortBy === "alphabetical") {
            list.sort((a, b) => a.title.localeCompare(b.title))
        } else {
            list.sort((a, b) => b.updatedAt - a.updatedAt)
        }
        return list
    }, [filteredBookmarks, sortBy])

    const bookmarkScrollResetKey = `${selectedFolderId ?? 'all'}-${searchQuery}-${sortBy}`
    const { displayCount: bmDisplayCount, sentinelRef: bmSentinelRef, hasMore: bmHasMore } = useInfiniteScroll({
        totalCount: displayedBookmarks.length,
        resetKey: bookmarkScrollResetKey,
        pageSize: 24,
        scrollContainerRef: bookmarkScrollRef,
    })
    const visibleBookmarks = displayedBookmarks.slice(0, bmDisplayCount)

    const clearSelection = useCallback(() => {
        setSelectedBookmarkIds(new Set())
    }, [])

    const toggleBookmarkSelected = useCallback((id: string) => {
        setSelectedBookmarkIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }, [])

    const selectAllVisible = useCallback(() => {
        setSelectedBookmarkIds(new Set(displayedBookmarks.map((bookmark) => bookmark.id)))
    }, [displayedBookmarks])

    const deleteSelected = useCallback(() => {
        selectedBookmarkIds.forEach((id) => deleteBookmark(id))
        setSelectedBookmarkIds(new Set())
        setSelectionMode(false)
    }, [deleteBookmark, selectedBookmarkIds])

    useEffect(() => {
        if (!selectionMode) {
            setSelectedBookmarkIds(new Set())
        }
    }, [selectionMode])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            const isTyping =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                searchInputRef.current?.focus()
            }

            if (event.key === "Escape" && selectionMode) {
                setSelectionMode(false)
            }

            if (event.key === "/" && !isTyping) {
                event.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [selectionMode])

    return (
        <div className="flex h-full w-full overflow-hidden bg-background mobile-nav-offset">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {(showSidebar || !isMobile) && (
                    <>
                        {/* Mobile backdrop overlay */}
                        {isMobile && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                                onClick={() => setShowSidebar(false)}
                            />
                        )}
                        <motion.div
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className={cn(
                                "w-72 border-r border-border/40 flex flex-col",
                                isMobile
                                    ? "fixed inset-y-0 left-0 z-50 shadow-2xl bg-background"
                                    : "relative bg-muted/30"
                            )}
                        >
                            {/* Sidebar Header */}
                            <div className="h-16 px-4 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-sm">
                                <h2 className="font-semibold text-base tracking-tight">{t("foldersHeading")}</h2>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => setIsAddFolderOpen(true)}
                                    >
                                        <IconFolderPlus className="h-4.5 w-4.5" />
                                    </Button>
                                    {isMobile && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setShowSidebar(false)}
                                        >
                                            <IconX className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Folder Tree */}
                            <ScrollArea className="flex-1 px-3 py-4">
                                <FolderTree
                                    onSelectFolder={(id: string | null) => {
                                        setSelectedFolder(id)
                                        if (isMobile) setShowSidebar(false)
                                    }}
                                />
                            </ScrollArea>

                            {/* Tags Section */}
                            {allTags.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="p-4">
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("tagsHeading")}</h3>
                                        <div className="flex flex-wrap gap-1">
                                            {(showAllTags ? allTags : allTags.slice(0, 10)).map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => setSearchQuery(`#${tag}`)}
                                                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                            {allTags.length > 10 && (
                                                <button
                                                    onClick={() => setShowAllTags(prev => !prev)}
                                                    className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                                >
                                                    {showAllTags ? t("tagsShowLess") : t("tagsMore", { count: allTags.length - 10 })}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 bg-background">
                {/* Toolbar - Fixed height, not scrollable */}
                <div className="shrink-0 h-16 px-4 border-b border-border/40 flex items-center gap-4 bg-background/80 backdrop-blur-md z-10">
                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="-ml-2 shrink-0"
                            onClick={() => setShowSidebar(true)}
                        >
                            <IconList className="h-5 w-5" />
                        </Button>
                    )}

                    {/* Search */}
                    <div className="relative flex-1 max-w-xl">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t("searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-9 bg-muted/40 border-transparent focus:bg-background focus:border-input transition-all"
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
                                onClick={() => setSearchQuery('')}
                            >
                                <IconX className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
                            </Button>
                        )}
                    </div>

                    {/* Desktop Actions - Visible on larger screens */}
                    <div className="hidden md:flex items-center gap-2 ml-auto">
                        <Select value={sortBy} onValueChange={(value: "recent" | "alphabetical") => setSortBy(value)}>
                            <SelectTrigger className="h-9 w-[150px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Recently updated</SelectItem>
                                <SelectItem value="alphabetical">A-Z title</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* View Toggle */}
                        <div className="flex items-center p-1 bg-muted/40 rounded-lg border border-border/20">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7 rounded-sm"
                                onClick={() => setViewMode('grid')}
                            >
                                <IconLayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-7 w-7 rounded-sm"
                                onClick={() => setViewMode('list')}
                            >
                                <IconList className="h-4 w-4" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-1" />

                        <Button
                            variant={selectionMode ? "secondary" : "ghost"}
                            size="sm"
                            className="h-9"
                            onClick={() => setSelectionMode((prev) => !prev)}
                        >
                            <IconCheck className="h-4 w-4 mr-2" />
                            {selectionMode ? "Done" : "Select"}
                        </Button>
                        {selectionMode && (
                            <>
                                <Button variant="ghost" size="sm" className="h-9" onClick={selectAllVisible}>
                                    Select all
                                </Button>
                                <Button variant="ghost" size="sm" className="h-9" onClick={clearSelection}>
                                    Clear
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 text-destructive hover:text-destructive"
                                    onClick={deleteSelected}
                                    disabled={selectedBookmarkIds.size === 0}
                                >
                                    <IconTrash className="h-4 w-4 mr-2" />
                                    Delete ({selectedBookmarkIds.size})
                                </Button>
                            </>
                        )}

                        {/* Import */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 hover:bg-muted/60"
                            onClick={() => setIsImportOpen(true)}
                        >
                            <IconUpload className="h-4 w-4 mr-2 text-muted-foreground" />
                            {t("import")}
                        </Button>

                        {/* Export */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 hover:bg-muted/60">
                                    <IconDownload className="h-4 w-4 mr-2 text-muted-foreground" />
                                    {t("export")}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleExportHTML}>
                                    {t("exportAsHtml")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportJSON}>
                                    {t("exportAsJson")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Add Bookmark */}
                        <Button onClick={() => setIsAddBookmarkOpen(true)} className="ml-2 shadow-sm">
                            <IconPlus className="h-4 w-4 mr-2" />
                            {t("addBookmark")}
                        </Button>
                    </div>

                    {/* Mobile/Tablet Actions Menu */}
                    <div className="md:hidden flex items-center gap-1 ml-auto">
                        {/* View Toggle - Icon Only */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                            className="shrink-0"
                        >
                            {viewMode === 'grid' ? (
                                <IconLayoutGrid className="h-5 w-5" />
                            ) : (
                                <IconList className="h-5 w-5" />
                            )}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0">
                                    <IconDotsVertical className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setSelectionMode((prev) => !prev)}>
                                    <IconCheck className="h-4 w-4 mr-2" />
                                    {selectionMode ? "Done selecting" : "Select bookmarks"}
                                </DropdownMenuItem>
                                {selectionMode && (
                                    <>
                                        <DropdownMenuItem onClick={selectAllVisible}>
                                            Select all visible
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={clearSelection}>
                                            Clear selection
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={deleteSelected}
                                            disabled={selectedBookmarkIds.size === 0}
                                        >
                                            <IconTrash className="h-4 w-4 mr-2" />
                                            Delete selected ({selectedBookmarkIds.size})
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuItem onClick={() => setIsImportOpen(true)}>
                                    <IconUpload className="h-4 w-4 mr-2" />
                                    {t("import")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportHTML}>
                                    <IconDownload className="h-4 w-4 mr-2" />
                                    {t("exportAsHtml")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportJSON}>
                                    <IconDownload className="h-4 w-4 mr-2" />
                                    {t("exportAsJson")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Add Bookmark - Prominent on mobile */}
                        <Button
                            onClick={() => setIsAddBookmarkOpen(true)}
                            size="icon"
                            className="shrink-0 ml-1 rounded-full h-9 w-9 shadow-sm"
                        >
                            <IconPlus className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Content Header - Fixed, not scrollable */}
                <div className="shrink-0 px-6 pt-6 pb-2">
                    <div className="flex items-end justify-between border-b border-border/40 pb-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground/90">{selectedFolderName}</h1>
                            <p className="text-sm text-muted-foreground mt-1 font-medium">
                                {t("bookmarkCount", { count: displayedBookmarks.length })}
                                {searchQuery && (
                                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                                        {t("matchingQuery", { query: searchQuery })}
                                    </span>
                                )}
                                {selectionMode && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                                        {selectedBookmarkIds.size} selected
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bookmarks Grid/List - Only this section scrolls */}
                <div ref={bookmarkScrollRef} className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-4">
                        <BookmarkGrid
                            bookmarks={visibleBookmarks}
                            viewMode={viewMode}
                            onEdit={handleEditBookmark}
                            selectionMode={selectionMode}
                            selectedBookmarkIds={selectedBookmarkIds}
                            onToggleSelect={toggleBookmarkSelected}
                            onTagClick={(tag) => setSearchQuery(`#${tag}`)}
                        />
                        {bmHasMore && (
                            <div className="space-y-4">
                                <div ref={bmSentinelRef} className="flex items-center justify-center py-6">
                                    <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                                </div>
                                <div
                                    aria-hidden
                                    className={cn(
                                        viewMode === 'grid'
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                                            : "flex flex-col gap-3"
                                    )}
                                >
                                    {Array.from({ length: viewMode === 'grid' ? 4 : 3 }).map((_, idx) => (
                                        <Skeleton
                                            key={idx}
                                            className={cn(
                                                viewMode === 'grid'
                                                    ? "h-32 rounded-xl border border-border/60"
                                                    : "h-20 rounded-lg border border-border/60"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {!bmHasMore && displayedBookmarks.length > 24 && (
                            <p className="py-6 text-center text-xs text-muted-foreground/40">
                                All {displayedBookmarks.length} bookmarks loaded
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <AddBookmarkDialog
                open={isAddBookmarkOpen}
                onOpenChange={handleCloseAddBookmark}
                editingId={editingBookmark}
            />
            <ImportDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
            />
            <AddFolderDialog
                open={isAddFolderOpen}
                onOpenChange={setIsAddFolderOpen}
            />
        </div>
    )
}
