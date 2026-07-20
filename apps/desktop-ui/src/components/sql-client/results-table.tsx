"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconDownload, IconSearch, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { QueryResult, SchemaInfo, SqlConnectionConfig } from "./types";
import { typeCellInput } from "@/lib/sql-cell";

interface ResultsTableProps {
    result: QueryResult;
    /** Present when the result is a plain table select — enables cell editing. */
    editable?: { config: SqlConnectionConfig; schema: string; table: string };
}

export function ResultsTable({ result, editable }: ResultsTableProps) {
    const t = useTranslations("SqlClient.results");
    const [filter, setFilter] = useState("");
    // Primary-key columns for the edited table; [] = no PK (editing disabled).
    const [pkCols, setPkCols] = useState<string[]>([]);
    // Committed edits, keyed by original row index — result props stay immutable.
    const [overrides, setOverrides] = useState<Record<number, Record<string, unknown>>>({});
    const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState("");
    const [saving, setSaving] = useState(false);
    const editInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!editable) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch("/api/sql-client/tables", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editable.config),
                });
                if (!res.ok) return;
                const schema = (await res.json()) as SchemaInfo;
                if (cancelled) return;
                const pks = (schema.primaryKeys ?? [])
                    .filter(
                        (pk) =>
                            pk.table_name === editable.table &&
                            (!editable.schema || !pk.schema || pk.schema === editable.schema),
                    )
                    .map((pk) => pk.column_name);
                setPkCols(pks);
            } catch {
                // No PK info → editing stays disabled; the grid still renders.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [editable]);

    useEffect(() => {
        if (editing) editInputRef.current?.focus();
    }, [editing]);

    // New result rows → old index-keyed edits no longer apply.
    useEffect(() => {
        setOverrides({});
        setEditing(null);
    }, [result]);

    const cellValue = (origIdx: number, col: string): unknown => {
        const o = overrides[origIdx];
        return o && col in o ? o[col] : result.rows[origIdx]?.[col];
    };

    // Filter over effective (edited) values, carrying original indexes.
    const indexedRows = result.rows.map((_, i) => i);
    const filteredIdx = filter
        ? indexedRows.filter((i) =>
              result.columns.some((col) =>
                  String(cellValue(i, col) ?? "").toLowerCase().includes(filter.toLowerCase()),
              ),
          )
        : indexedRows;

    const canEdit =
        !!editable &&
        pkCols.length > 0 &&
        pkCols.every((pk) => result.columns.includes(pk));

    const commitEdit = async (origIdx: number, col: string) => {
        if (!editable || saving) return;
        const newValue = typeCellInput(editValue);
        const current = cellValue(origIdx, col);
        if (newValue === current) {
            setEditing(null);
            return;
        }
        setSaving(true);
        try {
            const where: Record<string, unknown> = {};
            for (const pk of pkCols) where[pk] = cellValue(origIdx, pk);
            const res = await apiFetch("/api/sql-client/update-row", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editable.config,
                    schema: editable.schema,
                    table: editable.table,
                    set: { [col]: newValue },
                    where,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setOverrides((prev) => ({
                ...prev,
                [origIdx]: { ...prev[origIdx], [col]: newValue },
            }));
            if (data.rowCount === 1) {
                toast.success(t("toastRowUpdated"));
            } else {
                toast.warning(t("toastRowsUpdated", { count: Number(data.rowCount ?? 0) }));
            }
            setEditing(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    const handleExportCSV = () => {
        const header = result.columns.join(",");
        const rows = indexedRows.map((i) =>
            result.columns
                .map((col) => {
                    const val = cellValue(i, col);
                    const str = val == null ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
                    return `"${str.replace(/"/g, '""')}"`;
                })
                .join(",")
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "query-results.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatCell = (value: unknown): string => {
        if (value === null || value === undefined) return "NULL";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 bg-muted/30">
                <div className="relative flex-1 max-w-xs">
                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        className="h-7 pl-8 pr-7 text-xs"
                        placeholder={t("filterPlaceholder")}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    {filter && (
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => setFilter("")}
                        >
                            <IconX className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <span className="text-xs text-muted-foreground ml-auto">
                    {canEdit && <span className="mr-2 opacity-70">{t("editHint")}</span>}
                    {filteredIdx.length !== result.rows.length
                        ? t("rowCountFiltered", { filtered: filteredIdx.length, total: result.rows.length })
                        : t("rowCount", { count: result.rowCount })}{" "}
                    · {result.executionTime}ms
                </span>

                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportCSV}>
                    <IconDownload className="w-3.5 h-3.5" />
                    {t("exportCsv")}
                </Button>
            </div>

            {/* Table */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="min-w-max">
                    <table className="w-full text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                            <tr>
                                <th className="w-10 px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-r select-none">
                                    #
                                </th>
                                {result.columns.map((col) => (
                                    <th
                                        key={col}
                                        className="px-3 py-1.5 text-left font-medium border-b border-r whitespace-nowrap font-mono"
                                    >
                                        {col}
                                        {canEdit && pkCols.includes(col) && (
                                            <span className="ml-1 text-[9px] text-muted-foreground align-top">PK</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIdx.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={result.columns.length + 1}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        {t("noRows")}
                                    </td>
                                </tr>
                            ) : (
                                filteredIdx.map((origIdx, displayIdx) => (
                                    <tr key={origIdx} className="hover:bg-muted/40 group">
                                        <td className="px-2 py-1 text-muted-foreground border-b border-r text-right select-none tabular-nums">
                                            {displayIdx + 1}
                                        </td>
                                        {result.columns.map((col) => {
                                            const val = cellValue(origIdx, col);
                                            const isNull = val === null || val === undefined;
                                            const isEditing = editing?.row === origIdx && editing?.col === col;
                                            if (isEditing) {
                                                return (
                                                    <td key={col} className="p-0 border-b border-r max-w-[300px]">
                                                        <Input
                                                            ref={editInputRef}
                                                            className="h-6 rounded-none border-primary text-xs font-mono px-2"
                                                            value={editValue}
                                                            disabled={saving}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") void commitEdit(origIdx, col);
                                                                if (e.key === "Escape") setEditing(null);
                                                            }}
                                                            onBlur={() => { if (!saving) setEditing(null); }}
                                                        />
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td
                                                    key={col}
                                                    className="px-3 py-1 border-b border-r max-w-[300px] truncate font-mono"
                                                    title={isNull ? "NULL" : String(val)}
                                                    onDoubleClick={() => {
                                                        // PK cells are the row identity — not editable in place.
                                                        if (!canEdit || pkCols.includes(col)) return;
                                                        setEditing({ row: origIdx, col });
                                                        setEditValue(isNull ? "" : formatCell(val));
                                                    }}
                                                >
                                                    {isNull ? (
                                                        <span className="text-muted-foreground/50 italic">NULL</span>
                                                    ) : (
                                                        <span
                                                            className={
                                                                typeof val === "boolean"
                                                                    ? "text-blue-500"
                                                                    : typeof val === "number"
                                                                    ? "text-orange-500"
                                                                    : ""
                                                            }
                                                        >
                                                            {formatCell(val)}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </ScrollArea>
        </div>
    );
}
