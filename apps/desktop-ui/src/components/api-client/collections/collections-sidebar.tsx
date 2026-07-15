"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collection, CollectionRequest } from "../types"
import { CollectionItem } from "./collection-item"
import { FolderPlus, Trash2, Pencil, MoreHorizontal, Search, X, FileDown, Play, Server, Link2, Globe, PanelRightClose } from "lucide-react"
import { buildShareUrl } from "@/lib/share-link"
import { backendFetch } from "@/lib/backend-auth"
import { toast } from "sonner"
import { downloadCollectionAsPostman } from "@/lib/export/postman"
import { downloadCollectionAsOpenApi } from "@/lib/export/openapi"
import { downloadCollectionAsHar } from "@/lib/export/har"
import { downloadCollectionAsInsomnia } from "@/lib/export/insomnia"
import { CollectionRunnerDialog } from "../collection-runner-dialog"
import { useWorkspacesContext } from "../context/workspaces-context"
import { WorkspacesDialog } from "../workspaces-dialog"
import { Briefcase } from "lucide-react"
import { FolderDefaultsDialog } from "../folder-defaults-dialog"
import type { CollectionFolder } from "../types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { VirtualHistoryList } from "./virtual-history-list"
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
import { useCollectionsState, useCollectionsActions } from "../context/collections-context"
import { useHistoryState, useHistoryActions } from "../context/history-context"
import { CollectionsSidebarSkeleton, HistoryListSkeleton } from "../skeletons"
import { useDebouncedValue } from "@/lib/use-debounced-value"

interface CollectionsSidebarProps {
    onLoadRequest: (request: CollectionRequest) => void
    onCollapse?: () => void
}

export function CollectionsSidebar({
    onLoadRequest,
    onCollapse,
}: CollectionsSidebarProps) {
    const { collections, isLoading } = useCollectionsState()
    const { addFolder: onAddFolder, deleteItem: onDelete, toggleFolder: onToggle, createCollection: onCreateCollection, renameCollection: onRenameCollection, renameFolder: onRenameFolder, patchFolder, deleteMultipleCollections: onDeleteMultiple } = useCollectionsActions()
    const { history, isLoading: isHistoryLoading } = useHistoryState()
    const { clearHistory: onClearHistory, deleteHistoryItem: onDeleteHistoryItem } = useHistoryActions()
    const t = useTranslations("ApiClient.collectionsSidebar")
    const tRoot = useTranslations("ApiClient")
    const [historySearch, setHistorySearch] = React.useState("")

    const debouncedSearch = useDebouncedValue(historySearch, 200)

    const filteredHistory = React.useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase()
        if (!q) return history
        return history.filter(item =>
            item.url?.toLowerCase().includes(q) ||
            item.name?.toLowerCase().includes(q) ||
            item.method?.toLowerCase().includes(q)
        )
    }, [history, debouncedSearch])

    // FixedSizeList virtualizes overflow; all filtered items are passed directly.
    const visibleHistory = filteredHistory

    // Measure the flex container height so FixedSizeList fills it exactly.
    const historyListContainerRef = React.useRef<HTMLDivElement>(null)
    const [historyListHeight, setHistoryListHeight] = React.useState(400)
    React.useEffect(() => {
        const el = historyListContainerRef.current
        if (!el) return
        const obs = new ResizeObserver(([entry]) => {
            if (entry) setHistoryListHeight(entry.contentRect.height)
        })
        obs.observe(el)
        // Set initial height
        setHistoryListHeight(el.clientHeight || 400)
        return () => obs.disconnect()
    }, [])

    const [newFolderDialogOpen, setNewFolderDialogOpen] = React.useState(false)
    const [newCollectionDialogOpen, setNewCollectionDialogOpen] = React.useState(false)
    const [renameCollectionDialogOpen, setRenameCollectionDialogOpen] = React.useState(false)
    const [newFolderName, setNewFolderName] = React.useState("")
    const [newCollectionName, setNewCollectionName] = React.useState("")
    const [renameCollectionName, setRenameCollectionName] = React.useState("")
    const [targetParentId, setTargetParentId] = React.useState<string | null>(null)
    const [targetCollectionId, setTargetCollectionId] = React.useState<string | null>(null)
    const [runnerCollection, setRunnerCollection] = React.useState<Collection | null>(null)
    const [folderDefaultsTarget, setFolderDefaultsTarget] = React.useState<CollectionFolder | null>(null)
    /** "" = show all workspaces; otherwise filter collections whose `workspace` matches. */
    const [workspaceFilter, setWorkspaceFilter] = React.useState<string>("")

    const workspaceOptions = React.useMemo(() => {
        const set = new Set<string>()
        for (const c of collections) {
            if (c.workspace) set.add(c.workspace)
        }
        return Array.from(set).sort()
    }, [collections])

    const filteredCollections = React.useMemo(() => {
        if (!workspaceFilter) return collections
        return collections.filter((c) => (c.workspace ?? "") === workspaceFilter)
    }, [collections, workspaceFilter])

    // Multi-tenant filter: when an active workspace is set via the WorkspacesProvider,
    // narrow to collections referencing that workspace id. Local chip filter still composes.
    const { workspaces, activeId: activeWorkspaceId } = useWorkspacesContext()
    const [workspaceDialogOpen, setWorkspaceDialogOpen] = React.useState(false)
    const collectionsForActiveWs = React.useMemo(() => {
        if (!activeWorkspaceId) return filteredCollections
        return filteredCollections.filter((c) => c.workspace === activeWorkspaceId)
    }, [filteredCollections, activeWorkspaceId])

    const activeWorkspaceName = workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? "All"
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

    const openAddFolderDialog = React.useCallback((parentId: string) => {
        setTargetParentId(parentId)
        setNewFolderDialogOpen(true)
    }, [])

    const openRenameCollectionDialog = React.useCallback((collection: Collection) => {
        setTargetCollectionId(collection.id)
        setRenameCollectionName(collection.name)
        setRenameCollectionDialogOpen(true)
    }, [])

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
                            {onCollapse && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={onCollapse}
                                    title={tRoot("layout.closeSidebar")}
                                >
                                    <PanelRightClose className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="px-3 pb-1">
                        <button
                            className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-md border bg-card hover:bg-muted/50"
                            onClick={() => setWorkspaceDialogOpen(true)}
                        >
                            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Workspace</span>
                            <span className="flex-1 truncate text-left">{activeWorkspaceName}</span>
                        </button>
                    </div>
                    {workspaceOptions.length > 0 && (
                        <div className="px-3 pb-2 flex items-center gap-1.5 overflow-x-auto">
                            <button
                                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${workspaceFilter === "" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
                                onClick={() => setWorkspaceFilter("")}
                            >
                                All
                            </button>
                            {workspaceOptions.map((ws) => (
                                <button
                                    key={ws}
                                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${workspaceFilter === ws ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
                                    onClick={() => setWorkspaceFilter(ws)}
                                >
                                    {ws}
                                </button>
                            ))}
                        </div>
                    )}
                    <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-lg">
                        <TabsTrigger value="collections" className="rounded-md text-xs font-medium">{t("tabCollections")}</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-md text-xs font-medium">{t("tabHistory")}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="collections" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden outline-none">
                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            {isLoading && collections.length === 0 ? (
                                <CollectionsSidebarSkeleton />
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
                                collectionsForActiveWs.map((collection) => (
                                    <div key={collection.id} className="mb-4">
                                        <div className="flex items-center justify-between px-2 py-1.5 mb-1 group rounded-md hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="flex items-center">
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
                                                            onClick={async () => {
                                                                if (typeof window === "undefined") return
                                                                if (workspaces.length === 0) {
                                                                    toast.error("Create a workspace first (sidebar → Workspace bar)")
                                                                    return
                                                                }
                                                                const options = workspaces
                                                                    .map((w, i) => `${i + 1}: ${w.name}`)
                                                                    .join("\n")
                                                                const choice = window.prompt(
                                                                    `Move "${collection.name}" to which workspace?\n0: default (no workspace)\n${options}`,
                                                                    "0",
                                                                )
                                                                if (choice === null) return
                                                                const idx = Number(choice)
                                                                const target = idx === 0 ? null : workspaces[idx - 1]?.id ?? null
                                                                try {
                                                                    const res = await backendFetch(`/api/backend/api-client/collections/${collection.id}`, {
                                                                        method: "PATCH",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ workspace: target }),
                                                                    })
                                                                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                                                                    toast.success("Workspace updated. Reload to see filter.")
                                                                } catch (e) {
                                                                    toast.error((e as Error).message)
                                                                }
                                                            }}
                                                        >
                                                            <FolderPlus className="h-4 w-4 mr-2" />
                                                            Set workspace…
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setRunnerCollection(collection)}>
                                                            <Play className="h-4 w-4 mr-2" />
                                                            Run collection
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                if (typeof window === "undefined") return
                                                                const baseUrl = `${window.location.origin}/api/mock/${collection.id}/`
                                                                try {
                                                                    await navigator.clipboard.writeText(baseUrl)
                                                                    toast.success("Mock URL copied — append the request path to invoke")
                                                                } catch {
                                                                    toast.error("Could not copy to clipboard")
                                                                }
                                                            }}
                                                        >
                                                            <Server className="h-4 w-4 mr-2" />
                                                            Copy mock URL
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                if (typeof window === "undefined") return
                                                                try {
                                                                    const url = await buildShareUrl(window.location.origin, collection)
                                                                    await navigator.clipboard.writeText(url)
                                                                    toast.success("Share link copied — recipient sees a read-only snapshot")
                                                                } catch (e) {
                                                                    toast.error((e as Error).message)
                                                                }
                                                            }}
                                                        >
                                                            <Link2 className="h-4 w-4 mr-2" />
                                                            Copy share link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                if (typeof window === "undefined") return
                                                                try {
                                                                    const res = await backendFetch("/api/backend/api-client/public-mocks", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            collection_id: collection.id,
                                                                            name: collection.name,
                                                                            items: collection.items,
                                                                        }),
                                                                    })
                                                                    if (!res.ok) throw new Error(`Publish failed: ${res.status}`)
                                                                    const data = await res.json() as { mock_id: string }
                                                                    const baseUrl = `${window.location.origin}/api/mock/public/${data.mock_id}/`
                                                                    await navigator.clipboard.writeText(baseUrl)
                                                                    toast.success("Public mock URL copied — anyone with the link can call it")
                                                                } catch (e) {
                                                                    toast.error((e as Error).message)
                                                                }
                                                            }}
                                                        >
                                                            <Globe className="h-4 w-4 mr-2" />
                                                            Publish as public mock
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => downloadCollectionAsPostman(collection)}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (Postman v2.1)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => downloadCollectionAsOpenApi(collection)}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (OpenAPI 3.0)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => downloadCollectionAsHar(collection)}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (HAR 1.2)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => downloadCollectionAsInsomnia(collection)}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (Insomnia v4)
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
                                                    onEditFolderDefaults={setFolderDefaultsTarget}
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
                    <div className="flex-1 overflow-hidden" ref={historyListContainerRef}>
                        {isHistoryLoading && history.length === 0 ? (
                            <HistoryListSkeleton />
                        ) : !history.length ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <FolderPlus className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium">{t("noHistoryTitle")}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t("noHistoryHint")}</p>
                            </div>
                        ) : !!history.length && historySearch && !filteredHistory.length ? (
                            <div className="text-xs text-muted-foreground text-center py-6">No results for &quot;{historySearch}&quot;</div>
                        ) : (
                            <VirtualHistoryList
                                items={visibleHistory}
                                height={historyListHeight}
                                onSelect={onLoadRequest}
                                onDelete={onDeleteHistoryItem}
                                renderRow={(item, style) => (
                                    <div key={item.id} style={style} className="px-2 py-0.5">
                                        <div
                                            className="group flex flex-col p-2.5 hover:bg-muted/60 rounded-lg cursor-pointer transition-all duration-200 text-sm h-full"
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
                                                        onDeleteHistoryItem(item.id)
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
                                    </div>
                                )}
                            />
                        )}
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
            <CollectionRunnerDialog
                open={runnerCollection !== null}
                onOpenChange={(o) => { if (!o) setRunnerCollection(null) }}
                collection={runnerCollection}
            />
            <WorkspacesDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
            <FolderDefaultsDialog
                open={folderDefaultsTarget !== null}
                onOpenChange={(o) => { if (!o) setFolderDefaultsTarget(null) }}
                folder={folderDefaultsTarget}
                onSave={(patch) => {
                    if (folderDefaultsTarget) {
                        void patchFolder(folderDefaultsTarget.id, patch)
                    }
                }}
            />
        </div>
    )
}
