"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    IconChevronRight,
    IconChevronDown,
    IconTable,
    IconRefresh,
    IconPlus,
    IconDatabase,
    IconEye,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { SavedSqlConnection, SchemaInfo, TableInfo } from "./types";
import { DbIcon, dbTypeLabel } from "./db-icon";
import { touchConnection } from "./connection-service";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SchemaSidebarProps {
    width: number;
    connections: SavedSqlConnection[];
    activeConnectionId: string | null;
    onSelectTable: (conn: SavedSqlConnection, table: TableInfo) => void;
    onAddConnection: () => void;
    onSelectConnection: (conn: SavedSqlConnection) => void;
}

interface ConnState {
    expanded: boolean;
    schema: SchemaInfo | null;
    loading: boolean;
    error: string | null;
    expandedTables: Set<string>;
}

export function SchemaSidebar({
    width,
    connections,
    activeConnectionId,
    onSelectTable,
    onAddConnection,
    onSelectConnection,
}: SchemaSidebarProps) {
    const t = useTranslations("SqlClient.sidebar");
    const [connStates, setConnStates] = useState<Record<string, ConnState>>({});

    const getState = (id: string): ConnState =>
        connStates[id] ?? {
            expanded: false,
            schema: null,
            loading: false,
            error: null,
            expandedTables: new Set(),
        };

    const setState = (id: string, patch: Partial<ConnState>) =>
        setConnStates((prev) => ({
            ...prev,
            [id]: { ...getState(id), ...patch },
        }));

    const loadSchema = async (conn: SavedSqlConnection) => {
        if (!conn.config) return;
        setState(conn.id, { loading: true, error: null });
        try {
            const res = await fetch("/api/sql-client/tables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(conn.config),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setState(conn.id, { schema: data, loading: false });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setState(conn.id, { loading: false, error: msg });
            toast.error(t("toastSchemaFail", { message: msg }));
        }
    };

    const toggleConnection = async (conn: SavedSqlConnection) => {
        const s = getState(conn.id);
        if (!s.expanded) {
            setState(conn.id, { expanded: true });
            onSelectConnection(conn);
            if (!s.schema && !s.loading) {
                await loadSchema(conn);
                touchConnection(conn.id).catch(() => {});
            }
        } else {
            setState(conn.id, { expanded: false });
        }
    };

    const toggleTable = (connId: string, tableName: string) => {
        const s = getState(connId);
        const expanded = new Set(s.expandedTables);
        if (expanded.has(tableName)) expanded.delete(tableName);
        else expanded.add(tableName);
        setState(connId, { expandedTables: expanded });
    };

    const handleTableClick = (e: React.MouseEvent, conn: SavedSqlConnection, table: TableInfo) => {
        e.stopPropagation();
        onSelectTable(conn, table);
    };

    return (
        <div
            className="flex flex-col h-full border-r bg-sidebar overflow-hidden"
            style={{ width }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0">
                <h1 className="text-sm font-semibold flex items-center gap-1.5">
                    <IconDatabase className="w-4 h-4 text-primary flex-shrink-0" />
                    {t("title")}
                </h1>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onAddConnection}
                    title={t("tooltipAddConnection")}
                >
                    <IconPlus className="h-3.5 w-3.5" />
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {connections.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                            {t("noConnections")}
                        </div>
                    )}

                    {connections.map((conn) => {
                        const s = getState(conn.id);
                        const isActive = activeConnectionId === conn.id;

                        // Group tables by schema
                        const tablesBySchema: Record<string, TableInfo[]> = {};
                        if (s.schema) {
                            for (const t of s.schema.tables) {
                                const key = t.schema || "public";
                                if (!tablesBySchema[key]) tablesBySchema[key] = [];
                                tablesBySchema[key].push(t);
                            }
                        }

                        return (
                            <div key={conn.id}>
                                {/* Connection row */}
                                <div
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer group hover:bg-accent transition-colors",
                                        isActive && "bg-accent"
                                    )}
                                    onClick={() => toggleConnection(conn)}
                                >
                                    {s.expanded ? (
                                        <IconChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    ) : (
                                        <IconChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <DbIcon type={conn.type} className="w-4 h-4 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{conn.name}</div>
                                        <div className="text-[10px] text-muted-foreground truncate">
                                            {dbTypeLabel(conn.type)} · {conn.config?.database}
                                        </div>
                                    </div>
                                    {s.loading && (
                                        <IconRefresh className="w-3.5 h-3.5 animate-spin text-muted-foreground flex-shrink-0" />
                                    )}
                                    {s.expanded && !s.loading && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                            onClick={(e) => { e.stopPropagation(); loadSchema(conn); }}
                                            title={t("tooltipRefreshSchema")}
                                        >
                                            <IconRefresh className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {/* Schema tree */}
                                {s.expanded && !s.loading && s.schema && (
                                    <div className="ml-5 space-y-0.5">
                                        {Object.entries(tablesBySchema).map(([schema, tables]) => (
                                            <div key={schema}>
                                                {Object.keys(tablesBySchema).length > 1 && (
                                                    <div className="text-[10px] text-muted-foreground px-2 py-1 uppercase tracking-wider">
                                                        {schema}
                                                    </div>
                                                )}
                                                {tables.map((table) => {
                                                    const isTableExpanded = s.expandedTables.has(table.name);
                                                    const cols = s.schema?.columns.filter(
                                                        (c) => c.table_name === table.name && c.schema === table.schema
                                                    ) ?? [];

                                                    return (
                                                        <div key={table.name}>
                                                            <div
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent cursor-pointer group/table text-xs"
                                                                onClick={(e) => handleTableClick(e, conn, table)}
                                                            >
                                                                <span
                                                                    className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        toggleTable(conn.id, table.name);
                                                                    }}
                                                                >
                                                                    {isTableExpanded ? (
                                                                        <IconChevronDown className="w-3 h-3" />
                                                                    ) : (
                                                                        <IconChevronRight className="w-3 h-3" />
                                                                    )}
                                                                </span>
                                                                {table.type === "VIEW" ? (
                                                                    <IconEye className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                                ) : (
                                                                    <IconTable className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                                                )}
                                                                <span className="truncate font-mono">{table.name}</span>
                                                            </div>

                                                            {isTableExpanded && cols.length > 0 && (
                                                                <div className="ml-6 space-y-0.5 pb-1">
                                                                    {cols.map((col) => (
                                                                        <div
                                                                            key={col.column_name}
                                                                            className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] text-muted-foreground"
                                                                        >
                                                                            <span className="font-mono truncate">{col.column_name}</span>
                                                                            <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground/70 flex-shrink-0">
                                                                                {col.data_type}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {s.expanded && s.error && (
                                    <div className="ml-5 px-2 py-1 text-xs text-destructive">
                                        {s.error}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
