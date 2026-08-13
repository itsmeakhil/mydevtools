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
    IconCopy,
    IconDatabase,
    IconDots,
    IconEdit,
    IconFiles,
    IconFolder,
    IconRefresh,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
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
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { apiFetch } from "@/lib/desktop/api-fetch";
import {
    sanitizeError,
    validateCollectionName,
    validateDbName,
} from "@/lib/nosql-error-sanitizer";
import {
    DB_DIALECTS,
    detectDbType,
    normalizeConnectionString,
    type DbType,
} from "@/lib/nosql-dialects";
import { CONNECTION_COLORS } from "@/components/data-explorer/connection-colors";
import {
    SidebarDialogs,
    type BulkDeleteState,
    type DeleteConnState,
    type DropCollState,
    type DropDbState,
    type RenameCollectionState,
    type RenameDatabaseState,
} from "@/components/data-explorer/mongodb/sidebar-dialogs";
import { DocumentView } from "@/components/data-explorer/mongodb/document-view";
import { GridFsBrowser } from "@/components/data-explorer/mongodb/gridfs-browser";
import { SyncDialog } from "@/components/data-explorer/mongodb/sync-dialog";
import { ServerMonitor } from "@/components/data-explorer/mongodb/server-monitor";
import type { Collection, Database, SavedConnection } from "@/components/data-explorer/mongodb/types";
import { useMongoActions } from "@/lib/data-explorer/mongo-actions";
import type { ConnectionFormProps, PaneProps, SidebarTreeProps, SourceAdapter } from "../types";

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
function MongoConnectionForm({
    initial,
    saving,
    error,
    onTest,
    testState,
    onSubmit,
    onCancel,
}: ConnectionFormProps<MongoConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
    const [connectionString, setConnectionString] = useState(initial.config.connectionString);

    /**
     * Inferred from the connection string, not picked by the user — the source
     * dropdown already said "MongoDB" and asking again read as a duplicate.
     *
     * `dbType` is still load-bearing: `normalizeConnectionString` appends
     * `retryWrites=false` for DocumentDB and Cosmos, which reject the driver's
     * default and would otherwise fail writes silently. Both are identifiable
     * by their managed hostnames, which is exactly what `detectDbType` matches.
     * It falls back to "mongodb" when it cannot tell, so keep whatever the
     * connection was saved with in that case — an explicit FerretDB choice from
     * an older build then survives an edit.
     */
    const dbType = useMemo<DbType>(() => {
        const detected = detectDbType(connectionString);
        return detected === "mongodb" ? initial.config.dbType : detected;
    }, [connectionString, initial.config.dbType]);

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
            {testState === "ok" && !error && (
                <div className="rounded-md bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {t("testOk")}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onTest({ connectionString, dbType })}
                    disabled={saving || testState === "testing"}
                >
                    {t("test")}
                </Button>
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

/**
 * Sanitised server message when there is one, otherwise translated fallback.
 * Sanitised again here: `post` already sanitises what it throws, but this also
 * runs on errors from anywhere else, and connection strings carry passwords.
 */
function errorText(e: unknown, fallback: string): string {
    const message = e instanceof Error ? sanitizeError(e.message) : "";
    return message || fallback;
}

/**
 * Maps a `validateDbName` / `validateCollectionName` failure onto its own
 * translated key, so the user learns *why* the name was rejected. The library
 * returns English prose; matching its distinct phrases keeps the reason precise
 * without duplicating the rules. Exported so a unit test locks the mapping to
 * the library's real output.
 */
export function mongoNameErrorKey(result: { valid: boolean; error?: string }): string {
    const e = result.error ?? "";
    if (/non-empty/i.test(e)) return "mongo.toast.nameEmpty";
    if (/exceed/i.test(e)) return "mongo.toast.nameTooLong";
    if (/forbidden characters/i.test(e)) return "mongo.toast.nameForbiddenChars";
    if (/consecutive dots/i.test(e)) return "mongo.toast.nameConsecutiveDots";
    if (/null character/i.test(e)) return "mongo.toast.nameNullChar";
    if (/start with/i.test(e)) return "mongo.toast.nameReservedPrefix";
    return "mongo.toast.nameInvalid";
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
    selected: boolean;
    /** All callbacks take the entity as arguments so the parent can keep them
     *  `useCallback`-stable — an inline arrow per row would defeat React.memo. */
    onOpen: (dbName: string, collectionName: string) => void;
    onToggleSelect: (dbName: string, collectionName: string) => void;
    onRename: (dbName: string, collectionName: string) => void;
    onSync: (dbName: string, collectionName: string) => void;
    onDrop: (dbName: string, collectionName: string) => void;
}

const CollectionRow = React.memo(function CollectionRow({
    dbName,
    collection,
    readOnly,
    selected,
    onOpen,
    onToggleSelect,
    onRename,
    onSync,
    onDrop,
}: CollectionRowProps) {
    const t = useTranslations("DataExplorer");
    const count = collection.documentCount;

    return (
        <div className="group/col flex items-center pr-1">
            {!readOnly && (
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(dbName, collection.name)}
                    aria-label={t("mongo.selectCollection", { name: collection.name })}
                    className={cn(
                        "mx-1 size-3 shrink-0 cursor-pointer accent-primary transition-opacity",
                        selected
                            ? "opacity-100"
                            : "opacity-100 md:opacity-0 md:group-focus-within/col:opacity-100 md:group-hover/col:opacity-100"
                    )}
                />
            )}
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
// Connection delete lives in the unified shell, not in this tree — that branch
// of `SidebarDialogs` stays permanently closed.
const NO_DELETE_CONN: DeleteConnState = { open: false, index: null };
const noop = () => { };
/** `SidebarDialogs` wants a `{ open }` object; these keep the identity stable. */
const BULK_STATE: Record<"open" | "closed", BulkDeleteState> = {
    open: { open: true },
    closed: { open: false },
};

/** Selection key format `SidebarDialogs` parses for its bulk-delete list. */
function selectionKey(connectionId: string, dbName: string, collectionName: string): string {
    return `${connectionId}|${dbName}|${collectionName}`;
}

function MongoSidebarTree({
    connection,
    config,
    openTab,
    onConnectionsChanged,
    searchQuery,
    siblings,
}: SidebarTreeProps<MongoConfig, MongoTabState>) {
    const t = useTranslations("DataExplorer");
    const { copyToClipboard } = useCopyToClipboard();
    const readOnly = !!connection.readOnly;
    // DocumentDB/Cosmos reject the driver default retryWrites=true.
    const connectionString = useMemo(
        () => normalizeConnectionString(config?.dbType ?? "mongodb", config?.connectionString ?? ""),
        [config?.dbType, config?.connectionString]
    );

    const [databases, setDatabases] = useState<Database[] | null>(null);
    // Seeded true: the mount effect connects immediately, and a false start
    // flashes "No databases" for one paint.
    const [dbLoading, setDbLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const [collections, setCollections] = useState<Record<string, CollectionsState>>({});
    /** Multi-select: key → the entity, so nothing has to re-parse the key. */
    const [selected, setSelected] = useState<Map<string, { dbName: string; collectionName: string }>>(
        () => new Map()
    );
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

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

    const toggleSelect = useCallback(
        (dbName: string, collectionName: string) => {
            const key = selectionKey(connection.id, dbName, collectionName);
            setSelected((prev) => {
                const next = new Map(prev);
                if (!next.delete(key)) next.set(key, { dbName, collectionName });
                return next;
            });
        },
        [connection.id]
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
        const check = validateCollectionName(name);
        if (!check.valid) {
            toast.error(t(mongoNameErrorKey(check)));
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
        const check = validateDbName(name);
        if (!check.valid) {
            toast.error(t(mongoNameErrorKey(check)));
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
            // Drop it from the multi-select too, or the footer counts a row that is gone.
            setSelected((prev) => {
                const next = new Map(prev);
                next.delete(selectionKey(connection.id, dbName, collectionName));
                return next;
            });
            void loadCollections(dbName);
            onConnectionsChanged();
        } catch (e) {
            toast.error(errorText(e, t("mongo.toast.dropFailed", { name: collectionName })));
        } finally {
            setDropColl(CLOSED_DROP_COLL);
        }
    }

    /** One drop per selected collection — the API has no bulk endpoint. */
    async function handleBulkDelete() {
        setBulkDeleting(true);
        const targets = Array.from(selected.values());
        const touchedDbs = new Set(targets.map((s) => s.dbName));
        let failed = 0;
        for (const { dbName, collectionName } of targets) {
            try {
                await post("/api/nosql/collection/drop", { connectionString, dbName, collectionName });
            } catch {
                // Reason is per-collection and already sanitised; the summary
                // toast below reports the count so one failure cannot spam N toasts.
                failed += 1;
            }
        }
        setBulkDeleting(false);
        setBulkOpen(false);
        setSelected(new Map());
        for (const dbName of touchedDbs) void loadCollections(dbName);
        if (failed > 0) toast.error(t("mongo.toast.bulkDropFailed", { count: failed }));
        else toast.success(t("mongo.toast.bulkDropped", { count: targets.length }));
        onConnectionsChanged();
    }

    // Every saved Mongo-family connection is a sync target, so a collection can
    // be copied to another server — `siblings` already carries decrypted configs.
    const syncTargets = useMemo<SavedConnection[]>(
        () =>
            siblings.flatMap((sibling) => {
                const cfg = sibling.config as MongoConfig | undefined;
                if (!cfg?.connectionString) return [];
                return [
                    {
                        id: sibling.id,
                        userId: sibling.userId,
                        encryptedData: sibling.encryptedData,
                        iv: sibling.iv,
                        connectionString: normalizeConnectionString(
                            cfg.dbType ?? "mongodb",
                            cfg.connectionString
                        ),
                        name: sibling.name,
                        color: sibling.color,
                        readOnly: sibling.readOnly,
                        dbType: cfg.dbType,
                        createdAt: sibling.createdAt,
                        lastUsedAt: sibling.lastUsedAt,
                    },
                ];
            }),
        [siblings]
    );

    // Search comes from the shell's one search box. A connection whose own name
    // matches shows its whole tree; otherwise levels filter on their own names,
    // and a database survives when one of its loaded collections matches.
    const q = searchQuery.trim().toLowerCase();
    const showAll = !q || connection.name.toLowerCase().includes(q);
    const matches = (value: string) => value.toLowerCase().includes(q);
    const visibleDatabases = (databases ?? []).filter(
        (db) =>
            showAll ||
            matches(db.name) ||
            (collections[db.name]?.items ?? []).some((col) => matches(col.name))
    );

    /** Only this connection is named in the bulk-delete list `SidebarDialogs` renders. */
    const dialogRows = useMemo(
        () => syncTargets.filter((c) => c.id === connection.id).map((c) => ({ connection: c })),
        [syncTargets, connection.id]
    );
    const selectedKeys = useMemo(() => new Set(selected.keys()), [selected]);

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
            ) : databases === null || databases.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">{t("mongo.noDatabases")}</p>
            ) : visibleDatabases.length === 0 ? (
                <p className="px-2 py-1 text-xs text-muted-foreground">{t("mongo.noMatches")}</p>
            ) : (
                visibleDatabases.map((db) => {
                    const isOpen = expanded.has(db.name);
                    const state = collections[db.name];
                    const dbMatches = showAll || matches(db.name);
                    const visibleCols = state?.items
                        ? state.items
                            .filter((col) => dbMatches || matches(col.name))
                            .sort((a, b) => a.name.localeCompare(b.name))
                        : null;
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
                                        <DropdownMenuItem
                                            onClick={() =>
                                                void copyToClipboard(db.name, t("mongo.toast.dbNameCopied"))
                                            }
                                        >
                                            <IconCopy className="mr-2 size-3.5" />
                                            {t("mongo.copyDbName")}
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
                                    ) : !visibleCols || visibleCols.length === 0 ? (
                                        <p className="px-2 py-1 text-xs text-muted-foreground">
                                            {t("mongo.noCollections")}
                                        </p>
                                    ) : (
                                        visibleCols.map((col) => (
                                            <CollectionRow
                                                key={col.name}
                                                dbName={db.name}
                                                collection={col}
                                                readOnly={readOnly}
                                                selected={selectedKeys.has(
                                                    selectionKey(connection.id, db.name, col.name)
                                                )}
                                                onOpen={openCollection}
                                                onToggleSelect={toggleSelect}
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

            {selected.size > 0 && (
                <div className="flex items-center gap-1 px-1 py-1">
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 flex-1 gap-1.5 text-xs"
                        onClick={() => setBulkOpen(true)}
                    >
                        <IconTrash className="size-3.5" />
                        {t("mongo.deleteSelected", { count: selected.size })}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelected(new Map())}
                    >
                        {t("mongo.clearSelection")}
                    </Button>
                </div>
            )}

            <SidebarDialogs
                connections={dialogRows}
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
                bulkDeleteDialog={BULK_STATE[bulkOpen ? "open" : "closed"]}
                setBulkDeleteDialog={(s) => setBulkOpen(s.open)}
                selectedCollections={selectedKeys}
                isBulkDeleting={bulkDeleting}
                onConfirmBulkDelete={() => void handleBulkDelete()}
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

/* ------------------------------------------------------------------ pane */

/**
 * Document pane. `DocumentView` already hosts the query builder, aggregation
 * pipeline builder, schema view, index manager, explain, import/export and
 * codegen, so wiring its props is the whole feature.
 *
 * A `setState` here is what triggers a refetch — `useMongoActions` refreshes
 * from an effect keyed on the tab state, so no handler calls `refresh()` itself
 * (the legacy page did, and doing both would double-fetch).
 *
 * Errors and toasts are owned downstream: mutations sanitise and toast inside
 * the hook before re-throwing, and `IndexManager` toasts what `dropIndex` /
 * `createIndex` throw and reloads the index list after each mutation.
 *
 * Single-document delete is the one exception. `DocumentView`'s trash button
 * calls `onDelete` straight away with no prompt of its own (unlike bulk delete,
 * which it confirms internally), so the confirmation has to live out here — the
 * legacy page owns the same dialog. Without it one misclick deletes a document
 * irreversibly.
 */
function MongoPane({ connection, config, state, setState }: PaneProps<MongoConfig, MongoTabState>) {
    const t = useTranslations("DataExplorer");
    const readOnly = connection.readOnly ?? false;
    const actions = useMongoActions(config, state, readOnly);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function confirmDelete() {
        if (!confirmId || deleting) return;
        setDeleting(true);
        try {
            await actions.remove(confirmId);
        } catch {
            // `remove` already toasted the sanitised reason and re-threw only so a
            // caller could stay open. Swallowed so the rejection cannot go
            // uncaught; like the legacy dialog, this one closes either way.
        } finally {
            setDeleting(false);
            setConfirmId(null);
        }
    }

    return (
        <>
        <DocumentView
            connectionName={connection.name}
            dbName={state.dbName}
            collectionName={state.collectionName}
            documents={actions.documents}
            total={actions.total}
            page={state.page}
            limit={state.limit}
            loading={actions.loading}
            error={actions.error}
            sortField={state.sortField}
            sortDirection={state.sortDirection}
            onRefresh={actions.refresh}
            onInsert={actions.insert}
            onUpdate={actions.update}
            onDelete={async (id) => setConfirmId(id)}
            onSearch={(query) => setState((prev) => ({ ...prev, query, page: 1 }))}
            onPageChange={(page) => setState((prev) => ({ ...prev, page }))}
            onLimitChange={(limit) => setState((prev) => ({ ...prev, limit, page: 1 }))}
            onSortChange={(sortField, sortDirection) =>
                setState((prev) => ({ ...prev, sortField, sortDirection, page: 1 }))
            }
            onBulkDelete={actions.bulkDelete}
            onImport={actions.importDocuments}
            onLoadSchema={actions.loadSchema}
            onLoadIndexes={actions.loadIndexes}
            onDropIndex={actions.dropIndex}
            onCreateIndex={actions.createIndex}
            onExplain={actions.explain}
            onPreviewPipeline={actions.previewPipeline}
            readOnly={readOnly}
        />

        <AlertDialog
            open={confirmId !== null}
            onOpenChange={(open) => {
                if (!open && !deleting) setConfirmId(null);
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("deleteDocTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("deleteDocBody")}</AlertDialogDescription>
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
        </>
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
    Pane: MongoPane,
};
