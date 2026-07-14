"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { IconUpload, IconFile, IconX, IconAlertCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (documents: any[]) => Promise<void>;
    collectionName: string;
}

export function ImportDialog({ open, onOpenChange, onImport, collectionName }: ImportDialogProps) {
    const [parsed, setParsed] = useState<any[] | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setParsed(null);
        setParseError(null);
        setFileName(null);
    };

    const processFile = (file: File) => {
        if (!file.name.endsWith('.json')) {
            setParseError('Only .json files are supported');
            return;
        }
        setFileName(file.name);
        setParseError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                    setParsed(data);
                } else if (typeof data === 'object' && data !== null) {
                    setParsed([data]);
                } else {
                    setParseError('File must contain a JSON array or object');
                }
            } catch {
                // Try NDJSON (newline-delimited JSON)
                try {
                    const lines = text.split('\n').filter(l => l.trim());
                    const docs = lines.map(l => JSON.parse(l));
                    setParsed(docs);
                } catch {
                    setParseError('Invalid JSON: could not parse file');
                }
            }
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleImport = async () => {
        if (!parsed || parsed.length === 0) return;
        setImporting(true);
        try {
            await onImport(parsed);
            toast.success(`Imported ${parsed.length} documents`);
            onOpenChange(false);
            reset();
        } catch (err: any) {
            toast.error(err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        if (!importing) {
            onOpenChange(false);
            reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Import Documents into {collectionName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {!parsed ? (
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <IconUpload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                            <p className="font-medium text-sm">Drag & drop or click to upload</p>
                            <p className="text-xs text-muted-foreground mt-1">Supports JSON array or NDJSON</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                                <IconFile className="h-4 w-4 text-primary shrink-0" />
                                <span className="text-sm font-medium truncate flex-1">{fileName}</span>
                                <span className="text-xs text-muted-foreground shrink-0">{parsed.length.toLocaleString()} docs</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={reset}>
                                    <IconX className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Preview (first 3 documents)</p>
                                <ScrollArea className="h-[200px] border rounded-md">
                                    <pre className="p-3 text-[11px] font-mono leading-relaxed">
                                        {JSON.stringify(parsed.slice(0, 3), null, 2)}
                                        {parsed.length > 3 && `\n\n// ... and ${parsed.length - 3} more documents`}
                                    </pre>
                                </ScrollArea>
                            </div>
                        </div>
                    )}

                    {parseError && (
                        <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                            <IconAlertCircle className="h-4 w-4 shrink-0" />
                            {parseError}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={importing}>Cancel</Button>
                    <Button
                        onClick={handleImport}
                        disabled={!parsed || parsed.length === 0 || importing}
                        className="min-w-[120px]"
                    >
                        {importing ? 'Importing...' : parsed ? `Import ${parsed.length.toLocaleString()} Docs` : 'Import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
