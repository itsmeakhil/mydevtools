"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, Folder, MoreHorizontal, Trash2, FolderPlus, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
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
}

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
        prev.onLoadRequest === next.onLoadRequest
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
}: CollectionItemProps) {
    const t = useTranslations("ApiClient.collectionItem")
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

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center gap-2 h-8 pr-1.5 text-[13px] hover:bg-foreground/[0.05] rounded-lg select-none transition-colors"
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
                                        Folder defaults
                                    </DropdownMenuItem>
                                )}
                            </>
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
