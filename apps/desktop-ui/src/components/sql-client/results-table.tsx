"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconDownload, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { QueryResult } from "./types";

interface ResultsTableProps {
    result: QueryResult;
}

export function ResultsTable({ result }: ResultsTableProps) {
    const t = useTranslations("SqlClient.results");
    const [filter, setFilter] = useState("");

    const filteredRows = filter
        ? result.rows.filter((row) =>
              Object.values(row).some((v) =>
                  String(v ?? "").toLowerCase().includes(filter.toLowerCase())
              )
          )
        : result.rows;

    const handleExportCSV = () => {
        const header = result.columns.join(",");
        const rows = result.rows.map((row) =>
            result.columns
                .map((col) => {
                    const val = row[col];
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
                    {filteredRows.length !== result.rows.length
                        ? t("rowCountFiltered", { filtered: filteredRows.length, total: result.rows.length })
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
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={result.columns.length + 1}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        {t("noRows")}
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row, i) => (
                                    <tr key={i} className="hover:bg-muted/40 group">
                                        <td className="px-2 py-1 text-muted-foreground border-b border-r text-right select-none tabular-nums">
                                            {i + 1}
                                        </td>
                                        {result.columns.map((col) => {
                                            const val = row[col];
                                            const isNull = val === null || val === undefined;
                                            return (
                                                <td
                                                    key={col}
                                                    className="px-3 py-1 border-b border-r max-w-[300px] truncate font-mono"
                                                    title={isNull ? "NULL" : String(val)}
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
