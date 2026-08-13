"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { IconPlus, IconTrash, IconRefresh, IconDatabase, IconAlertCircle, IconX } from "@tabler/icons-react";
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

interface IndexInfo {
    name: string;
    key: Record<string, number | string>;
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    v?: number;
    expireAfterSeconds?: number;
    size?: number;
    [key: string]: any;
}

interface CollectionStats {
    count?: number | null;
    size?: number | null;
    storageSize?: number | null;
    avgObjSize?: number | null;
}

interface IndexManagerProps {
    indexes: IndexInfo[];
    totalIndexSize?: number;
    stats?: CollectionStats | null;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    onDropIndex: (indexName: string) => Promise<void>;
    onCreateIndex: (keys: Record<string, number>, options: Record<string, any>) => Promise<void>;
    readOnly?: boolean;
}

interface FieldRow {
    field: string;
    dir: "1" | "-1";
}

function formatKeySpec(key: Record<string, number | string>): string {
    return Object.entries(key)
        .map(([field, dir]) => `${field}: ${dir === 1 ? 'asc' : dir === -1 ? 'desc' : dir}`)
        .join(', ');
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function IndexManager({
    indexes,
    totalIndexSize,
    stats,
    loading,
    error,
    onRefresh,
    onDropIndex,
    onCreateIndex,
    readOnly = false,
}: IndexManagerProps) {
    const t = useTranslations("NoSqlExplorer.indexManager");
    const [dropConfirm, setDropConfirm] = useState<string | null>(null);
    const [dropping, setDropping] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [fieldRows, setFieldRows] = useState<FieldRow[]>([{ field: '', dir: '1' }]);
    const [newUnique, setNewUnique] = useState(false);
    const [newSparse, setNewSparse] = useState(false);
    const [ttlSeconds, setTtlSeconds] = useState('');

    const resetCreateForm = () => {
        setShowCreate(false);
        setFieldRows([{ field: '', dir: '1' }]);
        setNewUnique(false);
        setNewSparse(false);
        setTtlSeconds('');
    };

    const updateRow = (i: number, patch: Partial<FieldRow>) =>
        setFieldRows(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));

    const handleDrop = async () => {
        if (!dropConfirm) return;
        setDropping(true);
        try {
            await onDropIndex(dropConfirm);
            toast.success(t("dropped", { name: dropConfirm }));
        } catch (err: any) {
            toast.error(err.message || t("dropFailed"));
        } finally {
            setDropping(false);
            setDropConfirm(null);
        }
    };

    const handleCreate = async () => {
        const rows = fieldRows.filter(r => r.field.trim());
        if (rows.length === 0) {
            toast.error(t("fieldRequired"));
            return;
        }
        const keys: Record<string, number> = {};
        rows.forEach(r => { keys[r.field.trim()] = parseInt(r.dir); });
        const options: Record<string, any> = {};
        if (newUnique) options.unique = true;
        if (newSparse) options.sparse = true;
        const ttl = parseInt(ttlSeconds, 10);
        if (!isNaN(ttl) && ttl >= 0) options.expireAfterSeconds = ttl;
        setCreating(true);
        try {
            await onCreateIndex(keys, options);
            toast.success(t("created"));
            resetCreateForm();
        } catch (err: any) {
            toast.error(err.message || t("createFailed"));
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-sm text-muted-foreground animate-pulse">{t("loading")}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center p-6">
                    <IconAlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={onRefresh}>
                        <IconRefresh className="h-3.5 w-3.5 mr-1.5" />
                        {t("retry")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/10 shrink-0">
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="text-sm font-medium text-foreground">{t("countLabel", { count: indexes.length })}</span>
                    {typeof totalIndexSize === 'number' && (
                        <span>· {t("totalSize", { size: formatBytes(totalIndexSize) })}</span>
                    )}
                    {typeof stats?.count === 'number' && (
                        <span>· {t("statsDocs", { count: stats.count })}</span>
                    )}
                    {typeof stats?.storageSize === 'number' && (
                        <span>· {t("statsStorage", { size: formatBytes(stats.storageSize) })}</span>
                    )}
                    {typeof stats?.avgObjSize === 'number' && (
                        <span>· {t("statsAvgObj", { size: formatBytes(Math.round(stats.avgObjSize)) })}</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
                        <IconRefresh className="h-3.5 w-3.5" />
                    </Button>
                    {!readOnly && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => setShowCreate(true)}>
                            <IconPlus className="h-3.5 w-3.5 mr-1" />
                            {t("newIndex")}
                        </Button>
                    )}
                </div>
            </div>

            {showCreate && (
                <div className="px-4 py-3 border-b bg-muted/20 space-y-2.5 shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">{t("createTitle")}</p>
                    {fieldRows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Input
                                placeholder={t("fieldPlaceholder")}
                                value={row.field}
                                onChange={(e) => updateRow(i, { field: e.target.value })}
                                className="h-8 text-xs flex-1"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') resetCreateForm(); }}
                            />
                            <select
                                value={row.dir}
                                onChange={(e) => updateRow(i, { dir: e.target.value as '1' | '-1' })}
                                className="h-8 rounded-md border bg-background text-xs px-2 outline-none"
                            >
                                <option value="1">{t("ascending")}</option>
                                <option value="-1">{t("descending")}</option>
                            </select>
                            {fieldRows.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground"
                                    onClick={() => setFieldRows(rows => rows.filter((_, idx) => idx !== i))}
                                >
                                    <IconX className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                    <div className="flex items-center gap-4 flex-wrap">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setFieldRows(rows => [...rows, { field: '', dir: '1' }])}
                        >
                            <IconPlus className="h-3 w-3 mr-1" />
                            {t("addField")}
                        </Button>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                            <input type="checkbox" checked={newUnique} onChange={(e) => setNewUnique(e.target.checked)} className="rounded" />
                            {t("unique")}
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                            <input type="checkbox" checked={newSparse} onChange={(e) => setNewSparse(e.target.checked)} className="rounded" />
                            {t("sparse")}
                        </label>
                        <label className="flex items-center gap-1.5 text-xs shrink-0">
                            {t("ttlLabel")}
                            <Input
                                type="number"
                                min={0}
                                placeholder={t("ttlPlaceholder")}
                                value={ttlSeconds}
                                onChange={(e) => setTtlSeconds(e.target.value)}
                                className="h-7 text-xs w-28"
                            />
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={resetCreateForm}>{t("cancel")}</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={creating}>
                            {creating ? t("creating") : t("create")}
                        </Button>
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                    {indexes.map((idx) => (
                        <div
                            key={idx.name}
                            className="group flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                        >
                            <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-medium truncate">{idx.name}</span>
                                    {idx.name === '_id_' && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t("badgeSystem")}</Badge>
                                    )}
                                    {idx.unique && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-600 dark:text-blue-400">{t("badgeUnique")}</Badge>
                                    )}
                                    {idx.sparse && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t("badgeSparse")}</Badge>
                                    )}
                                    {idx.expireAfterSeconds !== undefined && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/50 text-orange-600">{t("badgeTtl")}</Badge>
                                    )}
                                    {typeof idx.size === 'number' && (
                                        <span className="text-[10px] font-mono text-muted-foreground">{formatBytes(idx.size)}</span>
                                    )}
                                </div>
                                <p className="text-[11px] font-mono text-muted-foreground">{formatKeySpec(idx.key)}</p>
                            </div>
                            {idx.name !== '_id_' && !readOnly && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => setDropConfirm(idx.name)}
                                >
                                    <IconTrash className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}

                    {indexes.length === 0 && (
                        <div className="flex flex-col items-center gap-3 py-12 text-center">
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                                <IconDatabase className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">{t("empty")}</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <AlertDialog open={!!dropConfirm} onOpenChange={(open) => !open && setDropConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("dropTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("dropDescription", { name: dropConfirm ?? "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDrop}
                            disabled={dropping}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {dropping ? t("dropping") : t("dropConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
