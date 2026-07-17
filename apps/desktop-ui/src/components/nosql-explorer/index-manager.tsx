"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IconPlus, IconTrash, IconRefresh, IconDatabase, IconAlertCircle } from "@tabler/icons-react";
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
import { cn } from "@/lib/utils";

interface IndexInfo {
    name: string;
    key: Record<string, number | string>;
    unique?: boolean;
    sparse?: boolean;
    background?: boolean;
    v?: number;
    expireAfterSeconds?: number;
    [key: string]: any;
}

interface IndexManagerProps {
    indexes: IndexInfo[];
    totalIndexSize?: number;
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
    onDropIndex: (indexName: string) => Promise<void>;
    onCreateIndex: (keys: Record<string, number>, options: Record<string, any>) => Promise<void>;
    readOnly?: boolean;
}

function formatKeySpec(key: Record<string, number | string>): string {
    return Object.entries(key)
        .map(([field, dir]) => `${field}: ${dir === 1 ? 'asc' : dir === -1 ? 'desc' : dir}`)
        .join(', ');
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IndexManager({
    indexes,
    totalIndexSize,
    loading,
    error,
    onRefresh,
    onDropIndex,
    onCreateIndex,
    readOnly = false,
}: IndexManagerProps) {
    const [dropConfirm, setDropConfirm] = useState<string | null>(null);
    const [dropping, setDropping] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newField, setNewField] = useState('');
    const [newDir, setNewDir] = useState<'1' | '-1'>('1');
    const [newUnique, setNewUnique] = useState(false);

    const handleDrop = async () => {
        if (!dropConfirm) return;
        setDropping(true);
        try {
            await onDropIndex(dropConfirm);
            toast.success(`Index "${dropConfirm}" dropped`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to drop index');
        } finally {
            setDropping(false);
            setDropConfirm(null);
        }
    };

    const handleCreate = async () => {
        if (!newField.trim()) {
            toast.error('Field name is required');
            return;
        }
        setCreating(true);
        try {
            await onCreateIndex(
                { [newField.trim()]: parseInt(newDir) as 1 | -1 },
                newUnique ? { unique: true } : {}
            );
            toast.success('Index created');
            setShowCreate(false);
            setNewField('');
            setNewDir('1');
            setNewUnique(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create index');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-sm text-muted-foreground animate-pulse">Loading indexes...</div>
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
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/10 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{indexes.length} {indexes.length === 1 ? 'index' : 'indexes'}</span>
                    {totalIndexSize !== undefined && (
                        <span className="text-xs text-muted-foreground">· {formatBytes(totalIndexSize)} total</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
                        <IconRefresh className="h-3.5 w-3.5" />
                    </Button>
                    {!readOnly && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => setShowCreate(true)}>
                            <IconPlus className="h-3.5 w-3.5 mr-1" />
                            New Index
                        </Button>
                    )}
                </div>
            </div>

            {showCreate && (
                <div className="px-4 py-3 border-b bg-muted/20 space-y-2.5 shrink-0">
                    <p className="text-xs font-medium text-muted-foreground">Create Index</p>
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Field name"
                            value={newField}
                            onChange={(e) => setNewField(e.target.value)}
                            className="h-8 text-xs flex-1"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
                        />
                        <select
                            value={newDir}
                            onChange={(e) => setNewDir(e.target.value as '1' | '-1')}
                            className="h-8 rounded-md border bg-background text-xs px-2 outline-none"
                        >
                            <option value="1">Ascending</option>
                            <option value="-1">Descending</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={newUnique}
                                onChange={(e) => setNewUnique(e.target.checked)}
                                className="rounded"
                            />
                            Unique
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={creating}>
                            {creating ? 'Creating...' : 'Create'}
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
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">system</Badge>
                                    )}
                                    {idx.unique && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/50 text-blue-600 dark:text-blue-400">unique</Badge>
                                    )}
                                    {idx.sparse && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">sparse</Badge>
                                    )}
                                    {idx.expireAfterSeconds !== undefined && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/50 text-orange-600">TTL</Badge>
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
                            <p className="text-sm text-muted-foreground">No indexes found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <AlertDialog open={!!dropConfirm} onOpenChange={(open) => !open && setDropConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Drop index?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently drop index <strong>{dropConfirm}</strong>. Queries using this index will slow down.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDrop}
                            disabled={dropping}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {dropping ? 'Dropping...' : 'Drop Index'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
