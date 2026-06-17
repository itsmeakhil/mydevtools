"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    IconFolder,
    IconFolderOpen,
    IconChevronRight,
    IconBookmarks,
    IconDotsVertical,
    IconTrash,
    IconEdit,
    IconFolderPlus
} from "@tabler/icons-react"
import { useBookmarkStore, useChildFolders, useFolderBookmarkCount, BookmarkFolder } from "@/store/bookmark-store"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
import EditFolderDialog from "./edit-folder-dialog"
import AddFolderDialog from "./add-folder-dialog"
import { useTranslations } from "next-intl"

interface FolderTreeProps {
    onSelectFolder: (id: string | null) => void
}

export default function FolderTree({ onSelectFolder }: FolderTreeProps) {
    const t = useTranslations("Bookmarks.folderTree")
    const { selectedFolderId, bookmarks } = useBookmarkStore()

    const totalBookmarks = bookmarks.length

    return (
        <div className="space-y-1">
            {/* All Bookmarks */}
            <FolderItem
                icon={IconBookmarks}
                label={t("allBookmarks")}
                count={totalBookmarks}
                isSelected={selectedFolderId === null}
                onClick={() => onSelectFolder(null)}
            />

            {/* Separator */}
            <div className="h-px bg-border my-2" />

            {/* User Folders */}
            <RootFolders onSelectFolder={onSelectFolder} />
        </div>
    )
}

function RootFolders({ onSelectFolder }: { onSelectFolder: (id: string | null) => void }) {
    const rootFolders = useChildFolders(null)

    return (
        <div className="space-y-0.5">
            {rootFolders.map(folder => (
                <FolderNode
                    key={folder.id}
                    folder={folder}
                    depth={0}
                    onSelectFolder={onSelectFolder}
                />
            ))}
        </div>
    )
}

interface FolderNodeProps {
    folder: BookmarkFolder
    depth: number
    onSelectFolder: (id: string | null) => void
}

function FolderNode({ folder, depth, onSelectFolder }: FolderNodeProps) {
    const t = useTranslations("Bookmarks.folderTree")
    const tCard = useTranslations("Bookmarks.card")
    const { selectedFolderId, toggleFolderExpanded, deleteFolder } = useBookmarkStore()
    const childFolders = useChildFolders(folder.id)
    const bookmarkCount = useFolderBookmarkCount(folder.id)
    const hasChildren = childFolders.length > 0
    const isSelected = selectedFolderId === folder.id
    const isExpanded = folder.isExpanded
    const isMobile = useIsMobile()

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [addSubfolderOpen, setAddSubfolderOpen] = useState(false)

    const handleDelete = () => {
        deleteFolder(folder.id)
        setDeleteConfirmOpen(false)
    }

    const folderActions = (
        <>
            <DropdownMenuItem onClick={() => setAddSubfolderOpen(true)}>
                <IconFolderPlus className="h-4 w-4 mr-2" />
                {t("addSubfolder")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <IconEdit className="h-4 w-4 mr-2" />
                {t("rename")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
            >
                <IconTrash className="h-4 w-4 mr-2" />
                {tCard("delete")}
            </DropdownMenuItem>
        </>
    )

    const folderRow = (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
                "hover:bg-muted/60",
                isSelected && "bg-primary/10 text-primary font-medium hover:bg-primary/15"
            )}
            style={{ paddingLeft: `${(depth * 16) + 12}px` }}
            onClick={() => onSelectFolder(folder.id)}
        >
            {/* Expand/Collapse Arrow */}
            <button
                className={cn(
                    "h-5 w-5 flex items-center justify-center transition-transform rounded-md hover:bg-black/5 dark:hover:bg-white/5",
                    !hasChildren && "invisible"
                )}
                onClick={(e) => {
                    e.stopPropagation()
                    toggleFolderExpanded(folder.id)
                }}
            >
                <IconChevronRight
                    className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground/70",
                        isExpanded && "rotate-90 text-foreground"
                    )}
                />
            </button>

            {/* Folder Icon */}
            <div className="relative">
                {isExpanded ? (
                    <IconFolderOpen className={cn("h-4.5 w-4.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                ) : (
                    <IconFolder className={cn("h-4.5 w-4.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                )}
            </div>

            {/* Folder Name */}
            <span className="flex-1 truncate text-[14px] leading-none pt-0.5">{folder.name}</span>

            {/* Bookmark Count */}
            {bookmarkCount > 0 && (
                <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isSelected
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-background/80"
                )}>
                    {bookmarkCount}
                </span>
            )}

            {/* Mobile dots menu — always visible on touch */}
            {isMobile && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1">
                            <IconDotsVertical className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {folderActions}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </motion.div>
    )

    return (
        <>
            {isMobile ? (
                folderRow
            ) : (
                <ContextMenu>
                    <ContextMenuTrigger>{folderRow}</ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem onClick={() => setAddSubfolderOpen(true)}>
                            <IconFolderPlus className="h-4 w-4 mr-2" />
                            {t("addSubfolder")}
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => setEditDialogOpen(true)}>
                            <IconEdit className="h-4 w-4 mr-2" />
                            {t("rename")}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteConfirmOpen(true)}
                        >
                            <IconTrash className="h-4 w-4 mr-2" />
                            {tCard("delete")}
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            )}

            {/* Child Folders */}
            <AnimatePresence>
                {isExpanded && hasChildren && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {childFolders.map(child => (
                            <FolderNode
                                key={child.id}
                                folder={child}
                                depth={depth + 1}
                                onSelectFolder={onSelectFolder}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteFolderTitle", { name: folder.name })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteFolderDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tCard("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {tCard("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog */}
            <EditFolderDialog
                folder={editDialogOpen ? folder : null}
                onOpenChange={(open: boolean) => !open && setEditDialogOpen(false)}
            />

            {/* Add Subfolder Dialog */}
            <AddFolderDialog
                open={addSubfolderOpen}
                onOpenChange={setAddSubfolderOpen}
                parentFolderId={folder.id}
            />
        </>
    )
}

interface FolderItemProps {
    icon: React.ElementType
    label: string
    count?: number
    isSelected: boolean
    onClick: () => void
}

function FolderItem({ icon: Icon, label, count, isSelected, onClick }: FolderItemProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
                "hover:bg-muted/60",
                isSelected && "bg-primary/10 text-primary font-medium hover:bg-primary/15"
            )}
            onClick={onClick}
        >
            <Icon className={cn("h-4.5 w-4.5", isSelected ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 text-[14px] leading-none pt-0.5">{label}</span>
            {count !== undefined && count > 0 && (
                <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isSelected
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground group-hover:bg-background/80"
                )}>
                    {count}
                </span>
            )}
        </div>
    )
}

