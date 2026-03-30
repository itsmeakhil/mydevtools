"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collection, CollectionFolder, CollectionRequest, HistoryRequest } from "../types"
import { CollectionItem } from "./collection-item"
import { FolderPlus, ChevronRight, ChevronLeft, Trash2, Pencil, MoreHorizontal } from "lucide-react"
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
    onAddFolder: (parentId: string, name: string) => void
    onDelete: (id: string) => void
    onToggle: (id: string) => void
    onLoadRequest: (request: CollectionRequest) => void
    onCreateCollection: (name: string) => void
    onRenameCollection: (id: string, name: string) => void
    history?: HistoryRequest[]
    onClearHistory?: () => void
    onDeleteHistoryItem?: (id: string) => void
}

export function CollectionsSidebar({
    collections,
    onAddFolder,
    onDelete,
    onToggle,
    onLoadRequest,
    onCreateCollection,
    onRenameCollection,
    history,
    onClearHistory,
    onDeleteHistoryItem,
}: CollectionsSidebarProps) {
    const t = useTranslations("ApiClient.collectionsSidebar")
    const tRoot = useTranslations("ApiClient")
    const [collapsed, setCollapsed] = React.useState(false)
    const [newFolderDialogOpen, setNewFolderDialogOpen] = React.useState(false)
    const [newCollectionDialogOpen, setNewCollectionDialogOpen] = React.useState(false)
    const [renameCollectionDialogOpen, setRenameCollectionDialogOpen] = React.useState(false)
    const [newFolderName, setNewFolderName] = React.useState("")
    const [newCollectionName, setNewCollectionName] = React.useState("")
    const [renameCollectionName, setRenameCollectionName] = React.useState("")
    const [targetParentId, setTargetParentId] = React.useState<string | null>(null)
    const [targetCollectionId, setTargetCollectionId] = React.useState<string | null>(null)

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

    return (
        <div className="flex flex-col w-full h-full bg-background/50">
            <Tabs defaultValue="collections" className="flex-1 flex flex-col h-full min-h-0">
                <div className="px-4 py-3 border-b flex flex-col gap-3 shrink-0 bg-card/40 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm tracking-tight">{t("title")}</h3>
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
                    <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-lg">
                        <TabsTrigger value="collections" className="rounded-md text-xs font-medium">{t("tabCollections")}</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-md text-xs font-medium">{t("tabHistory")}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="collections" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden outline-none">
                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            {collections.length === 0 ? (
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
                                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate flex-1 mr-2 px-1">
                                                {collection.name}
                                            </span>
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
                    <ScrollArea className="flex-1">
                        <div className="p-2 space-y-1">
                            {history?.map((item) => (
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
                                                    item.status >= 200 && item.status < 300 ? "text-green-500" : "text-destructive"
                                                )}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!history?.length && (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                        <FolderPlus className="h-5 w-5 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-sm font-medium">{t("noHistoryTitle")}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{t("noHistoryHint")}</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
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
        </div>
    )
}
