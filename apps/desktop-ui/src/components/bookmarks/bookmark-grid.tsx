"use client"

import { Bookmark } from "@/store/bookmark-store"
import BookmarkCard from "./bookmark-card"
import { motion } from "framer-motion"
import { IconBookmarkOff, IconPlus, IconUpload } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useIsMobile } from "@/components/hooks/use-mobile"

interface BookmarkGridProps {
    bookmarks: Bookmark[]
    viewMode: 'grid' | 'list'
    onEdit: (id: string) => void
    selectionMode: boolean
    selectedBookmarkIds: Set<string>
    onToggleSelect: (id: string) => void
    onTagClick?: (tag: string) => void
    onAdd?: () => void
    onImport?: () => void
}

export default function BookmarkGrid({
    bookmarks,
    viewMode,
    onEdit,
    selectionMode,
    selectedBookmarkIds,
    onToggleSelect,
    onTagClick,
    onAdd,
    onImport,
}: BookmarkGridProps) {
    const tEmpty = useTranslations("Bookmarks.grid")
    const tManager = useTranslations("Bookmarks.manager")
    const isMobile = useIsMobile()

    if (bookmarks.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
            >
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <IconBookmarkOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">{tEmpty("emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                    {tEmpty("emptyDescription")}
                </p>
                {(onAdd || onImport) && (
                    <div className="mt-6 flex items-center gap-2">
                        {onAdd && (
                            <Button onClick={onAdd}>
                                <IconPlus className="h-4 w-4 mr-2" />
                                {tManager("addBookmark")}
                            </Button>
                        )}
                        {onImport && (
                            <Button variant="outline" onClick={onImport}>
                                <IconUpload className="h-4 w-4 mr-2" />
                                {tManager("import")}
                            </Button>
                        )}
                    </div>
                )}
            </motion.div>
        )
    }

    return (
        <div
            className={cn(
                viewMode === 'grid'
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
                    : "flex flex-col gap-2 sm:gap-3"
            )}
        >
            {bookmarks.map((bookmark, index) => (
                <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    viewMode={viewMode}
                    onEdit={onEdit}
                    index={index}
                    selectionMode={selectionMode}
                    isSelected={selectedBookmarkIds.has(bookmark.id)}
                    onToggleSelect={onToggleSelect}
                    isMobile={isMobile}
                    onTagClick={onTagClick}
                />
            ))}
        </div>
    )
}
