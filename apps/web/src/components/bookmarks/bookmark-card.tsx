"use client"

import { useState, useCallback } from "react"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { motion } from "framer-motion"
import {
    IconExternalLink,
    IconCopy,
    IconEdit,
    IconTrash,
    IconDotsVertical,
    IconTag,
    IconFolder
} from "@tabler/icons-react"
import { Bookmark, useBookmarkStore } from "@/store/bookmark-store"
import { getFaviconUrl, getDomainFromUrl } from "@/lib/favicon-utils"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { Checkbox } from "@/components/ui/checkbox"

interface BookmarkCardProps {
    bookmark: Bookmark
    viewMode: 'grid' | 'list'
    onEdit: (id: string) => void
    index: number
    selectionMode: boolean
    isSelected: boolean
    onToggleSelect: (id: string) => void
    isMobile: boolean
    onTagClick?: (tag: string) => void
}

export default function BookmarkCard({
    bookmark,
    viewMode,
    onEdit,
    index,
    selectionMode,
    isSelected,
    onToggleSelect,
    isMobile,
    onTagClick,
}: BookmarkCardProps) {
    const t = useTranslations("Bookmarks.card")
    const { deleteBookmark, addBookmark, folders } = useBookmarkStore()
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [imageError, setImageError] = useState(false)

    const { copyToClipboard } = useCopyToClipboard()

    const folder = folders.find(f => f.id === bookmark.folderId)
    const faviconUrl = getFaviconUrl(bookmark.url)
    const domain = getDomainFromUrl(bookmark.url)

    const handleOpenLink = useCallback(() => {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer')
    }, [bookmark.url])

    const handleCopyUrl = useCallback(() => {
        void copyToClipboard(bookmark.url, t("urlCopied"))
    }, [bookmark.url, t, copyToClipboard])

    const handleDelete = useCallback(() => {
        const snapshot = { ...bookmark }
        deleteBookmark(bookmark.id)
        setDeleteConfirmOpen(false)
        toast.success(t("bookmarkDeleted"), {
            action: {
                label: "Undo",
                onClick: () => addBookmark(snapshot),
            },
        })
    }, [bookmark, deleteBookmark, addBookmark, t])

    const handlePrimaryAction = useCallback(() => {
        if (selectionMode) {
            onToggleSelect(bookmark.id)
            return
        }
        handleOpenLink()
    }, [selectionMode, onToggleSelect, bookmark.id, handleOpenLink])

    const deleteDialog = (
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("deleteConfirmDescription", { title: bookmark.title })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                        {t("delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

    if (viewMode === 'list') {
        return (
            <>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index < 6 ? index * 0.03 : 0 }}
                    className={cn(
                        "group flex items-center gap-4 p-3 rounded-lg border border-border/50",
                        "hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer",
                        isSelected && "border-primary/40 bg-primary/5"
                    )}
                    onClick={handlePrimaryAction}
                >
                    {selectionMode && (
                        <Checkbox
                            checked={isSelected}
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => onToggleSelect(bookmark.id)}
                        />
                    )}
                    {/* Favicon */}
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {!imageError ? (
                            <img
                                src={faviconUrl}
                                alt=""
                                className="h-5 w-5"
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <span className="text-xs font-bold text-muted-foreground">
                                {bookmark.title.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-sm">{bookmark.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{domain}</p>
                    </div>

                    {/* Tags */}
                    <div className="hidden sm:flex items-center gap-1">
                        {bookmark.tags.slice(0, 2).map(tag => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-secondary/70"
                                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag) }}
                            >
                                {tag}
                            </Badge>
                        ))}
                        {bookmark.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                                +{bookmark.tags.length - 2}
                            </span>
                        )}
                    </div>

                    {/* Folder */}
                    {folder && (
                        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                            <IconFolder className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{folder.name}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); handleCopyUrl() }}
                        >
                            <IconCopy className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <IconDotsVertical className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(bookmark.id)}>
                                    <IconEdit className="h-4 w-4 mr-2" />
                                    {t("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteConfirmOpen(true)}
                                >
                                    <IconTrash className="h-4 w-4 mr-2" />
                                    {t("delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </motion.div>
                {deleteDialog}
            </>
        )
    }

    // Grid View
    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index < 6 ? index * 0.03 : 0 }}
                className={cn(
                    "group relative flex flex-col p-4 rounded-xl border border-border/40",
                    "bg-gradient-to-br from-background via-background to-muted/10",
                    "hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
                    "transition-all duration-300 cursor-pointer overflow-hidden",
                    isSelected && "border-primary/50 bg-primary/5"
                )}
                onClick={handlePrimaryAction}
            >
                {selectionMode && (
                    <div className="absolute left-3 top-3 z-20">
                        <Checkbox
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => onToggleSelect(bookmark.id)}
                        />
                    </div>
                )}
                {/* Header */}
                <div className={cn("flex items-start gap-3.5 mb-3", selectionMode && "pl-6")}>
                    {/* Favicon */}
                    <div className={cn(
                        "rounded-xl bg-gradient-to-br from-muted/50 to-muted/80 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-border/50 shadow-sm group-hover:scale-105 transition-transform duration-300",
                        isMobile ? "h-11 w-11" : "h-10 w-10"
                    )}>
                        {!imageError ? (
                            <img
                                src={faviconUrl}
                                alt=""
                                className={cn("object-contain", isMobile ? "h-6 w-6" : "h-5 w-5")}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <span className="text-sm font-bold text-muted-foreground/70">
                                {bookmark.title.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Title & Domain */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-semibold truncate text-[15px] leading-tight text-foreground/90 group-hover:text-primary transition-colors duration-200">
                            {bookmark.title}
                        </h3>
                        <p className="text-xs text-muted-foreground/80 truncate mt-1 font-medium">
                            {domain}
                        </p>
                    </div>

                    {/* Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-8 w-8 -mr-2 -mt-1",
                                    isMobile
                                        ? "opacity-100 touch-target-sm"
                                        : "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                                )}
                            >
                                <IconDotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={handleCopyUrl}>
                                <IconCopy className="h-4 w-4 mr-2" />
                                {t("copyUrl")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(bookmark.id)}>
                                <IconEdit className="h-4 w-4 mr-2" />
                                {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirmOpen(true)}
                            >
                                <IconTrash className="h-4 w-4 mr-2" />
                                {t("delete")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Description */}
                {bookmark.description && (
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-3 leading-relaxed">
                        {bookmark.description}
                    </p>
                )}

                {/* Tags */}
                {bookmark.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                        {bookmark.tags.slice(0, 3).map(tag => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0.5 h-5 font-medium bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag) }}
                            >
                                {tag}
                            </Badge>
                        ))}
                        {bookmark.tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground font-medium px-1">
                                +{bookmark.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Hover Overlay - Subtle Shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.div>
            {deleteDialog}
        </>
    )
}
