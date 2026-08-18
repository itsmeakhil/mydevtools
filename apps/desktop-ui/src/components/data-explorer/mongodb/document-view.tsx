"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Document } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    IconPlus, IconRefresh, IconTrash, IconPencil, IconTable,
    IconCopy, IconAlignLeft, IconMinimize, IconJson, IconBinaryTree,
    IconHistory, IconX, IconDownload, IconMaximize, IconChevronLeft,
    IconChevronRight, IconServer, IconDatabase, IconFolder, IconFolderOpen,
    IconRowInsertBottom, IconLayoutRows, IconArrowsMaximize, IconArrowsMinimize,
    IconUpload, IconListDetails, IconSchema, IconArrowsExchange, IconChevronDown,
    IconFilter, IconFilterX, IconSortAscending, IconSortDescending, IconLock,
    IconAlertTriangle, IconLoader2, IconChartBar,
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    ContextMenu, ContextMenuContent, ContextMenuItem,
    ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Editor from "@/components/lazy/LazyMonaco";
import CodeEditor from "@/components/ui/code-editor";
import { JsonTree } from "./json-tree";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportDialog } from "./export-dialog";
import { ImportDialog } from "./import-dialog";
import { IndexManager } from "./index-manager";
import { QueryBuilder } from "./query-builder";
import { CellValue, SkeletonRow } from "./cells";
import { summarizeExplain } from "@/lib/nosql-explain";
import { SchemaView } from "./schema-view";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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

interface DocumentViewProps {
    connectionName: string;
    dbName: string;
    collectionName: string;
    documents: Document[];
    total: number;
    page: number;
    limit: number;
    loading: boolean;
    error?: string | null;
    onRefresh: () => void;
    onInsert: (doc: any) => Promise<void>;
    onUpdate: (id: string, update: any, mode?: "merge" | "replace") => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onSearch: (query: string) => void;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSortChange: (field: string, direction: 'asc' | 'desc') => void;
    onBulkDelete?: (ids: string[]) => Promise<void>;
    onImport?: (documents: any[]) => Promise<void>;
    onLoadSchema?: (opts: { sampleMode: string; sampleSize: number }) => Promise<{ fields: any[]; sampleSize: number; validator?: unknown }>;
    onLoadIndexes?: () => Promise<{ indexes: any[]; totalIndexSize?: number; stats?: any }>;
    onDropIndex?: (indexName: string) => Promise<void>;
    onCreateIndex?: (keys: Record<string, number>, options: Record<string, any>) => Promise<void>;
    onExplain?: (query: string) => Promise<any>;
    onPreviewPipeline?: (pipelineJson: string) => Promise<{ documents: unknown[] }>;
    readOnly?: boolean;
}


// ── main component ────────────────────────────────────────────────────────────

// Explicit default so header/body columns share one width. Virtual rows are
// position:absolute (detached from the table's column model), so `auto` widths
// let thead and tbody size independently and drift out of alignment.
const DEFAULT_COL_WIDTH = 200;

// Pinned cells sit over the horizontally scrolled ones, so their hover/selected
// tints ride on background-image (gradient) and leave the opaque background-color
// underneath. A plain `bg-muted/50` here replaces the base colour and the scrolled
// cells bleed through the 50% alpha.
const STICKY_CELL =
    "sticky z-10 bg-background transition-colors bg-gradient-to-r from-transparent to-transparent group-hover:from-muted/50 group-hover:to-muted/50";
const STICKY_CELL_SELECTED =
    "from-primary/5 to-primary/5 group-hover:from-primary/10 group-hover:to-primary/10";

// Local input state so keystrokes don't re-render the whole document grid.
function EditableCell({
    initialValue,
    saving,
    onCommit,
    onCancel,
}: {
    initialValue: string;
    saving: boolean;
    onCommit: (raw: string) => void;
    onCancel: () => void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <Input
            autoFocus
            value={value}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === "Enter") onCommit(value);
                if (e.key === "Escape") onCancel();
            }}
            onBlur={() => { if (!saving) onCancel(); }}
            className="h-7 text-xs font-mono"
        />
    );
}

export function DocumentView({
    connectionName,
    dbName,
    collectionName,
    documents,
    total,
    page,
    limit,
    loading,
    error = null,
    onRefresh,
    onInsert,
    onUpdate,
    onDelete,
    onSearch,
    onPageChange,
    onLimitChange,
    sortField,
    sortDirection,
    onSortChange,
    onBulkDelete,
    onImport,
    onLoadSchema,
    onLoadIndexes,
    onDropIndex,
    onCreateIndex,
    onExplain,
    onPreviewPipeline,
    readOnly = false,
}: DocumentViewProps) {
    const t = useTranslations("NoSqlExplorer.document");
    const [viewMode, setViewMode] = useState<"table" | "json" | "tree" | "schema" | "indexes">("table");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [isImportExportChooserOpen, setIsImportExportChooserOpen] = useState(false);
    const [editorContent, setEditorContent] = useState("");
    const [viewValue, setViewValue] = useState<string>("");
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [jsonViewContent, setJsonViewContent] = useState("");
    // Column widths persist per collection so a hand-tuned grid survives tab
    // switches and reloads (localStorage; best-effort, SSR-safe via try/catch).
    const colWidthKey = `nosql_colw_${connectionName}|${dbName}|${collectionName}`;
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        try { return JSON.parse(localStorage.getItem(colWidthKey) || "{}"); } catch { return {}; }
    });
    useEffect(() => {
        try { setColumnWidths(JSON.parse(localStorage.getItem(colWidthKey) || "{}")); } catch { setColumnWidths({}); }
    }, [colWidthKey]);
    useEffect(() => {
        try { localStorage.setItem(colWidthKey, JSON.stringify(columnWidths)); } catch { /* quota / SSR */ }
    }, [colWidthKey, columnWidths]);
    const [treeExpandAll, setTreeExpandAll] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [indexesData, setIndexesData] = useState<{ indexes: any[]; totalIndexSize?: number; stats?: any } | null>(null);
    const [indexesLoading, setIndexesLoading] = useState(false);
    const [indexesError, setIndexesError] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ docId: string; field: string } | null>(null);
    const [editCellSaving, setEditCellSaving] = useState(false);
    const [explainOpen, setExplainOpen] = useState(false);
    const [explainLoading, setExplainLoading] = useState(false);
    const [explainData, setExplainData] = useState<any>(null);
    const [groupOpen, setGroupOpen] = useState(false);
    const [groupField, setGroupField] = useState("");
    const [groupLoading, setGroupLoading] = useState(false);
    const [groupRows, setGroupRows] = useState<Array<{ _id: unknown; count: number }> | null>(null);
    const [groupError, setGroupError] = useState<string | null>(null);
    const { theme } = useTheme();
    const { copyToClipboard } = useCopyToClipboard();

    const isScalar = (v: unknown) => v === null || ["string", "number", "boolean"].includes(typeof v);

    const startCellEdit = (doc: Document, field: string) => {
        if (readOnly || field === "_id") return;
        const value = doc[field];
        if (!isScalar(value) && value !== undefined) {
            // Nested values go through the full document editor
            handleEdit(doc);
            return;
        }
        setEditingCell({ docId: doc._id, field });
    };

    const commitCellEdit = async (doc: Document, rawValue: string) => {
        if (!editingCell || editCellSaving) return;
        const raw = rawValue.trim();
        const original = doc[editingCell.field];
        // Auto-type like the query builder: number / boolean / null, else string
        let parsed: unknown = rawValue;
        if (raw === "null") parsed = null;
        else if (raw === "true") parsed = true;
        else if (raw === "false") parsed = false;
        else if (raw !== "" && !isNaN(Number(raw)) && typeof original !== "string") parsed = Number(raw);
        if (parsed === original) {
            setEditingCell(null);
            return;
        }
        setEditCellSaving(true);
        try {
            await onUpdate(doc._id, { [editingCell.field]: parsed });
            toast.success(t("cellUpdated"));
            setEditingCell(null);
        } catch (e: any) {
            toast.error(e.message || t("cellUpdateFail"));
        } finally {
            setEditCellSaving(false);
        }
    };

    const applyCellFilter = (field: string, value: unknown, exclude = false) => {
        let q: Record<string, unknown> = {};
        try {
            const parsed = JSON.parse(searchQuery || "{}");
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) q = parsed;
        } catch { /* start fresh */ }
        q[field] = exclude ? { $ne: value } : value;
        const next = JSON.stringify(q);
        setSearchQuery(next);
        onSearch(next);
    };

    const runExplain = async (query: string) => {
        if (!onExplain) return;
        setExplainOpen(true);
        setExplainLoading(true);
        setExplainData(null);
        try {
            setExplainData(await onExplain(query));
        } catch (e: any) {
            toast.error(e.message || t("explainFail"));
            setExplainOpen(false);
        } finally {
            setExplainLoading(false);
        }
    };

    // One-click "group by field": distinct values + counts via the aggregation
    // path we already have (onPreviewPipeline). No new backend.
    const runGroupBy = async (field: string) => {
        if (!onPreviewPipeline) return;
        setGroupField(field);
        setGroupOpen(true);
        setGroupLoading(true);
        setGroupRows(null);
        setGroupError(null);
        try {
            const pipeline = JSON.stringify([
                { $group: { _id: `$${field}`, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 200 },
            ]);
            const res = await onPreviewPipeline(pipeline);
            setGroupRows((res.documents as Array<{ _id: unknown; count: number }>) ?? []);
        } catch (e: any) {
            setGroupError(e.message || t("groupByFail"));
        } finally {
            setGroupLoading(false);
        }
    };

    const tableContainerRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: documents.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 48,
        overscan: 10,
    });

    const treeContainerRef = useRef<HTMLDivElement>(null);

    const treeVirtualizer = useVirtualizer({
        count: documents.length,
        getScrollElement: () => treeContainerRef.current,
        estimateSize: () => 120,
        overscan: 5,
    });

    const openImportFromChooser = () => {
        setIsImportExportChooserOpen(false);
        setIsImportDialogOpen(true);
    };

    const openExportFromChooser = () => {
        setIsImportExportChooserOpen(false);
        setIsExportDialogOpen(true);
    };

    // Only serialize when the JSON view is actually visible — stringifying 2000
    // large docs on every fetch in table mode is wasted MBs of work.
    useEffect(() => {
        if (viewMode !== "json") return;
        if (documents.length === 0) {
            setJsonViewContent("[]");
            return;
        }
        const id = setTimeout(() => {
            setJsonViewContent(JSON.stringify(documents, null, 2));
        }, 0);
        return () => clearTimeout(id);
    }, [documents, viewMode]);

    // Clear selection when documents change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [documents]);

    // Load indexes when switching to indexes view
    useEffect(() => {
        if (viewMode === 'indexes' && !indexesData && onLoadIndexes) {
            loadIndexes();
        }
    }, [viewMode]);

    const loadIndexes = async () => {
        if (!onLoadIndexes) return;
        setIndexesLoading(true);
        setIndexesError(null);
        try {
            const data = await onLoadIndexes();
            setIndexesData(data);
        } catch (e: any) {
            setIndexesError(e.message || t("indexesLoadFail"));
        } finally {
            setIndexesLoading(false);
        }
    };

    const handlePrettify = () => {
        try {
            setJsonViewContent(JSON.stringify(JSON.parse(jsonViewContent), null, 2));
        } catch { toast.error(t("invalidJson")); }
    };

    const handleMinify = () => {
        try {
            setJsonViewContent(JSON.stringify(JSON.parse(jsonViewContent)));
        } catch { toast.error(t("invalidJson")); }
    };

    const handleCopy = () => {
        void copyToClipboard(jsonViewContent, t("copiedClipboard"));
    };

    const handleViewValue = (value: any) => {
        setViewValue(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
        setIsViewDialogOpen(true);
    };

    const handleEdit = (doc: Document) => {
        setSelectedDoc(doc);
        setEditorContent(JSON.stringify(doc, null, 2));
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        let updatedDoc: any;
        try { updatedDoc = JSON.parse(editorContent); }
        catch { toast.error(t("invalidJsonShort")); return; }
        if (!selectedDoc) return;
        try {
            // replace: fields removed in the editor get removed in the DB too
            await onUpdate(selectedDoc._id, updatedDoc, "replace");
            setIsEditDialogOpen(false);
            toast.success(t("docUpdated"));
            onRefresh();
        } catch (e: any) { toast.error(e.message || t("docUpdateFailed")); }
    };

    const handleInsert = async () => {
        let newDoc: any;
        try { newDoc = JSON.parse(editorContent); }
        catch { toast.error(t("invalidJsonShort")); return; }
        try {
            await onInsert(newDoc);
            setIsInsertDialogOpen(false);
            toast.success(t("docInserted"));
            onRefresh();
        } catch (e: any) { toast.error(e.message || t("docInsertFailed")); }
    };

    const openInsertDialog = () => {
        setEditorContent("{\n  \n}");
        setIsInsertDialogOpen(true);
    };

    const handleDuplicate = (doc: Document) => {
        const copy: any = { ...doc };
        delete copy._id;
        setEditorContent(JSON.stringify(copy, null, 2));
        setIsInsertDialogOpen(true);
    };

    const handleCopyDocument = (doc: Document) => {
        void copyToClipboard(JSON.stringify(doc, null, 2), t("docCopied"));
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            onSortChange(sortDirection === 'asc' ? field : '', sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            onSortChange(field, 'asc');
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === documents.length && documents.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(documents.map(d => d._id)));
        }
    };

    const handleSelectRow = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedIds(next);
    };

    const handleBulkDelete = async () => {
        if (!onBulkDelete || selectedIds.size === 0) return;
        setBulkDeleteLoading(true);
        try {
            await onBulkDelete(Array.from(selectedIds));
            toast.success(t("bulkDeleted", { count: selectedIds.size }));
            setSelectedIds(new Set());
            setBulkDeleteConfirm(false);
        } catch (e: any) {
            toast.error(e.message || t("bulkDeleteFailed"));
        } finally {
            setBulkDeleteLoading(false);
        }
    };

    const handleColumnResize = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.pageX;
        const th = (e.currentTarget as HTMLElement).parentElement;
        const initialWidth = th ? th.getBoundingClientRect().width : (columnWidths[key] || 300);

        const onMouseMove = (ev: MouseEvent) => {
            setColumnWidths(prev => ({ ...prev, [key]: Math.max(50, initialWidth + (ev.pageX - startX)) }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    const fields = useMemo(
        () => Array.from(new Set(documents.flatMap(Object.keys))).filter(k => k !== "_id"),
        [documents]
    );
    const allFields = useMemo(() => ["_id", ...fields], [fields]);
    const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);
    const isAllSelected = useMemo(
        () => documents.length > 0 && selectedIds.size === documents.length,
        [selectedIds, documents]
    );
    const isIndeterminate = useMemo(
        () => selectedIds.size > 0 && selectedIds.size < documents.length,
        [selectedIds, documents]
    );
    const isFilterActive = useMemo(() => {
        try {
            const q = searchQuery?.trim();
            if (!q || q === "{}") return false;
            return Object.keys(JSON.parse(q)).length > 0;
        } catch { return false; }
    }, [searchQuery]);

    const showSelectMode = viewMode === 'table' && !!onBulkDelete && !readOnly;

    const viewModeOptions = [
        { mode: 'table', icon: IconTable, label: t("table") },
        { mode: 'json', icon: IconJson, label: t("json") },
        { mode: 'tree', icon: IconBinaryTree, label: t("tree") },
        { mode: 'schema', icon: IconListDetails, label: t("schema") },
        { mode: 'indexes', icon: IconDatabase, label: t("indexes") },
    ] as const;

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 px-4 py-1.5 border-b bg-muted/20 text-xs text-muted-foreground overflow-x-auto no-scrollbar shrink-0">
                <IconServer className="h-3 w-3 text-purple-500 shrink-0" />
                <span className="truncate max-w-[120px]">{connectionName}</span>
                <span className="text-border">/</span>
                <IconDatabase className="h-3 w-3 text-blue-500 shrink-0" />
                <span className="truncate max-w-[120px]">{dbName}</span>
                <span className="text-border">/</span>
                <IconFolder className="h-3 w-3 text-yellow-500 shrink-0" />
                <span className="font-medium text-foreground truncate max-w-[140px]">{collectionName}</span>
                {readOnly && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-0.5 border-amber-500/50 text-amber-600 dark:text-amber-400 shrink-0">
                        <IconLock className="h-2.5 w-2.5" />
                        {t("readOnlyBadge")}
                    </Badge>
                )}
                {!loading && total > 0 && (
                    <>
                        <span className="text-border ml-auto shrink-0">·</span>
                        <span className="shrink-0 ml-1">
                            {t("docsBreadcrumb", {
                                n: total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)}M`
                                    : total >= 1_000 ? `${(total / 1_000).toFixed(1)}K`
                                    : String(total),
                            })}
                        </span>
                    </>
                )}
            </div>

            {/* Toolbar */}
            <div className="min-h-14 border-b flex flex-col md:flex-row items-center justify-between px-4 py-2 md:py-0 gap-2 md:gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
                <div className="w-full md:flex-1 md:max-w-2xl">
                    <QueryBuilder
                        query={searchQuery}
                        onSearch={(q: string) => {
                            setSearchQuery(q);
                            onSearch(q);
                        }}
                        fields={fields}
                        connectionName={connectionName}
                        dbName={dbName}
                        collectionName={collectionName}
                        onExplain={onExplain ? runExplain : undefined}
                        onPreviewPipeline={onPreviewPipeline}
                    />
                </div>

                <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
                    {/* View mode dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs px-2.5 flex-shrink-0">
                                {(() => {
                                    const ActiveIcon = viewModeOptions.find(o => o.mode === viewMode)?.icon ?? IconTable;
                                    return <ActiveIcon className="h-3.5 w-3.5" />;
                                })()}
                                <span className="hidden sm:inline">{viewModeOptions.find(o => o.mode === viewMode)?.label ?? t("table")}</span>
                                <IconChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[160px]">
                            {viewModeOptions.map(({ mode, icon: Icon, label }) => (
                                <DropdownMenuItem
                                    key={mode}
                                    onClick={() => setViewMode(mode as any)}
                                    className={cn("gap-2 text-xs", viewMode === mode && "bg-accent font-medium")}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Contextual view actions */}
                    {viewMode === "tree" && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setTreeExpandAll(true)} className="h-8 w-8">
                                        <IconArrowsMaximize className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("expandAll")}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setTreeExpandAll(false)} className="h-8 w-8">
                                        <IconArrowsMinimize className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("collapseAll")}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    <div className="h-4 w-[1px] bg-border hidden md:block flex-shrink-0" />

                    {/* Pagination */}
                    <div className="flex items-center gap-0.5 border rounded-md bg-background shadow-sm h-8 px-1 flex-shrink-0">
                        <select
                            className="h-full bg-transparent text-[10px] font-mono text-muted-foreground border-none outline-none cursor-pointer"
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                        >
                            {[50, 100, 200, 500, 1000, 2000].map(val => (
                                <option key={val} value={val}>{t("perPage", { n: val })}</option>
                            ))}
                        </select>
                        <div className="w-[1px] h-3 bg-border mx-0.5" />
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                            <IconChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] font-mono text-muted-foreground px-1 min-w-[30px] md:min-w-[50px] text-center">
                            {page}/{totalPages}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
                            <IconChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="h-4 w-[1px] bg-border hidden md:block flex-shrink-0" />

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-auto md:ml-0">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-8 w-8">
                                        <IconRefresh className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("refreshData")}</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {!readOnly && (
                            <Button size="sm" onClick={openInsertDialog} className="h-8 px-2 md:px-3 text-xs">
                                <IconPlus className="h-3.5 w-3.5 md:mr-1" />
                                <span className="hidden md:inline">{t("insert")}</span>
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsImportExportChooserOpen(true)}
                            className="h-8 px-2 md:px-3 text-xs"
                        >
                            <IconArrowsExchange className="h-3.5 w-3.5 md:mr-1" />
                            <span className="hidden md:inline">{t("importExport")}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-primary/5 shrink-0 animate-in slide-in-from-top-1 duration-150">
                    <span className="text-sm font-medium text-primary">
                        {t("selectedCount", { count: selectedIds.size })}
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setBulkDeleteConfirm(true)}
                    >
                        <IconTrash className="h-3.5 w-3.5 mr-1.5" />
                        {t("deleteSelected")}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs ml-auto"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        <IconX className="h-3.5 w-3.5 mr-1" />
                        {t("clearSelection")}
                    </Button>
                </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-hidden min-h-0">
                {viewMode === 'schema' && onLoadSchema ? (
                    <SchemaView onLoad={onLoadSchema} collectionName={collectionName} />
                ) : viewMode === 'indexes' ? (
                    <IndexManager
                        readOnly={readOnly}
                        indexes={indexesData?.indexes || []}
                        totalIndexSize={indexesData?.totalIndexSize}
                        stats={indexesData?.stats}
                        loading={indexesLoading}
                        error={indexesError}
                        onRefresh={() => { setIndexesData(null); loadIndexes(); }}
                        onDropIndex={async (name) => {
                            if (!onDropIndex) throw new Error('Not supported');
                            await onDropIndex(name);
                            setIndexesData(null);
                            loadIndexes();
                        }}
                        onCreateIndex={async (keys, opts) => {
                            if (!onCreateIndex) throw new Error('Not supported');
                            await onCreateIndex(keys, opts);
                            setIndexesData(null);
                            loadIndexes();
                        }}
                    />
                ) : loading ? (
                    <div className="h-full w-full overflow-auto">
                        <table aria-busy="true" aria-label="Loading documents" className="min-w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th className="px-3 py-3 w-[40px]" />
                                    <th className="px-4 py-3 w-[50px]">#</th>
                                    {(documents.length > 0 ? allFields : ["f1", "f2", "f3", "f4"]).map(k => (
                                        <th key={k} className="px-4 py-3 whitespace-nowrap">
                                            <div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 w-[120px]">{t("actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <SkeletonRow key={i} colCount={documents.length > 0 ? allFields.length : 4} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                            <IconAlertTriangle className="w-7 h-7 text-destructive" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{t("queryErrorTitle")}</p>
                            <p className="text-sm text-destructive mt-1 max-w-md break-words font-mono">{error}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <Button variant="outline" size="sm" onClick={onRefresh}>
                                <IconRefresh className="h-3.5 w-3.5 mr-1.5" />
                                {t("retry")}
                            </Button>
                            {isFilterActive && (
                                <Button variant="outline" size="sm" onClick={() => { setSearchQuery("{}"); onSearch("{}"); }}>
                                    <IconX className="h-3.5 w-3.5 mr-1.5" />
                                    {t("clearFilter")}
                                </Button>
                            )}
                        </div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                            <IconFolderOpen className="w-7 h-7 text-muted-foreground" />
                        </div>
                        {isFilterActive ? (
                            <>
                                <div>
                                    <p className="font-medium text-foreground">{t("emptyFilterTitle")}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{t("emptyFilterHint")}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { setSearchQuery("{}"); onSearch("{}"); }}>
                                    <IconX className="h-3.5 w-3.5 mr-1.5" />
                                    {t("clearFilter")}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="font-medium text-foreground">{t("emptyCollectionTitle")}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{t("emptyCollectionHint")}</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {!readOnly && (
                                        <Button size="sm" onClick={openInsertDialog}>
                                            <IconPlus className="h-3.5 w-3.5 mr-1.5" />
                                            {t("insertDocument")}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => setIsImportExportChooserOpen(true)}>
                                        <IconArrowsExchange className="h-3.5 w-3.5 mr-1.5" />
                                        {t("importExport")}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                ) : viewMode === "json" ? (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-end gap-2 p-2 border-b bg-muted/10">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handlePrettify}>
                                            <IconAlignLeft className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("formatJson")}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleMinify}>
                                            <IconMinimize className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("compactJson")}</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleCopy}>
                                            <IconCopy className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t("copyClipboard")}</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <CodeEditor
                                value={jsonViewContent}
                                language="json"
                                readOnly={true}
                                minimap={true}
                                onChange={setJsonViewContent}
                            />
                        </div>
                    </div>
                ) : viewMode === "tree" ? (
                    <div ref={treeContainerRef} className="h-full overflow-auto p-4">
                        <div style={{ height: `${treeVirtualizer.getTotalSize()}px`, position: "relative" }}>
                            {treeVirtualizer.getVirtualItems().map((virtualRow) => {
                                const doc = documents[virtualRow.index];
                                const index = virtualRow.index;
                                return (
                                    <div
                                        key={doc._id}
                                        data-index={virtualRow.index}
                                        ref={treeVirtualizer.measureElement}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                        className="pb-4"
                                    >
                                        <div className="border rounded-lg p-2 bg-card relative group">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyDocument(doc)}>
                                                    <IconCopy className="h-3 w-3" />
                                                </Button>
                                                {!readOnly && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(doc)}>
                                                            <IconPlus className="h-3 w-3 text-blue-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(doc)}>
                                                            <IconPencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(doc._id)}>
                                                            <IconTrash className="h-3 w-3" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                            <JsonTree
                                                key={`${doc._id}-${treeExpandAll}`}
                                                data={doc}
                                                label={t("documentLabel", { n: index + 1 + (page - 1) * limit })}
                                                defaultExpanded={treeExpandAll}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Table view */
                    <div ref={tableContainerRef} className="h-full w-full overflow-auto">
                        <table
                            className="min-w-full w-max text-sm text-left relative table-fixed"
                            aria-label={`${collectionName} documents`}
                        >
                            <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    {showSelectMode && (
                                        <th className="px-3 py-3 w-[44px] sticky left-0 top-0 z-30 bg-muted">
                                            <Checkbox
                                                checked={isIndeterminate ? "indeterminate" : isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </th>
                                    )}
                                    <th className={cn("px-4 py-3 w-[50px] whitespace-nowrap font-medium text-center sticky top-0 z-30 bg-muted", showSelectMode ? "left-[44px]" : "left-0")}>#</th>
                                    {allFields.map((key) => (
                                        <th
                                            key={key}
                                            className="px-4 py-3 whitespace-nowrap font-medium sticky top-0 z-20 bg-muted pr-6 group/th hover:bg-muted/80 transition-colors border-r"
                                            style={{
                                                width: `${columnWidths[key] ?? DEFAULT_COL_WIDTH}px`,
                                                maxWidth: `${columnWidths[key] ?? DEFAULT_COL_WIDTH}px`,
                                            }}
                                        >
                                            <div className="flex items-center gap-1 cursor-pointer truncate" onClick={() => handleSort(key)}>
                                                {key}
                                                <span className={cn("text-muted-foreground w-3 h-3 flex items-center justify-center text-[10px]", sortField !== key && "opacity-0 group-hover/th:opacity-50")}>
                                                    {sortField === key ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                                </span>
                                            </div>
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-primary/30 cursor-col-resize z-50 flex items-center justify-center after:content-[''] after:w-[1px] after:h-4 after:bg-border group-hover/th:after:bg-muted-foreground/30"
                                                onMouseDown={(e) => handleColumnResize(key, e)}
                                            />
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 w-[120px] bg-muted whitespace-nowrap font-medium sticky top-0 right-0 z-30 border-l">{t("actions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Native padding-spacer virtualization: rows stay in
                                    normal table flow so the sticky <thead> reliably sits
                                    above them. Absolute-positioned rows broke in WebKit
                                    (Tauri) because <tbody> doesn't establish a containing
                                    block there, so row 0 rendered under the header. */}
                                {(() => {
                                    const vRows = rowVirtualizer.getVirtualItems();
                                    const padTop = vRows.length ? vRows[0].start : 0;
                                    return padTop > 0 ? (
                                        <tr aria-hidden="true"><td colSpan={9999} style={{ height: padTop, padding: 0, border: 0 }} /></tr>
                                    ) : null;
                                })()}
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const doc = documents[virtualRow.index];
                                    const index = virtualRow.index;
                                    const isSelected = selectedIds.has(doc._id);
                                    return (
                                        <tr
                                            key={doc._id}
                                            data-index={virtualRow.index}
                                            ref={rowVirtualizer.measureElement}
                                            className={cn(
                                                "border-b hover:bg-muted/50 group transition-colors",
                                                isSelected && "bg-primary/5 hover:bg-primary/10"
                                            )}
                                        >
                                            {showSelectMode && (
                                                <td className={cn("px-3 py-3 left-0", STICKY_CELL, isSelected && STICKY_CELL_SELECTED)}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => handleSelectRow(doc._id)}
                                                        aria-label="Select row"
                                                    />
                                                </td>
                                            )}
                                            <td className={cn("px-4 py-3 w-[50px] font-mono text-xs text-center text-muted-foreground", STICKY_CELL, showSelectMode ? "left-[44px]" : "left-0", isSelected && STICKY_CELL_SELECTED)}>
                                                {index + 1 + (page - 1) * limit}
                                            </td>
                                            {allFields.map((key) => {
                                                const value = doc[key];
                                                const isEditingThis = editingCell?.docId === doc._id && editingCell?.field === key;
                                                const cellStyle = {
                                                    maxWidth: `${columnWidths[key] ?? DEFAULT_COL_WIDTH}px`,
                                                    width: `${columnWidths[key] ?? DEFAULT_COL_WIDTH}px`,
                                                };
                                                if (isEditingThis) {
                                                    return (
                                                        <td key={key} className="px-2 py-2 align-top border-r relative" style={cellStyle}>
                                                            <EditableCell
                                                                initialValue={value === null || value === undefined ? "" : String(value)}
                                                                saving={editCellSaving}
                                                                onCommit={(raw) => commitCellEdit(doc, raw)}
                                                                onCancel={() => setEditingCell(null)}
                                                            />
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <ContextMenu key={key}>
                                                        <ContextMenuTrigger asChild>
                                                            <td
                                                                className="px-4 py-3 align-top truncate border-r relative overflow-hidden"
                                                                style={cellStyle}
                                                                onDoubleClick={() => startCellEdit(doc, key)}
                                                            >
                                                                <CellValue value={value} onViewClick={handleViewValue} />
                                                            </td>
                                                        </ContextMenuTrigger>
                                                        <ContextMenuContent className="min-w-[190px]">
                                                            {isScalar(value) && (
                                                                <>
                                                                    <ContextMenuItem className="text-xs gap-2" onClick={() => applyCellFilter(key, value)}>
                                                                        <IconFilter className="h-3.5 w-3.5" />
                                                                        {t("cellFilterByValue")}
                                                                    </ContextMenuItem>
                                                                    <ContextMenuItem className="text-xs gap-2" onClick={() => applyCellFilter(key, value, true)}>
                                                                        <IconFilterX className="h-3.5 w-3.5" />
                                                                        {t("cellExcludeValue")}
                                                                    </ContextMenuItem>
                                                                    <ContextMenuSeparator />
                                                                </>
                                                            )}
                                                            <ContextMenuItem className="text-xs gap-2" onClick={() => onSortChange(key, 'asc')}>
                                                                <IconSortAscending className="h-3.5 w-3.5" />
                                                                {t("cellSortAsc")}
                                                            </ContextMenuItem>
                                                            <ContextMenuItem className="text-xs gap-2" onClick={() => onSortChange(key, 'desc')}>
                                                                <IconSortDescending className="h-3.5 w-3.5" />
                                                                {t("cellSortDesc")}
                                                            </ContextMenuItem>
                                                            {onPreviewPipeline && (
                                                                <ContextMenuItem className="text-xs gap-2" onClick={() => runGroupBy(key)}>
                                                                    <IconChartBar className="h-3.5 w-3.5" />
                                                                    {t("cellGroupBy")}
                                                                </ContextMenuItem>
                                                            )}
                                                            <ContextMenuSeparator />
                                                            <ContextMenuItem
                                                                className="text-xs gap-2"
                                                                onClick={() => {
                                                                    const text = isScalar(value) ? String(value) : JSON.stringify(value, null, 2);
                                                                    void copyToClipboard(text, t("copiedClipboard"));
                                                                }}
                                                            >
                                                                <IconCopy className="h-3.5 w-3.5" />
                                                                {t("cellCopyValue")}
                                                            </ContextMenuItem>
                                                            {!readOnly && (() => {
                                                                const wholeDoc = key === "_id" || (!isScalar(value) && value !== undefined);
                                                                return (
                                                                    <ContextMenuItem
                                                                        className="text-xs gap-2"
                                                                        onClick={() => (wholeDoc ? handleEdit(doc) : startCellEdit(doc, key))}
                                                                    >
                                                                        <IconPencil className="h-3.5 w-3.5" />
                                                                        {wholeDoc ? t("editDoc") : t("cellEditValue")}
                                                                    </ContextMenuItem>
                                                                );
                                                            })()}
                                                        </ContextMenuContent>
                                                    </ContextMenu>
                                                );
                                            })}
                                            <td className={cn("px-4 py-3 align-top w-[120px] right-0 border-l", STICKY_CELL, isSelected && STICKY_CELL_SELECTED)}>
                                                <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyDocument(doc)} title={t("copyJson")}>
                                                        <IconCopy className="h-3 w-3" />
                                                    </Button>
                                                    {!readOnly && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(doc)} title={t("duplicate")}>
                                                                <IconPlus className="h-3 w-3 text-blue-500" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(doc)} title={t("editDoc")}>
                                                                <IconPencil className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(doc._id)} title={t("deleteDoc")}>
                                                                <IconTrash className="h-3 w-3" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {(() => {
                                    const vRows = rowVirtualizer.getVirtualItems();
                                    const padBottom = vRows.length
                                        ? rowVirtualizer.getTotalSize() - vRows[vRows.length - 1].end
                                        : 0;
                                    return padBottom > 0 ? (
                                        <tr aria-hidden="true"><td colSpan={9999} style={{ height: padBottom, padding: 0, border: 0 }} /></tr>
                                    ) : null;
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="border-t bg-muted/10 px-4 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono shrink-0">
                <span>
                    {loading ? t("statusLoading") : documents.length > 0
                        ? t("statusShowing", {
                            from: (page - 1) * limit + 1,
                            to: Math.min((page - 1) * limit + documents.length, total),
                            total: total.toLocaleString(),
                        })
                        : t("statusEmpty")
                    }
                </span>
                {selectedIds.size > 0 && (
                    <span className="text-primary font-medium">{t("statusSelected", { count: selectedIds.size })}</span>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t("editDialogTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 border rounded-md overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={editorContent}
                            onChange={(v) => setEditorContent(v || "")}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t("cancel")}</Button>
                        <Button onClick={handleSaveEdit}>{t("saveChanges")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isInsertDialogOpen} onOpenChange={setIsInsertDialogOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t("insertDialogTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 border rounded-md overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={editorContent}
                            onChange={(v) => setEditorContent(v || "")}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInsertDialogOpen(false)}>{t("cancel")}</Button>
                        <Button onClick={handleInsert}>{t("insertButton")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t("viewValueTitle")}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 border rounded-md overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={viewValue}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{ minimap: { enabled: false }, fontSize: 14, readOnly: true, folding: true }}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsViewDialogOpen(false)}>{t("close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportExportChooserOpen} onOpenChange={setIsImportExportChooserOpen}>
                <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-5 pt-5 pb-3">
                        <DialogTitle className="text-base">{t("importExportTitle")}</DialogTitle>
                        <DialogDescription className="text-xs">
                            {t("importExportDescription")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="px-3 pb-4 space-y-1.5">
                        {onImport && !readOnly && (
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
                                onClick={openImportFromChooser}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                                    <IconUpload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{t("import")}</p>
                                    <p className="text-xs text-muted-foreground truncate">{t("importExportImportHint")}</p>
                                </div>
                                <IconChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                        )}
                        <button
                            type="button"
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
                            onClick={openExportFromChooser}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                                <IconDownload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{t("export")}</p>
                                <p className="text-xs text-muted-foreground truncate">{t("importExportExportHint")}</p>
                            </div>
                            <IconChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <ExportDialog
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                documents={documents}
                fields={fields}
            />

            {onImport && (
                <ImportDialog
                    open={isImportDialogOpen}
                    onOpenChange={setIsImportDialogOpen}
                    onImport={onImport}
                    collectionName={collectionName}
                />
            )}

            {/* Explain plan */}
            <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
                <DialogContent className="max-w-3xl h-[75vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t("explainTitle")}</DialogTitle>
                    </DialogHeader>
                    {explainLoading ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                            {t("explainLoading")}
                        </div>
                    ) : explainData ? (() => {
                        const summary = summarizeExplain(explainData);
                        return (
                            <div className="flex-1 flex flex-col min-h-0 gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {summary.collscan ? (
                                        <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                                            <IconAlertTriangle className="h-3 w-3" />
                                            {t("explainCollscan")}
                                        </Badge>
                                    ) : summary.indexNames.length > 0 && (
                                        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 dark:text-green-400">
                                            <IconDatabase className="h-3 w-3" />
                                            {t("explainIndexUsed", { name: summary.indexNames.join(", ") })}
                                        </Badge>
                                    )}
                                    {summary.executionTimeMillis !== undefined && (
                                        <Badge variant="secondary" className="font-mono text-[10px]">
                                            {summary.executionTimeMillis} ms
                                        </Badge>
                                    )}
                                    {summary.nReturned !== undefined && (
                                        <Badge variant="secondary" className="font-mono text-[10px]">
                                            {t("explainReturned", { n: summary.nReturned })}
                                        </Badge>
                                    )}
                                    {summary.totalDocsExamined !== undefined && (
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "font-mono text-[10px]",
                                                summary.nReturned !== undefined &&
                                                summary.totalDocsExamined > Math.max(10, summary.nReturned * 10) &&
                                                "text-amber-600 dark:text-amber-400"
                                            )}
                                        >
                                            {t("explainDocsExamined", { n: summary.totalDocsExamined })}
                                        </Badge>
                                    )}
                                    {summary.stages.length > 0 && (
                                        <span className="text-[10px] font-mono text-muted-foreground truncate">
                                            {summary.stages.join(" → ")}
                                        </span>
                                    )}
                                </div>
                                {summary.collscan && (
                                    <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                                        {t("explainCollscanHint")}
                                    </p>
                                )}
                                <div className="flex-1 min-h-0 border rounded-md overflow-auto bg-card p-2">
                                    <JsonTree data={explainData} label={t("explainRawLabel")} defaultExpanded={false} />
                                </div>
                            </div>
                        );
                    })() : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExplainOpen(false)}>{t("close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Group by field */}
            <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
                <DialogContent className="max-w-lg h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-sm">{t("groupByTitle", { field: groupField })}</DialogTitle>
                    </DialogHeader>
                    {groupLoading ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
                            <IconLoader2 className="h-4 w-4 animate-spin" />
                            {t("groupByLoading")}
                        </div>
                    ) : groupError ? (
                        <div className="flex-1 flex items-center justify-center text-destructive text-sm font-mono px-4 text-center break-words">
                            {groupError}
                        </div>
                    ) : groupRows && groupRows.length > 0 ? (
                        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">{t("groupByValue")}</th>
                                        <th className="px-3 py-2 text-right font-medium w-24">{t("groupByCount")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupRows.map((row, i) => {
                                        const scalar = isScalar(row._id);
                                        const label = row._id === null || row._id === undefined
                                            ? "null"
                                            : scalar ? String(row._id) : JSON.stringify(row._id);
                                        return (
                                            <tr
                                                key={i}
                                                className={cn("border-b hover:bg-muted/50", scalar && "cursor-pointer")}
                                                onClick={scalar ? () => { applyCellFilter(groupField, row._id); setGroupOpen(false); } : undefined}
                                            >
                                                <td className="px-3 py-2 font-mono truncate max-w-[300px]" title={label}>{label}</td>
                                                <td className="px-3 py-2 text-right font-mono text-muted-foreground">{row.count}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                            {t("groupByEmpty")}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setGroupOpen(false)}>{t("close")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk delete confirmation */}
            <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("bulkDeleteTitle", { count: selectedIds.size })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("bulkDeleteDescription", { count: selectedIds.size, collection: collectionName })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleteLoading}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={bulkDeleteLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {bulkDeleteLoading ? t("bulkDeleting") : t("bulkDeleteConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
