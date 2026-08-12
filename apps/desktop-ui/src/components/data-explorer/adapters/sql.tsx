"use client";

import React, { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    IconAlertCircle,
    IconChevronRight,
    IconEye,
    IconFileDatabase,
    IconPlus,
    IconRefresh,
    IconTable,
    IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { sqlBody } from "@/lib/sql-request";
import { CONNECTION_COLORS } from "@/components/nosql-explorer/connection-form";
import { DbIcon } from "@/components/sql-client/db-icon";
import type {
    ColumnInfo,
    SchemaInfo,
    SqlConnectionConfig,
    TableInfo,
} from "@/components/sql-client/types";
import {
    applyPastedHost,
    blankSqlConfig,
    blankSqliteConfig,
    buildSelect,
    DEFAULT_PORT,
    ENGINE_LABEL,
    normalizeSqlitePath,
    sanitizeSqlError,
    sqlConfigKey,
    validateSqlConfig,
    validateSqliteConfig,
    type AnySqlConfig,
    type SqlEngine,
    type SqliteConfig,
    type SqlSourceId,
} from "@/lib/data-explorer/sql-api";
import { SqlQueryPane } from "../sql/query-pane";
import type {
    ConnectionFormProps,
    SidebarTreeProps,
    SourceAdapter,
} from "../types";

export interface SqlTabState {
    /**
     * `"table"` means the rows still map back to one table, which is what makes
     * grid editing safe. Any edit to the query text demotes the tab to
     * `"console"`.
     */
    kind: "table" | "console";
    schema: string;
    table: string;
    query: string;
    limit: number;
}

const DEFAULT_LIMIT = 100;

/**
 * A tab restored from localStorage was written by whatever build was installed
 * then. `parseStoredTabs` validates the envelope but never the adapter's own
 * `state`, and the pane reads these fields unguarded — an older shape would
 * white-screen the tool with no way to clear it.
 */
export function normalizeSqlTabState(state: unknown): SqlTabState {
    const s = (state ?? {}) as Partial<SqlTabState>;
    const table = typeof s.table === "string" ? s.table : "";
    return {
        kind: s.kind === "table" && table ? "table" : "console",
        schema: typeof s.schema === "string" ? s.schema : "",
        table,
        query: typeof s.query === "string" ? s.query : "",
        limit: Number.isInteger(s.limit) && (s.limit as number) > 0 ? (s.limit as number) : DEFAULT_LIMIT,
    };
}

/* ------------------------------------------------------------------ form */

function SqlConnectionForm(engine: SqlEngine) {
    return function Form({
        initial,
        saving,
        error,
        onTest,
        testState,
        onSubmit,
        onCancel,
    }: ConnectionFormProps<SqlConnectionConfig>) {
        const t = useTranslations("DataExplorer.connectionDialog");
        const ts = useTranslations("DataExplorer.sql");
        const [name, setName] = useState(initial.name);
        const [folder, setFolder] = useState(initial.folder ?? "");
        const [color, setColor] = useState<string | null>(initial.color ?? null);
        const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
        const [config, setConfig] = useState<SqlConnectionConfig>(() => ({
            ...blankSqlConfig(engine),
            ...initial.config,
            // The adapter owns the engine; a config edited under a different
            // adapter (or hand-restored) must not override it.
            type: engine,
        }));

        const set = <K extends keyof SqlConnectionConfig>(key: K, value: SqlConnectionConfig[K]) =>
            setConfig((prev) => ({ ...prev, [key]: value }));

        function handleSubmit(e: FormEvent) {
            e.preventDefault();
            onSubmit({ name, folder, color, readOnly, config });
        }

        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="sql-name">{t("name")}</Label>
                    <Input
                        id="sql-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("namePlaceholder")}
                        disabled={saving}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sql-folder">{t("folder")}</Label>
                    <Input
                        id="sql-folder"
                        value={folder}
                        onChange={(e) => setFolder(e.target.value)}
                        placeholder={t("folderPlaceholder")}
                        disabled={saving}
                    />
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-2">
                        <Label htmlFor="sql-host">{ts("host")}</Label>
                        <Input
                            id="sql-host"
                            value={config.host}
                            // A pasted `postgresql://user:pass@host:5432/db` fills
                            // every field it carries — that is how most people
                            // actually have their credentials.
                            onChange={(e) => setConfig((prev) => applyPastedHost(prev, e.target.value))}
                            placeholder={ts("hostPlaceholder")}
                            disabled={saving}
                            className="font-mono text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">{ts("hostHint")}</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sql-port">{ts("port")}</Label>
                        <Input
                            id="sql-port"
                            type="number"
                            min={1}
                            max={65535}
                            value={config.port}
                            onChange={(e) => set("port", Number(e.target.value))}
                            placeholder={String(DEFAULT_PORT[engine])}
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sql-database">{ts("database")}</Label>
                    <Input
                        id="sql-database"
                        value={config.database}
                        onChange={(e) => set("database", e.target.value)}
                        disabled={saving}
                        className="font-mono text-sm"
                    />
                    {/* One connection = one database; say so rather than let it
                        be discovered by an empty tree. */}
                    <p className="text-[10px] text-muted-foreground">{ts("databaseHint")}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <Label htmlFor="sql-username">{ts("username")}</Label>
                        <Input
                            id="sql-username"
                            value={config.username}
                            onChange={(e) => set("username", e.target.value)}
                            disabled={saving}
                            autoComplete="off"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sql-password">{ts("password")}</Label>
                        <Input
                            id="sql-password"
                            type="password"
                            value={config.password}
                            // Never trimmed — a leading or trailing space is a
                            // legitimate part of a password.
                            onChange={(e) => set("password", e.target.value)}
                            disabled={saving}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{ts("ssl")}</Label>
                        <Switch
                            checked={config.ssl}
                            onCheckedChange={(v) => set("ssl", v)}
                            disabled={saving}
                        />
                    </div>
                    {config.ssl && (
                        <div className="flex items-start justify-between gap-3 border-t pt-2">
                            <div className="space-y-0.5">
                                <Label className="text-xs font-medium">{ts("sslVerify")}</Label>
                                <p className="text-[10px] text-muted-foreground">
                                    {config.sslVerify === false ? ts("sslVerifyOffWarning") : ts("sslVerifyHint")}
                                </p>
                            </div>
                            <Switch
                                checked={config.sslVerify !== false}
                                onCheckedChange={(v) => set("sslVerify", v)}
                                disabled={saving}
                            />
                        </div>
                    )}
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
                        <p className="text-[10px] text-muted-foreground">{ts("readOnlyHint")}</p>
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
                        onClick={() => onTest(config)}
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
    };
}

/**
 * SQLite is a file: no host, port, credentials or TLS, so this shares nothing
 * with the server form beyond name/folder/colour/read-only.
 */
function SqliteConnectionForm({
    initial,
    saving,
    error,
    onTest,
    testState,
    onSubmit,
    onCancel,
}: ConnectionFormProps<SqliteConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const ts = useTranslations("DataExplorer.sql");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
    const [path, setPath] = useState(initial.config.path ?? "");

    // Normalised on the way out, not on every keystroke — stripping quotes
    // mid-typing fights the user.
    const config = (): SqliteConfig => ({ type: "sqlite", path: normalizeSqlitePath(path) });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        onSubmit({ name, folder, color, readOnly, config: config() });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="sqlite-name">{t("name")}</Label>
                <Input
                    id="sqlite-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sqlite-folder">{t("folder")}</Label>
                <Input
                    id="sqlite-folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t("folderPlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="sqlite-path">{ts("filePath")}</Label>
                <Input
                    id="sqlite-path"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/Users/you/app.db"
                    disabled={saving}
                    className="font-mono text-sm"
                    spellCheck={false}
                />
                {/* Quoted paths and file:// URLs are what Finder and a terminal
                    drag actually produce; both are cleaned up on save. */}
                <p className="text-[10px] text-muted-foreground">{ts("filePathHint")}</p>
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
                    {/* Opens the file with SQLITE_OPEN_READ_ONLY, so it is the
                        operating system refusing the write, not the UI. */}
                    <p className="text-[10px] text-muted-foreground">{ts("readOnlyHintSqlite")}</p>
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
                    onClick={() => onTest(config())}
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

interface TreeState {
    loading: boolean;
    tables: TableInfo[] | null;
    error: string | null;
}

/** `schema` is empty on MySQL rows only when the server omitted it. */
function tableKey(table: TableInfo): string {
    return `${table.schema ?? ""}/${table.name}`;
}

/** Stable identity for "loaded, and this table has none" — a fresh `[]` per
 *  render would defeat the memo below. */
const NO_COLUMNS: ColumnInfo[] = [];

interface TableRowProps {
    table: TableInfo;
    expanded: boolean;
    columns: ColumnInfo[] | null;
    columnsLoading: boolean;
    onOpen: (table: TableInfo) => void;
    onToggle: (table: TableInfo) => void;
}

const TableRow = React.memo(function TableRow({
    table,
    expanded,
    columns,
    columnsLoading,
    onOpen,
    onToggle,
}: TableRowProps) {
    const t = useTranslations("DataExplorer.sql");
    const isView = (table.type ?? "").toUpperCase().includes("VIEW");

    return (
        <div>
            <div className="group/table flex items-center pr-1">
                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={t("toggleColumns", { name: table.name })}
                    onClick={() => onToggle(table)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                    <IconChevronRight
                        className={cn(
                            "size-3 shrink-0 transition-transform duration-200",
                            expanded && "rotate-90 text-foreground"
                        )}
                    />
                </button>
                <button
                    type="button"
                    onClick={() => onOpen(table)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted/60"
                >
                    {isView ? (
                        <IconEye className="size-3.5 shrink-0 text-blue-500" />
                    ) : (
                        <IconTable className="size-3.5 shrink-0 text-green-600" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-mono">{table.name}</span>
                    {/* An InnoDB estimate, and null for views — never presented
                        as an exact count. */}
                    {typeof table.row_estimate === "number" && (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            ~{table.row_estimate}
                        </span>
                    )}
                </button>
            </div>

            {expanded && (
                <div className="ml-6 space-y-0.5 pb-1">
                    {columnsLoading || !columns ? (
                        <p className="px-2 py-0.5 text-[11px] text-muted-foreground">
                            {t("loadingColumns")}
                        </p>
                    ) : columns.length === 0 ? (
                        <p className="px-2 py-0.5 text-[11px] text-muted-foreground">
                            {t("noColumns")}
                        </p>
                    ) : (
                        columns.map((col) => (
                            <div
                                key={col.column_name}
                                className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                                <span className="truncate font-mono">{col.column_name}</span>
                                <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground/70">
                                    {col.data_type}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
});

function SqlSidebarTree(engine: SqlSourceId) {
    return function Tree({
        connection,
        config,
        openTab,
        searchQuery,
    }: SidebarTreeProps<AnySqlConfig, SqlTabState>) {
        const t = useTranslations("DataExplorer.sql");
        const [state, setState] = useState<TreeState>({ loading: true, tables: null, error: null });
        const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
        /**
         * Every column of every table in one payload, fetched at most once and
         * only when a table is first expanded — the initial load asks for
         * `includeColumns: false` so opening a connection never pulls it.
         *
         * ponytail: one fetch for the whole database rather than per table.
         * A schema with tens of thousands of columns pays for it on the first
         * expand; scoping the query to one table is the upgrade path.
         */
        const [columns, setColumns] = useState<ColumnInfo[] | null>(null);
        const [columnsLoading, setColumnsLoading] = useState(false);
        // Ad-hoc console tabs need distinct keys or the shell's dedupe focuses
        // the existing one. Restarting at 1 after a reload can focus a restored
        // console tab on the first click; the next click opens a fresh one.
        const [consoleCounter, setConsoleCounter] = useState(1);

        const loadTables = useCallback(async () => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            try {
                const res = await apiFetch("/api/sql-client/tables", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(sqlBody(config, { includeColumns: false })),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                setState({ loading: false, tables: (data as SchemaInfo).tables ?? [], error: null });
            } catch (e) {
                const message = sanitizeSqlError(
                    e instanceof Error ? e.message : String(e),
                    config
                );
                setState({ loading: false, tables: null, error: message });
                toast.error(t("toast.schemaFailed", { name: connection.name }));
            }
        }, [config, connection.name, t]);

        const loadColumns = useCallback(async () => {
            setColumnsLoading(true);
            try {
                const res = await apiFetch("/api/sql-client/tables", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(sqlBody(config)),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                setColumns((data as SchemaInfo).columns ?? []);
            } catch {
                // The tree still works without column detail; an empty list
                // renders "no columns" rather than a spinner that never stops.
                setColumns([]);
            } finally {
                setColumnsLoading(false);
            }
        }, [config]);

        // The tree only mounts once its connection row is expanded, so mounting
        // is the expand. Keyed on the server identity, not on `loadTables`,
        // which closes over `t` — next-intl does not guarantee its identity
        // across renders, and a refetch per render would hammer the server.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useEffect(() => { void loadTables(); }, [sqlConfigKey(config)]);

        const toggleTable = useCallback(
            (table: TableInfo) => {
                const key = tableKey(table);
                setExpanded((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(key)) next.add(key);
                    return next;
                });
                if (columns === null && !columnsLoading) void loadColumns();
            },
            [columns, columnsLoading, loadColumns]
        );

        const openTable = useCallback(
            (table: TableInfo) => {
                const schema = table.schema ?? "";
                openTab({
                    // Encoded, not concatenated: a table name may contain the
                    // separator, and the shell keys tab identity off this.
                    key: `table:${encodeURIComponent(schema)}/${encodeURIComponent(table.name)}`,
                    title: table.name,
                    subtitle: `${connection.name}${schema ? ` › ${schema}` : ""}`,
                    state: {
                        kind: "table",
                        schema,
                        table: table.name,
                        query: buildSelect(engine, schema, table.name, DEFAULT_LIMIT),
                        limit: DEFAULT_LIMIT,
                    },
                });
            },
            [openTab, connection.name]
        );

        const openConsole = useCallback(() => {
            const n = consoleCounter;
            setConsoleCounter(n + 1);
            openTab({
                key: `console:${n}`,
                title: t("consoleTitle", { n }),
                subtitle: connection.name,
                state: { kind: "console", schema: "", table: "", query: "", limit: DEFAULT_LIMIT },
            });
        }, [openTab, connection.name, consoleCounter, t]);

        // The shell owns the one search box and only filters connection names,
        // so without this a search can never reach inside a tree.
        const q = searchQuery.trim().toLowerCase();
        const showAll = !q || connection.name.toLowerCase().includes(q);
        const visible = (state.tables ?? []).filter(
            (table) => showAll || table.name.toLowerCase().includes(q)
        );

        // Duplicate table names across schemas are normal in Postgres, so
        // everything is grouped and keyed by schema, never by name alone.
        const bySchema = useMemo(() => {
            const groups = new Map<string, TableInfo[]>();
            for (const table of visible) {
                const key = table.schema ?? "";
                const list = groups.get(key);
                if (list) list.push(table);
                else groups.set(key, [table]);
            }
            return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
        }, [visible]);

        // Grouped once, not filtered per row: filtering inside the render was
        // O(tables × columns) and handed every row a brand-new array, so the
        // React.memo on TableRow could never hit.
        const columnsByTable = useMemo(() => {
            if (columns === null) return null;
            const groups = new Map<string, ColumnInfo[]>();
            for (const column of columns) {
                const key = `${column.schema ?? ""}/${column.table_name}`;
                const list = groups.get(key);
                if (list) list.push(column);
                else groups.set(key, [column]);
            }
            return groups;
        }, [columns]);

        return (
            <div className="space-y-0.5 py-0.5">
                <div className="flex items-center gap-0.5 px-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={t("refreshSchema")}
                        onClick={() => void loadTables()}
                    >
                        <IconRefresh className="size-3.5" />
                    </Button>
                    {/* Lives here, not in the pane: PaneProps carries no
                        `openTab` — only the tree can open one. */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label={t("newConsole")}
                        onClick={openConsole}
                    >
                        <IconPlus className="size-3.5" />
                    </Button>
                </div>

                {state.loading && state.tables === null ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">{t("connecting")}</p>
                ) : state.error ? (
                    <p
                        title={state.error}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-destructive"
                    >
                        <IconAlertCircle className="size-3.5 shrink-0" />
                        <span className="truncate">{t("connectionFailed")}</span>
                    </p>
                ) : (state.tables?.length ?? 0) === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">{t("noTables")}</p>
                ) : bySchema.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">{t("noMatches")}</p>
                ) : (
                    bySchema.map(([schema, tables]) => (
                        <div key={schema}>
                            {bySchema.length > 1 && schema && (
                                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {schema}
                                </div>
                            )}
                            {tables.map((table) => (
                                <TableRow
                                    key={tableKey(table)}
                                    table={table}
                                    expanded={expanded.has(tableKey(table))}
                                    columns={
                                        columnsByTable
                                            ? (columnsByTable.get(tableKey(table)) ?? NO_COLUMNS)
                                            : null
                                    }
                                    columnsLoading={columnsLoading}
                                    onOpen={openTable}
                                    onToggle={toggleTable}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>
        );
    };
}

/* --------------------------------------------------------------- adapter */

function makeSqlAdapter(
    engine: SqlEngine,
    accent: string
): SourceAdapter<SqlConnectionConfig, SqlTabState> {
    // Bound once at module scope: a new component identity per render would
    // remount the icon on every sidebar update.
    const Icon = ({ className }: { className?: string }) => (
        <DbIcon type={engine} className={className} />
    );
    Icon.displayName = `${ENGINE_LABEL[engine]}Icon`;

    return {
        id: engine,
        label: ENGINE_LABEL[engine],
        icon: Icon,
        accent,
        blankConfig: () => blankSqlConfig(engine),
        validate: validateSqlConfig,
        testConnection: async (config) => {
            const res = await apiFetch("/api/sql-client/connect", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sqlBody({ ...config, type: engine })),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data?.success === false) {
                // Redacted against this config: driver errors quote back the
                // host and user they were given.
                throw new Error(sanitizeSqlError(String(data?.error ?? ""), config));
            }
        },
        ConnectionForm: SqlConnectionForm(engine),
        SidebarTree: SqlSidebarTree(engine),
        Pane: (props) => <SqlQueryPane {...props} state={normalizeSqlTabState(props.state)} />,
    };
}

export const postgresqlAdapter = makeSqlAdapter("postgresql", "text-sky-600");
export const mysqlAdapter = makeSqlAdapter("mysql", "text-cyan-600");
export const mariadbAdapter = makeSqlAdapter("mariadb", "text-orange-600");

/**
 * Shares the tree and the pane with the server engines — the Rust side answers
 * on the same `/api/sql-client/*` routes and returns the same shapes — but has
 * its own form, because a file path has nothing in common with host/port/creds.
 */
export const sqliteAdapter: SourceAdapter<SqliteConfig, SqlTabState> = {
    id: "sqlite",
    label: "SQLite",
    icon: IconFileDatabase,
    accent: "text-violet-500",
    blankConfig: blankSqliteConfig,
    validate: validateSqliteConfig,
    testConnection: async (config) => {
        const res = await apiFetch("/api/sql-client/connect", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sqlBody(config)),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
            throw new Error(sanitizeSqlError(String(data?.error ?? ""), config));
        }
    },
    ConnectionForm: SqliteConnectionForm,
    SidebarTree: SqlSidebarTree("sqlite"),
    Pane: (props) => <SqlQueryPane {...props} state={normalizeSqlTabState(props.state)} />,
};
