"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { IconArrowsExchange, IconLoader2, IconLock, IconAlertTriangle } from "@tabler/icons-react";
import { toast } from "sonner";
import { SavedConnection } from "./types";

interface SyncSource {
    connectionString: string;
    dbName: string;
    collectionName: string;
    name: string;
}

interface SyncResult {
    scanned: number;
    inserted: number;
    modified: number;
    skipped: number;
    capped: boolean;
}

export function SyncDialog({
    source,
    targets,
    open,
    onClose,
}: {
    source: SyncSource;
    targets: SavedConnection[];
    open: boolean;
    onClose: () => void;
}) {
    const [targetId, setTargetId] = useState<string>(targets[0]?.id ?? "");
    const [targetDb, setTargetDb] = useState(source.dbName);
    const [targetColl, setTargetColl] = useState(source.collectionName);
    const [mode, setMode] = useState<"insert" | "overwrite">("insert");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<SyncResult | null>(null);

    const target = targets.find((t) => t.id === targetId);
    const targetReadOnly = !!target?.readOnly;

    const run = async () => {
        if (!target) return;
        if (targetReadOnly) { toast.error("Target connection is read-only"); return; }
        if (!targetDb.trim() || !targetColl.trim()) { toast.error("Target database and collection are required"); return; }
        setRunning(true);
        setResult(null);
        try {
            const res = await apiFetch("/api/nosql/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionString: source.connectionString,
                    dbName: source.dbName,
                    collectionName: source.collectionName,
                    mode,
                    target: {
                        connectionString: target.connectionString,
                        dbName: targetDb.trim(),
                        collectionName: targetColl.trim(),
                        readOnly: target.readOnly,
                    },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data as SyncResult);
            toast.success(`Synced ${data.inserted + data.modified} document(s)`);
        } catch (e: any) {
            toast.error(e.message || "Sync failed");
        } finally {
            setRunning(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                        <IconArrowsExchange className="h-4 w-4" /> Sync collection
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-1">
                    <div className="text-xs text-muted-foreground">
                        From <span className="font-mono text-foreground">{source.name}</span>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Target connection</Label>
                        <Select value={targetId} onValueChange={setTargetId}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select a connection" />
                            </SelectTrigger>
                            <SelectContent>
                                {targets.map((t) => (
                                    <SelectItem key={t.id} value={t.id ?? t.name}>
                                        <span className="flex items-center gap-1.5">
                                            {t.readOnly && <IconLock className="h-3 w-3 text-amber-500" />}
                                            {t.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {targetReadOnly && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <IconAlertTriangle className="h-3 w-3" /> This connection is read-only — pick another target.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Target database</Label>
                            <Input value={targetDb} onChange={(e) => setTargetDb(e.target.value)} className="h-9 text-sm font-mono" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Target collection</Label>
                            <Input value={targetColl} onChange={(e) => setTargetColl(e.target.value)} className="h-9 text-sm font-mono" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Mode (matched by _id)</Label>
                        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "insert" | "overwrite")} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="insert" id="sync-insert" />
                                <Label htmlFor="sync-insert" className="text-sm font-normal">Insert missing only</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="overwrite" id="sync-overwrite" />
                                <Label htmlFor="sync-overwrite" className="text-sm font-normal">Overwrite existing</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {result && (
                        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs font-mono space-y-0.5">
                            <div>scanned: {result.scanned}</div>
                            <div className="text-green-600 dark:text-green-400">inserted: {result.inserted}</div>
                            {mode === "overwrite" && <div className="text-blue-600 dark:text-blue-400">modified: {result.modified}</div>}
                            {mode === "insert" && <div className="text-muted-foreground">skipped (existing): {result.skipped}</div>}
                            {result.capped && <div className="text-amber-600 dark:text-amber-400">capped at 100k scanned</div>}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={running}>Close</Button>
                    <Button onClick={run} disabled={running || !target || targetReadOnly}>
                        {running ? <IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> : <IconArrowsExchange className="h-4 w-4 mr-2" />}
                        {running ? "Syncing…" : "Run sync"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
