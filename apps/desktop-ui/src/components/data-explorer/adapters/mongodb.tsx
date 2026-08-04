"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    IconActivity,
    IconAlertCircle,
    IconArrowsExchange,
    IconBrandMongodb,
    IconChevronRight,
    IconDatabase,
    IconDots,
    IconEdit,
    IconFiles,
    IconFolder,
    IconRefresh,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/desktop/api-fetch";
import {
    sanitizeError,
    validateCollectionName,
    validateDbName,
} from "@/lib/nosql-error-sanitizer";
import {
    DB_DIALECTS,
    DB_TYPE_ORDER,
    normalizeConnectionString,
    type DbType,
} from "@/lib/nosql-dialects";
import { CONNECTION_COLORS } from "@/components/nosql-explorer/connection-form";
import {
    SidebarDialogs,
    type BulkDeleteState,
    type DeleteConnState,
    type DropCollState,
    type DropDbState,
    type RenameCollectionState,
    type RenameDatabaseState,
} from "@/components/nosql-explorer/sidebar-dialogs";
import { GridFsBrowser } from "@/components/nosql-explorer/gridfs-browser";
import { SyncDialog } from "@/components/nosql-explorer/sync-dialog";
import { ServerMonitor } from "@/components/nosql-explorer/server-monitor";
import type { Collection, Database, SavedConnection } from "@/components/nosql-explorer/types";
import type { ConnectionFormProps, SidebarTreeProps, SourceAdapter } from "../types";

export interface MongoConfig {
    connectionString: string;
    dbType: DbType;
}

export interface MongoTabState {
    dbName: string;
    collectionName: string;
    page: number;
    limit: number;
    query: string;
    sortField: string | null;
    sortDirection: "asc" | "desc";
}

function blankConfig(): MongoConfig {
    return { connectionString: "", dbType: "mongodb" };
}

/** Keys are relative to the `DataExplorer` namespace; the dialog resolves them via t(). */
function validate(config: MongoConfig): string | null {
    const value = config.connectionString.trim();
    if (!value) return "validation.connectionStringRequired";
    if (!/^mongodb(\+srv)?:\/\//i.test(value)) {
        return "validation.connectionStringScheme";
    }
    return null;
}

async function testConnection(config: MongoConfig): Promise<void> {
    const connectionString = normalizeConnectionString(
        config.dbType,
        config.connectionString.trim()
    );
    const res = await apiFetch("/api/nosql/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
    });
    const data = await res.json();
    // Sanitised so credentials embedded in the connection string never surface.
    // No server message to report → empty message; the dialog supplies its own copy.
    if (!res.ok || !data.success) throw new Error(data.error ? sanitizeError(data.error) : "");
}

/**
 * Controlled-input form: reports values up via `onSubmit`. Never persists,
 * never calls the connection service, never toasts — the connection dialog
 * owns validate → testConnection → persist and renders `error` inline.
 */
function MongoConnectionForm({ initial, saving, error, onSubmit, onCancel }: ConnectionFormProps<MongoConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
    const [connectionString, setConnectionString] = useState(initial.config.connectionString);
    const [dbType, setDbType] = useState<DbType>(initial.config.dbType);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit({ name, folder, color, readOnly, config: { connectionString, dbType } });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="mongo-name">{t("name")}</Label>
                <Input
                    id="mongo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="mongo-folder">{t("folder")}</Label>
                <Input
                    id="mongo-folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t("folderPlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label>{t("dbType")}</Label>
                <div className="grid grid-cols-2 gap-2">
                    {DB_TYPE_ORDER.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setDbType(type)}
                            disabled={saving}
                            className={cn(
                                "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                                dbType === type
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : "border-border bg-background/50 hover:border-primary/30"
                            )}
                        >
                            {DB_DIALECTS[type].label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="mongo-connection-string">{t("connectionString")}</Label>
                <Input
                    id="mongo-connection-string"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder={DB_DIALECTS[dbType].placeholder}
                    disabled={saving}
                    className="font-mono text-sm"
                />
            </div>

            <div className="space-y-2">
                <Label>{t("color")}</Label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setColor(null)}
                        disabled={saving}
                        className={cn(
                            "flex size-6 items-center justify-center rounded-full border-2 text-muted-foreground transition-transform",
                            color === null ? "border-primary scale-110" : "border-border hover:scale-105"
                        )}
                        aria-label={t("colorNone")}
                    >
                        <IconX className="size-3" />
                    </button>
                    {CONNECTION_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            disabled={saving}
                            className={cn(
                                "size-6 rounded-full border-2 transition-transform",
                                color === c ? "border-primary scale-110" : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                            aria-label={c}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 pr-3">
                    <Label className="text-xs font-medium">{t("readOnly")}</Label>
                    <p className="text-[10px] text-muted-foreground">{t("readOnlyHint")}</p>
                </div>
                <Switch checked={readOnly} onCheckedChange={setReadOnly} disabled={saving} />
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                    {t("cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                    {t("save")}
                </Button>
            </div>
        </form>
    );
}

/* ------------------------------------------------------------------ tree */

/**
 * POST helper for every tree endpoint. Errors are sanitised here so a
 * connection string (which carries the password) can never reach a toast.
 */
async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) throw new Error(sanitizeError(data?.error ?? ""));
    return data as T;
}

/** Sanitised server message when there is one, otherwise translated fallback. */
function errorText(e: unknown, fallback: string): string {
    const message = e instanceof Error ? e.message : "";
    return message || fallback;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

interface CollectionsState {
    loading: boolean;
    items: Collection[] | null;
    error: string | null;
}

interface CollectionRowProps {
    dbName: string;
    collection: Collection;
    readOnly: boolean;
    /** All callbacks take the entity as arguments so the parent can keep them
     *  `useCallback`-stable — an inline arrow per row would defeat React.memo. */
    onOpen: (dbName: string, collectionName: string) => void;
    onRename: (dbName: string, collectionName: string) => void;
    onSync: (dbName: string, collectionName: string) => void;
    onDrop: (dbName: string, collectionName: string) => void;
}

const CollectionRow = React.memo(function CollectionRow({
    dbName,
    collection,
    readOnly,
    onOpen,
    onRename,
    onSync,
    onDrop,
}: CollectionRowProps) {
    const t = useTranslations("DataExplorer");
    const count = collection.documentCount;

    return (
        <div className="group/col flex items-center pr-1">
            <button
                type="button"
                onClick={() => onOpen(dbName, collection.name)}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/60"
            >
                <IconFolder className="size-3.5 shrink-0 text-yellow-500" />
                <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                {count !== undefined && count !== null && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {formatCount(count)}
                    </span>
                )}
            </button>
            {!readOnly && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("mongo.collectionActions", { name: collection.name })}
                            className="size-6 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-focus-within/col:opacity-100 md:group-hover/col:opacity-100"
                        >
                            <IconDots className="size-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRename(dbName, collection.name)}>
                            <IconEdit className="mr-2 size-3.5" />
                            {t("mongo.rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSync(dbName, collection.name)}>
                            <IconArrowsExchange className="mr-2 size-3.5" />
                            {t("mongo.sync")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDrop(dbName, collection.name)}
                        >
                            <IconTrash className="mr-2 size-3.5" />
                            {t("mongo.dropCollection")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
});

// Closed-dialog constants: stable identities, and the shared `SidebarDialogs`
// only reads `open` / names / `newName` from these — `connection` stays null
// because this tree already owns the target connection.
const CLOSED_RENAME_COLL: RenameCollectionState = {
    open: false, connection: null, dbName: "", collectionName: "", newName: "",
};
const CLOSED_RENAME_DB: RenameDatabaseState = {
    open: false, connection: null, dbName: "", newName: "",
};
const CLOSED_DROP_DB: DropDbState = { open: false, connIndex: null, dbName: "" };
const CLOSED_DROP_COLL: DropCollState = {
    open: false, connIndex: null, dbName: "", collectionName: "",
};
// Connection delete and bulk delete live in the unified shell, not in this
// tree — those branches of `SidebarDialogs` stay permanently closed.
const NO_DELETE_CONN: DeleteConnState = { open: false, index: null };
const NO_BULK: BulkDeleteState = { open: false };
const NO_SELECTION = new Set<string>();
const NO_ROWS: never[] = [];
const noop = () => { };

function MongoSidebarTree({
    connection,
    config,
    openTab,
    onConnectionsChanged,
}: SidebarTreeProps<MongoConfig, MongoTabState>) {
    const t = useTranslations("DataExplorer");
    const readOnly = !!connection.readOnly;
    // DocumentDB/Cosmos reject the driver default retryWrites=true.
    const connectionString = useMemo(
        () => normalizeConnectionString(config?.dbType ?? "mongodb", config?.connectionString ?? ""),
        [config?.dbType, config?.connectionString]
    );

    const [databases, setDatabases] = useState<Database[] | null>(null);
    const [dbLoading, setDbLoading] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const [collections, setCollections] = useState<Record<string, CollectionsState>>({});

    const [monitorOpen, setMonitorOpen] = useState(false);
    const [gridfsDb, setGridfsDb] = useState<string | null>(null);
    const [syncSource, setSyncSource] = useState<{ dbName: string; collectionName: string } | null>(null);
    const [renameColl, setRenameColl] = useState(CLOSED_RENAME_COLL);
    const [renameDb, setRenameDb] = useState(CLOSED_RENAME_DB);
    const [dropDb, setDropDb] = useState(CLOSED_DROP_DB);
    const [dropColl, setDropColl] = useState(CLOSED_DROP_COLL);

    /** There is no databases endpoint — the list comes back from connect. */
    const loadDatabases = useCallback(async () => {
        setDbLoading(true);
        setDbError(null);
        try {
            const data = await post<{ databases?: Database[] }>("/api/nosql/connect", {
                connectionString,
            });
            setDatabases(data.databases ?? []);
        } catch (e) {
            setDatabases(null);
            setDbError(errorText(e, t("mongo.connectionFailed")));
            toast.error(t("mongo.toast.connectFailed", { name: connection.name }));
        } finally {
            setDbLoading(false);
        }
    }, [connectionString, connection.name, t]);

    const loadCollections = useCallback(
        async (dbName: string) => {
            setCollections((prev) => ({
                ...prev,
                [dbName]: { loading: true, items: prev[dbName]?.items ?? null, error: null },
            }));
            try {
                const data = await post<{ collections?: Collection[] }>("/api/nosql/collections", {
                    connectionString,
                    dbName,
                });
                setCollections((prev) => ({
                    ...prev,
                    [dbName]: { loading: false, items: data.collections ?? [], error: null },
                }));
            } catch (e) {
                setCollections((prev) => ({
                    ...prev,
                    [dbName]: {
                        loading: false,
                        items: null,
                        error: errorText(e, t("mongo.collectionsFailed")),
                    },
                }));
                toast.error(t("mongo.toast.collectionsFailed", { name: dbName }));
            }
        },
        [connectionString, t]
    );

    // The tree only mounts once its connection row is expanded, so mounting is
    // the expand. Keyed on the server alone: `loadDatabases` also closes over
    // `t`, whose identity next-intl does not guarantee across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { void loadDatabases(); }, [connectionString]);

    const toggleDatabase = useCallback(
        (dbName: string) => {
            const isOpen = expanded.has(dbName);
            setExpanded((prev) => {
                const next = new Set(prev);
                if (isOpen) next.delete(dbName);
                else next.add(dbName);
                return next;
            });
            if (!isOpen && !collections[dbName]) void loadCollections(dbName);
        },
        [expanded, collections, loadCollections]
    );

    const openCollection = useCallback(
        (dbName: string, collectionName: string) => {
            openTab({
                key: `${dbName}/${collectionName}`,
                title: collectionName,
                subtitle: `${connection.name} › ${dbName}`,
                state: {
                    dbName,
                    collectionName,
                    page: 1,
                    limit: 50,
                    query: "{}",
                    sortField: null,
                    sortDirection: "asc",
                },
            });
        },
        [openTab, connection.name]
    );

    const requestRenameCollection = useCallback((dbName: string, collectionName: string) => {
        setRenameColl({ open: true, connection: null, dbName, collectionName, newName: collectionName });
    }, []);

    const requestSync = useCallback((dbName: string, collectionName: string) => {
        setSyncSource({ dbName, collectionName });
    }, []);

    const requestDropCollection = useCallback((dbName: string, collectionName: string) => {
        setDropColl({ open: true, connIndex: 0, dbName, collectionName });
    }, []);

    async function handleRenameCollection() {
        const { dbName, collectionName, newName } = renameColl;
        const name = newName.trim();
        if (!validateCollectionName(name).valid) {
            toast.error(t("mongo.toast.invalidCollectionName"));
            return;
        }
        try {
            await post("/api/nosql/collection/rename", {
                connectionString,
                dbName,
                collectionName,
                newCollectionName: name,
            });
            toast.success(t("mongo.toast.renamed", { name }));
            setRenameColl(CLOSED_RENAME_COLL);
            void loadCollections(dbName);
        } catch (e) {
            toast.error(errorText(e, t("mongo.toast.renameFailed")));
        }
    }

    async function handleRenameDatabase() {
        const { dbName, newName } = renameDb;
        const name = newName.trim();
        if (!validateDbName(name).valid) {
            toast.error(t("mongo.toast.invalidDbName"));
            return;
        }
        try {
            await post("/api/nosql/database/rename", {
                connectionString,
                oldDbName: dbName,
                newDbName: name,
            });
            toast.success(t("mongo.toast.renamed", { name }));
            setRenameDb(CLOSED_RENAME_DB);
            void loadDatabases();
        } catch (e) {
            toast.error(errorText(e, t("mongo.toast.renameFailed")));
        }
    }

    async function handleDropDatabase() {
        const { dbName } = dropDb;
        try {
            await post("/api/nosql/database/drop", { connectionString, dbName });
            toast.success(t("mongo.toast.dropped", { name: dbName }));
            void loadDatabases();
            onConnectionsChanged();
        } catch (e) {
            toast.error(errorText(e, t("mongo.toast.dropFailed", { name: dbName })));
        } finally {
            setDropDb(CLOSED_DROP_DB);
        }
    }

    async function handleDropCollection() {
        const { dbName, collectionName } = dropColl;
        try {
            await post("/api/nosql/collection/drop", { connectionString, dbName, collectionName });
            toast.success(t("mongo.toast.dropped", { name: collectionName }));
            void loadCollections(dbName);
            onConnectionsChanged();
        } catch (e) {
            toast.error(errorText(e, t("mongo.toast.dropFailed", { name: collectionName })));
        } finally {
            setDropColl(CLOSED_DROP_COLL);
        }
    }

    // SyncDialog picks its target from saved connections; this tree only knows
    // its own, so it is the only offered target (same server, other db/collection).
    const syncTargets = useMemo<SavedConnection[]>(
        () => [
            {
                id: connection.id,
                userId: connection.userId,
                encryptedData: connection.encryptedData,
                iv: connection.iv,
                connectionString,
                name: connection.name,
                color: connection.color,
                readOnly: connection.readOnly,
                dbType: config?.dbType,
                createdAt: connection.createdAt,
                lastUsedAt: connection.lastUsedAt,
            },
        ],
        [connection, connectionString, config?.dbType]
    );

    return (
        <div className="space-y-0.5 py-0.5">
            <div className="flex items-center gap-0.5 px-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={t("mongo.refreshDatabases")}
                    onClick={() => void loadDatabases()}
                >
                    <IconRefresh className="size-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={t("mongo.serverMonitor")}
                    onClick={() => setMonitorOpen(true)}
                >
                    <IconActivity className="size-3.5" />
                </Button>
            </div>

            {dbLoading && databases === null ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">{t("mongo.connecting")}</p>
            ) : dbError ? (
                <p
                    title={dbError}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-destructive"
                >
                    <IconAlertCircle className="size-3.5 shrink-0" />
                    <span className="truncate">{t("mongo.connectionFailed")}</span>
                </p>
            ) : !databases || databases.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">{t("mongo.noDatabases")}</p>
            ) : (
                databases.map((db) => {
                    const isOpen = expanded.has(db.name);
                    const state = collections[db.name];
                    return (
                        <div key={db.name}>
                            <div className="group/db flex items-center pr-1">
                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={() => toggleDatabase(db.name)}
                                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/60"
                                >
                                    <IconChevronRight
                                        className={cn(
                                            "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
                                            isOpen && "rotate-90 text-foreground"
                                        )}
                                    />
                                    <IconDatabase className="size-3.5 shrink-0 text-blue-500" />
                                    <span className="min-w-0 flex-1 truncate">{db.name}</span>
                                </button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={t("mongo.databaseActions", { name: db.name })}
                                            className="size-6 shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-focus-within/db:opacity-100 md:group-hover/db:opacity-100"
                                        >
                                            <IconDots className="size-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => void loadCollections(db.name)}>
                                            <IconRefresh className="mr-2 size-3.5" />
                                            {t("mongo.refresh")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setGridfsDb(db.name)}>
                                            <IconFiles className="mr-2 size-3.5" />
                                            {t("mongo.browseGridfs")}
                                        </DropdownMenuItem>
                                        {!readOnly && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        setRenameDb({
                                                            open: true,
                                                            connection: null,
                                                            dbName: db.name,
                                                            newName: db.name,
                                                        })
                                                    }
                                                >
                                                    <IconEdit className="mr-2 size-3.5" />
                                                    {t("mongo.rename")}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() =>
                                                        setDropDb({ open: true, connIndex: 0, dbName: db.name })
                                                    }
                                                >
                                                    <IconTrash className="mr-2 size-3.5" />
                                                    {t("mongo.dropDatabase")}
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {isOpen && (
                                <div className="ml-3 space-y-0.5 border-l pl-2">
                                    {state?.loading || !state ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                            {t("mongo.loadingCollections")}
                                        </p>
                                    ) : state.error ? (
                                        <p
                                            title={state.error}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-destructive"
                                        >
                                            <IconAlertCircle className="size-3.5 shrink-0" />
                                            <span className="truncate">{t("mongo.collectionsFailed")}</span>
                                        </p>
                                    ) : !state.items || state.items.length === 0 ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                            {t("mongo.noCollections")}
                                        </p>
                                    ) : (
                                        state.items.map((col) => (
                                            <CollectionRow
                                                key={col.name}
                                                dbName={db.name}
                                                collection={col}
                                                readOnly={readOnly}
                                                onOpen={openCollection}
                                                onRename={requestRenameCollection}
                                                onSync={requestSync}
                                                onDrop={requestDropCollection}
                                            />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            <SidebarDialogs
                connections={NO_ROWS}
                renameCollectionDialog={renameColl}
                setRenameCollectionDialog={setRenameColl}
                onRenameCollection={() => void handleRenameCollection()}
                renameDatabaseDialog={renameDb}
                setRenameDatabaseDialog={setRenameDb}
                onRenameDatabase={() => void handleRenameDatabase()}
                deleteConnDialog={NO_DELETE_CONN}
                setDeleteConnDialog={noop}
                onConfirmDeleteConnection={noop}
                dropDbDialog={dropDb}
                setDropDbDialog={setDropDb}
                onConfirmDropDatabase={() => void handleDropDatabase()}
                dropCollDialog={dropColl}
                setDropCollDialog={setDropColl}
                onConfirmDropCollection={() => void handleDropCollection()}
                bulkDeleteDialog={NO_BULK}
                setBulkDeleteDialog={noop}
                selectedCollections={NO_SELECTION}
                isBulkDeleting={false}
                onConfirmBulkDelete={noop}
            />

            {monitorOpen && (
                <ServerMonitor
                    connectionString={connectionString}
                    name={connection.name}
                    readOnly={readOnly}
                    open={monitorOpen}
                    onClose={() => setMonitorOpen(false)}
                />
            )}
            {gridfsDb && (
                <GridFsBrowser
                    connectionString={connectionString}
                    dbName={gridfsDb}
                    name={`${connection.name} / ${gridfsDb}`}
                    readOnly={readOnly}
                    open={!!gridfsDb}
                    onClose={() => setGridfsDb(null)}
                />
            )}
            {syncSource && (
                <SyncDialog
                    source={{
                        connectionString,
                        dbName: syncSource.dbName,
                        collectionName: syncSource.collectionName,
                        name: `${connection.name} / ${syncSource.dbName} / ${syncSource.collectionName}`,
                    }}
                    targets={syncTargets}
                    open={!!syncSource}
                    onClose={() => setSyncSource(null)}
                />
            )}
        </div>
    );
}

export const mongodbAdapter: SourceAdapter<MongoConfig, MongoTabState> = {
    id: "mongodb",
    label: "MongoDB",
    icon: IconBrandMongodb,
    accent: "text-green-500",
    blankConfig,
    validate,
    testConnection,
    ConnectionForm: MongoConnectionForm,
    SidebarTree: MongoSidebarTree,
    // Replaced in Task 11.
    Pane: () => null,
};
