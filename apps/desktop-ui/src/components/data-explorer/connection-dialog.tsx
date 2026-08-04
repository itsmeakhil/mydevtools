"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMasterKeyStore } from "@/store/master-key-store";
import { SOURCES, SOURCE_ORDER, getAdapter } from "./sources";
import { saveConnection, updateConnection } from "./connection-service";
import type { ConnectionFormValues, SourceId, UnifiedConnection } from "./types";

interface ConnectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Null when creating. */
    editing: UnifiedConnection | null;
    onSaved: () => void;
}

export function ConnectionDialog({ open, onOpenChange, editing, onSaved }: ConnectionDialogProps) {
    const t = useTranslations("DataExplorer");
    const { encryptionKey } = useMasterKeyStore();
    const [sourceId, setSourceId] = useState<SourceId | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setSourceId(editing?.sourceId ?? null);
        setError(null);
        setSaving(false);
    }, [open, editing]);

    const adapter = sourceId ? getAdapter(sourceId) : null;

    async function handleSubmit(values: ConnectionFormValues<unknown>) {
        if (!adapter || !encryptionKey) return;
        setError(null);

        const invalid = adapter.validate(values.config);
        if (invalid) {
            setError(invalid);
            return;
        }

        setSaving(true);
        try {
            await adapter.testConnection(values.config);
            if (editing) {
                await updateConnection(editing.id, values, encryptionKey);
            } else {
                await saveConnection(adapter.id, values, encryptionKey);
            }
            toast.success(t("toast.saved"));
            onSaved();
            onOpenChange(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : t("toast.saveFailed"));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editing ? t("connectionDialog.editTitle") : t("connectionDialog.createTitle")}
                    </DialogTitle>
                </DialogHeader>

                {!adapter ? (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            {t("connectionDialog.pickSource")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {SOURCE_ORDER.map((id) => {
                                const candidate = SOURCES[id];
                                const Icon = candidate.icon;
                                return (
                                    <Button
                                        key={id}
                                        variant="outline"
                                        className="h-auto justify-start gap-2 py-3"
                                        onClick={() => setSourceId(id)}
                                    >
                                        <Icon className={cn("size-5", candidate.accent)} />
                                        <span>{candidate.label}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <adapter.ConnectionForm
                        initial={{
                            name: editing?.name ?? "",
                            folder: editing?.folder ?? "",
                            color: editing?.color ?? null,
                            readOnly: editing?.readOnly ?? false,
                            config: editing?.config ?? adapter.blankConfig(),
                        }}
                        saving={saving}
                        error={error}
                        onSubmit={handleSubmit}
                        onCancel={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
