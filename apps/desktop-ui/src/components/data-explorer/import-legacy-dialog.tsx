"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { getConnections as getMongoConnections } from "@/components/nosql-explorer/connection-service";
import { getConnections as getRedisConnections } from "@/components/redis-commander/connection-service";
import {
    dedupeAgainstExisting,
    legacyMongoToUnified,
    legacyRedisToUnified,
    type LegacyCandidate,
} from "@/lib/data-explorer/legacy-import";
import { SOURCES } from "./sources";
import { saveConnection } from "./connection-service";
import type { UnifiedConnection } from "./types";

interface ImportLegacyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Current unified connections, used to dedupe by (sourceId, name). */
    existing: UnifiedConnection[];
    onImported: () => void;
}

/**
 * One-shot, opt-in copy of connections from Database Explorer and Redis
 * Commander into the unified store. Both legacy stores are read-only here —
 * this never writes to or deletes from them, so the old tools keep working
 * unchanged. Re-running it is safe: `dedupeAgainstExisting` skips anything
 * already imported by (sourceId, name).
 */
export function ImportLegacyDialog({ open, onOpenChange, existing, onImported }: ImportLegacyDialogProps) {
    const t = useTranslations("DataExplorer");
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();

    const [loading, setLoading] = useState(false);
    const [candidates, setCandidates] = useState<LegacyCandidate[]>([]);
    const [skipped, setSkipped] = useState(0);
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setCandidates([]);
        setSkipped(0);
        if (!user || !encryptionKey) return;

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const [mongoRows, redisRows] = await Promise.all([
                    getMongoConnections(user.uid, encryptionKey),
                    getRedisConnections(encryptionKey),
                ]);

                const mongoCandidates = mongoRows.map((row) =>
                    legacyMongoToUnified(
                        { name: row.name, color: row.color, readOnly: row.readOnly, dbType: row.dbType },
                        row.connectionString
                    )
                );
                const redisCandidates = redisRows
                    .filter((row) => !!row.config)
                    .map((row) =>
                        legacyRedisToUnified(
                            { name: row.name, folder: row.folder },
                            row.config as { redisUrl: string; folder?: string }
                        )
                    );

                const { toImport, skipped: skippedCount } = dedupeAgainstExisting(
                    [...mongoCandidates, ...redisCandidates],
                    existing
                );
                if (cancelled) return;
                setCandidates(toImport);
                setSkipped(skippedCount);
            } catch (e) {
                if (cancelled) return;
                toast.error(e instanceof Error ? e.message : t("toast.legacyImportFailed"));
                onOpenChange(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // Re-run only when the dialog opens or its inputs change identity —
        // not on every `existing` array reference from a parent re-render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user, encryptionKey]);

    async function handleConfirm() {
        if (!encryptionKey || candidates.length === 0) return;
        setImporting(true);
        let imported = 0;
        let failed = 0;
        // Per-row failure must not abort the batch — collect and report the count.
        for (const candidate of candidates) {
            try {
                await saveConnection(candidate.sourceId, candidate.values, encryptionKey);
                imported++;
            } catch {
                failed++;
            }
        }
        setImporting(false);
        toast.success(t("toast.legacyImportResult", { imported, skipped, failed }));
        onImported();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !importing && onOpenChange(next)}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("importDialog.title")}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {t("importDialog.loading")}
                    </p>
                ) : candidates.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {skipped > 0
                            ? t("importDialog.allSkipped", { count: skipped })
                            : t("importDialog.empty")}
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            {t("importDialog.previewHeading", { count: candidates.length })}
                        </p>
                        <ScrollArea className="max-h-64 rounded-md border">
                            <ul className="divide-y">
                                {candidates.map((candidate, i) => (
                                    <li
                                        key={`${candidate.sourceId}-${candidate.values.name}-${i}`}
                                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0 flex-1 truncate">{candidate.values.name}</span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {SOURCES[candidate.sourceId].label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                        {skipped > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {t("importDialog.skippedNote", { count: skipped })}
                            </p>
                        )}
                    </>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                        {t("connectionDialog.cancel")}
                    </Button>
                    <Button
                        onClick={() => void handleConfirm()}
                        disabled={loading || importing || candidates.length === 0}
                    >
                        {importing
                            ? t("importDialog.importing")
                            : t("importDialog.confirm", { count: candidates.length })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
