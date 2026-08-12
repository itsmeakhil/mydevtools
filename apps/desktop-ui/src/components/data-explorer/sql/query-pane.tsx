"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
    IconAlertCircle,
    IconDeviceFloppy,
    IconHistory,
    IconInfoCircle,
    IconLoader2,
    IconLock,
    IconPlayerPlay,
    IconPlayerStop,
    IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import MonacoEditor from "@/components/lazy/LazyMonaco";
import type { editor } from "monaco-editor";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { sqlBody } from "@/lib/sql-request";
import { sanitizeSqlError, sqlDisplayName, type AnySqlConfig } from "@/lib/data-explorer/sql-api";
import {
    getSqlQueryHistory,
    getSqlSavedQueries,
    putSqlQueryHistory,
    putSqlSavedQueries,
    type NosqlSavedQuery,
} from "@/lib/user-preferences-api";
import { ResultsTable } from "@/components/sql-client/results-table";
import type { QueryResult } from "@/components/sql-client/types";
import type { PaneProps } from "../types";
import type { SqlTabState } from "../adapters/sql";

const ROW_LIMITS = [100, 500, 1000, 5000];

/**
 * Session-scoped SQL. Connections are per-request, so `BEGIN` in one run and
 * `COMMIT` in the next land on different sessions and the work is silently
 * rolled back. Statements sent together in one run share a connection and are
 * fine — which is exactly the distinction the notice explains.
 */
const SESSION_SCOPED =
    /\b(begin|start\s+transaction|commit|rollback|savepoint|set\s+session|set\s+@|create\s+(temp|temporary)|prepare\s)\b/i;

/**
 * Persisted tab state is capped so one enormous query cannot exceed the
 * localStorage quota — the shell writes the whole tab array at once, so
 * overflowing takes every other tab down with it.
 */
const MAX_PERSISTED_QUERY = 64_000;

export function SqlQueryPane({
    connection,
    config,
    tab,
    state,
    setState,
}: PaneProps<AnySqlConfig, SqlTabState>) {
    const t = useTranslations("DataExplorer.sql");
    const { resolvedTheme } = useTheme();
    const readOnly = !!connection.readOnly;

    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    // Bumped on every run and on abandon, so a response from a run the user
    // walked away from can never overwrite the current one.
    const runIdRef = useRef(0);

    const [history, setHistory] = useState<string[]>([]);
    const [saved, setSaved] = useState<NosqlSavedQuery[]>([]);
    const [saveName, setSaveName] = useState("");
    const [saveOpen, setSaveOpen] = useState(false);

    const listKey = useMemo(
        // For SQLite the "database" is the file, so history keys off its name.
        () => ({ connectionName: connection.name, dbName: sqlDisplayName(config) }),
        [connection.name, config]
    );
    useEffect(() => {
        let cancelled = false;
        // eslint react-hooks/set-state-in-effect: the work is async, so the
        // setState never runs synchronously in the effect body.
        const load = async () => {
            try {
                const [h, s] = await Promise.all([
                    getSqlQueryHistory(listKey),
                    getSqlSavedQueries(listKey),
                ]);
                if (cancelled) return;
                setHistory(h.queries ?? []);
                setSaved(s.queries ?? []);
            } catch {
                // History is a convenience; its absence must not break the pane.
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [listKey]);

    useEffect(() => {
        if (!running) return;
        const started = Date.now();
        const id = setInterval(() => setElapsed(Date.now() - started), 100);
        return () => {
            clearInterval(id);
            setElapsed(0);
        };
    }, [running]);

    const setQuery = useCallback(
        (query: string) => {
            setState((prev) => ({
                ...prev,
                query: query.length > MAX_PERSISTED_QUERY ? query.slice(0, MAX_PERSISTED_QUERY) : query,
                // Editing the text detaches the tab from its source table: grid
                // edits must never target a table the rows no longer come from.
                kind: query === prev.query ? prev.kind : "console",
            }));
        },
        [setState]
    );

    const recordHistory = useCallback(
        (query: string) => {
            setHistory((prev) => {
                const next = [query, ...prev.filter((q) => q !== query)].slice(0, 10);
                putSqlQueryHistory({ ...listKey, queries: next }).catch(() => {});
                return next;
            });
        },
        [listKey]
    );

    const runQuery = useCallback(async () => {
        const query = editorRef.current?.getValue() ?? state.query;
        if (!query.trim() || running) return;

        const runId = ++runIdRef.current;
        setRunning(true);
        setResult(null);
        setError(null);
        try {
            const res = await apiFetch("/api/sql-client/query", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sqlBody(config, { query, limit: state.limit, readOnly })),
            });
            const data = await res.json();
            if (runId !== runIdRef.current) return; // abandoned
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setResult(data as QueryResult);
            recordHistory(query);
        } catch (err) {
            if (runId !== runIdRef.current) return;
            const message = sanitizeSqlError(
                err instanceof Error ? err.message : String(err),
                config
            );
            setError(message);
        } finally {
            if (runId === runIdRef.current) setRunning(false);
        }
    }, [config, state.query, state.limit, readOnly, running, recordHistory]);

    /**
     * There is no cancel channel to the server — the statement keeps running
     * until its own timeout. This releases the editor and guarantees the
     * abandoned response is discarded rather than landing later.
     */
    const abandon = useCallback(() => {
        runIdRef.current++;
        setRunning(false);
        setError(t("abandoned"));
    }, [t]);

    const applyQuery = (q: string) => {
        setQuery(q);
        editorRef.current?.setValue(q);
    };

    const saveCurrentQuery = () => {
        const query = editorRef.current?.getValue() ?? state.query;
        const name = saveName.trim();
        if (!name || !query.trim()) return;
        setSaved((prev) => {
            const next = [{ name, query }, ...prev.filter((s) => s.name !== name)].slice(0, 50);
            putSqlSavedQueries({ ...listKey, queries: next }).catch(() => {});
            return next;
        });
        setSaveName("");
        setSaveOpen(false);
        toast.success(t("toast.querySaved"));
    };

    const deleteSavedQuery = (name: string) => {
        setSaved((prev) => {
            const next = prev.filter((s) => s.name !== name);
            putSqlSavedQueries({ ...listKey, queries: next }).catch(() => {});
            return next;
        });
    };

    /**
     * `addCommand` binds once at mount and keeps that closure forever. Calling
     * `runQuery` directly would freeze `limit`, `config` and `readOnly` at
     * their mount-time values — changing the row limit and pressing ⌘↩ would
     * quietly run with the old one. The ref always holds the current closure.
     */
    const runQueryRef = useRef(runQuery);
    useEffect(() => {
        runQueryRef.current = runQuery;
    }, [runQuery]);

    const handleEditorMount = (ed: editor.IStandaloneCodeEditor) => {
        editorRef.current = ed;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monaco = (window as any).monaco;
        if (monaco) {
            ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
                void runQueryRef.current()
            );
        }
    };

    const warnsAboutSession = SESSION_SCOPED.test(state.query);

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-shrink-0 items-center gap-2 border-b bg-background px-3 py-2">
                <span className="truncate text-xs font-medium">{tab.title}</span>
                {readOnly && (
                    <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        <IconLock className="size-3" />
                        {t("readOnly")}
                    </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    <Select
                        value={String(state.limit)}
                        onValueChange={(value) =>
                            setState((prev) => ({ ...prev, limit: Number(value) }))
                        }
                    >
                        <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ROW_LIMITS.map((n) => (
                                <SelectItem key={n} value={String(n)}>
                                    {t("rowLimit", { count: n })}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                                <IconHistory className="size-3.5" />
                                {t("history")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-96 p-0">
                            <div className="max-h-80 overflow-y-auto text-xs">
                                {saved.length === 0 && history.length === 0 && (
                                    <p className="p-4 text-muted-foreground">{t("historyEmpty")}</p>
                                )}
                                {saved.length > 0 && (
                                    <div className="p-2">
                                        <p className="px-1 pb-1 font-medium text-muted-foreground">
                                            {t("savedSection")}
                                        </p>
                                        {saved.map((s) => (
                                            <div
                                                key={s.name}
                                                className="group flex items-center rounded hover:bg-muted/60"
                                            >
                                                <button
                                                    className="min-w-0 flex-1 px-2 py-1.5 text-left"
                                                    onClick={() => applyQuery(s.query)}
                                                >
                                                    <span className="font-medium">{s.name}</span>
                                                    <span className="block truncate font-mono text-muted-foreground">
                                                        {s.query}
                                                    </span>
                                                </button>
                                                <button
                                                    className="p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                                                    aria-label={t("deleteSaved")}
                                                    onClick={() => deleteSavedQuery(s.name)}
                                                >
                                                    <IconTrash className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {history.length > 0 && (
                                    <div className="border-t p-2">
                                        <p className="px-1 pb-1 font-medium text-muted-foreground">
                                            {t("recentSection")}
                                        </p>
                                        {history.map((q, i) => (
                                            <button
                                                key={i}
                                                className="block w-full truncate rounded px-2 py-1.5 text-left font-mono hover:bg-muted/60"
                                                onClick={() => applyQuery(q)}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover open={saveOpen} onOpenChange={setSaveOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                                <IconDeviceFloppy className="size-3.5" />
                                {t("saveQuery")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="flex w-64 gap-2 p-2">
                            <Input
                                className="h-7 text-xs"
                                placeholder={t("savePlaceholder")}
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveCurrentQuery();
                                }}
                            />
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={saveCurrentQuery}
                                disabled={!saveName.trim()}
                            >
                                {t("saveQuery")}
                            </Button>
                        </PopoverContent>
                    </Popover>

                    {running ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={abandon}
                        >
                            <IconPlayerStop className="size-3.5" />
                            {t("abandon", { seconds: (elapsed / 1000).toFixed(1) })}
                        </Button>
                    ) : (
                        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => void runQuery()}>
                            <IconPlayerPlay className="size-3.5" />
                            {t("run")}
                        </Button>
                    )}
                    <span className="hidden text-[10px] text-muted-foreground sm:block">⌘↩</span>
                </div>
            </div>

            {warnsAboutSession && (
                <div className="flex items-center gap-2 border-b bg-sky-500/10 px-3 py-1.5 text-xs text-sky-700 dark:text-sky-300">
                    <IconInfoCircle className="size-3.5 flex-shrink-0" />
                    {t("sessionNotice")}
                </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="h-[200px] flex-shrink-0 border-b">
                    <MonacoEditor
                        language="sql"
                        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
                        value={state.query}
                        onChange={(v) => setQuery(v ?? "")}
                        onMount={handleEditorMount}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: "on",
                            wordWrap: "on",
                            padding: { top: 8, bottom: 8 },
                            scrollBeyondLastLine: false,
                            renderLineHighlight: "line",
                        }}
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-hidden">
                    {running && (
                        <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                            <IconLoader2 className="size-5 animate-spin" />
                            <span className="text-sm">
                                {t("executing", { seconds: (elapsed / 1000).toFixed(1) })}
                            </span>
                        </div>
                    )}

                    {!running && error && (
                        <div className="m-4 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                            <IconAlertCircle className="mt-0.5 size-4 flex-shrink-0" />
                            <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
                        </div>
                    )}

                    {!running && result && !error && (
                        <ResultsTable
                            result={result}
                            editable={
                                // Only a untouched table tab maps rows back to a
                                // table; a console query may join anything.
                                state.kind === "table" && state.table && !readOnly
                                    ? { config, schema: state.schema, table: state.table }
                                    : undefined
                            }
                        />
                    )}

                    {!running && !result && !error && (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <IconPlayerPlay className="size-8 opacity-20" />
                            <p className="text-sm">{t("emptyTitle")}</p>
                            <p className="text-xs opacity-60">{t("emptyHint")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
