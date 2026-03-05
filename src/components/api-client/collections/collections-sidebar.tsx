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
        <div
            className={cn(
                "border-l bg-muted/10 flex flex-col transition-all duration-300 ease-in-out relative",
                collapsed ? "w-[0px]" : "w-[300px]"
            )}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute -left-3 top-2 h-6 w-6 rounded-full border bg-background shadow-sm z-10"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            <div className={cn("flex-1 flex flex-col min-w-[300px] h-full", collapsed && "invisible")}>
                <Tabs defaultValue="collections" className="flex-1 flex flex-col h-full min-h-0">
                    <div className="p-4 border-b flex flex-col gap-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Sidebar</h3>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewCollectionDialogOpen(true)} title="New Collection">
                                <FolderPlus className="h-4 w-4" />
                            </Button>
                        </div>
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="collections">Collections</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="collections" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
                        <ScrollArea className="flex-1">
                            <div className="p-2">
                                {collections.map((collection) => (
                                    <div key={collection.id} className="mb-4">
                                        <div className="flex items-center justify-between px-2 py-1 mb-1 group">
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate flex-1 mr-2">
                                                {collection.name}
                                            </span>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={() => openAddFolderDialog(collection.id)}
                                                >
                                                    <FolderPlus className="h-3 w-3" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5 w-5"
                                                        >
                                                            <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => openRenameCollectionDialog(collection)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={() => onDelete(collection.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
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
                                            <div className="text-xs text-muted-foreground px-2 italic">
                                                No items
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="history" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden">
                        <div className="flex items-center justify-end p-2 border-b shrink-0">
                            <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-destructive h-8 text-xs">
                                <Trash2 className="h-3 w-3 mr-2" />
                                Clear All
                            </Button>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 flex flex-col gap-1">
                                {history?.map((item) => (
                                    <div key={item.id} className="group flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer border border-transparent hover:border-border transition-colors text-sm" onClick={() => onLoadRequest(item)}>
                                        <div className="flex flex-col min-w-0 flex-1 mr-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs font-bold", item.method === "GET" ? "text-green-500" : item.method === "POST" ? "text-yellow-500" : item.method === "PUT" ? "text-blue-500" : item.method === "DELETE" ? "text-red-500" : "text-muted-foreground")}>{item.method}</span>
                                                <span className="font-medium truncate">{item.name || item.url}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                                                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                                {item.status && <span className={item.status >= 200 && item.status < 300 ? "text-green-500" : "text-destructive"}>{item.status}</span>}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteHistoryItem?.(item.id)
                                            }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {!history?.length && (
                                    <div className="text-center p-4 text-sm text-muted-foreground italic">No history yet</div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New Folder</DialogTitle>
                        <DialogDescription>
                            Create a new folder to organize your requests.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="folder-name">Folder Name</Label>
                            <Input
                                id="folder-name"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="My Folder"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddFolder}>Create Folder</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={newCollectionDialogOpen} onOpenChange={setNewCollectionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>New Collection</DialogTitle>
                        <DialogDescription>
                            Create a new top-level collection.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="collection-name">Collection Name</Label>
                            <Input
                                id="collection-name"
                                value={newCollectionName}
                                onChange={(e) => setNewCollectionName(e.target.value)}
                                placeholder="My Collection"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCreateCollection}>Create Collection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={renameCollectionDialogOpen} onOpenChange={setRenameCollectionDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Collection</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the collection.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rename-collection-name">Collection Name</Label>
                            <Input
                                id="rename-collection-name"
                                value={renameCollectionName}
                                onChange={(e) => setRenameCollectionName(e.target.value)}
                                placeholder="Collection Name"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleRenameCollection}>Rename</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
