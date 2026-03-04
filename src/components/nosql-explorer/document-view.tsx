"use client";

import { useState, useEffect } from "react";
import { Document } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPlus, IconRefresh, IconSearch, IconTrash, IconPencil, IconCode, IconTable, IconCopy, IconAlignLeft, IconMinimize, IconJson, IconBinaryTree, IconHistory, IconX, IconDownload, IconMaximize } from "@tabler/icons-react";
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
                onSortChange('', 'asc'); // Clear sort
            }
        } else {
            onSortChange(field, 'asc');
        }
    };

    const fields = Array.from(new Set(documents.flatMap(Object.keys))).filter(key => key !== "_id");

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

    return (
        <div className="flex flex-col h-full">
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

                    <div className="flex items-center gap-1 border rounded-md bg-background shadow-sm h-7 px-1 flex-shrink-0">
                        <select
                            className="h-full bg-transparent text-[10px] font-mono text-muted-foreground border-none outline-none cursor-pointer"
                            value={limit}
                            onChange={(e) => onLimitChange(Number(e.target.value))}
                            title="Items per page"
                        >
                            {[50, 100, 200, 500, 1000, 2000].map((val) => (
                                <option key={val} value={val}>
                                    {val} / page
                                </option>
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
                            <span className="text-xs">&lt;</span>
                        </Button>
                        <span className="text-[10px] font-mono text-muted-foreground px-1 min-w-[30px] md:min-w-[60px] text-center">
                            {page} / {Math.ceil(total / limit) || 1}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded-sm"
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= Math.ceil(total / limit)}
                            title="Next Page"
                        >
                            <span className="text-xs">&gt;</span>
                        </Button>
                    </div>

                    <div className="h-4 w-[1px] bg-border hidden md:block" />

                    <div className="flex items-center gap-2 flex-shrink-0 ml-auto md:ml-0">
                        <TooltipProvider>
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

            <div className="flex-1 overflow-hidden min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Loading documents...
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No documents found.
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
                                    <JsonTree data={doc} label={`Document ${index + 1 + (page - 1) * limit}`} defaultExpanded={false} />
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="h-full w-full overflow-auto">
                        <table className="min-w-full w-max text-sm text-left relative">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted">
                                <tr>
                                    <th className="px-4 py-3 w-[50px] whitespace-nowrap font-medium text-center sticky left-0 top-0 z-30 bg-muted">#</th>
                                    {Array.from(new Set(documents.flatMap(Object.keys)))
                                        .filter(key => key !== "_id")
                                        .reduce((acc, key) => [...acc, key], ["_id"])
                                        .map((key) => (
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
                                        {Array.from(new Set(documents.flatMap(Object.keys)))
                                            .filter(key => key !== "_id")
                                            .reduce((acc, key) => [...acc, key], ["_id"])
                                            .map((key) => (
                                                <td
                                                    key={key}
                                                    className="px-4 py-3 font-mono text-xs align-top truncate border-r relative overflow-hidden"
                                                    style={{
                                                        maxWidth: columnWidths[key] ? `${columnWidths[key]}px` : '300px',
                                                        width: columnWidths[key] ? `${columnWidths[key]}px` : 'auto'
                                                    }}
                                                    title={typeof doc[key] === 'object' ? JSON.stringify(doc[key]) : String(doc[key])}
                                                >
                                                    {doc[key] === undefined ? (
                                                        ""
                                                    ) : typeof doc[key] === 'object' && doc[key] !== null ? (
                                                        <Popover>
                                                            <PopoverTrigger className="text-blue-500 hover:underline focus:outline-none outline-none">
                                                                {Array.isArray(doc[key]) ? `Array(${doc[key].length})` : '{...}'}
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[350px] p-0 shadow-lg" align="start" side="bottom">
                                                                <div className="max-h-[300px] overflow-auto bg-card rounded-md">
                                                                    <div className="p-2 border-b bg-muted/50 text-xs font-semibold flex justify-between items-center sticky top-0 z-10">
                                                                        <span className="truncate pr-2 font-mono text-muted-foreground">{key}</span>
                                                                        <Button variant="ghost" size="icon" className="h-5 w-5 bg-background shadow-sm" onClick={(e) => { e.stopPropagation(); handleViewValue(doc[key]); }} title="Open in full editor">
                                                                            <IconMaximize className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                    <div className="p-2">
                                                                        <JsonTree data={doc[key]} label="Root" defaultExpanded={true} />
                                                                    </div>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    ) : (
                                                        String(doc[key])
                                                    )}
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
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                            }}
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
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                            }}
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
        </div >
    );
}

