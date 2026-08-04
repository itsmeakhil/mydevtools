"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    IconAlertTriangle,
    IconChevronRight,
    IconDots,
    IconDownload,
    IconEdit,
    IconLock,
    IconPlus,
    IconSearch,
    IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { SOURCES, SOURCE_ORDER, getAdapter } from "./sources";
import { deleteConnection } from "./connection-service";
import type { OpenTabRequest, SourceId, UnifiedConnection } from "./types";

interface UnifiedSidebarProps {
    connections: UnifiedConnection[];
    onOpenTab: (connection: UnifiedConnection, req: OpenTabRequest) => void;
    onAddConnection: () => void;
    onEditConnection: (connection: UnifiedConnection) => void;
    onConnectionsChanged: () => void;
    onImportLegacy: () => void;
}

interface ConnectionRowProps {
    connection: UnifiedConnection;
    expanded: boolean;
    onToggle: (connectionId: string) => void;
    onOpenTab: (connection: UnifiedConnection, req: OpenTabRequest) => void;
    onEdit: (connection: UnifiedConnection) => void;
    onDelete: (connection: UnifiedConnection) => void;
    onConnectionsChanged: () => void;
}

const ConnectionRow = React.memo(function ConnectionRow({
    connection,
    expanded,
    onToggle,
    onOpenTab,
    onEdit,
    onDelete,
    onConnectionsChanged,
}: ConnectionRowProps) {
    const t = useTranslations("DataExplorer");
    const adapter = getAdapter(connection.sourceId);
    const supported = adapter !== null;

    const openTab = useCallback(
        (req: OpenTabRequest) => onOpenTab(connection, req),
        [onOpenTab, connection]
    );

    const Icon = adapter?.icon ?? IconAlertTriangle;

    return (
        <div>
            <div className="group flex items-center pr-1">
                <button
                    type="button"
                    disabled={!supported}
                    onClick={() => onToggle(connection.id)}
                    className={cn(
                        "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        supported ? "hover:bg-muted/60" : "cursor-default opacity-60"
                    )}
                >
                    <IconChevronRight
                        className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                            expanded && "rotate-90 text-foreground",
                            !supported && "invisible"
                        )}
                    />
                    <Icon
                        className={cn(
                            "size-4 shrink-0",
                            supported ? adapter?.accent : "text-amber-500"
                        )}
                    />
                    <span className="min-w-0 flex-1 truncate">{connection.name}</span>
                    {connection.readOnly && (
                        <IconLock className="size-3 shrink-0 text-amber-500" />
                    )}
                    {connection.color && (
                        <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: connection.color }}
                        />
                    )}
                </button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                        >
                            <IconDots className="size-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {supported && (
                            <>
                                <DropdownMenuItem onClick={() => onEdit(connection)}>
                                    <IconEdit className="mr-2 size-3.5" />
                                    {t("menuEdit")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(connection)}
                        >
                            <IconTrash className="mr-2 size-3.5" />
                            {t("menuDelete")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {!supported && (
                <p className="px-2 pb-1 pl-8 text-[11px] text-muted-foreground">
                    {t("unsupportedSource")}
                </p>
            )}

            <AnimatePresence initial={false}>
                {supported && expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 overflow-hidden border-l pl-2"
                    >
                        <adapter.SidebarTree
                            connection={connection}
                            config={connection.config}
                            openTab={openTab}
                            onConnectionsChanged={onConnectionsChanged}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

/** Bucket for connections whose sourceId has no registered adapter. */
const UNSUPPORTED_GROUP = "__unsupported__";

export function UnifiedSidebar({
    connections,
    onOpenTab,
    onAddConnection,
    onEditConnection,
    onConnectionsChanged,
    onImportLegacy,
}: UnifiedSidebarProps) {
    const t = useTranslations("DataExplorer");
    const [query, setQuery] = useState("");
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [pendingDelete, setPendingDelete] = useState<UnifiedConnection | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const safe = connections.filter(
            (c): c is UnifiedConnection => !!c && typeof c.id === "string"
        );
        return q ? safe.filter((c) => c.name.toLowerCase().includes(q)) : safe;
    }, [connections, query]);

    const groups = useMemo(() => {
        const byId = new Map<SourceId, UnifiedConnection[]>();
        for (const connection of filtered) {
            const key = getAdapter(connection.sourceId) ? connection.sourceId : UNSUPPORTED_GROUP;
            const bucket = byId.get(key);
            if (bucket) bucket.push(connection);
            else byId.set(key, [connection]);
        }
        return [...SOURCE_ORDER, UNSUPPORTED_GROUP]
            .map((id) => ({ id, items: byId.get(id) ?? [] }))
            .filter((group) => group.items.length > 0);
    }, [filtered]);

    const toggleConnection = useCallback((connectionId: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (!next.delete(connectionId)) next.add(connectionId);
            return next;
        });
    }, []);

    const toggleGroup = useCallback((groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (!next.delete(groupId)) next.add(groupId);
            return next;
        });
    }, []);

    const requestDelete = useCallback((connection: UnifiedConnection) => {
        setPendingDelete(connection);
    }, []);

    async function confirmDelete() {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteConnection(pendingDelete.id);
            toast.success(t("toast.deleted"));
            setPendingDelete(null);
            onConnectionsChanged();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("toast.deleteFailed"));
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="flex h-full flex-col overflow-hidden border-r bg-muted/10">
            <div className="space-y-2 border-b p-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t("title")}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={t("addConnection")}
                        onClick={onAddConnection}
                    >
                        <IconPlus className="size-4" />
                    </Button>
                </div>
                <div className="relative">
                    <IconSearch className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("searchConnections")}
                        className="h-9 pl-7 text-xs"
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {connections.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 p-6 text-center">
                        <p className="text-sm font-medium">{t("emptyTitle")}</p>
                        <p className="text-xs text-muted-foreground">{t("emptyBody")}</p>
                        <Button size="sm" className="mt-1 gap-1.5" onClick={onAddConnection}>
                            <IconPlus className="size-3.5" />
                            {t("addConnection")}
                        </Button>
                    </div>
                ) : groups.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                        {t("noResults")}
                    </p>
                ) : (
                    groups.map((group) => {
                        const source = SOURCES[group.id];
                        const GroupIcon = source?.icon ?? IconAlertTriangle;
                        const open = !collapsedGroups.has(group.id);
                        return (
                            <div key={group.id} className="space-y-0.5">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.id)}
                                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                                >
                                    <IconChevronRight
                                        className={cn(
                                            "size-3 transition-transform duration-200",
                                            open && "rotate-90"
                                        )}
                                    />
                                    <GroupIcon
                                        className={cn(
                                            "size-3.5",
                                            source?.accent ?? "text-amber-500"
                                        )}
                                    />
                                    <span className="truncate">
                                        {source?.label ?? t("unsupportedSource")}
                                    </span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {open && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-0.5 overflow-hidden"
                                        >
                                            {group.items.map((connection) => (
                                                <ConnectionRow
                                                    key={connection.id}
                                                    connection={connection}
                                                    expanded={expandedIds.has(connection.id)}
                                                    onToggle={toggleConnection}
                                                    onOpenTab={onOpenTab}
                                                    onEdit={onEditConnection}
                                                    onDelete={requestDelete}
                                                    onConnectionsChanged={onConnectionsChanged}
                                                />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="border-t p-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-1.5 text-xs text-muted-foreground"
                    onClick={onImportLegacy}
                >
                    <IconDownload className="size-3.5" />
                    {t("importLegacy")}
                </Button>
            </div>

            <AlertDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !deleting) setPendingDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("deleteBody", { name: pendingDelete?.name ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>
                            {t("connectionDialog.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmDelete();
                            }}
                        >
                            {t("menuDelete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
