"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    IconPlayerPlay,
    IconLoader2,
    IconX,
    IconAlertCircle,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { QueryResult, QueryTab, SavedSqlConnection } from "./types";
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
            const res = await fetch("/api/sql-client/query", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...connection.config, query }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onResult(data as QueryResult, null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            onResult(null, msg);
            toast.error(msg);
        } finally {
            setIsRunning(false);
        }
    }, [connection, tab.query, onResult, t]);

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
                        <ResultsTable result={tab.result} />
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
