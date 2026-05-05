"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Collection, SavedConnection } from "./types";
import { IconDatabase, IconFolder, IconChevronRight, IconChevronDown, IconRefresh, IconSearch, IconPlus, IconServer, IconPencil, IconCheck, IconX, IconDotsVertical, IconTrash, IconEdit, IconCopy, IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { getConnections, updateConnectionName, deleteConnection } from "./connection-service";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface ExplorerSidebarProps {
    onSelectCollection: (connection: SavedConnection, dbName: string, collectionName: string) => void;
    onRefresh: () => void;
    onAddConnection: () => void;
    width?: number;
}

interface ConnectionNode {
    connection: SavedConnection;
    isExpanded: boolean;
    databases: Database[];
    isLoading: boolean;
    error: string | null;
    expandedDbs: Set<string>; // Set of expanded db names
    dbCollections: Record<string, Collection[]>; // Map of dbName -> collections
}

export function ExplorerSidebar({
    onSelectCollection,
    onRefresh,
    onAddConnection,
    width = 256,
}: ExplorerSidebarProps) {
    const t = useTranslations("NoSqlExplorer.sidebar");
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();
    const [connections, setConnections] = useState<ConnectionNode[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");

    // Dialog states
    const [renameCollectionDialog, setRenameCollectionDialog] = useState<{ open: boolean, connection: SavedConnection | null, dbName: string, collectionName: string, newName: string }>({ open: false, connection: null, dbName: "", collectionName: "", newName: "" });
    const [renameDatabaseDialog, setRenameDatabaseDialog] = useState<{ open: boolean, connection: SavedConnection | null, dbName: string, newName: string }>({ open: false, connection: null, dbName: "", newName: "" });

    useEffect(() => {
        if (user && encryptionKey) {
            loadConnections();
        }
    }, [user, encryptionKey]);

    const loadConnections = async () => {
        if (!user || !encryptionKey) return;
        setLoading(true);
        try {
            const saved = await getConnections(user.uid, encryptionKey);

            // Restore expanded state from localStorage
            const expandedConnIds = JSON.parse(localStorage.getItem("nosql_expanded_connections") || "[]");
            const expandedDbsMap = JSON.parse(localStorage.getItem("nosql_expanded_dbs") || "{}");

            const newConnections = saved.map(conn => {
                const isExpanded = expandedConnIds.includes(conn.id);
                const expandedDbs = new Set<string>(expandedDbsMap[conn.id!] || []);

                return {
                    connection: conn,
                    isExpanded,
                    databases: [],
                    isLoading: false,
                    error: null,
                    expandedDbs,
                    dbCollections: {}
                };
            });

            setConnections(newConnections);

            // Trigger refresh for expanded connections to load databases
            newConnections.forEach((node, index) => {
                if (node.isExpanded) {
                    refreshDatabases(index, node.connection);
                }
            });

        } catch (error) {
            toast.error(t("toastLoadFail"));
        } finally {
            setLoading(false);
        }
    };

    const toggleConnection = async (index: number) => {
        if (editingConnectionId) return; // Prevent toggle while editing

        const node = connections[index];
        const newExpandedState = !node.isExpanded;

        // Update state
        setConnections(prev => prev.map((c, i) => i === index ? { ...c, isExpanded: newExpandedState, isLoading: newExpandedState, error: null } : c));

        // Update localStorage
        const expandedConnIds = JSON.parse(localStorage.getItem("nosql_expanded_connections") || "[]");
        if (newExpandedState) {
            if (node.connection.id && !expandedConnIds.includes(node.connection.id)) {
                expandedConnIds.push(node.connection.id);
            }
        } else {
            const idx = expandedConnIds.indexOf(node.connection.id);
            if (idx !== -1) expandedConnIds.splice(idx, 1);
        }
        localStorage.setItem("nosql_expanded_connections", JSON.stringify(expandedConnIds));

        if (newExpandedState) {
            await refreshDatabases(index);
        }
    };

    const refreshDatabases = async (index: number, connectionOverride?: SavedConnection) => {
        const connection = connectionOverride || connections[index]?.connection;
        if (!connection) return;

        setConnections(prev => prev.map((c, i) => i === index ? { ...c, isLoading: true, error: null } : c));
        try {
            const res = await fetch("/api/nosql/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString: connection.connectionString }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setConnections(prev => prev.map((c, i) => i === index ? {
                ...c,
                isLoading: false,
                databases: data.databases,
            } : c));
        } catch (error: any) {
            setConnections(prev => prev.map((c, i) => i === index ? {
                ...c,
                isLoading: false,
                error: error.message
            } : c));
            toast.error(t("toastConnectFail", { name: connection.name }));
        }
    };

    const toggleDatabase = async (connIndex: number, dbName: string) => {
        const node = connections[connIndex];
        const isDbExpanded = node.expandedDbs.has(dbName);
        const newExpanded = new Set(node.expandedDbs);

        if (isDbExpanded) {
            newExpanded.delete(dbName);
        } else {
            newExpanded.add(dbName);
        }

        // Update state
        setConnections(prev => prev.map((c, i) => i === connIndex ? { ...c, expandedDbs: newExpanded } : c));

        // Update localStorage
        if (node.connection.id) {
            const expandedDbsMap = JSON.parse(localStorage.getItem("nosql_expanded_dbs") || "{}");
            expandedDbsMap[node.connection.id] = Array.from(newExpanded);
            localStorage.setItem("nosql_expanded_dbs", JSON.stringify(expandedDbsMap));
        }

        if (!isDbExpanded) {
            // Fetch collections if not already fetched
            if (!node.dbCollections[dbName]) {
                await refreshCollections(connIndex, dbName);
            }
        }
    };

    const refreshCollections = async (connIndex: number, dbName: string) => {
        const node = connections[connIndex];
        try {
            const res = await fetch("/api/nosql/collections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString: node.connection.connectionString,
                    dbName,
                }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            setConnections(prev => prev.map((c, i) => i === connIndex ? {
                ...c,
                dbCollections: { ...c.dbCollections, [dbName]: data.collections }
            } : c));
        } catch (error) {
            toast.error(t("toastCollectionsFail", { name: dbName }));
        }
    };

    const startEditing = (e: React.MouseEvent, conn: SavedConnection) => {
        e.stopPropagation();
        setEditingConnectionId(conn.id || null);
        setEditName(conn.name);
    };

    const cancelEditing = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingConnectionId(null);
        setEditName("");
    };

    const saveEditing = async (e: React.MouseEvent, conn: SavedConnection) => {
        e.stopPropagation();
        if (!user || !conn.id) return;

        try {
            await updateConnectionName(user.uid, conn.id, editName);
            setConnections(prev => prev.map(c => c.connection.id === conn.id ? { ...c, connection: { ...c.connection, name: editName } } : c));
            toast.success(t("toastRenamed"));
            setEditingConnectionId(null);
        } catch (error) {
            toast.error(t("toastRenameFail"));
        }
    };

    const handleDeleteConnection = async (index: number) => {
        const node = connections[index];
        if (!user || !node.connection.id) return;
        if (!confirm(t("confirmDeleteConnection", { name: node.connection.name }))) return;

        try {
            await deleteConnection(user.uid, node.connection.id);
            setConnections(prev => prev.filter((_, i) => i !== index));
            toast.success(t("toastDeleted"));
        } catch (error) {
            toast.error(t("toastDeleteConnFail"));
        }
    };

    const handleDropDatabase = async (connIndex: number, dbName: string) => {
        if (!confirm(t("confirmDropDb", { name: dbName }))) return;

        const node = connections[connIndex];
        try {
            const res = await fetch("/api/nosql/database/drop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString: node.connection.connectionString, dbName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(t("toastDbDropped", { name: dbName }));
            refreshDatabases(connIndex);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDropCollection = async (connIndex: number, dbName: string, collectionName: string) => {
        if (!confirm(t("confirmDropCollection", { name: collectionName }))) return;

        const node = connections[connIndex];
        try {
            const res = await fetch("/api/nosql/collection/drop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString: node.connection.connectionString, dbName, collectionName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(t("toastCollectionDropped", { name: collectionName }));
            refreshCollections(connIndex, dbName);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleRenameCollection = async () => {
        const { connection, dbName, collectionName, newName } = renameCollectionDialog;
        if (!connection || !newName) return;

        try {
            const res = await fetch("/api/nosql/collection/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString: connection.connectionString,
                    dbName,
                    collectionName,
                    newCollectionName: newName
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(t("toastCollectionRenamed", { name: newName }));
            setRenameCollectionDialog({ ...renameCollectionDialog, open: false });

            // Find connection index to refresh
            const connIndex = connections.findIndex(c => c.connection.id === connection.id);
            if (connIndex !== -1) {
                refreshCollections(connIndex, dbName);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleRenameDatabase = async () => {
        const { connection, dbName, newName } = renameDatabaseDialog;
        if (!connection || !newName) return;

        try {
            const res = await fetch("/api/nosql/database/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString: connection.connectionString,
                    oldDbName: dbName,
                    newDbName: newName
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success(t("toastDatabaseRenamed", { name: newName }));
            setRenameDatabaseDialog({ ...renameDatabaseDialog, open: false });

            // Find connection index to refresh
            const connIndex = connections.findIndex(c => c.connection.id === connection.id);
            if (connIndex !== -1) {
                refreshDatabases(connIndex);
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const matchesSearch = (text: string) => text.toLowerCase().includes(searchQuery.toLowerCase());

    const filteredConnections = connections.filter(node => {
        if (!searchQuery) return true;
        if (matchesSearch(node.connection.name)) return true;

        const hasMatchingDb = node.databases.some(db => {
            if (matchesSearch(db.name)) return true;
            const collections = node.dbCollections[db.name] || [];
            return collections.some(col => matchesSearch(col.name));
        });

        return hasMatchingDb;
    });

    const nosqlScrollRef = useRef<HTMLDivElement>(null);
    const { displayCount: nosqlDisplayCount, sentinelRef: nosqlSentinelRef, hasMore: nosqlHasMore } = useInfiniteScroll({
        totalCount: filteredConnections.length,
        resetKey: searchQuery,
        pageSize: 20,
        scrollContainerRef: nosqlScrollRef,
    });
    const visibleConnections = filteredConnections.slice(0, nosqlDisplayCount);

    return (
        <div
            className="border-r bg-muted/10 flex flex-col h-full flex-shrink-0 overflow-hidden"
            style={{ width: `${width}px` }}
        >
            <div className="p-4 border-b space-y-2">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{t("explorer")}</span>
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 md:h-6 px-2 text-xs gap-1"
                                        onClick={onAddConnection}
                                    >
                                        <IconPlus className="h-3 w-3" />
                                        <span>{t("add")}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("tooltipAdd")}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-6 md:w-6" onClick={loadConnections}>
                                        <IconRefresh className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("tooltipRefresh")}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
                <div className="relative">
                    <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 pl-7 text-xs"
                    />
                </div>
            </div>
            <div ref={nosqlScrollRef} className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                    {loading ? (
                        <div className="text-xs text-muted-foreground text-center p-4">{t("loadingConnections")}</div>
                    ) : filteredConnections.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center p-4">{t("noConnectionsFound")}</div>
                    ) : (
                        visibleConnections.map((node, index) => (
                            <div key={node.connection.id}>
                                <div className="flex items-center group touch-none">
                                    {editingConnectionId === node.connection.id ? (
                                        <div className="flex items-center gap-1 px-2 py-1 w-full">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-8 text-xs"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") saveEditing(e as any, node.connection);
                                                    if (e.key === "Escape") cancelEditing();
                                                }}
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={(e) => saveEditing(e, node.connection)}>
                                                <IconCheck className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={cancelEditing}>
                                                <IconX className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full justify-start gap-2 px-2 font-normal hover:bg-muted/50 relative h-9 md:h-8"
                                                        onClick={() => toggleConnection(index)}
                                                    >
                                                        {node.isExpanded ? (
                                                            <IconChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        ) : (
                                                            <IconChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        )}
                                                        <div className="relative shrink-0">
                                                            <IconServer className="h-4 w-4 text-purple-500" />
                                                            {/* Status dot */}
                                                            <span className={cn(
                                                                "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
                                                                node.error ? "bg-red-500" :
                                                                    node.isLoading ? "bg-yellow-400 animate-pulse" :
                                                                        node.databases.length > 0 ? "bg-green-500" :
                                                                            "bg-muted-foreground/40"
                                                            )} />
                                                        </div>
                                                        <span className="truncate flex-1 text-left text-sm">{node.connection.name}</span>

                                                        <div className="absolute right-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <div
                                                                        className="bg-background/80 hover:bg-muted rounded-sm p-1 cursor-pointer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <IconDotsVertical className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                                    </div>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                                                                    <DropdownMenuItem onClick={(e) => startEditing(e as any, node.connection)}>
                                                                        <IconEdit className="h-3 w-3 mr-2" /> {t("menuRename")}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigator.clipboard.writeText(node.connection.connectionString);
                                                                        toast.success(t("toastSidebarStringCopied"));
                                                                    }}>
                                                                        <IconCopy className="h-3 w-3 mr-2" /> {t("menuCopyConnectionString")}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteConnection(index);
                                                                    }}>
                                                                        <IconTrash className="h-3 w-3 mr-2" /> {t("menuDeleteConnection")}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    <p className="font-mono text-xs">{node.connection.connectionString}</p>
                                                    {node.error && <p className="text-destructive text-xs mt-1">{node.error}</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>

                                {node.isExpanded && (
                                    <div className="ml-4 border-l pl-2 mt-1 space-y-1">
                                        {node.isLoading ? (
                                            <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                                {t("connecting")}
                                            </div>
                                        ) : node.error ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-xs text-destructive px-2 py-1 flex items-center gap-1.5 cursor-default">
                                                            <IconAlertCircle className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{t("connectionFailed")}</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-[240px]">
                                                        <p className="text-xs">{node.error}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : node.databases.length === 0 ? (
                                            <div className="text-xs text-muted-foreground px-2 py-1">{t("noDatabases")}</div>
                                        ) : (
                                            node.databases
                                                .filter(db => {
                                                    if (!searchQuery) return true;
                                                    if (matchesSearch(node.connection.name)) return true;
                                                    if (matchesSearch(db.name)) return true;
                                                    const collections = node.dbCollections[db.name] || [];
                                                    return collections.some(col => matchesSearch(col.name));
                                                })
                                                .map((db) => (
                                                    <div key={db.name}>
                                                        <div className="group/db flex items-center pr-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="flex-1 justify-start gap-2 px-2 font-normal h-9 md:h-8 text-xs"
                                                                onClick={() => toggleDatabase(index, db.name)}
                                                            >
                                                                {node.expandedDbs.has(db.name) ? (
                                                                    <IconChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                ) : (
                                                                    <IconChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                )}
                                                                <IconDatabase className="h-3 w-3 text-blue-500 shrink-0" />
                                                                <span className="truncate">{db.name}</span>
                                                            </Button>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-6 md:w-6 opacity-100 md:opacity-0 group-hover/db:opacity-100 transition-opacity">
                                                                        <IconDotsVertical className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => refreshCollections(index, db.name)}>
                                                                        <IconRefresh className="h-3 w-3 mr-2" /> {t("refresh")}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        navigator.clipboard.writeText(db.name);
                                                                        toast.success(t("toastDbNameCopied"));
                                                                    }}>
                                                                        <IconCopy className="h-3 w-3 mr-2" /> {t("copyDbName")}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => setRenameDatabaseDialog({
                                                                        open: true,
                                                                        connection: node.connection,
                                                                        dbName: db.name,
                                                                        newName: db.name
                                                                    })}>
                                                                        <IconEdit className="h-3 w-3 mr-2" /> {t("menuRename")}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDropDatabase(index, db.name)}>
                                                                        <IconTrash className="h-3 w-3 mr-2" /> {t("dropDatabase")}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>

                                                        {node.expandedDbs.has(db.name) && (
                                                            <div className="ml-4 border-l pl-2 mt-1 space-y-1">
                                                                {!node.dbCollections[db.name] ? (
                                                                    <div className="text-xs text-muted-foreground px-2 py-1">{t("loading")}</div>
                                                                ) : node.dbCollections[db.name].length === 0 ? (
                                                                    <div className="text-xs text-muted-foreground px-2 py-1">{t("noCollections")}</div>
                                                                ) : (
                                                                    node.dbCollections[db.name]
                                                                        .filter(col => {
                                                                            if (!searchQuery) return true;
                                                                            if (matchesSearch(node.connection.name)) return true;
                                                                            if (matchesSearch(db.name)) return true;
                                                                            return matchesSearch(col.name);
                                                                        })
                                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                                        .map((col) => (
                                                                            <div key={col.name} className="group/col flex items-center pr-2">
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    className="flex-1 justify-start gap-2 px-2 font-normal h-9 md:h-8 text-xs"
                                                                                    onClick={() => onSelectCollection(node.connection, db.name, col.name)}
                                                                                >
                                                                                    <IconFolder className="h-3 w-3 text-yellow-500 shrink-0" />
                                                                                    <span className="truncate">{col.name}</span>
                                                                                    {col.documentCount !== undefined && col.documentCount !== null && (
                                                                                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                                                                                            {col.documentCount >= 1000000
                                                                                                ? `${(col.documentCount / 1000000).toFixed(1)}M`
                                                                                                : col.documentCount >= 1000
                                                                                                    ? `${(col.documentCount / 1000).toFixed(1)}K`
                                                                                                    : col.documentCount}
                                                                                        </span>
                                                                                    )}
                                                                                </Button>
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild>
                                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-6 md:w-6 opacity-100 md:opacity-0 group-hover/col:opacity-100 transition-opacity">
                                                                                            <IconDotsVertical className="h-3.5 w-3.5" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end">
                                                                                        <DropdownMenuItem onClick={() => setRenameCollectionDialog({
                                                                                            open: true,
                                                                                            connection: node.connection,
                                                                                            dbName: db.name,
                                                                                            collectionName: col.name,
                                                                                            newName: col.name
                                                                                        })}>
                                                                                            <IconEdit className="h-3 w-3 mr-2" /> {t("menuRename")}
                                                                                        </DropdownMenuItem>
                                                                                        <DropdownMenuSeparator />
                                                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDropCollection(index, db.name, col.name)}>
                                                                                            <IconTrash className="h-3 w-3 mr-2" /> {t("dropCollection")}
                                                                                        </DropdownMenuItem>
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </div>
                                                                        ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {nosqlHasMore && (
                        <div ref={nosqlSentinelRef} className="flex justify-center py-3">
                            <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={renameCollectionDialog.open} onOpenChange={(open) => setRenameCollectionDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("renameCollectionTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Input
                            value={renameCollectionDialog.newName}
                            onChange={(e) => setRenameCollectionDialog(prev => ({ ...prev, newName: e.target.value }))}
                            placeholder={t("placeholderNewCollection")}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameCollectionDialog(prev => ({ ...prev, open: false }))}>{t("cancel")}</Button>
                        <Button onClick={handleRenameCollection}>{t("rename")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={renameDatabaseDialog.open} onOpenChange={(open) => setRenameDatabaseDialog(prev => ({ ...prev, open }))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("renameDatabaseTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Input
                            value={renameDatabaseDialog.newName}
                            onChange={(e) => setRenameDatabaseDialog(prev => ({ ...prev, newName: e.target.value }))}
                            placeholder={t("placeholderNewDatabase")}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDatabaseDialog(prev => ({ ...prev, open: false }))}>{t("cancel")}</Button>
                        <Button onClick={handleRenameDatabase}>{t("rename")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
