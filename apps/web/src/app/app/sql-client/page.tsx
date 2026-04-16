"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { IconPlus, IconDatabase, IconTable, IconLock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTranslations } from "next-intl";

import { SchemaSidebar } from "@/components/sql-client/schema-sidebar";
import { ConnectionForm } from "@/components/sql-client/connection-form";
import { QueryEditor } from "@/components/sql-client/query-editor";
import { getConnections } from "@/components/sql-client/connection-service";
import { DbType, QueryResult, QueryTab, SavedSqlConnection, TableInfo } from "@/components/sql-client/types";

function newTabId() {
    return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function SqlClientPage() {
    const t = useTranslations("SqlClient.page");
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [connections, setConnections] = useState<SavedSqlConnection[]>([]);
    const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
    const [tabs, setTabs] = useState<QueryTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
    const sidebarWidthRef = useRef(sidebarWidth);

    useEffect(() => { sidebarWidthRef.current = sidebarWidth; }, [sidebarWidth]);

    useEffect(() => {
        const saved = localStorage.getItem("sql_sidebar_width");
        if (saved) setSidebarWidth(parseInt(saved, 10));
    }, []);

    useEffect(() => {
        if (isResizing) {
            const onMove = (e: MouseEvent) => {
                if (!resizeStartRef.current) return;
                const delta = e.clientX - resizeStartRef.current.x;
                const w = Math.max(180, Math.min(500, resizeStartRef.current.width + delta));
                setSidebarWidth(w);
            };
            const onUp = () => {
                setIsResizing(false);
                resizeStartRef.current = null;
                localStorage.setItem("sql_sidebar_width", sidebarWidthRef.current.toString());
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            document.body.style.userSelect = "none";
            document.body.style.cursor = "col-resize";
            return () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
                document.body.style.userSelect = "";
                document.body.style.cursor = "";
            };
        }
    }, [isResizing]);

    const loadConnections = async () => {
        if (!encryptionKey) return;
        try {
            const conns = await getConnections(encryptionKey);
            setConnections(conns);
        } catch (err) {
            toast.error(t("toastLoadFail"));
        }
    };

    useEffect(() => {
        if (user && encryptionKey) loadConnections();
    }, [user, encryptionKey]);

    const handleConnected = (conn: SavedSqlConnection) => {
        setIsConnectionDialogOpen(false);
        setMobileSidebarOpen(false);
        loadConnections();
        openQueryTab(conn);
    };

    const openQueryTab = (conn: SavedSqlConnection, initialQuery?: string) => {
        setActiveConnectionId(conn.id);
        const id = newTabId();
        const newTab: QueryTab = {
            id,
            connectionId: conn.id,
            connectionName: conn.name,
            connectionType: conn.type as DbType,
            query: initialQuery ?? "SELECT 1;",
            result: null,
            error: null,
            loading: false,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(id);
    };

    const handleSelectTable = (conn: SavedSqlConnection, table: TableInfo) => {
        setMobileSidebarOpen(false);
        const query = `SELECT *\nFROM ${table.schema !== "public" && table.schema ? `"${table.schema}".` : ""}"${table.name}"\nLIMIT 100;`;
        openQueryTab(conn, query);
    };

    const handleSelectConnection = (conn: SavedSqlConnection) => {
        setActiveConnectionId(conn.id);
    };

    const closeTab = (tabId: string) => {
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== tabId);
            if (activeTabId === tabId) {
                const idx = prev.findIndex((t) => t.id === tabId);
                const fallback = prev[idx - 1] ?? prev[idx + 1];
                setActiveTabId(fallback?.id ?? null);
            }
            return next;
        });
    };

    const updateTab = (tabId: string, patch: Partial<QueryTab>) => {
        setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t)));
    };

    const activeTab = tabs.find((t) => t.id === activeTabId);
    const activeConnection = connections.find((c) => c.id === activeTab?.connectionId);

    const sidebar = (
        <SchemaSidebar
            width={isDesktop ? sidebarWidth : 300}
            connections={connections}
            activeConnectionId={activeConnectionId}
            onSelectTable={handleSelectTable}
            onAddConnection={() => setIsConnectionDialogOpen(true)}
            onSelectConnection={handleSelectConnection}
        />
    );

    return (
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden mobile-nav-offset">
            {/* Sidebar */}
            {isDesktop ? (
                <>
                    {sidebar}
                    <div
                        className={cn(
                            "w-2 bg-border/50 hover:bg-primary/50 cursor-col-resize flex-shrink-0 transition-all z-50",
                            isResizing && "bg-primary/50"
                        )}
                        onMouseDown={(e) => {
                            setIsResizing(true);
                            resizeStartRef.current = { x: e.clientX, width: sidebarWidth };
                        }}
                    />
                </>
            ) : (
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent side="left" className="p-0 w-[85vw] sm:w-[350px]">
                        <VisuallyHidden><SheetTitle>{t("mobileSheetTitle")}</SheetTitle></VisuallyHidden>
                        {sidebar}
                    </SheetContent>
                </Sheet>
            )}

            {/* Main area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background min-w-0">
                {/* Mobile toolbar */}
                {!isDesktop && (
                    <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 shrink-0"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground flex-1 truncate">
                            {activeTab ? activeTab.connectionName : t("title")}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => setIsConnectionDialogOpen(true)}
                        >
                            <IconPlus className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Tab bar */}
                {tabs.length > 0 && (
                    <div className="flex items-center border-b overflow-x-auto flex-shrink-0 bg-muted/30 min-h-[36px]">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-xs border-r whitespace-nowrap transition-colors min-w-0 max-w-[160px]",
                                    activeTabId === tab.id
                                        ? "bg-background text-foreground border-b-2 border-b-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <IconTable className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{tab.connectionName}</span>
                                <span
                                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                    className="ml-1 hover:text-destructive flex-shrink-0 rounded p-0.5 hover:bg-muted"
                                >
                                    ×
                                </span>
                            </button>
                        ))}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 mx-1 flex-shrink-0"
                            onClick={() => connections[0] && openQueryTab(connections[0])}
                            disabled={connections.length === 0}
                            title={t("newTabLabel")}
                        >
                            <IconPlus className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {activeTab ? (
                        <QueryEditor
                            key={activeTab.id}
                            tab={activeTab}
                            connection={activeConnection}
                            onQueryChange={(q) => updateTab(activeTab.id, { query: q })}
                            onResult={(result, error) => updateTab(activeTab.id, { result, error })}
                            onClose={() => closeTab(activeTab.id)}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 animate-in fade-in zoom-in duration-300">
                            {!encryptionKey ? (
                                <div className="text-center space-y-4 max-w-sm">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                                        <IconLock className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">{t("vaultLockedTitle")}</h3>
                                        <p className="text-sm mt-1">
                                            {t("vaultLockedDesc")}
                                        </p>
                                    </div>
                                </div>
                            ) : connections.length === 0 ? (
                                <div className="text-center space-y-6 max-w-md">
                                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                                        <IconDatabase className="w-10 h-10 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                            {t("heroTitle")}
                                        </h2>
                                        <p className="text-muted-foreground">
                                            {t("heroDesc")}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-left">
                                        {(["PostgreSQL", "MySQL", "MariaDB"] as const).map((db) => (
                                            <div key={db} className="p-3 rounded-xl bg-card border shadow-sm text-center">
                                                <p className="text-xs font-medium">{db}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() => setIsConnectionDialogOpen(true)}
                                        className="gap-2 shadow-lg"
                                    >
                                        <IconPlus className="w-5 h-5" />
                                        {t("heroAddConnection")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto">
                                        <IconTable className="w-7 h-7 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{t("selectTableTitle")}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("selectTableDesc")}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Connection dialog — wider than default to fit form + saved-connections panel */}
            {isDesktop ? (
                <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
                    <DialogContent className="max-w-[780px] p-0 overflow-hidden gap-0">
                        <DialogHeader className="px-6 pt-5 pb-0">
                            <DialogTitle>{t("dialogTitle")}</DialogTitle>
                        </DialogHeader>
                        <ConnectionForm
                            savedConnections={connections}
                            onConnected={handleConnected}
                            onConnectionsChanged={loadConnections}
                        />
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
                    <DrawerContent className="max-h-[90vh]">
                        <DrawerHeader>
                            <DrawerTitle>{t("dialogTitle")}</DrawerTitle>
                        </DrawerHeader>
                        <div className="overflow-y-auto">
                            <ConnectionForm
                                savedConnections={connections}
                                onConnected={handleConnected}
                                onConnectionsChanged={loadConnections}
                            />
                        </div>
                    </DrawerContent>
                </Drawer>
            )}
        </div>
    );
}
