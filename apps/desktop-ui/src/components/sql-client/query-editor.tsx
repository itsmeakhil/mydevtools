"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    IconPlayerPlay,
    IconLoader2,
    IconX,
    IconAlertCircle,
    IconHistory,
    IconDeviceFloppy,
    IconTrash,
} from "@tabler/icons-react";
import {
    getSqlQueryHistory,
    getSqlSavedQueries,
    putSqlQueryHistory,
    putSqlSavedQueries,
    type NosqlSavedQuery,
} from "@/lib/user-preferences-api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { QueryResult, QueryTab, SavedSqlConnection } from "./types";
import { sqlBody } from "@/lib/sql-request";
import { ResultsTable } from "./results-table";
import { DbIcon, dbTypeLabel } from "./db-icon";
import MonacoEditor from "@/components/lazy/LazyMonaco";
import type { editor } from "monaco-editor";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface QueryEditorProps {
    tab: QueryTab;
    connection: SavedSqlConnection | undefined;
    onQueryChange: (query: string) => void;
    onResult: (result: QueryResult | null, error: string | null) => void;
    onClose: () => void;
}

export function QueryEditor({ tab, connection, onQueryChange, onResult, onClose }: QueryEditorProps) {
    const t = useTranslations("SqlClient.editor");
    const { resolvedTheme } = useTheme();
    const [isRunning, setIsRunning] = useState(false);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Query history + saved queries, keyed by connection + database (same
    // generic user-preferences list store the nosql explorer uses).
    const [history, setHistory] = useState<string[]>([]);
    const [saved, setSaved] = useState<NosqlSavedQuery[]>([]);
    const [saveName, setSaveName] = useState("");
    const [saveOpen, setSaveOpen] = useState(false);
    const listKey = connection?.config
        ? { connectionName: tab.connectionName, dbName: connection.config.database }
        : null;
    const listKeyRef = useRef(listKey);
    listKeyRef.current = listKey;

    useEffect(() => {
        if (!listKey) return;
        let cancelled = false;
        Promise.all([getSqlQueryHistory(listKey), getSqlSavedQueries(listKey)])
            .then(([h, s]) => {
                if (cancelled) return;
                setHistory(h.queries ?? []);
                setSaved(s.queries ?? []);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab.connectionName, connection?.config?.database]);

    const recordHistory = useCallback((query: string) => {
        const key = listKeyRef.current;
        if (!key) return;
        setHistory((prev) => {
            const next = [query, ...prev.filter((q) => q !== query)].slice(0, 10);
            putSqlQueryHistory({ ...key, queries: next }).catch(() => {});
            return next;
        });
    }, []);

    const applyQuery = (q: string) => {
        onQueryChange(q);
        editorRef.current?.setValue(q);
    };

    const saveCurrentQuery = () => {
        const key = listKeyRef.current;
        const query = editorRef.current?.getValue() ?? tab.query;
        const name = saveName.trim();
        if (!key || !name || !query.trim()) return;
        setSaved((prev) => {
            const next = [{ name, query }, ...prev.filter((s) => s.name !== name)].slice(0, 50);
            putSqlSavedQueries({ ...key, queries: next }).catch(() => {});
            return next;
        });
        setSaveName("");
        setSaveOpen(false);
        toast.success(t("toastQuerySaved"));
    };

    const deleteSavedQuery = (name: string) => {
        const key = listKeyRef.current;
        if (!key) return;
        setSaved((prev) => {
            const next = prev.filter((s) => s.name !== name);
            putSqlSavedQueries({ ...key, queries: next }).catch(() => {});
            return next;
        });
    };

    const runQuery = useCallback(async () => {
        if (!connection?.config) {
            toast.error(t("toastNoConnection"));
            return;
        }
        const query = editorRef.current?.getValue() ?? tab.query;
        if (!query.trim()) return;

        setIsRunning(true);
        onResult(null, null);
        try {
            const res = await apiFetch("/api/sql-client/query", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sqlBody(connection.config, { query })),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onResult(data as QueryResult, null);
            recordHistory(query);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            onResult(null, msg);
            toast.error(msg);
        } finally {
            setIsRunning(false);
        }
    }, [connection, tab.query, onResult, recordHistory, t]);

    const handleEditorMount = (ed: editor.IStandaloneCodeEditor) => {
        editorRef.current = ed;
        // Ctrl/Cmd + Enter to run — keybinding wired up via monaco globals after mount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monaco = (window as any).monaco;
        if (monaco) {
            ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runQuery);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tab header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 bg-background">
                <DbIcon type={tab.connectionType} className="w-4 h-4" />
                <span className="text-xs font-medium truncate">
                    {tab.connectionName}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{dbTypeLabel(tab.connectionType)}</span>

                <div className="ml-auto flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                                <IconHistory className="w-3.5 h-3.5" />
                                {t("btnHistory")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-96 p-0">
                            <div className="max-h-80 overflow-y-auto text-xs">
                                {saved.length === 0 && history.length === 0 && (
                                    <p className="p-4 text-muted-foreground">{t("emptyHistory")}</p>
                                )}
                                {saved.length > 0 && (
                                    <div className="p-2">
                                        <p className="px-1 pb-1 font-medium text-muted-foreground">{t("savedSection")}</p>
                                        {saved.map((s) => (
                                            <div key={s.name} className="flex items-center group rounded hover:bg-muted/60">
                                                <button
                                                    className="flex-1 text-left px-2 py-1.5 min-w-0"
                                                    onClick={() => applyQuery(s.query)}
                                                >
                                                    <span className="font-medium">{s.name}</span>
                                                    <span className="block truncate font-mono text-muted-foreground">{s.query}</span>
                                                </button>
                                                <button
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive"
                                                    aria-label={t("deleteSaved")}
                                                    onClick={() => deleteSavedQuery(s.name)}
                                                >
                                                    <IconTrash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {history.length > 0 && (
                                    <div className="p-2 border-t">
                                        <p className="px-1 pb-1 font-medium text-muted-foreground">{t("recentSection")}</p>
                                        {history.map((q, i) => (
                                            <button
                                                key={i}
                                                className="block w-full text-left px-2 py-1.5 rounded hover:bg-muted/60 truncate font-mono"
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
                                <IconDeviceFloppy className="w-3.5 h-3.5" />
                                {t("btnSaveQuery")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 p-2 flex gap-2">
                            <Input
                                className="h-7 text-xs"
                                placeholder={t("savePlaceholder")}
                                value={saveName}
                                onChange={(e) => setSaveName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveCurrentQuery(); }}
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={saveCurrentQuery} disabled={!saveName.trim()}>
                                {t("btnSaveQuery")}
                            </Button>
                        </PopoverContent>
                    </Popover>
                    <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={runQuery}
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <IconPlayerPlay className="w-3.5 h-3.5" />
                        )}
                        {t("btnRun")}
                    </Button>
                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                        ⌘↩
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={onClose}
                    >
                        <IconX className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Editor + Results split */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Monaco editor */}
                <div className="h-[200px] flex-shrink-0 border-b">
                    <MonacoEditor
                        language="sql"
                        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
                        value={tab.query}
                        onChange={(v) => onQueryChange(v ?? "")}
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

                {/* Results */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {isRunning && (
                        <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                            <IconLoader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">{t("executing")}</span>
                        </div>
                    )}

                    {!isRunning && tab.error && (
                        <div className="flex items-start gap-3 p-4 m-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                            <IconAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <pre className="whitespace-pre-wrap font-mono text-xs">{tab.error}</pre>
                        </div>
                    )}

                    {!isRunning && tab.result && !tab.error && (
                        <ResultsTable
                            result={tab.result}
                            editable={
                                tab.table && connection?.config
                                    ? { config: connection.config, schema: tab.table.schema, table: tab.table.name }
                                    : undefined
                            }
                        />
                    )}

                    {!isRunning && !tab.result && !tab.error && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                            <IconPlayerPlay className="w-8 h-8 opacity-20" />
                            <p className="text-sm">{t("emptyTitle")}</p>
                            <p className="text-xs opacity-60">{t("emptyHint")}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
