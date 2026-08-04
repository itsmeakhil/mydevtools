"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { useVaultGuard } from "@/hooks/use-vault-guard";
import { useMediaQuery } from "@/hooks/use-media-query";
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder";
import { VaultRestoringSkeleton } from "@/components/vault-restoring-skeleton";
import { UnifiedTabBar } from "@/components/data-explorer/unified-tab-bar";
import { ConnectionDialog } from "@/components/data-explorer/connection-dialog";
import { UnifiedSidebar } from "@/components/data-explorer/unified-sidebar";
import { listConnections, touchConnection } from "@/components/data-explorer/connection-service";
import { getAdapter } from "@/components/data-explorer/sources";
import type {
    OpenTabRequest,
    UnifiedConnection,
    UnifiedTab,
} from "@/components/data-explorer/types";

export default function DataExplorerPage() {
    const t = useTranslations("DataExplorer");
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();
    const { isUnlocked, isRestoring } = useVaultGuard();
    const isWide = useMediaQuery("(min-width: 768px)");

    const [connections, setConnections] = useState<UnifiedConnection[]>([]);
    const [tabs, setTabs] = useState<UnifiedTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<UnifiedConnection | null>(null);
    // Consumed by the legacy-import dialog in Task 14.
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    /** True once a connection fetch has *succeeded*. Gates tab pruning. */
    const [connectionsLoaded, setConnectionsLoaded] = useState(false);

    const reloadConnections = useCallback(async () => {
        if (!user || !encryptionKey) return;
        try {
            setConnections(await listConnections(encryptionKey));
            setConnectionsLoaded(true);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("toast.loadFailed"));
        }
    }, [user, encryptionKey]);

    useEffect(() => {
        void reloadConnections();
    }, [reloadConnections]);

    // Restore tabs, adapter `state` included.
    useEffect(() => {
        if (!user) return;
        const raw = localStorage.getItem(`data_explorer_tabs_${user.uid}`);
        if (raw) {
            try {
                setTabs(JSON.parse(raw) as UnifiedTab[]);
            } catch {
                localStorage.removeItem(`data_explorer_tabs_${user.uid}`);
            }
        }
        const savedActive = localStorage.getItem(`data_explorer_active_tab_id_${user.uid}`);
        if (savedActive) setActiveTabId(savedActive);
        setIsInitialized(true);
    }, [user]);

    // Persists the whole tab array, adapter `state` included — that is what
    // restores a Mongo tab's page/query/sort across sessions. Adapter state is
    // contractually structural-only: fetched rows live in the adapter's actions
    // hook, never on the tab, so this stays far below the localStorage quota.
    useEffect(() => {
        if (!isInitialized || !user) return;
        const key = `data_explorer_tabs_${user.uid}`;
        try {
            localStorage.setItem(key, JSON.stringify(tabs));
        } catch (e) {
            console.warn("data-explorer tabs: localStorage write failed", e);
            try {
                localStorage.removeItem(key);
            } catch {
                /* noop */
            }
        }
    }, [tabs, isInitialized, user]);

    useEffect(() => {
        if (!isInitialized || !user) return;
        const key = `data_explorer_active_tab_id_${user.uid}`;
        try {
            if (activeTabId) localStorage.setItem(key, activeTabId);
            else localStorage.removeItem(key);
        } catch {
            /* noop */
        }
    }, [activeTabId, isInitialized, user]);

    const openTab = useCallback(
        (connection: UnifiedConnection, req: OpenTabRequest) => {
            const id = `${connection.id}:${req.key}`;
            setMobileSidebarOpen(false);
            setTabs((prev) => {
                if (prev.some((tab) => tab.id === id)) return prev;
                return [
                    ...prev,
                    {
                        id,
                        connectionId: connection.id,
                        sourceId: connection.sourceId,
                        title: req.title,
                        subtitle: req.subtitle,
                        connectionColor: connection.color ?? null,
                        readOnly: connection.readOnly ?? false,
                        state: req.state,
                    },
                ];
            });
            setActiveTabId(id);
            void touchConnection(connection.id).catch(() => {});
        },
        []
    );

    // Drop tabs whose connection was deleted, so they never fall through to the
    // "unsupported source" pane. Gated on BOTH flags: `connections` is [] until
    // the first fetch resolves and tabs are restored from localStorage on mount,
    // so pruning any earlier would wipe every restored tab on a cold start. A
    // failed fetch never sets `connectionsLoaded`, so it never prunes either.
    // Zero connections is a legitimate loaded state and does prune.
    useEffect(() => {
        if (!connectionsLoaded || !isInitialized) return;
        const live = new Set(connections.map((c) => c.id));
        if (tabs.some((tab) => !live.has(tab.connectionId))) {
            setTabs((prev) => prev.filter((tab) => live.has(tab.connectionId)));
        }
        const active = tabs.find((tab) => tab.id === activeTabId);
        if (active && !live.has(active.connectionId)) setActiveTabId(null);
    }, [connections, connectionsLoaded, isInitialized, tabs, activeTabId]);

    const setTabState = useCallback((tabId: string, updater: (prev: unknown) => unknown) => {
        setTabs((prev) =>
            prev.map((tab) => (tab.id === tabId ? { ...tab, state: updater(tab.state) } : tab))
        );
    }, []);

    const closeTab = useCallback(
        (tabId: string) => {
            setTabs((prev) => {
                const idx = prev.findIndex((tab) => tab.id === tabId);
                const next = prev.filter((tab) => tab.id !== tabId);
                if (activeTabId === tabId) {
                    setActiveTabId((prev[idx - 1] ?? prev[idx + 1])?.id ?? null);
                }
                return next;
            });
        },
        [activeTabId]
    );

    const closeAllTabs = useCallback(() => {
        setTabs([]);
        setActiveTabId(null);
    }, []);

    // Stable identities — the sidebar memoises its connection rows on them.
    const handleAddConnection = useCallback(() => {
        setEditingConnection(null);
        setConnectionDialogOpen(true);
    }, []);

    const handleEditConnection = useCallback((connection: UnifiedConnection) => {
        setEditingConnection(connection);
        setConnectionDialogOpen(true);
    }, []);

    const handleConnectionsChanged = useCallback(() => {
        void reloadConnections();
    }, [reloadConnections]);

    const handleImportLegacy = useCallback(() => setImportDialogOpen(true), []);

    const activeTab = useMemo(
        () => tabs.find((tab) => tab.id === activeTabId) ?? null,
        [tabs, activeTabId]
    );
    const activeConnection = useMemo(
        () => (activeTab ? connections.find((c) => c.id === activeTab.connectionId) ?? null : null),
        [activeTab, connections]
    );

    if (isRestoring) return <VaultRestoringSkeleton />;
    if (!isUnlocked) return <VaultLockedPlaceholder appName="Data Explorer" />;

    const sidebar = (
        <UnifiedSidebar
            connections={connections}
            onOpenTab={openTab}
            onAddConnection={handleAddConnection}
            onEditConnection={handleEditConnection}
            onConnectionsChanged={handleConnectionsChanged}
            onImportLegacy={handleImportLegacy}
        />
    );

    const body = (() => {
        if (!activeTab) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                    <h2 className="font-semibold text-lg">{t("noTabsTitle")}</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">{t("noTabsBody")}</p>
                </div>
            );
        }
        const adapter = getAdapter(activeTab.sourceId);
        if (!adapter || !activeConnection?.config) {
            return (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                    <IconAlertTriangle className="size-8 text-amber-500" />
                    <h2 className="font-semibold">{t("unsupportedSource")}</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {t("unsupportedSourceHint")}
                    </p>
                </div>
            );
        }
        const Pane = adapter.Pane;
        return (
            <Pane
                connection={activeConnection}
                config={activeConnection.config}
                tab={activeTab}
                state={activeTab.state}
                setState={(updater: (prev: unknown) => unknown) => setTabState(activeTab.id, updater)}
            />
        );
    })();

    return (
        <div className="flex h-full min-h-0">
            {isWide ? (
                <div className="w-64 shrink-0">{sidebar}</div>
            ) : (
                <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                    <SheetContent side="left" className="w-72 p-0">
                        <VisuallyHidden>
                            <SheetTitle>{t("title")}</SheetTitle>
                        </VisuallyHidden>
                        {sidebar}
                    </SheetContent>
                </Sheet>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
                <UnifiedTabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onTabClose={closeTab}
                    onCloseAll={closeAllTabs}
                />
                <div className="min-h-0 flex-1">{body}</div>
            </div>
            <ConnectionDialog
                open={connectionDialogOpen}
                onOpenChange={(open) => {
                    setConnectionDialogOpen(open);
                    if (!open) setEditingConnection(null);
                }}
                editing={editingConnection}
                onSaved={() => void reloadConnections()}
            />
        </div>
    );
}
