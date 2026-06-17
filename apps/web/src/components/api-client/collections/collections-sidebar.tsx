"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collection, CollectionFolder, CollectionRequest, HistoryRequest } from "../types"
import { CollectionItem } from "./collection-item"
import { FolderPlus, Trash2, Pencil, MoreHorizontal, Search, X, Loader2 } from "lucide-react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from "next-intl"
import { getApiClientRequestDisplayName } from "../display-name"

interface CollectionsSidebarProps {
    collections: Collection[]
    isLoading?: boolean
    onAddFolder: (parentId: string, name: string) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
    onLoadRequest: (request: CollectionRequest) => void
    onCreateCollection: (name: string) => void
    onRenameCollection: (id: string, name: string) => void
    onRenameFolder?: (folderId: string, newName: string) => void
    history?: HistoryRequest[]
    onClearHistory?: () => void
    onDeleteHistoryItem?: (id: string) => void
    onDeleteMultiple?: (ids: string[]) => void
}

export function CollectionsSidebar({
    collections,
    isLoading,
    onAddFolder,
    onDelete,
    onToggle,
    onLoadRequest,
    onCreateCollection,
    onRenameCollection,
    onRenameFolder,
    history,
    onClearHistory,
    onDeleteHistoryItem,
    onDeleteMultiple,
}: CollectionsSidebarProps) {
    const t = useTranslations("ApiClient.collectionsSidebar")
    const tRoot = useTranslations("ApiClient")
    const [historySearch, setHistorySearch] = React.useState("")

    const filteredHistory = React.useMemo(() => {
        if (!history) return []
        if (!historySearch.trim()) return history
        const q = historySearch.toLowerCase()
        return history.filter(item =>
            item.url?.toLowerCase().includes(q) ||
            item.name?.toLowerCase().includes(q) ||
            item.method?.toLowerCase().includes(q)
        )
    }, [history, historySearch])

    const historyScrollRef = React.useRef<HTMLDivElement>(null)
    const { displayCount: historyDisplayCount, sentinelRef: historySentinelRef, hasMore: historyHasMore } = useInfiniteScroll({
        totalCount: filteredHistory.length,
        resetKey: historySearch,
        pageSize: 30,
        scrollContainerRef: historyScrollRef,
    })
    const visibleHistory = filteredHistory.slice(0, historyDisplayCount)
    const [newFolderDialogOpen, setNewFolderDialogOpen] = React.useState(false)
    const [newCollectionDialogOpen, setNewCollectionDialogOpen] = React.useState(false)
    const [renameCollectionDialogOpen, setRenameCollectionDialogOpen] = React.useState(false)
    const [newFolderName, setNewFolderName] = React.useState("")
    const [newCollectionName, setNewCollectionName] = React.useState("")
    const [renameCollectionName, setRenameCollectionName] = React.useState("")
    const [targetParentId, setTargetParentId] = React.useState<string | null>(null)
    const [targetCollectionId, setTargetCollectionId] = React.useState<string | null>(null)
    const [selectedCollections, setSelectedCollections] = React.useState<Set<string>>(new Set())
    const [deleteBulkDialogOpen, setDeleteBulkDialogOpen] = React.useState(false)
    const [isDeleting, setIsDeleting] = React.useState(false)

    const handleAddFolder = () => {
        if (newFolderName && targetParentId) {
            onAddFolder(targetParentId, newFolderName)
            setNewFolderDialogOpen(false)
            setNewFolderName("")
            setTargetParentId(null)
        }
    }

    const handleCreateCollection = () => {
        if (newCollectionName) {
            onCreateCollection(newCollectionName)
            setNewCollectionDialogOpen(false)
            setNewCollectionName("")
        }
    }

    const handleRenameCollection = () => {
        if (renameCollectionName && targetCollectionId) {
            onRenameCollection(targetCollectionId, renameCollectionName)
            setRenameCollectionDialogOpen(false)
            setRenameCollectionName("")
            setTargetCollectionId(null)
        }
    }

    const openAddFolderDialog = (parentId: string) => {
        setTargetParentId(parentId)
        setNewFolderDialogOpen(true)
    }

    const openRenameCollectionDialog = (collection: Collection) => {
        setTargetCollectionId(collection.id)
        setRenameCollectionName(collection.name)
        setRenameCollectionDialogOpen(true)
    }

    const toggleCollectionSelection = (collectionId: string) => {
        setSelectedCollections(prev => {
            const next = new Set(prev)
            if (next.has(collectionId)) {
                next.delete(collectionId)
            } else {
                next.add(collectionId)
            }
            return next
        })
    }

    const clearSelection = () => {
        setSelectedCollections(new Set())
    }

    return (
        <div className="flex flex-col w-full h-full bg-background/50">
            <Tabs defaultValue="collections" className="flex-1 flex flex-col h-full min-h-0">
                <div className="px-4 py-3 border-b flex flex-col gap-3 shrink-0 bg-card/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm tracking-tight">{t("title")}</h3>
                        <div className="flex items-center gap-2">
                            {selectedCollections.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 px-3 rounded-lg text-xs font-medium gap-2"
                                    onClick={() => setDeleteBulkDialogOpen(true)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete ({selectedCollections.size})
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => setNewCollectionDialogOpen(true)}
                                title={t("newCollection")}
                            >
                                <FolderPlus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-lg">
                        <TabsTrigger value="collections" className="rounded-md text-xs font-medium">{t("tabCollections")}</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-md text-xs font-medium">{t("tabHistory")}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="collections" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden outline-none">
                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            {isLoading ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                                </div>
                            ) : collections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-muted/30 mx-2 mt-4">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                        <FolderPlus className="h-5 w-5 text-primary" />
                                    </div>
                                    <h4 className="font-medium text-sm">{t("noCollectionsTitle")}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                                        {t("noCollectionsHint")}
                                    </p>
                                    <Button size="sm" onClick={() => setNewCollectionDialogOpen(true)}>
                                        {t("createCollection")}
                                    </Button>
                                </div>
                            ) : (
                                collections.map((collection) => (
                                    <div key={collection.id} className="mb-4">
                                        <div className="flex items-center justify-between px-2 py-1.5 mb-1 group rounded-md hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pointer-events-auto">
                                                    <Checkbox
                                                        checked={selectedCollections.has(collection.id)}
                                                        onCheckedChange={() => toggleCollectionSelection(collection.id)}
                                                        className="h-4 w-4"
                                                    />
                                                </div>
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate flex-1 px-1">
                                                    {collection.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded-md hover:bg-background"
                                                    onClick={() => openAddFolderDialog(collection.id)}
                                                    title={t("newFolder")}
                                                >
                                                    <FolderPlus className="h-3.5 w-3.5 text-muted-foreground" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 rounded-md hover:bg-background"
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                        <DropdownMenuItem onClick={() => openRenameCollectionDialog(collection)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            {t("rename")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => onDelete(collection.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            {t("delete")}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                        <div className="pl-1">
                                            {collection.items.map((item) => (
                                                <CollectionItem
                                                    key={item.id}
                                                    item={item}
                                                    level={0}
                                                    onToggle={onToggle}
                                                    onDelete={onDelete}
                                                    onAddFolder={openAddFolderDialog}
                                                    onLoadRequest={onLoadRequest}
                                                    onRenameFolder={onRenameFolder}
                                                />
                                            ))}
                                            {collection.items.length === 0 && (
                                                <div className="text-xs text-muted-foreground/60 px-3 py-2 italic flex items-center gap-2">
                                                    <div className="w-px h-3 bg-border/50" />
                                                    {t("emptyCollection")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="history" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden outline-none bg-muted/5">
                    <div className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-background/50 backdrop-blur-sm">
                        <span className="text-xs font-medium text-muted-foreground">{t("recentRequests")}</span>
                        <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 text-[11px] rounded-md px-2">
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            {t("clearAll")}
                        </Button>
                    </div>
                    <div className="px-3 py-2 border-b shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-muted/40 border border-border/50 rounded-md outline-none focus:border-primary/50 transition-colors"
                            />
                            {historySearch && (
                                <button
                                    onClick={() => setHistorySearch("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div ref={historyScrollRef} className="flex-1 overflow-y-auto">
                        <div className="p-2 space-y-1">
                            {visibleHistory.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="group flex flex-col p-2.5 hover:bg-muted/60 rounded-lg cursor-pointer transition-all duration-200 text-sm" 
                                    onClick={() => onLoadRequest(item)}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span 
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm tracking-wide shrink-0",
                                                    item.method === "GET" && "bg-blue-500/10 text-blue-500",
                                                    item.method === "POST" && "bg-green-500/10 text-green-500",
                                                    item.method === "PUT" && "bg-orange-500/10 text-orange-500",
                                                    item.method === "DELETE" && "bg-red-500/10 text-red-500",
                                                    item.method === "PATCH" && "bg-yellow-500/10 text-yellow-600",
                                                    (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(item.method)) && "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {item.method}
                                            </span>
                                            <span className="font-medium text-xs truncate max-w-[150px]">
                                                {item.name ? getApiClientRequestDisplayName(item.name, tRoot) : item.url}
                                            </span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0" 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteHistoryItem?.(item.id)
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pl-1">
                                        <span className="truncate max-w-[160px]">{item.url}</span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            {item.status && (
                                                <span className={cn(
                                                    "font-medium",
                                                    item.status >= 200 && item.status < 300 ? "text-green-500"
                                                        : item.status >= 300 && item.status < 400 ? "text-amber-500"
                                                        : "text-destructive"
                                                )}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {historyHasMore && (
                                <div ref={historySentinelRef} className="flex justify-center py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                                </div>
                            )}
                            {!history?.length && (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <FolderPlus className="h-5 w-5 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-sm font-medium">{t("noHistoryTitle")}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{t("noHistoryHint")}</p>
                                </div>
                            )}
                            {!!history?.length && historySearch && !filteredHistory.length && (
                                <div className="text-xs text-muted-foreground text-center py-6">No results for &quot;{historySearch}&quot;</div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("dialogNewFolderTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dialogNewFolderDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="folder-name">{t("labelFolderName")}</Label>
                            <Input
                                id="folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder={t("placeholderFolderName")}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddFolder()
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddFolder}>{t("createFolder")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={newCollectionDialogOpen} onOpenChange={setNewCollectionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("dialogNewCollectionTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dialogNewCollectionDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="collection-name">{t("labelCollectionName")}</Label>
                            <Input
                                id="collection-name"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder={t("placeholderCollectionName")}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateCollection()
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateCollection}>{t("createCollection")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={renameCollectionDialogOpen} onOpenChange={setRenameCollectionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("dialogRenameCollectionTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dialogRenameCollectionDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rename-collection-name">{t("labelCollectionName")}</Label>
                            <Input
                                id="rename-collection-name"
                                value={renameCollectionName}
                                onChange={(e) => setRenameCollectionName(e.target.value)}
                                placeholder={t("placeholderRenameCollection")}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameCollection()
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleRenameCollection}>{t("renameAction")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteBulkDialogOpen} onOpenChange={setDeleteBulkDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{t("dialogDeleteBulkTitle") || "Delete Collections"}</DialogTitle>
                        <DialogDescription>
                            {t("dialogDeleteBulkDescription") || "This action cannot be undone. The following collections will be permanently deleted:"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {Array.from(selectedCollections).map(collectionId => {
                                const collection = collections.find(c => c.id === collectionId)
                                return (
                                    <div key={collectionId} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border/50">
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-medium truncate">{collection?.name || "Unknown"}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteBulkDialogOpen(false)}>
                            {t("cancel") || "Cancel"}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={async () => {
                                setIsDeleting(true)
                                try {
                                    await onDeleteMultiple?.(Array.from(selectedCollections))
                                    // Only close dialog and clear selection on successful deletion
                                    setDeleteBulkDialogOpen(false)
                                    clearSelection()
                                } catch (error) {
                                    // Keep dialog open if deletion failed so user can retry
                                    console.error("Error deleting collections:", error)
                                } finally {
                                    setIsDeleting(false)
                                }
                            }}
                        >
                            {isDeleting ? "Deleting..." : (t("delete") || "Delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
