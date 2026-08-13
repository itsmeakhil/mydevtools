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
import { getConnections as getMongoConnections } from "@/components/data-explorer/mongodb/connection-service";
import { getConnections as getRedisConnections } from "@/components/data-explorer/redis/connection-service";
import { getConnections as getSqlConnections } from "@/components/data-explorer/sql/connection-service";
import {
    dedupeAgainstExisting,
    legacyMongoToUnified,
    legacyRedisToUnified,
    legacySqlToUnified,
    type LegacyCandidate,
} from "@/lib/data-explorer/legacy-import";
import { SOURCES } from "./sources";
import { saveConnection } from "./connection-service";
import type { UnifiedConnection } from "./types";

interface ImportLegacyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Current unified connections, used to dedupe by (sourceId, name, config). */
    existing: UnifiedConnection[];
    /**
     * True once the shell's own connection list has genuinely finished
     * loading (see `page.tsx`'s `connectionsLoaded`). A failed or in-flight
     * load leaves `existing` stale or empty — deduping against that would
     * silently re-import connections the user already has, so the dialog
     * refuses to fetch legacy candidates until this is true.
     */
    connectionsLoaded: boolean;
    onImported: () => void;
}

/**
 * One-shot, opt-in copy of connections from Database Explorer and Redis
 * Commander into the unified store. Both legacy stores are read-only here —
 * this never writes to or deletes from them, so the old tools keep working
 * unchanged. Re-running it is safe: `dedupeAgainstExisting` skips anything
 * already imported by (sourceId, name, config).
 */
export function ImportLegacyDialog({
    open,
    onOpenChange,
    existing,
    connectionsLoaded,
    onImported,
}: ImportLegacyDialogProps) {
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
        // The unified list hasn't genuinely loaded yet — `existing` cannot be
        // trusted for dedupe, so don't fetch legacy candidates against it.
        // The effect re-runs once `connectionsLoaded` flips true.
        if (!connectionsLoaded) {
            setLoading(false);
            return;
        }
        if (!user || !encryptionKey) return;

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                // allSettled, not all: these are three independent cloud stores
                // and one being unreachable must not cost the user the other
                // two. Whatever resolved still gets imported.
                const [mongo, redis, sql] = await Promise.allSettled([
                    getMongoConnections(user.uid, encryptionKey),
                    getRedisConnections(encryptionKey),
                    getSqlConnections(encryptionKey),
                ]);

                const mongoCandidates = (mongo.status === "fulfilled" ? mongo.value : []).map((row) =>
                    legacyMongoToUnified(
                        { name: row.name, color: row.color, readOnly: row.readOnly, dbType: row.dbType },
                        row.connectionString
                    )
                );
                const redisCandidates = (redis.status === "fulfilled" ? redis.value : [])
                    .filter((row) => !!row.config)
                    .map((row) =>
                        legacyRedisToUnified(
                            { name: row.name, folder: row.folder },
                            row.config as { redisUrl: string; folder?: string }
                        )
                    );
                const sqlCandidates = (sql.status === "fulfilled" ? sql.value : [])
                    .flatMap((row) => {
                        if (!row.config) return [];
                        // A row whose `type` is not one of the three engines
                        // has no adapter to import into — skip it rather than
                        // create a connection nothing can open.
                        const candidate = legacySqlToUnified({ name: row.name, type: row.type }, row.config);
                        return candidate ? [candidate] : [];
                    });

                const { toImport, skipped: skippedCount } = dedupeAgainstExisting(
                    [...sqlCandidates, ...mongoCandidates, ...redisCandidates],
                    existing
                );
                if (cancelled) return;
                setCandidates(toImport);
                setSkipped(skippedCount);
            } catch {
                // Never surface the raw error: this flow reads decrypted
                // credentials, so an uncontrolled message is a risk, not just
                // an i18n gap.
                if (cancelled) return;
                toast.error(t("toast.legacyImportFailed"));
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
    }, [open, user, encryptionKey, connectionsLoaded]);

    async function handleConfirm() {
        if (!encryptionKey || candidates.length === 0 || !connectionsLoaded) return;
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
        const message = t("toast.legacyImportResult", { imported, skipped, failed });
        // A total failure is not a success — say so.
        if (imported === 0 && failed > 0) toast.error(message);
        else toast.success(message);
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
                ) : !connectionsLoaded ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {t("importDialog.notReady")}
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
                        disabled={loading || importing || candidates.length === 0 || !connectionsLoaded}
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
