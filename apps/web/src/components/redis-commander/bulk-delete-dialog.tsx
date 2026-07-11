"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { DryRunResult } from "./bulk-types";

export function BulkDeleteDialog({
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
            const res = await apiFetch("/api/redis-commander/bulk-delete", {
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
            const res = await apiFetch("/api/redis-commander/bulk-delete", {
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
