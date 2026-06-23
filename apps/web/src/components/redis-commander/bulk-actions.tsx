"use client";

import { useRef, useState } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { IconTrash, IconDownload, IconUpload } from "@tabler/icons-react";

interface BulkActionsProps {
    redisUrl: string;
    db: number;
    onChanged: () => void;
}

interface DryRunResult {
    affected: number;
    scanned: number;
    sample: string[];
    truncated: boolean;
}

interface ExportedKey {
    key: string;
    type: string;
    ttl: number;
    value: unknown;
}

export function BulkActions({ redisUrl, db, onChanged }: BulkActionsProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
            >
                <IconTrash className="size-3.5" /> Bulk Delete
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setExportOpen(true)}
            >
                <IconDownload className="size-3.5" /> Export
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setImportOpen(true)}
            >
                <IconUpload className="size-3.5" /> Import
            </Button>

            <BulkDeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                redisUrl={redisUrl}
                db={db}
                onChanged={onChanged}
            />
            <ExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                redisUrl={redisUrl}
                db={db}
            />
            <ImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                redisUrl={redisUrl}
                db={db}
                onChanged={onChanged}
            />
        </>
    );
}

function BulkDeleteDialog({
    open,
    onOpenChange,
    redisUrl,
    db,
    onChanged,
}: {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    redisUrl: string;
    db: number;
    onChanged: () => void;
}) {
    const [pattern, setPattern] = useState("");
    const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
    const [busy, setBusy] = useState(false);

    async function runDryRun() {
        if (!pattern.trim()) return;
        setBusy(true);
        try {
            const res = await fetch("/api/redis-commander/bulk-delete", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, pattern: pattern.trim(), dryRun: true }),
            });
            const body = await res.json() as DryRunResult & { error?: string };
            if (body.error) throw new Error(body.error);
            setDryRun(body);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Dry-run failed");
        } finally {
            setBusy(false);
        }
    }

    async function runDelete() {
        if (!pattern.trim() || !dryRun) return;
        setBusy(true);
        try {
            const res = await fetch("/api/redis-commander/bulk-delete", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, pattern: pattern.trim(), dryRun: false }),
            });
            const body = await res.json() as DryRunResult & { error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`Deleted ${body.affected} key(s)`);
            onChanged();
            close();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setBusy(false);
        }
    }

    function close() {
        onOpenChange(false);
        setPattern("");
        setDryRun(null);
    }

    return (
        <AlertDialog open={open} onOpenChange={(b) => (b ? onOpenChange(b) : close())}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Bulk Delete by Pattern</AlertDialogTitle>
                    <AlertDialogDescription>
                        Scans keys matching the pattern, then deletes them. Always run dry-run first.
                        Wildcard <code>*</code> alone is rejected here — use Flush for that.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-1">
                    <Label className="text-xs">Pattern</Label>
                    <Input
                        value={pattern}
                        onChange={(e) => {
                            setPattern(e.target.value);
                            setDryRun(null);
                        }}
                        placeholder="e.g. session:*"
                        className="h-8 text-xs font-mono"
                    />
                    {dryRun && (
                        <div className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                            <div>
                                Will delete <strong>{dryRun.affected.toLocaleString()}</strong> key(s),
                                scanned {dryRun.scanned.toLocaleString()}.
                                {dryRun.truncated && (
                                    <span className="text-amber-600"> (scan capped)</span>
                                )}
                            </div>
                            {dryRun.sample.length > 0 && (
                                <details>
                                    <summary className="cursor-pointer text-muted-foreground">
                                        Sample keys
                                    </summary>
                                    <div className="font-mono text-[10px] mt-1 max-h-32 overflow-auto">
                                        {dryRun.sample.map((k) => <div key={k}>{k}</div>)}
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={close} disabled={busy}>Cancel</AlertDialogCancel>
                    {dryRun ? (
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={(e) => {
                                e.preventDefault();
                                void runDelete();
                            }}
                            disabled={busy || dryRun.affected === 0}
                        >
                            {busy ? "Deleting…" : `Delete ${dryRun.affected}`}
                        </AlertDialogAction>
                    ) : (
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void runDryRun();
                            }}
                            disabled={busy || !pattern.trim()}
                        >
                            {busy ? "Scanning…" : "Dry-run"}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function ExportDialog({
    open,
    onOpenChange,
    redisUrl,
    db,
}: {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    redisUrl: string;
    db: number;
}) {
    const [pattern, setPattern] = useState("*");
    const [busy, setBusy] = useState(false);

    async function run() {
        setBusy(true);
        try {
            const res = await fetch("/api/redis-commander/export", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, pattern: pattern.trim() || "*" }),
            });
            const body = await res.json() as { keys?: ExportedKey[]; count?: number; truncated?: boolean; error?: string };
            if (body.error) throw new Error(body.error);
            const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `redis-export-db${db}-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported ${body.count ?? 0} key(s)${body.truncated ? " (truncated)" : ""}`);
            onOpenChange(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Export failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Export Keys to JSON</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-1">
                    <Label className="text-xs">Pattern</Label>
                    <Input
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                        placeholder="* = everything (capped at 10,000)"
                        className="h-8 text-xs font-mono"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button onClick={run} disabled={busy}>
                        {busy ? "Exporting…" : "Download"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ImportDialog({
    open,
    onOpenChange,
    redisUrl,
    db,
    onChanged,
}: {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    redisUrl: string;
    db: number;
    onChanged: () => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [overwrite, setOverwrite] = useState(false);
    const [busy, setBusy] = useState(false);
    const [filename, setFilename] = useState<string>("");
    const [keysToImport, setKeysToImport] = useState<ExportedKey[] | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);

    async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setFilename(file.name);
        setParseError(null);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as { keys?: ExportedKey[] } | ExportedKey[];
            const keys = Array.isArray(parsed) ? parsed : parsed.keys;
            if (!Array.isArray(keys)) {
                throw new Error("File must contain a 'keys' array or be an array of entries");
            }
            setKeysToImport(keys);
        } catch (err) {
            setParseError(err instanceof Error ? err.message : "Parse failed");
            setKeysToImport(null);
        }
    }

    async function run() {
        if (!keysToImport) return;
        setBusy(true);
        try {
            const res = await fetch("/api/redis-commander/import", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, keys: keysToImport, overwrite }),
            });
            const body = await res.json() as { imported?: number; skipped?: number; errors?: string[]; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`Imported ${body.imported ?? 0}, skipped ${body.skipped ?? 0}`);
            if (body.errors && body.errors.length > 0) {
                toast.warning(`${body.errors.length} error(s) — first: ${body.errors[0]}`);
            }
            onChanged();
            close();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Import failed");
        } finally {
            setBusy(false);
        }
    }

    function close() {
        onOpenChange(false);
        setFilename("");
        setKeysToImport(null);
        setOverwrite(false);
        setParseError(null);
        if (fileRef.current) fileRef.current.value = "";
    }

    return (
        <Dialog open={open} onOpenChange={(b) => (b ? onOpenChange(b) : close())}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Keys from JSON</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-1">
                    <div className="space-y-1">
                        <Label className="text-xs">JSON file (exported format)</Label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/json,.json"
                            onChange={onFileChange}
                            className="text-xs"
                        />
                        {filename && (
                            <div className="text-[10px] text-muted-foreground font-mono truncate">
                                {filename}
                            </div>
                        )}
                        {parseError && (
                            <div className="text-[10px] text-destructive">{parseError}</div>
                        )}
                        {keysToImport && (
                            <div className="text-[10px] text-muted-foreground">
                                {keysToImport.length} key(s) ready to import
                            </div>
                        )}
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                            checked={overwrite}
                            onCheckedChange={(c) => setOverwrite(c === true)}
                        />
                        Overwrite existing keys
                    </label>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
                    <Button onClick={run} disabled={busy || !keysToImport || keysToImport.length === 0}>
                        {busy ? "Importing…" : "Import"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
