"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Menu } from "lucide-react";
import {
    IconPlus,
    IconBrandRedux,
    IconDatabase,
    IconLock,
    IconTrash,
    IconTerminal2,
} from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { useVaultGuard } from "@/hooks/use-vault-guard";
import { VaultLockedPlaceholder } from "@/components/vault-locked-placeholder";
import { useMediaQuery } from "@/hooks/use-media-query";

import { ConnectionForm } from "@/components/redis-commander/connection-form";
import { KeyBrowser } from "@/components/redis-commander/key-browser";
import { ValueEditor } from "@/components/redis-commander/value-editor";
import { CommandPanel } from "@/components/redis-commander/command-panel";
import { getConnections, touchConnection } from "@/components/redis-commander/connection-service";
import { SavedRedisConnection, RedisTab } from "@/components/redis-commander/types";
import { cn } from "@/lib/utils";

function newTabId() {
    return `rtab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function RedisCommanderPage() {
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();
    const { isUnlocked } = useVaultGuard();
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const [connections, setConnections] = useState<SavedRedisConnection[]>([]);
    const [tabs, setTabs] = useState<RedisTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Per-tab state
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [dbSize, setDbSize] = useState(0);
    const [refreshKeysTick, setRefreshKeysTick] = useState(0);

    // Flush dialog
    const [flushDialogOpen, setFlushDialogOpen] = useState(false);
    const [flushPattern, setFlushPattern] = useState("");
    const [flushing, setFlushing] = useState(false);

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

    useEffect(() => {
        if (!user || !encryptionKey || isInitialized) return;
        setIsInitialized(true);
        getConnections(encryptionKey)
            .then(setConnections)
            .catch(() => {});
    }, [user, encryptionKey, isInitialized]);

    // Reset per-tab state when tab changes
    useEffect(() => {
        setSelectedKey(null);
        setDbSize(0);
    }, [activeTabId]);

    function openConnection(conn: SavedRedisConnection) {
        if (!conn.config) return;
        const existing = tabs.find((t) => t.connectionId === conn.id);
        if (existing) {
            setActiveTabId(existing.id);
            return;
        }
        const tab: RedisTab = {
            id: newTabId(),
            connectionId: conn.id,
            connectionName: conn.name,
            redisUrl: conn.config.redisUrl,
        };
        setTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
        touchConnection(conn.id).catch(() => {});
    }

    function closeTab(tabId: string) {
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== tabId);
            if (activeTabId === tabId) {
                setActiveTabId(next[next.length - 1]?.id ?? null);
            }
            return next;
        });
    }

    const handleRefreshKeys = useCallback(() => {
        setRefreshKeysTick((t) => t + 1);
    }, []);

    async function handleFlush() {
        if (!activeTab) return;
        setFlushing(true);
        try {
            const res = await fetch("/api/redis-commander/flush", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    redisUrl: activeTab.redisUrl,
                    pattern: flushPattern.trim() || undefined,
                }),
            });
            const data = await res.json() as { success?: boolean; deleted?: number; error?: string };
            if (data.error) throw new Error(data.error);
            const msg =
                data.deleted === -1
                    ? "Database flushed"
                    : `${data.deleted} key${data.deleted !== 1 ? "s" : ""} deleted`;
            toast.success(msg);
            setSelectedKey(null);
            handleRefreshKeys();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Flush failed");
        } finally {
            setFlushing(false);
            setFlushDialogOpen(false);
            setFlushPattern("");
        }
    }

    if (!isUnlocked) {
        return (
            <VaultLockedPlaceholder appName="Redis Commander" />
        );
    }

    const sidebar = (
        <div className="flex h-full flex-col border-r bg-background">
            <div className="flex items-center justify-between px-3 py-2.5 border-b">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <IconBrandRedux className="size-4 text-red-500" />
                    Redis Commander
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setIsConnectionDialogOpen(true)}
                >
                    <IconPlus className="size-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
                {connections.length === 0 && (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                        No saved connections.
                        <br />
                        <button
                            className="mt-1 underline hover:no-underline"
                            onClick={() => setIsConnectionDialogOpen(true)}
                        >
                            Add one
                        </button>
                    </div>
                )}
                {connections.map((conn) => {
                    const isOpen = tabs.some((t) => t.connectionId === conn.id);
                    return (
                        <button
                            key={conn.id}
                            onClick={() => openConnection(conn)}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors hover:bg-accent",
                                isOpen && "bg-accent"
                            )}
                        >
                            <IconBrandRedux className="size-4 shrink-0 text-red-500" />
                            <span className="flex-1 truncate">{conn.name}</span>
                            {isOpen && (
                                <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const mainContent =
        tabs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
                <div className="rounded-full bg-red-500/10 p-4">
                    <IconDatabase className="size-8 text-red-500" />
                </div>
                <div>
                    <h2 className="font-semibold text-lg">Redis Commander</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Connect to a Redis instance to browse keys, inspect values, and run commands.
                        Credentials are encrypted and never stored in plaintext.
                    </p>
                </div>
                <Button onClick={() => setIsConnectionDialogOpen(true)}>
                    <IconPlus className="mr-2 size-4" />
                    New Connection
                </Button>
            </div>
        ) : (
            <div className="flex h-full flex-col">
                {/* Tab bar */}
                <div className="flex items-center gap-0 border-b overflow-x-auto scrollbar-none shrink-0">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={cn(
                                "flex items-center gap-1.5 border-r px-3 py-2 text-sm cursor-pointer select-none shrink-0 transition-colors hover:bg-accent",
                                activeTabId === tab.id && "bg-accent border-b-2 border-b-red-500"
                            )}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            <IconBrandRedux className="size-3.5 text-red-500 shrink-0" />
                            <span className="max-w-[140px] truncate">{tab.connectionName}</span>
                            <button
                                className="ml-1 rounded hover:text-destructive transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.id);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    {activeTab && (
                        <div className="ml-auto flex items-center gap-1 px-2 shrink-0">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                                onClick={() => setFlushDialogOpen(true)}
                            >
                                <IconTrash className="size-3.5" />
                                Flush
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tab content */}
                {activeTab && (
                    <div className="flex-1 min-h-0">
                        <ResizablePanelGroup direction="horizontal" className="h-full">
                            <ResizablePanel defaultSize={22} minSize={16} maxSize={40}>
                                <KeyBrowser
                                    key={`${activeTab.id}-${refreshKeysTick}`}
                                    redisUrl={activeTab.redisUrl}
                                    selectedKey={selectedKey}
                                    onSelectKey={setSelectedKey}
                                    dbSize={dbSize}
                                    onDbSizeChange={setDbSize}
                                />
                            </ResizablePanel>
                            <ResizableHandle />
                            <ResizablePanel defaultSize={78} minSize={40}>
                                <Tabs defaultValue="editor" className="h-full flex flex-col">
                                    <TabsList className="h-8 rounded-none border-b w-full justify-start gap-0 p-0 bg-transparent shrink-0">
                                        <TabsTrigger
                                            value="editor"
                                            className="h-8 rounded-none border-r px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none"
                                        >
                                            <IconDatabase className="mr-1.5 size-3.5" />
                                            Key Editor
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="console"
                                            className="h-8 rounded-none border-r px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none"
                                        >
                                            <IconTerminal2 className="mr-1.5 size-3.5" />
                                            Console
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="editor" className="flex-1 min-h-0 mt-0">
                                        <ValueEditor
                                            redisUrl={activeTab.redisUrl}
                                            selectedKey={selectedKey}
                                            onKeyDeleted={(k) => {
                                                if (selectedKey === k) setSelectedKey(null);
                                                handleRefreshKeys();
                                            }}
                                            onRefreshKeys={handleRefreshKeys}
                                        />
                                    </TabsContent>
                                    <TabsContent value="console" className="flex-1 min-h-0 mt-0">
                                        <CommandPanel redisUrl={activeTab.redisUrl} />
                                    </TabsContent>
                                </Tabs>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </div>
                )}
            </div>
        );

    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Desktop sidebar */}
            {isDesktop ? (
                <div className="w-56 shrink-0 h-full overflow-hidden">{sidebar}</div>
            ) : (
                <>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute left-2 top-2 z-10 size-8"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        <Menu className="size-4" />
                    </Button>
                    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
                        <SheetContent side="left" className="w-64 p-0">
                            <VisuallyHidden>
                                <SheetTitle>Connections</SheetTitle>
                            </VisuallyHidden>
                            {sidebar}
                        </SheetContent>
                    </Sheet>
                </>
            )}

            <div className="flex-1 min-w-0 h-full overflow-hidden">{mainContent}</div>

            {/* Connection dialog */}
            <Dialog open={isConnectionDialogOpen} onOpenChange={setIsConnectionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <IconBrandRedux className="size-5 text-red-500" />
                            Redis Connections
                        </DialogTitle>
                    </DialogHeader>
                    <ConnectionForm
                        encryptionKey={encryptionKey!}
                        connections={connections}
                        onConnect={openConnection}
                        onConnectionsChange={setConnections}
                        onClose={() => setIsConnectionDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Flush confirmation */}
            <AlertDialog open={flushDialogOpen} onOpenChange={setFlushDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Flush Keys</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter a pattern to delete matching keys, or leave blank to flush the entire
                            database (requires <code>DANGER_ZONE=true</code>).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1.5 py-2">
                        <Label>Pattern (optional)</Label>
                        <Input
                            placeholder="e.g. session:* — blank = FLUSHDB"
                            value={flushPattern}
                            onChange={(e) => setFlushPattern(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={(e) => {
                                e.preventDefault();
                                handleFlush();
                            }}
                            disabled={flushing}
                        >
                            {flushing ? "Flushing…" : "Flush"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
