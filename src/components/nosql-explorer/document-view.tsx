"use client";

import { useState, useEffect } from "react";
import { Document } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    IconPlus, IconRefresh, IconTrash, IconPencil, IconCode, IconTable,
    IconCopy, IconAlignLeft, IconMinimize, IconJson, IconBinaryTree,
    IconHistory, IconX, IconDownload, IconMaximize, IconChevronLeft,
    IconChevronRight, IconServer, IconDatabase, IconFolder, IconFolderOpen,
    IconRowInsertBottom, IconLayoutRows, IconArrowsMaximize, IconArrowsMinimize
} from "@tabler/icons-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import CodeEditor from "@/components/ui/code-editor";
import { JsonTree } from "./json-tree";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExportDialog } from "./export-dialog";
import { QueryBuilder } from "./query-builder";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";

interface DocumentViewProps {
    connectionName: string;
    dbName: string;
    collectionName: string;
    documents: Document[];
    total: number;
    page: number;
    limit: number;
    loading: boolean;
    onRefresh: () => void;
    onInsert: (doc: any) => Promise<void>;
    onUpdate: (id: string, update: any) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onSearch: (query: string) => void;
    onPageChange: (page: number) => void;
    onLimitChange: (limit: number) => void;
    sortField?: string | null;
    sortDirection?: 'asc' | 'desc';
    onSortChange: (field: string, direction: 'asc' | 'desc') => void;
}

// Typed cell renderer for table view
function CellValue({ value, onViewClick }: { value: any; onViewClick: (v: any) => void }) {
    if (value === undefined) return null;

    if (value === null) {
        return <span className="text-muted-foreground italic text-xs">null</span>;
    }

    if (typeof value === 'boolean') {
        return (
            <span className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium font-mono",
                value
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
                {value.toString()}
            </span>
        );
    }

    if (typeof value === 'number') {
        return <span className="text-blue-600 dark:text-blue-400 font-mono text-xs">{value}</span>;
    }

    if (typeof value === 'object') {
        return (
            <Popover>
                <PopoverTrigger className="text-blue-500 hover:underline focus:outline-none outline-none text-xs font-mono">
                    {Array.isArray(value) ? `Array(${value.length})` : '{...}'}
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 shadow-lg" align="start" side="bottom">
                    <div className="max-h-[300px] overflow-auto bg-card rounded-md">
                        <div className="p-2 border-b bg-muted/50 text-xs font-semibold flex justify-between items-center sticky top-0 z-10">
                            <span className="truncate pr-2 font-mono text-muted-foreground">
                                {Array.isArray(value) ? `Array[${value.length}]` : 'Object'}
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 bg-background shadow-sm" onClick={(e) => { e.stopPropagation(); onViewClick(value); }} title="Open in full editor">
                                <IconMaximize className="h-3 w-3" />
                            </Button>
                        </div>
                        <div className="p-2">
                            <JsonTree data={value} label="Root" defaultExpanded={true} />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    // String
    const str = String(value);
    return <span className="font-mono text-xs">{str}</span>;
}

// Skeleton shimmer row
function SkeletonRow({ colCount }: { colCount: number }) {
    return (
        <tr className="border-b animate-pulse">
            <td className="px-4 py-3">
                <div className="h-3 w-6 bg-muted rounded" />
            </td>
            {Array.from({ length: colCount }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3 rounded bg-muted" style={{ width: `${40 + Math.random() * 50}%` }} />
                </td>
            ))}
            <td className="px-4 py-3">
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map(j => <div key={j} className="h-6 w-6 rounded bg-muted" />)}
                </div>
            </td>
        </tr>
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
}: DocumentViewProps) {
    const [viewMode, setViewMode] = useState<"table" | "json" | "tree">("table");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isInsertDialogOpen, setIsInsertDialogOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [editorContent, setEditorContent] = useState("");
    const [viewValue, setViewValue] = useState<string>("");
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [jsonViewContent, setJsonViewContent] = useState("");
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [treeExpandAll, setTreeExpandAll] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        setJsonViewContent(JSON.stringify(documents, null, 2));
    }, [documents]);

    const handlePrettify = () => {
        try {
            const parsed = JSON.parse(jsonViewContent);
            setJsonViewContent(JSON.stringify(parsed, null, 2));
        } catch (e) {
            toast.error("Invalid JSON content");
        }
    };

    const handleMinify = () => {
        try {
            const parsed = JSON.parse(jsonViewContent);
            setJsonViewContent(JSON.stringify(parsed));
        } catch (e) {
            toast.error("Invalid JSON content");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonViewContent);
        toast.success("Copied to clipboard");
    };

    const handleViewValue = (value: any) => {
        setViewValue(JSON.stringify(value, null, 2));
        setIsViewDialogOpen(true);
    };

    const handleEdit = (doc: Document) => {
        setSelectedDoc(doc);
        setEditorContent(JSON.stringify(doc, null, 2));
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        try {
            const updatedDoc = JSON.parse(editorContent);
            if (selectedDoc) {
                await onUpdate(selectedDoc._id, updatedDoc);
                setIsEditDialogOpen(false);
                toast.success("Document updated successfully");
                onRefresh();
            }
        } catch (e) {
            toast.error("Invalid JSON");
        }
    };

    const handleInsert = async () => {
        try {
            const newDoc = JSON.parse(editorContent);
            await onInsert(newDoc);
            setIsInsertDialogOpen(false);
            toast.success("Document inserted successfully");
            onRefresh();
        } catch (e) {
            toast.error("Invalid JSON");
        }
    };

    const openInsertDialog = () => {
        setEditorContent("{\n  \n}");
        setIsInsertDialogOpen(true);
    };

    const handleDuplicate = (doc: Document) => {
        const docCopy: any = { ...doc };
        delete docCopy._id;
        setEditorContent(JSON.stringify(docCopy, null, 2));
        setIsInsertDialogOpen(true);
    };

    const handleCopyDocument = (doc: Document) => {
        navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
        toast.success("Document copied to clipboard");
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                onSortChange(field, 'desc');
            } else {
                onSortChange('', 'asc');
            }
        } else {
            onSortChange(field, 'asc');
        }
    };

    const fields = Array.from(new Set(documents.flatMap(Object.keys))).filter(key => key !== "_id");
    const allFields = Array.from(new Set(documents.flatMap(Object.keys)))
        .filter(key => key !== "_id")
        .reduce((acc, key) => [...acc, key], ["_id"]);

    const handleColumnResize = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.pageX;
        const th = (e.currentTarget as HTMLElement).parentElement;
        const initialWidth = th ? th.getBoundingClientRect().width : (columnWidths[key] || 300);

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(50, initialWidth + (moveEvent.pageX - startX));
            setColumnWidths(prev => ({ ...prev, [key]: newWidth }));
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

    const totalPages = Math.ceil(total / limit) || 1;

    const isFilterActive = (() => {
        try {
            const q = searchQuery?.trim();
            if (!q || q === "{}") return false;
            return Object.keys(JSON.parse(q)).length > 0;
        } catch { return false; }
    })();

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb context header */}
            <div className="flex items-center gap-1.5 px-4 py-1.5 border-b bg-muted/20 text-xs text-muted-foreground overflow-x-auto no-scrollbar shrink-0">
                <IconServer className="h-3 w-3 text-purple-500 shrink-0" />
                <span className="truncate max-w-[120px]">{connectionName}</span>
                <span className="text-border">/</span>
                <IconDatabase className="h-3 w-3 text-blue-500 shrink-0" />
                <span className="truncate max-w-[120px]">{dbName}</span>
                <span className="text-border">/</span>
                <IconFolder className="h-3 w-3 text-yellow-500 shrink-0" />
                <span className="font-medium text-foreground truncate max-w-[140px]">{collectionName}</span>
                {!loading && total > 0 && (
                    <>
                        <span className="text-border ml-auto shrink-0">·</span>
                        <span className="shrink-0 ml-1">
                            {total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)}M` : total >= 1_000 ? `${(total / 1_000).toFixed(1)}K` : total} docs
                        </span>
                    </>
                )}
            </div>

            {/* Toolbar */}
            <div className="min-h-14 border-b flex flex-col md:flex-row items-center justify-between px-4 py-2 md:py-0 gap-2 md:gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                    />
                </div>

                <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-2 md:gap-4 overflow-x-auto no-scrollbar">
                    <div className="flex items-center bg-muted/50 p-1 rounded-lg border flex-shrink-0">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={viewMode === "table" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-7 px-2 md:px-3 text-xs", viewMode === "table" && "bg-background shadow-sm")}
                                        onClick={() => setViewMode("table")}
                                    >
                                        <IconTable className="h-3.5 w-3.5 md:mr-1.5" />
                                        <span className="hidden md:inline">Table</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Table View</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={viewMode === "json" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-7 px-2 md:px-3 text-xs", viewMode === "json" && "bg-background shadow-sm")}
                                        onClick={() => setViewMode("json")}
                                    >
                                        <IconJson className="h-3.5 w-3.5 md:mr-1.5" />
                                        <span className="hidden md:inline">JSON</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>JSON View</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={viewMode === "tree" ? "secondary" : "ghost"}
                                        size="sm"
                                        className={cn("h-7 px-2 md:px-3 text-xs", viewMode === "tree" && "bg-background shadow-sm")}
                                        onClick={() => setViewMode("tree")}
                                    >
                                        <IconBinaryTree className="h-3.5 w-3.5 md:mr-1.5" />
                                        <span className="hidden md:inline">Tree</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Tree View</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center gap-1 border rounded-md bg-background shadow-sm h-7 px-1 flex-shrink-0">
                        <select
                            className="h-full bg-transparent text-[10px] font-mono text-muted-foreground border-none outline-none cursor-pointer"
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            title="Items per page"
                        >
                            {[50, 100, 200, 500, 1000, 2000].map((val) => (
                                <option key={val} value={val}>{val} / page</option>
                            ))}
                        </select>
                        <div className="w-[1px] h-3 bg-border mx-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-sm"
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                            title="Previous Page"
                        >
                            <IconChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] font-mono text-muted-foreground px-1 min-w-[30px] md:min-w-[60px] text-center">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                            title="Next Page"
                        >
                            <IconChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="h-4 w-[1px] bg-border hidden md:block" />

                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto md:ml-0">
                        <TooltipProvider>
                            {/* Tree expand/collapse — only shown in tree mode */}
                            {viewMode === "tree" && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setTreeExpandAll(true)} className="h-9 w-9">
                                                <IconArrowsMaximize className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Expand All</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setTreeExpandAll(false)} className="h-9 w-9">
                                                <IconArrowsMinimize className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Collapse All</TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={onRefresh} disabled={loading} className="h-9 w-9">
                                        <IconRefresh className={cn("h-4 w-4", loading && "animate-spin")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Refresh Data</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button size="sm" onClick={openInsertDialog} className="h-9 px-2 md:px-4">
                            <IconPlus className="h-4 w-4 md:mr-1.5" />
                            <span className="hidden md:inline">Insert</span>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsExportDialogOpen(true)} className="h-9 px-2 md:px-4">
                            <IconDownload className="h-4 w-4 md:mr-1.5" />
                            <span className="hidden md:inline">Export</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden min-h-0">
                {loading ? (
                    /* Loading skeleton */
                    <div className="h-full w-full overflow-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th className="px-4 py-3 w-[50px]">#</th>
                                    {(documents.length > 0 ? allFields : ["field1", "field2", "field3", "field4"]).map(k => (
                                        <th key={k} className="px-4 py-3 whitespace-nowrap">
                                            <div className="h-3 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 w-[120px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <SkeletonRow key={i} colCount={documents.length > 0 ? allFields.length : 4} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : documents.length === 0 ? (
                    /* Improved empty state */
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10 gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                            <IconFolderOpen className="w-7 h-7 text-muted-foreground" />
                        </div>
                        {isFilterActive ? (
                            <>
                                <div>
                                    <p className="font-medium text-foreground">No documents match your query</p>
                                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filter or clearing the query.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery("{}");
                                        onSearch("{}");
                                    }}
                                >
                                    <IconX className="h-3.5 w-3.5 mr-1.5" />
                                    Clear Filter
                                </Button>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="font-medium text-foreground">This collection is empty</p>
                                    <p className="text-sm text-muted-foreground mt-1">Insert a document to get started.</p>
                                </div>
                                <Button size="sm" onClick={openInsertDialog}>
                                    <IconPlus className="h-3.5 w-3.5 mr-1.5" />
                                    Insert Document
                                </Button>
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
                                    <TooltipContent>Format JSON</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleMinify}>
                                            <IconMinimize className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Compact JSON</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleCopy}>
                                            <IconCopy className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy to Clipboard</TooltipContent>
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
                    <ScrollArea className="h-full p-4">
                        <div className="space-y-4">
                            {documents.map((doc, index) => (
                                <div key={doc._id} className="border rounded-lg p-2 bg-card relative group">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyDocument(doc)} title="Copy JSON">
                                            <IconCopy className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(doc)} title="Duplicate">
                                            <IconPlus className="h-3 w-3 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(doc)}>
                                            <IconPencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(doc._id)}>
                                            <IconTrash className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <JsonTree
                                        key={`${doc._id}-${treeExpandAll}`}
                                        data={doc}
                                        label={`Document ${index + 1 + (page - 1) * limit}`}
                                        defaultExpanded={treeExpandAll}
                                    />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    /* Table view with typed cells */
                    <div className="h-full w-full overflow-auto">
                        <table className="min-w-full w-max text-sm text-left relative">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th className="px-4 py-3 w-[50px] whitespace-nowrap font-medium text-center sticky left-0 top-0 z-30 bg-muted">#</th>
                                    {allFields.map((key) => (
                                        <th
                                            key={key}
                                            className="px-4 py-3 whitespace-nowrap font-medium sticky top-0 z-20 bg-muted pr-6 group/th hover:bg-muted/80 transition-colors border-r"
                                            style={{
                                                width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto',
                                                maxWidth: columnWidths[key] ? `${columnWidths[key]}px` : '300px',
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
                                    <th className="px-4 py-3 w-[120px] bg-muted whitespace-nowrap font-medium sticky top-0 z-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc, index) => (
                                    <tr key={doc._id} className="border-b hover:bg-muted/50 group">
                                        <td className="px-4 py-3 font-mono text-xs text-center text-muted-foreground sticky left-0 z-10 bg-background group-hover:bg-muted/50">
                                            {index + 1 + (page - 1) * limit}
                                        </td>
                                        {allFields.map((key) => (
                                            <td
                                                key={key}
                                                className="px-4 py-3 align-top truncate border-r relative overflow-hidden"
                                                style={{
                                                    maxWidth: columnWidths[key] ? `${columnWidths[key]}px` : '300px',
                                                    width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto'
                                                }}
                                            >
                                                <CellValue value={doc[key]} onViewClick={handleViewValue} />
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyDocument(doc)} title="Copy JSON">
                                                    <IconCopy className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(doc)} title="Duplicate Document">
                                                    <IconPlus className="h-3 w-3 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(doc)} title="Edit Document">
                                                    <IconPencil className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(doc._id)} title="Delete Document">
                                                    <IconTrash className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Document</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 border rounded-md overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={editorContent}
                            onChange={(value) => setEditorContent(value || "")}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isInsertDialogOpen} onOpenChange={setIsInsertDialogOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Insert Document</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 border rounded-md overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={editorContent}
                            onChange={(value) => setEditorContent(value || "")}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{ minimap: { enabled: false }, fontSize: 14 }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInsertDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleInsert}>Insert</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>View Value</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 border rounded-md overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={viewValue}
                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                readOnly: true,
                                folding: true,
                                formatOnPaste: true,
                                formatOnType: true,
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ExportDialog
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                documents={documents}
                fields={fields}
            />
        </div>
    );
}
