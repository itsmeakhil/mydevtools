"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ConnectionForm } from "@/components/nosql-explorer/connection-form";
import { ExplorerSidebar } from "@/components/nosql-explorer/explorer-sidebar";
import { DocumentView } from "@/components/nosql-explorer/document-view";
import { ConnectionState, ExplorerTab, SavedConnection } from "@/components/nosql-explorer/types";
import { TabBar } from "@/components/nosql-explorer/tab-bar";
import { toast } from "sonner";
import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { useVaultGuard } from "@/hooks/use-vault-guard";
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder";
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton";
import { getConnections } from "@/components/nosql-explorer/connection-service";
import { cn } from "@/lib/utils";
import { IconDatabase, IconServer, IconBrandMongodb, IconSearch, IconPlus, IconArrowLeft, IconMenu2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
    ResponsiveModal,
    ResponsiveModalBody,
    ResponsiveModalHeader,
    ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function NoSQLExplorerPage() {
    const t = useTranslations("NoSqlExplorer.page");
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();
    const { isUnlocked, isRestoring } = useVaultGuard();
    // We still keep some state for the "active" context if needed, but mostly driven by tabs now
    const [state, setState] = useState<ConnectionState>({
        isConnected: false,
        connectionString: "",
        databases: [],
        selectedDb: null,
        collections: [],
        selectedCollection: null,
        documents: [],
        total: 0,
        loading: false,
        error: null,
    });

    const [tabs, setTabs] = useState<ExplorerTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasConnections, setHasConnections] = useState<boolean | null>(null); // null = loading
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; documentId: string | null }>({
        isOpen: false,
        documentId: null,
    });
    const [isCloseAllDialogOpen, setIsCloseAllDialogOpen] = useState(false);

    const connectionCacheRef = useRef<Map<string, SavedConnection>>(new Map());

    // Keep tab color/read-only flags in sync when connections are (re)loaded —
    // persisted tabs may carry stale copies from a previous session.
    const syncTabsWithConnections = (conns: SavedConnection[]) => {
        const byId = new Map(conns.map((c) => [c.id, c]));
        setTabs((prev) =>
            prev.map((tab) => {
                const conn = byId.get(tab.connectionId);
                if (!conn) return tab;
                const color = conn.color ?? null;
                const readOnly = conn.readOnly ?? false;
                if (tab.connectionColor === color && (tab.readOnly ?? false) === readOnly) return tab;
                return { ...tab, connectionColor: color, readOnly };
            })
        );
    };

    // Check for connections + prime cache so auto-fetch doesn't trigger a second
    // getConnections round-trip on the cold path.
    useEffect(() => {
        const checkConnections = async () => {
            if (user && encryptionKey) {
                try {
                    const connections = await getConnections(user.uid, encryptionKey);
                    connections.forEach((c) => connectionCacheRef.current.set(c.id, c));
                    syncTabsWithConnections(connections);
                    setHasConnections(connections.length > 0);
                } catch (error) {
                    console.error("Failed to check connections", error);
                    setHasConnections(false);
                }
            } else {
                setHasConnections(false);
            }
        };
        checkConnections();
    }, [user, encryptionKey]);

    // Load tabs from localStorage on mount
    useEffect(() => {
        if (!user) return;

        const savedTabs = localStorage.getItem(`nosql_tabs_${user.uid}`);
        const savedActiveTabId = localStorage.getItem(`nosql_active_tab_id_${user.uid}`);

        if (savedTabs) {
            try {
                const parsed = JSON.parse(savedTabs) as ExplorerTab[];
                // Strip any persisted runtime fields from older builds — refetched on activation.
                const rehydrated = parsed.map((t) => ({
                    ...t,
                    documents: [],
                    total: 0,
                    loading: false,
                    error: null,
                }));
                setTabs(rehydrated);
            } catch (e) {
                console.error("Failed to parse saved tabs", e);
                localStorage.removeItem(`nosql_tabs_${user.uid}`);
            }
        }

        if (savedActiveTabId) {
            setActiveTabId(savedActiveTabId);
        }
        setIsInitialized(true);
    }, [user]);

    // Save tabs to localStorage whenever they change — persist only structural fields,
    // never `documents`/`total` (can be MBs, blows the per-origin localStorage quota).
    useEffect(() => {
        if (!isInitialized || !user) return;
        const slim = tabs.map((t) => ({
            id: t.id,
            connectionId: t.connectionId,
            connectionName: t.connectionName,
            connectionColor: t.connectionColor ?? null,
            readOnly: t.readOnly ?? false,
            dbName: t.dbName,
            collectionName: t.collectionName,
            page: t.page,
            limit: t.limit,
            query: t.query,
            sortField: t.sortField ?? null,
            sortDirection: t.sortDirection ?? 'asc',
        }));
        const key = `nosql_tabs_${user.uid}`;
        try {
            localStorage.setItem(key, JSON.stringify(slim));
        } catch (e) {
            console.warn("nosql tabs: localStorage write failed, dropping persisted state", e);
            try { localStorage.removeItem(key); } catch { /* noop */ }
        }
    }, [tabs, isInitialized, user]);

    // Save activeTabId to localStorage whenever it changes
    useEffect(() => {
        if (!isInitialized || !user) return;
        const key = `nosql_active_tab_id_${user.uid}`;
        try {
            if (activeTabId) localStorage.setItem(key, activeTabId);
            else localStorage.removeItem(key);
        } catch (e) {
            console.warn("nosql active tab: localStorage write failed", e);
        }
    }, [activeTabId, isInitialized, user]);

    const handleSelectCollection = async (connection: SavedConnection, dbName: string, collectionName: string) => {
        const tabId = `${connection.id}-${dbName}-${collectionName}`;
        const existingTab = tabs.find((t) => t.id === tabId);
        setMobileSidebarOpen(false);

        if (existingTab) {
            setActiveTabId(tabId);
            return;
        }

        const newTab: ExplorerTab = {
            id: tabId,
            connectionId: connection.id!,
            connectionName: connection.name,
            connectionColor: connection.color ?? null,
            readOnly: connection.readOnly ?? false,
            dbName,
            collectionName,
            documents: [],
            total: 0,
            page: 1,
            limit: 50,
            query: "{}",
            sortField: null,
            sortDirection: 'asc',
            loading: true,
            error: null,
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);

        await fetchDocumentsForTab(newTab, connection.connectionString);
    };

    const fetchDocumentsForTab = async (tab: ExplorerTab, connectionString: string) => {
        updateTab(tab.id, { loading: true, error: null });
        try {
            const skip = (tab.page - 1) * tab.limit;
            const res = await apiFetch("/api/nosql/documents/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString,
                    dbName: tab.dbName,
                    collectionName: tab.collectionName,
                    query: tab.query,
                    limit: tab.limit,
                    skip,
                    sortField: tab.sortField,
                    sortDirection: tab.sortDirection || "asc",
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            updateTab(tab.id, {
                documents: data.documents,
                total: data.total,
                loading: false,
            });
        } catch (error: any) {
            updateTab(tab.id, { loading: false, error: error.message });
            toast.error(t("toastFetchFailed", { collection: tab.collectionName }));
        }
    };

    const updateTab = (tabId: string, updates: Partial<ExplorerTab>) => {
        setTabs((prev) =>
            prev.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
        );
    };

    const handleTabChange = (tabId: string) => {
        setActiveTabId(tabId);
    };

    const handleTabClose = (tabId: string) => {
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== tabId);
            if (activeTabId === tabId) {
                const idx = prev.findIndex((t) => t.id === tabId);
                const nextTab = prev[idx - 1] ?? prev[idx + 1] ?? null;
                setActiveTabId(nextTab?.id ?? null);
            }
            return next;
        });
    };

    const handleCloseAllTabs = () => {
        if (tabs.length === 0) return;
        setIsCloseAllDialogOpen(true);
    };

    const confirmCloseAll = () => {
        setTabs([]);
        setActiveTabId(null);
        setIsCloseAllDialogOpen(false);
    };

    const activeTab = tabs.find((t) => t.id === activeTabId);

    const getConnectionForTab = useCallback(async (tab: ExplorerTab) => {
        const cached = connectionCacheRef.current.get(tab.connectionId);
        if (cached) return cached;
        if (!user || !encryptionKey) throw new Error("Not authenticated");
        const connections = await getConnections(user.uid, encryptionKey);
        connections.forEach(c => connectionCacheRef.current.set(c.id, c));
        const conn = connections.find(c => c.id === tab.connectionId);
        if (!conn) throw new Error("Connection not found — try refreshing the sidebar");
        return conn;
    }, [user, encryptionKey]);

    const handleRefresh = async () => {
        if (activeTab) {
            try {
                const conn = await getConnectionForTab(activeTab);
                fetchDocumentsForTab(activeTab, conn.connectionString);
            } catch (e: any) {
                updateTab(activeTab.id, { loading: false, error: e.message });
            }
        }
    };

    const handleInsert = async (doc: any) => {
        if (!activeTab) return;
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                readOnly: conn.readOnly ?? false,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                document: doc,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleRefresh();
    };

    const handleUpdate = async (id: string, update: any, mode: "merge" | "replace" = "merge") => {
        if (!activeTab) return;
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/documents", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                readOnly: conn.readOnly ?? false,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                documentId: id,
                update,
                mode,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleRefresh();
    };

    const handleDelete = async (id: string) => {
        setDeleteConfirmation({ isOpen: true, documentId: id });
    };

    const confirmDelete = async () => {
        const id = deleteConfirmation.documentId;
        if (!activeTab || !id) return;

        try {
            const conn = await getConnectionForTab(activeTab);

            const res = await apiFetch("/api/nosql/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString: conn.connectionString,
                    readOnly: conn.readOnly ?? false,
                    dbName: activeTab.dbName,
                    collectionName: activeTab.collectionName,
                    documentId: id,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(t("toastDocDeleted"));
            handleRefresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setDeleteConfirmation({ isOpen: false, documentId: null });
        }
    };

    const handleSearch = (query: string) => {
        if (activeTab) {
            const updatedTab = { ...activeTab, query, page: 1 };
            updateTab(activeTab.id, updatedTab);
            performFetch(updatedTab);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (activeTab) {
            const updatedTab = { ...activeTab, page: newPage };
            updateTab(activeTab.id, updatedTab);
            // We need to wait for state update? No, we updated local var 'updatedTab' but not state yet?
            // Actually updateTab updates state. But handleRefresh reads from state 'activeTab'.
            // State updates are async.
            // We should pass the updated tab to the fetch function.
            // Let's refactor handleRefresh to accept an optional tab override.
            performFetch(updatedTab);
        }
    };

    const handleLimitChange = (newLimit: number) => {
        if (activeTab) {
            const updatedTab = { ...activeTab, limit: newLimit, page: 1 };
            updateTab(activeTab.id, updatedTab);
            performFetch(updatedTab);
        }
    };

    const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
        if (activeTab) {
            const updatedTab = { ...activeTab, sortField: field, sortDirection: direction, page: 1 };
            updateTab(activeTab.id, updatedTab);
            performFetch(updatedTab);
        }
    };

    const handleBulkDelete = async (ids: string[]) => {
        if (!activeTab) return;
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                readOnly: conn.readOnly ?? false,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                documentIds: ids,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleRefresh();
    };

    const handleImport = async (documents: any[]) => {
        if (!activeTab) return;
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                readOnly: conn.readOnly ?? false,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                documents,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        handleRefresh();
    };

    const handleLoadSchema = useCallback(async () => {
        if (!activeTab) throw new Error("No active tab");
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/schema", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }, [activeTab, getConnectionForTab]);

    const handleLoadIndexes = useCallback(async () => {
        if (!activeTab) throw new Error("No active tab");
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/indexes/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }, [activeTab, getConnectionForTab]);

    const handleDropIndex = async (indexName: string) => {
        if (!activeTab) return;
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/indexes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                readOnly: conn.readOnly ?? false,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                indexName,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
    };

    const handleCreateIndex = async (keys: Record<string, number>, options: Record<string, any>) => {
        if (!activeTab) return;
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/indexes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                readOnly: conn.readOnly ?? false,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                keys,
                options,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
    };

    const handleExplain = useCallback(async (query: string) => {
        if (!activeTab) throw new Error("No active tab");
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/explain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                query,
                sortField: activeTab.sortField,
                sortDirection: activeTab.sortDirection || "asc",
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data.explain;
    }, [activeTab, getConnectionForTab]);

    const handlePreviewPipeline = useCallback(async (pipelineJson: string) => {
        if (!activeTab) throw new Error("No active tab");
        const conn = await getConnectionForTab(activeTab);

        const res = await apiFetch("/api/nosql/documents/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                connectionString: conn.connectionString,
                dbName: activeTab.dbName,
                collectionName: activeTab.collectionName,
                query: pipelineJson,
                limit: 10,
                skip: 0,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return { documents: data.documents as unknown[] };
    }, [activeTab, getConnectionForTab]);

    const performFetch = async (tab: ExplorerTab) => {
        try {
            const conn = await getConnectionForTab(tab);
            fetchDocumentsForTab(tab, conn.connectionString);
        } catch (e: any) {
            updateTab(tab.id, { loading: false, error: e.message });
        }
    };

    // Auto-fetch active tab once after hydration — persisted tabs no longer carry
    // documents (would blow the localStorage quota), so we lazily refetch on activate.
    const autoFetchedTabsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!isInitialized || !isUnlocked || !user || !encryptionKey || !activeTabId) return;
        const tab = tabs.find((t) => t.id === activeTabId);
        if (!tab) return;
        if (tab.loading || tab.documents.length > 0) return;
        if (autoFetchedTabsRef.current.has(tab.id)) return;
        autoFetchedTabsRef.current.add(tab.id);
        performFetch(tab);
    }, [isInitialized, isUnlocked, user, encryptionKey, activeTabId, tabs]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;

            // Ctrl/Cmd+W — close active tab
            if (e.key === 'w' && activeTabId) {
                e.preventDefault();
                handleTabClose(activeTabId);
                return;
            }
            // Ctrl/Cmd+Tab — next tab
            if (e.key === 'Tab' && !e.shiftKey && tabs.length > 1) {
                e.preventDefault();
                const idx = tabs.findIndex(t => t.id === activeTabId);
                const next = tabs[(idx + 1) % tabs.length];
                setActiveTabId(next.id);
                return;
            }
            // Ctrl/Cmd+Shift+Tab — prev tab
            if (e.key === 'Tab' && e.shiftKey && tabs.length > 1) {
                e.preventDefault();
                const idx = tabs.findIndex(t => t.id === activeTabId);
                const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
                setActiveTabId(prev.id);
                return;
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [activeTabId, tabs]);

    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(256);
    const [isResizing, setIsResizing] = useState(false);

    const resizeStartRef = useRef<{ x: number, width: number } | null>(null);
    const sidebarWidthRef = useRef(sidebarWidth);

    useEffect(() => {
        sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth]);

    useEffect(() => {
        const savedWidth = localStorage.getItem("nosql_sidebar_width");
        if (savedWidth) {
            setSidebarWidth(parseInt(savedWidth, 10));
        }
    }, []);

    useEffect(() => {
        if (isResizing) {
            const handleMouseMove = (e: MouseEvent) => {
                if (!resizeStartRef.current) return;
                const delta = e.clientX - resizeStartRef.current.x;
                const newWidth = Math.max(150, Math.min(600, resizeStartRef.current.width + delta));
                setSidebarWidth(newWidth);
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                resizeStartRef.current = null;
                localStorage.setItem("nosql_sidebar_width", sidebarWidthRef.current.toString());
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.userSelect = "none";
            document.body.style.cursor = "col-resize";

            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
                document.body.style.userSelect = "";
                document.body.style.cursor = "";
            };
        }
    }, [isResizing]);

    const isDesktop = useMediaQuery("(min-width: 768px)");

    if (isRestoring) return <VaultRestoringSkeleton />;
    if (!isUnlocked) return <VaultLockedPlaceholder appName="Database Explorer" />

    return (
        <div className="flex h-full min-h-0 w-full overflow-hidden relative mobile-nav-offset">
            {isDesktop ? (
                <>
                    <ExplorerSidebar
                        width={sidebarWidth}
                        onSelectCollection={handleSelectCollection}
                        onRefresh={() => { /* Sidebar handles its own refresh */ }}
                        onAddConnection={() => setIsConnectionDialogOpen(true)}
                        onConnectionsLoaded={(conns) => {
                            connectionCacheRef.current.clear();
                            conns.forEach(c => connectionCacheRef.current.set(c.id, c));
                            syncTabsWithConnections(conns);
                        }}
                    />
                    <div
                        className={cn(
                            "w-2 hover:w-2 bg-border/50 hover:bg-primary/50 cursor-col-resize flex-shrink-0 transition-all z-50",
                            isResizing && "bg-primary/50 w-2"
                        )}
                        onMouseDown={(e) => {
                            setIsResizing(true);
                            resizeStartRef.current = { x: e.clientX, width: sidebarWidth };
                        }}
                    />
                </>
            ) : (
                /* Mobile sidebar — controlled sheet that auto-closes on collection select */
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent side="left" className="p-0 w-[85vw] sm:w-[350px]">
                        <VisuallyHidden><SheetTitle>{t("dialogAddConnection")}</SheetTitle></VisuallyHidden>
                        <ExplorerSidebar
                            width={300}
                            onSelectCollection={handleSelectCollection}
                            onRefresh={() => { }}
                            onAddConnection={() => {
                                setMobileSidebarOpen(false);
                                setIsConnectionDialogOpen(true);
                            }}
                            onConnectionsLoaded={(conns) => {
                                connectionCacheRef.current.clear();
                                conns.forEach(c => connectionCacheRef.current.set(c.id, c));
                                syncTabsWithConnections(conns);
                            }}
                        />
                    </SheetContent>
                </Sheet>
            )}

            <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
                {/* Mobile top toolbar */}
                {!isDesktop && (
                    <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0 bg-background">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 shrink-0 p-0"
                            onClick={() => setMobileSidebarOpen(true)}
                            aria-label="Open collections"
                        >
                            <IconMenu2 className="h-4 w-4" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            {activeTab ? (
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <IconDatabase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <span className="truncate text-sm font-medium">
                                        {activeTab.collectionName}
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        · {activeTab.dbName}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground">
                                    {t("selectCollectionTitle")}
                                </span>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setIsConnectionDialogOpen(true)}
                            aria-label={t("connectCta")}
                        >
                            <IconPlus className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabChange={handleTabChange}
                    onTabClose={handleTabClose}
                    onCloseAll={handleCloseAllTabs}
                />
                <div className="flex-1 overflow-hidden relative min-h-0">
                    {activeTab ? (
                        <DocumentView
                            key={activeTab.id}
                            connectionName={activeTab.connectionName}
                            dbName={activeTab.dbName}
                            collectionName={activeTab.collectionName}
                            documents={activeTab.documents}
                            total={activeTab.total}
                            page={activeTab.page}
                            limit={activeTab.limit}
                            sortField={activeTab.sortField}
                            sortDirection={activeTab.sortDirection}
                            loading={activeTab.loading}
                            error={activeTab.error}
                            onRefresh={handleRefresh}
                            onInsert={handleInsert}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onSearch={handleSearch}
                            onPageChange={handlePageChange}
                            onLimitChange={handleLimitChange}
                            onSortChange={handleSortChange}
                            onBulkDelete={handleBulkDelete}
                            onImport={handleImport}
                            onLoadSchema={handleLoadSchema}
                            onLoadIndexes={handleLoadIndexes}
                            onDropIndex={handleDropIndex}
                            onCreateIndex={handleCreateIndex}
                            onExplain={handleExplain}
                            onPreviewPipeline={handlePreviewPipeline}
                            readOnly={activeTab.readOnly ?? false}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 animate-in fade-in zoom-in duration-300">
                            {!hasConnections ? (
                                <div className="max-w-2xl w-full space-y-8 text-center">
                                    <div className="space-y-2">
                                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                            <IconDatabase className="w-10 h-10 text-primary" />
                                        </div>
                                        <h2 className="text-3xl font-bold tracking-tight text-foreground">{t("heroTitle")}</h2>
                                        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                                            {t("heroSubtitle")}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                        <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                                                <IconServer className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <h3 className="font-semibold text-foreground mb-1">{t("featureMultiTitle")}</h3>
                                            <p className="text-xs text-muted-foreground">{t("featureMultiDesc")}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all">
                                            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                                                <IconBrandMongodb className="w-4 h-4 text-green-500" />
                                            </div>
                                            <h3 className="font-semibold text-foreground mb-1">{t("featureMongoTitle")}</h3>
                                            <p className="text-xs text-muted-foreground">{t("featureMongoDesc")}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-all">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                                                <IconSearch className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <h3 className="font-semibold text-foreground mb-1">{t("featureQueryTitle")}</h3>
                                            <p className="text-xs text-muted-foreground">{t("featureQueryDesc")}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button size="lg" onClick={() => setIsConnectionDialogOpen(true)} className="gap-2 shadow-lg hover:shadow-primary/25 transition-all">
                                            <IconPlus className="w-5 h-5" />
                                            {t("connectCta")}
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-4">
                                            {t("footerNote", { db: t("footerDb") })}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                                        <IconArrowLeft className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">{t("selectCollectionTitle")}</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                                            {t("selectCollectionDesc")}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ResponsiveModal open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen} className="sm:max-w-3xl">
                <ResponsiveModalHeader>
                    <ResponsiveModalTitle>{t("dialogAddConnection")}</ResponsiveModalTitle>
                </ResponsiveModalHeader>
                <ResponsiveModalBody>
                    <ConnectionForm
                        onConnect={async () => {
                            setIsConnectionDialogOpen(false);
                            setHasConnections(true);
                            connectionCacheRef.current.clear();
                            toast.success(t("toastConnectionAdded"));
                        }}
                        loading={false}
                        error={null}
                    />
                </ResponsiveModalBody>
            </ResponsiveModal>

            <AlertDialog open={deleteConfirmation.isOpen} onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteDocTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteDocDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("delete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isCloseAllDialogOpen} onOpenChange={setIsCloseAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("closeAllTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("closeAllDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCloseAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("closeAllConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
