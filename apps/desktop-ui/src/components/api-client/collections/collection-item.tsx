"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Folder, MoreHorizontal, Trash2, FolderPlus, Pencil, Copy, FolderInput } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DropPosition } from "@/lib/api-client/collection-tree"
import { CollectionFolder, CollectionRequest } from "../types"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { getApiClientRequestDisplayName } from "../display-name"

interface CollectionItemProps {
    item: CollectionFolder | CollectionRequest
    level: number
    onToggle: (id: string) => void
    onDelete: (id: string) => void
    onAddFolder: (parentId: string) => void
    onLoadRequest: (request: CollectionRequest) => void
    onRenameFolder?: (folderId: string, newName: string) => void
    onEditFolderDefaults?: (folder: CollectionFolder) => void
    onDuplicate?: (item: CollectionFolder | CollectionRequest) => void
    /** Keyboard path for moving (opens the "Move to…" dialog). */
    onMoveTo?: (item: CollectionFolder | CollectionRequest) => void
    /** Drag/drop: undefined disables dragging (e.g. while the tree is filtered). */
    onDropItem?: (draggedId: string, target: { itemId: string; position: DropPosition }) => void
}

/** Drag payload type — only our rows are accepted as drops. */
export const TREE_DRAG_MIME = "application/x-mydevtools-tree-item"

function arePropsEqual(prev: CollectionItemProps, next: CollectionItemProps) {
    return (
        prev.level === next.level &&
        prev.item.id === next.item.id &&
        prev.item.name === next.item.name &&
        prev.item === next.item &&
        prev.onToggle === next.onToggle &&
        prev.onDelete === next.onDelete &&
        prev.onRenameFolder === next.onRenameFolder &&
        prev.onAddFolder === next.onAddFolder &&
        prev.onLoadRequest === next.onLoadRequest &&
        prev.onDuplicate === next.onDuplicate &&
        prev.onMoveTo === next.onMoveTo &&
        prev.onDropItem === next.onDropItem
    )
}

function CollectionItemImpl({
    item,
    level,
    onToggle,
    onDelete,
    onAddFolder,
    onLoadRequest,
    onRenameFolder,
    onEditFolderDefaults,
    onDuplicate,
    onMoveTo,
    onDropItem,
}: CollectionItemProps) {
    const t = useTranslations("ApiClient.collectionItem")
    const tActions = useTranslations("ApiClient.collectionActions")
    const tRoot = useTranslations("ApiClient")
    const isFolder = "type" in item && item.type === "folder"
    const paddingLeft = `${level * 12 + 12}px`

    const [isRenaming, setIsRenaming] = React.useState(false)
    const [renameValue, setRenameValue] = React.useState("")
    const renameInputRef = React.useRef<HTMLInputElement>(null)

    const startRename = () => {
        setRenameValue(item.name)
        setIsRenaming(true)
        setTimeout(() => renameInputRef.current?.select(), 0)
    }

    const commitRename = () => {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== item.name && onRenameFolder) {
            onRenameFolder(item.id, trimmed)
        }
        setIsRenaming(false)
    }

    const [dropHint, setDropHint] = React.useState<DropPosition | null>(null)
    /** Folders: top/bottom quarter = before/after, middle = inside. Requests: top/bottom half. */
    const positionAt = (e: React.DragEvent<HTMLDivElement>): DropPosition => {
        const r = e.currentTarget.getBoundingClientRect()
        const f = (e.clientY - r.top) / r.height
        if (!isFolder) return f < 0.5 ? "before" : "after"
        return f < 0.25 ? "before" : f > 0.75 ? "after" : "inside"
    }
    const dnd = onDropItem && !isRenaming ? {
        draggable: true,
        onDragStart: (e: React.DragEvent<HTMLDivElement>) => {
            e.dataTransfer.setData(TREE_DRAG_MIME, item.id)
            e.dataTransfer.effectAllowed = "move"
        },
        onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.dataTransfer.types.includes(TREE_DRAG_MIME)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
            const pos = positionAt(e)
            if (pos !== dropHint) setDropHint(pos)
        },
        onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropHint(null)
        },
        onDrop: (e: React.DragEvent<HTMLDivElement>) => {
            const draggedId = e.dataTransfer.getData(TREE_DRAG_MIME)
            setDropHint(null)
            if (!draggedId) return
            e.preventDefault()
            onDropItem(draggedId, { itemId: item.id, position: positionAt(e) })
        },
    } : {}

    return (
        <div>
            <div
                {...dnd}
                className={cn(
                    "group relative flex items-center gap-2 h-8 pr-1.5 text-[13px] hover:bg-foreground/[0.05] rounded-lg select-none transition-colors",
                    dropHint === "inside" && "bg-primary/10 ring-1 ring-inset ring-primary/40",
                )}
                style={{ paddingLeft }}
                onClick={() => {
                    if (isRenaming) return
                    if (isFolder) {
                        onToggle(item.id)
                    } else {
                        onLoadRequest(item as CollectionRequest)
                    }
                }}
            >
                {(dropHint === "before" || dropHint === "after") && (
                    <span
                        aria-hidden
                        className={cn("pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-primary", dropHint === "before" ? "top-0" : "bottom-0")}
                    />
                )}
                {isFolder ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        )}
                        <Folder className="h-4 w-4 shrink-0 text-primary/80 fill-primary/15" />
                        {isRenaming ? (
                            <input
                                ref={renameInputRef}
                                className="flex-1 text-[13px] bg-transparent border-b border-primary outline-none min-w-0 text-foreground"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") commitRename()
                                    if (e.key === "Escape") setIsRenaming(false)
                                    e.stopPropagation()
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span className="truncate font-medium text-foreground">{item.name}</span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={cn(
                            "text-[10px] font-semibold shrink-0 w-[42px] tabular-nums",
                            (item as CollectionRequest).method === "GET" && "text-sky-500",
                            (item as CollectionRequest).method === "POST" && "text-emerald-500",
                            (item as CollectionRequest).method === "PUT" && "text-amber-500",
                            (item as CollectionRequest).method === "DELETE" && "text-rose-500",
                            (item as CollectionRequest).method === "PATCH" && "text-yellow-600",
                            (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes((item as CollectionRequest).method)) && "text-muted-foreground"
                        )}>
                            {(item as CollectionRequest).method}
                        </span>
                        <span className="truncate text-foreground/90">
                            {getApiClientRequestDisplayName((item as CollectionRequest).name, tRoot)}
                        </span>
                    </div>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 hover:bg-foreground/[0.06] shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {isFolder && (
                            <>
                                <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation()
                                    onAddFolder(item.id)
                                }}>
                                    <FolderPlus className="h-4 w-4 mr-2" />
                                    {t("newFolder")}
                                </DropdownMenuItem>
                                {onRenameFolder && (
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation()
                                        startRename()
                                    }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Rename
                                    </DropdownMenuItem>
                                )}
                                {onEditFolderDefaults && (
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation()
                                        onEditFolderDefaults(item as CollectionFolder)
                                    }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        {tRoot("collectionDefaults.folderMenu")}
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
                        {onDuplicate && (
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                onDuplicate(item)
                            }}>
                                <Copy className="h-4 w-4 mr-2" />
                                {tActions("duplicate")}
                            </DropdownMenuItem>
                        )}
                        {onMoveTo && (
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation()
                                onMoveTo(item)
                            }}>
                                <FolderInput className="h-4 w-4 mr-2" />
                                {tActions("moveTo")}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(item.id)
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("delete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {isFolder && (item as CollectionFolder).isOpen && (
                <div className="relative">
                    <div
                        className="absolute left-0 top-0 bottom-0 w-px bg-border"
                        style={{ marginLeft: `${Number(paddingLeft.replace('px','')) + 6}px` }}
                    />
                    <div className="py-0.5">
                        {(item as CollectionFolder).items.map((child) => (
                            <CollectionItem
                                key={child.id}
                                item={child}
                                level={level + 1}
                                onToggle={onToggle}
                                onDelete={onDelete}
                                onAddFolder={onAddFolder}
                                onLoadRequest={onLoadRequest}
                                onRenameFolder={onRenameFolder}
                                onEditFolderDefaults={onEditFolderDefaults}
                                onDuplicate={onDuplicate}
                                onMoveTo={onMoveTo}
                                onDropItem={onDropItem}
                            />
                        ))}
                        {(item as CollectionFolder).items.length === 0 && (
                            <div className="text-xs text-muted-foreground/70 py-1.5" style={{ paddingLeft: `${(level + 1) * 12 + 32}px` }}>
                                {t("emptyFolder")}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export const CollectionItem = React.memo(CollectionItemImpl, arePropsEqual)
