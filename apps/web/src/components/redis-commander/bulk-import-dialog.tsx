"use client";

import React, { useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { ExportedKey } from "./bulk-types";

export function BulkImportDialog({
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
