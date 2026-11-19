"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collection, CollectionRequest } from "../types"
import { CollectionItem, TREE_DRAG_MIME } from "./collection-item"
import { FolderPlus, FolderGit2, Trash2, Pencil, MoreHorizontal, Search, X, FileDown, Play, Server, Link2, Globe, Copy, Settings2, Lock, BookOpen } from "lucide-react"
import { filterTree, moveDestinations, resolveDrop, type DropPosition } from "@/lib/api-client/collection-tree"
import { buildShareUrl } from "@/lib/share-link"
import { apiFetch } from "@/lib/desktop/api-fetch"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import type { HistoryRequest } from "../types"
// Runner (+ csv/junit libs) only loads when a run is opened.
const CollectionRunnerDialog = dynamic(
    () => import("../collection-runner-dialog").then((m) => ({ default: m.CollectionRunnerDialog })),
    { ssr: false, loading: () => null },
)
const MockServerDialog = dynamic(
    () => import("../mock-server-dialog").then((m) => ({ default: m.MockServerDialog })),
    { ssr: false, loading: () => null },
)
import { useWorkspacesContext } from "../context/workspaces-context"
import { WorkspacesDialog } from "../workspaces-dialog"
import { Briefcase } from "lucide-react"
import { FolderDefaultsDialog, type DefaultsTarget } from "../folder-defaults-dialog"
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
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from "next-intl"
import { getApiClientRequestDisplayName } from "../display-name"
import { useCollectionsState, useCollectionsActions } from "../context/collections-context"
import { useHistoryState, useHistoryActions } from "../context/history-context"
import { CollectionsSidebarSkeleton, HistoryListSkeleton } from "../skeletons"
import { useDebouncedValue } from "@/lib/use-debounced-value"
import { isDesktop } from "@/lib/desktop/is-desktop"
import { ToolSidebarActions, useToolSidebarPanel, useToolSidebarRail } from "@/components/tools/tool-sidebar"

interface CollectionsSidebarProps {
    onLoadRequest: (request: CollectionRequest) => void
}

// Memoized: the API client root re-renders on every keystroke, and this
// sidebar's only prop (`onLoadRequest`) is stable across them.
export const CollectionsSidebar = React.memo(CollectionsSidebarImpl)

function CollectionsSidebarImpl({ onLoadRequest: loadRequest }: CollectionsSidebarProps) {
    const panel = useToolSidebarPanel()
    // While the panel floats (mobile sheet, or the desktop flyout from the
    // collapsed rail), loading a request has to dismiss it or the loaded
    // request stays hidden behind the panel.
    const onLoadRequest = React.useCallback(
        (request: CollectionRequest) => {
            loadRequest(request)
            if (panel?.isOverlay) panel.close()
        },
        [loadRequest, panel],
    )
    const { collections, isLoading } = useCollectionsState()
    const { addFolder: onAddFolder, deleteItem: onDelete, toggleFolder: onToggle, createCollection: onCreateCollection, renameCollection: onRenameCollection, renameFolder: onRenameFolder, patchFolder, patchCollection, deleteMultipleCollections: onDeleteMultiple, openFolderCollection, duplicateItem, duplicateCollection, setCollectionWorkspace, moveItem } = useCollectionsActions()
    const tActions = useTranslations("ApiClient.collectionActions")

    // Drag/drop + "Move to…". Collections are read through a ref so these
    // callbacks stay stable and the memoized rows don't all re-render.
    const collectionsRef = React.useRef(collections)
    collectionsRef.current = collections
    const moveTo = React.useCallback(
        (draggedId: string, target: Parameters<typeof resolveDrop>[2]) => {
            const to = resolveDrop(collectionsRef.current, draggedId, target)
            if (to) void moveItem(draggedId, to, tActions("moveFailed"))
        },
        [moveItem, tActions],
    )
    const onDropItem = React.useCallback(
        (draggedId: string, target: { itemId: string; position: DropPosition }) => moveTo(draggedId, target),
        [moveTo],
    )
    const [moveSource, setMoveSource] = React.useState<Collection["items"][number] | null>(null)
    const [collectionDropTarget, setCollectionDropTarget] = React.useState<string | null>(null)

    const onDuplicateItem = React.useCallback(
        (item: Collection["items"][number]) =>
            void duplicateItem(item.id, tActions("copyName", { name: item.name }), tActions("duplicateFailed")),
        [duplicateItem, tActions],
    )

    // isDesktop() is false during SSR — gate behind a mounted flag to avoid hydration mismatch.
    const [desktop, setDesktop] = React.useState(false)
    React.useEffect(() => { setDesktop(isDesktop()) }, [])
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
    const [mockCollection, setMockCollection] = React.useState<Collection | null>(null)
    const tMock = useTranslations("ApiClient.mockServer")
    const [defaultsTarget, setDefaultsTarget] = React.useState<DefaultsTarget | null>(null)
    const editFolderDefaults = React.useCallback((item: CollectionFolder) => setDefaultsTarget({ kind: "folder", item }), [])
    const tDefaults = useTranslations("ApiClient.collectionDefaults")
    const tDocs = useTranslations("ApiClient.docs")

    // One workspace mechanism: the active workspace (WorkspacesProvider) narrows
    // to collections assigned to it; no workspace selected shows everything.
    const { workspaces, activeId: activeWorkspaceId } = useWorkspacesContext()
    const tWs = useTranslations("ApiClient.workspaces")
    const [workspaceDialogOpen, setWorkspaceDialogOpen] = React.useState(false)
    const collectionsForActiveWs = React.useMemo(() => {
        if (!activeWorkspaceId) return collections
        return collections.filter((c) => c.workspace === activeWorkspaceId)
    }, [collections, activeWorkspaceId])

    // Collections stay reachable from the collapsed rail. A collection has no
    // open/closed state of its own — only the folders inside it toggle — so
    // picking one expands the panel and scrolls that collection into view.
    useToolSidebarRail(
        "collections",
        React.useMemo(
            () =>
                collectionsForActiveWs.slice(0, 8).map((c) => ({
                    id: c.id,
                    label: c.name,
                    icon: FolderGit2,
                    count: c.items.length,
                    onSelect: () => {
                        // The panel is expanding in the same tick; wait for layout.
                        requestAnimationFrame(() =>
                            document
                                .querySelector(`[data-collection-id="${CSS.escape(c.id)}"]`)
                                ?.scrollIntoView({ block: "nearest" }),
                        )
                    },
                })),
            [collectionsForActiveWs],
        ),
    )

    // Collections search: request name / URL / method and folder names; folders on the way to a hit open.
    const [treeSearch, setTreeSearch] = React.useState("")
    const treeQuery = useDebouncedValue(treeSearch, 150).trim().toLowerCase()
    const visibleCollections = React.useMemo(() => {
        if (!treeQuery) return collectionsForActiveWs
        return collectionsForActiveWs.flatMap((c) => {
            if (c.name.toLowerCase().includes(treeQuery)) return [c]
            const items = filterTree(c.items, treeQuery)
            return items.length > 0 ? [{ ...c, items }] : []
        })
    }, [collectionsForActiveWs, treeQuery])

    const activeWorkspaceName = workspaces.find((w) => w.id === activeWorkspaceId)?.name ?? tWs("all")
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

    // Stable row renderer so VirtualHistoryList's memo holds while the request
    // editor re-renders on every keystroke.
    const renderHistoryRow = React.useCallback((item: HistoryRequest, style: React.CSSProperties) => (
        <div key={item.id} style={style} className="px-2 py-0.5">
            <div
                className="group flex flex-col justify-center gap-0.5 px-2.5 hover:bg-foreground/[0.05] rounded-lg transition-colors text-[13px] h-full"
                onClick={() => onLoadRequest(item)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                            className={cn(
                                "text-[10px] font-semibold shrink-0 w-[42px]",
                                item.method === "GET" && "text-sky-500",
                                item.method === "POST" && "text-emerald-500",
                                item.method === "PUT" && "text-amber-500",
                                item.method === "DELETE" && "text-rose-500",
                                item.method === "PATCH" && "text-yellow-600",
                                (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(item.method)) && "text-muted-foreground"
                            )}
                        >
                            {item.method}
                        </span>
                        <span className="font-medium truncate max-w-[150px]">
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
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate font-mono">{item.url}</span>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                        <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {item.status && (
                            <span className={cn(
                                "font-medium",
                                item.status >= 200 && item.status < 300 ? "text-success"
                                    : item.status >= 300 && item.status < 400 ? "text-warning"
                                    : "text-destructive"
                            )}>
                                {item.status}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ), [onLoadRequest, onDeleteHistoryItem, tRoot])

    return (
        // Header (icon, title, collapse) is owned by ToolSidebarLayout in
        // components/api-client/api-client.tsx — this renders the body only.
        <>
            <ToolSidebarActions>
                {selectedCollections.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1.5"
                        onClick={() => setDeleteBulkDialogOpen(true)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete ({selectedCollections.size})
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setNewCollectionDialogOpen(true)}
                    title={t("newCollection")}
                >
                    <FolderPlus className="h-4 w-4" />
                </Button>
                {desktop && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void openFolderCollection()}
                        title={t("openFolderCollection")}
                    >
                        <FolderGit2 className="h-4 w-4" />
                    </Button>
                )}
            </ToolSidebarActions>

            <Tabs defaultValue="collections" className="flex-1 flex flex-col h-full min-h-0">
                <div className="chrome px-3 py-2.5 border-b border-border flex flex-col gap-2 shrink-0">
                    <button
                        className="w-full flex items-center gap-2 h-8 px-2.5 text-[13px] rounded-lg border border-border bg-card shadow-elev-1 hover:bg-foreground/[0.03] transition-colors"
                        onClick={() => setWorkspaceDialogOpen(true)}
                    >
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{tWs("barLabel")}</span>
                        <span className="flex-1 truncate text-left font-medium">{activeWorkspaceName}</span>
                    </button>
                    <TabsList className="w-full grid grid-cols-2 h-8">
                        <TabsTrigger value="collections" className="py-0.5">{t("tabCollections")}</TabsTrigger>
                        <TabsTrigger value="history" className="py-0.5">{t("tabHistory")}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="collections" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden outline-none">
                    {collections.length > 0 && (
                        <div className="px-3 py-2 border-b border-border shrink-0">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    aria-label={tActions("searchPlaceholder")}
                                    placeholder={tActions("searchPlaceholder")}
                                    value={treeSearch}
                                    onChange={(e) => setTreeSearch(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Escape") setTreeSearch("") }}
                                    className="w-full h-8 pl-8 pr-7 text-[13px] bg-card border border-input rounded-md outline-none placeholder:text-muted-foreground/80 focus:border-primary focus:ring-[3px] focus:ring-primary/25 transition-[border-color,box-shadow]"
                                />
                                {treeSearch && (
                                    <button
                                        onClick={() => setTreeSearch("")}
                                        aria-label={tActions("clearSearch")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <ScrollArea className="flex-1">
                        <div className="p-2">
                            {isLoading && collections.length === 0 ? (
                                <CollectionsSidebarSkeleton />
                            ) : collections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                                    <FolderPlus className="h-8 w-8 text-muted-foreground/60 mb-3" />
                                    <h4 className="font-medium text-sm">{t("noCollectionsTitle")}</h4>
                                    <p className="text-[13px] text-muted-foreground mt-1 mb-4">
                                        {t("noCollectionsHint")}
                                    </p>
                                    <div className="flex flex-col gap-2">
                                        <Button size="sm" onClick={() => setNewCollectionDialogOpen(true)}>
                                            {t("createCollection")}
                                        </Button>
                                        {desktop && (
                                            <Button size="sm" variant="outline" onClick={() => void openFolderCollection()}>
                                                <FolderGit2 className="h-3.5 w-3.5 mr-2" />
                                                {t("openFolderCollection")}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : treeQuery && visibleCollections.length === 0 ? (
                                <div className="text-[13px] text-muted-foreground text-center py-6">
                                    {tActions("noSearchResults", { query: treeSearch.trim() })}
                                </div>
                            ) : (
                                visibleCollections.map((collection) => (
                                    <div key={collection.id} data-collection-id={collection.id} className="mb-3">
                                        <div
                                            className={cn(
                                                "flex items-center justify-between h-8 px-2 group rounded-lg hover:bg-foreground/[0.05] transition-colors",
                                                collectionDropTarget === collection.id && "bg-primary/10 ring-1 ring-inset ring-primary/40",
                                            )}
                                            // Dropping on the header puts the item at the end of the collection root.
                                            onDragOver={(e) => {
                                                if (treeQuery || !e.dataTransfer.types.includes(TREE_DRAG_MIME)) return
                                                e.preventDefault()
                                                e.dataTransfer.dropEffect = "move"
                                                if (collectionDropTarget !== collection.id) setCollectionDropTarget(collection.id)
                                            }}
                                            onDragLeave={(e) => {
                                                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCollectionDropTarget(null)
                                            }}
                                            onDrop={(e) => {
                                                setCollectionDropTarget(null)
                                                const draggedId = e.dataTransfer.getData(TREE_DRAG_MIME)
                                                if (!draggedId) return
                                                e.preventDefault()
                                                moveTo(draggedId, { collectionId: collection.id })
                                            }}
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="flex items-center">
                                                    <Checkbox
                                                        checked={selectedCollections.has(collection.id)}
                                                        onCheckedChange={() => toggleCollectionSelection(collection.id)}
                                                        className="h-4 w-4"
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-muted-foreground truncate flex-1 px-1">
                                                    {collection.name}
                                                </span>
                                                {collection.source && (
                                                    <span title={collection.source.path} aria-label={t("folderCollection")}>
                                                        <FolderGit2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                                    </span>
                                                )}
                                                {collection.source?.kind === "bruno" && collection.source.readOnly && (
                                                    <span title={tRoot("fileSync.readOnlyOpenCollection")} aria-label={tRoot("fileSync.readOnlyOpenCollection")}>
                                                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 rounded-md hover:bg-foreground/[0.06]"
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
                                                            className="h-6 w-6 rounded-md hover:bg-foreground/[0.06]"
                                                        >
                                                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-52">
                                                        <DropdownMenuItem onClick={() => openRenameCollectionDialog(collection)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            {t("rename")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setDefaultsTarget({ kind: "collection", item: collection })}>
                                                            <Settings2 className="h-4 w-4 mr-2" />
                                                            {tDefaults("collectionMenu")}
                                                        </DropdownMenuItem>
                                                        {/* Workspace ids are app-local, so folder (git) collections don't carry one. */}
                                                        {!collection.source && workspaces.length > 0 && (
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    <Briefcase className="h-4 w-4 mr-2" />
                                                                    {tActions("workspace")}
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent>
                                                                    <DropdownMenuRadioGroup
                                                                        value={collection.workspace ?? ""}
                                                                        onValueChange={(v) => void setCollectionWorkspace(collection.id, v || null, tActions("workspaceFailed"))}
                                                                    >
                                                                        <DropdownMenuRadioItem value="">{tActions("noWorkspace")}</DropdownMenuRadioItem>
                                                                        {workspaces.map((w) => (
                                                                            <DropdownMenuRadioItem key={w.id} value={w.id}>{w.name}</DropdownMenuRadioItem>
                                                                        ))}
                                                                    </DropdownMenuRadioGroup>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                        )}
                                                        <DropdownMenuItem onClick={() => void duplicateCollection(collection.id, tActions("copyName", { name: collection.name }))}>
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            {tActions("duplicate")}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setRunnerCollection(collection)}>
                                                            <Play className="h-4 w-4 mr-2" />
                                                            Run collection
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                if (typeof window === "undefined") return
                                                                try {
                                                                    let baseUrl: string
                                                                    if (isDesktop()) {
                                                                        // Desktop: real loopback HTTP server so curl / the
                                                                        // user's own app can call the mock.
                                                                        const { invoke } = await import("@tauri-apps/api/core")
                                                                        const port = await invoke<number>("mock_server_start")
                                                                        baseUrl = `http://127.0.0.1:${port}/${collection.id}/`
                                                                    } else {
                                                                        baseUrl = `${window.location.origin}/api/mock/${collection.id}/`
                                                                    }
                                                                    await navigator.clipboard.writeText(baseUrl)
                                                                    toast.success("Mock URL copied — append the request path to invoke")
                                                                } catch (e) {
                                                                    toast.error((e as Error)?.message || "Could not copy to clipboard")
                                                                }
                                                            }}
                                                        >
                                                            <Server className="h-4 w-4 mr-2" />
                                                            Copy mock URL
                                                        </DropdownMenuItem>
                                                        {desktop && (
                                                            <DropdownMenuItem onClick={() => setMockCollection(collection)}>
                                                                <Server className="h-4 w-4 mr-2" />
                                                                {tMock("menu")}
                                                            </DropdownMenuItem>
                                                        )}
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
                                                        {/* Public mocks need a hosted origin — desktop is offline-only. */}
                                                        {!isDesktop() && <DropdownMenuItem
                                                            onClick={async () => {
                                                                if (typeof window === "undefined") return
                                                                try {
                                                                    const res = await apiFetch("/api/backend/api-client/public-mocks", {
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
                                                        </DropdownMenuItem>}
                                                        <DropdownMenuItem onClick={() => void import("@/lib/export/postman").then((m) => m.downloadCollectionAsPostman(collection))}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (Postman v2.1)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => void import("@/lib/export/openapi").then((m) => m.downloadCollectionAsOpenApi(collection))}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (OpenAPI 3.0)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => void import("@/lib/export/har").then((m) => m.downloadCollectionAsHar(collection))}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (HAR 1.2)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => void import("@/lib/export/insomnia").then((m) => m.downloadCollectionAsInsomnia(collection))}>
                                                            <FileDown className="h-4 w-4 mr-2" />
                                                            Export (Insomnia v4)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                try {
                                                                    const m = await import("@/lib/export/docs-html")
                                                                    if (await m.saveCollectionDocsHtml(collection)) toast.success(tDocs("exported"))
                                                                } catch {
                                                                    toast.error(tDocs("exportFailed"))
                                                                }
                                                            }}
                                                        >
                                                            <BookOpen className="h-4 w-4 mr-2" />
                                                            {tDocs("exportHtml")}
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
                                        <div>
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
                                                    onEditFolderDefaults={editFolderDefaults}
                                                    onDuplicate={onDuplicateItem}
                                                    onMoveTo={setMoveSource}
                                                    // Filtered trees hide siblings, so drop indices would be wrong.
                                                    onDropItem={treeQuery ? undefined : onDropItem}
                                                />
                                            ))}
                                            {collection.items.length === 0 && (
                                                <div className="text-xs text-muted-foreground/70 px-3 py-1.5">
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

                <TabsContent value="history" className="flex-1 flex flex-col min-h-0 m-0 data-[state=inactive]:hidden outline-none">
                    <div className="chrome flex items-center justify-between h-9 px-3 border-b border-border shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">{t("recentRequests")}</span>
                        <Button variant="ghost" size="sm" onClick={onClearHistory} className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 text-xs px-2">
                            <Trash2 className="h-3 w-3 mr-1.5" />
                            {t("clearAll")}
                        </Button>
                    </div>
                    <div className="px-3 py-2 border-b border-border shrink-0">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full h-8 pl-8 pr-7 text-[13px] bg-card border border-input rounded-md outline-none placeholder:text-muted-foreground/80 focus:border-primary focus:ring-[3px] focus:ring-primary/25 transition-[border-color,box-shadow]"
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
                            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                                <FolderPlus className="h-8 w-8 text-muted-foreground/60 mb-3" />
                                <p className="text-sm font-medium">{t("noHistoryTitle")}</p>
                                <p className="text-[13px] text-muted-foreground mt-1">{t("noHistoryHint")}</p>
                            </div>
                        ) : !!history.length && historySearch && !filteredHistory.length ? (
                            <div className="text-[13px] text-muted-foreground text-center py-6">No results for &quot;{historySearch}&quot;</div>
                        ) : (
                            <VirtualHistoryList
                                items={visibleHistory}
                                height={historyListHeight}
                                onSelect={onLoadRequest}
                                onDelete={onDeleteHistoryItem}
                                renderRow={renderHistoryRow}
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
                        <div className="max-h-[200px] overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border">
                            {Array.from(selectedCollections).map(collectionId => {
                                const collection = collections.find(c => c.id === collectionId)
                                return (
                                    <div key={collectionId} className="flex items-center gap-2 h-9 px-3">
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-[13px] font-medium truncate">{collection?.name || "Unknown"}</span>
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
            {mockCollection && (
                <MockServerDialog collection={mockCollection} onOpenChange={(o) => { if (!o) setMockCollection(null) }} />
            )}
            <WorkspacesDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
            <Dialog open={moveSource !== null} onOpenChange={(o) => { if (!o) setMoveSource(null) }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{tActions("moveTitle", { name: moveSource?.name ?? "" })}</DialogTitle>
                        <DialogDescription>{tActions("moveDescription")}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[50vh]">
                        <div className="flex flex-col gap-0.5 p-1">
                            {moveSource && moveDestinations(collections, moveSource.id).map((d) => (
                                <button
                                    key={d.parentId ?? d.collectionId}
                                    className={cn(
                                        "flex items-center gap-2 h-8 pr-2 rounded-md text-left text-[13px] hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05] outline-none",
                                        d.depth === 0 && "font-semibold",
                                    )}
                                    style={{ paddingLeft: `${d.depth * 14 + 8}px` }}
                                    onClick={() => {
                                        const id = moveSource.id
                                        setMoveSource(null)
                                        moveTo(id, d.parentId ? { itemId: d.parentId, position: "inside" } : { collectionId: d.collectionId })
                                    }}
                                >
                                    {d.depth === 0
                                        ? <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        : <FolderPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                    <span className="truncate">{d.label}</span>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <FolderDefaultsDialog
                open={defaultsTarget !== null}
                onOpenChange={(o) => { if (!o) setDefaultsTarget(null) }}
                target={defaultsTarget}
                onSave={(patch) => {
                    if (defaultsTarget?.kind === "folder") void patchFolder(defaultsTarget.item.id, patch)
                    if (defaultsTarget?.kind === "collection") {
                        void patchCollection(defaultsTarget.item.id, patch, { ok: tDefaults("saved"), fail: tDefaults("saveFailed") })
                    }
                }}
            />
        </>
    )
}
