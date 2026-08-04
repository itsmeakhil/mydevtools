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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    const [testState, setTestState] = useState<"idle" | "testing" | "ok">("idle");

    useEffect(() => {
        if (!open) return;
        // Creating defaults to the first registered source so the dialog opens
        // ready to type. Editing pins the connection's own source — changing
        // what kind of database an existing connection is was never coherent.
        setSourceId(editing?.sourceId ?? SOURCE_ORDER[0] ?? null);
        setError(null);
        setSaving(false);
        setTestState("idle");
    }, [open, editing]);

    const adapter = sourceId ? getAdapter(sourceId) : null;

    /** Switching source discards any error or test result from the previous one. */
    function handleSourceChange(next: SourceId) {
        setSourceId(next);
        setError(null);
        setTestState("idle");
    }

    /**
     * Explicit, optional user action. Saving never waits on it — a rename or a
     * recolour must still persist off-VPN, and a connection to a server that is
     * not running yet must be creatable. Both outcomes render inline in the
     * dialog so the form (and anything half-typed in it) survives a retry.
     */
    async function handleTest(config: unknown) {
        if (!adapter) return;
        setError(null);

        const invalidKey = adapter.validate(config);
        if (invalidKey) {
            setError(t(invalidKey));
            return;
        }

        setTestState("testing");
        try {
            await adapter.testConnection(config);
            setTestState("ok");
        } catch (e) {
            // Adapters throw pre-sanitised messages, or an empty one when there
            // is nothing reportable. Never a raw config.
            const message = e instanceof Error ? e.message.trim() : "";
            setError(message || t("connectionDialog.testFailed"));
            setTestState("idle");
        }
    }

    async function handleSubmit(values: ConnectionFormValues<unknown>) {
        if (!adapter || !encryptionKey) return;
        setError(null);

        const invalidKey = adapter.validate(values.config);
        if (invalidKey) {
            setError(t(invalidKey));
            return;
        }

        setSaving(true);
        try {
            if (editing) {
                await updateConnection(editing.id, values, encryptionKey);
            } else {
                await saveConnection(adapter.id, values, encryptionKey);
            }
            toast.success(t("toast.saved"));
            onSaved();
            onOpenChange(false);
        } catch (e) {
            const message = e instanceof Error ? e.message.trim() : "";
            setError(message || t("toast.saveFailed"));
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

                <div className="space-y-1.5">
                    <Label htmlFor="data-explorer-source">
                        {t("connectionDialog.pickSource")}
                    </Label>
                    <Select
                        value={sourceId ?? undefined}
                        onValueChange={handleSourceChange}
                        // Editing pins the source: an existing connection cannot
                        // change what kind of database it points at.
                        disabled={!!editing || saving}
                    >
                        <SelectTrigger id="data-explorer-source" className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SOURCE_ORDER.map((id) => {
                                const candidate = SOURCES[id];
                                const Icon = candidate.icon;
                                return (
                                    <SelectItem key={id} value={id}>
                                        <span className="flex items-center gap-2">
                                            <Icon className={cn("size-4", candidate.accent)} />
                                            {/* Proper noun — never translated. */}
                                            {candidate.label}
                                        </span>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {adapter && (
                    <adapter.ConnectionForm
                        // Remount on source change so no field carries over
                        // from the previous adapter's form.
                        key={adapter.id}
                        initial={{
                            name: editing?.name ?? "",
                            folder: editing?.folder ?? "",
                            color: editing?.color ?? null,
                            readOnly: editing?.readOnly ?? false,
                            config: editing?.config ?? adapter.blankConfig(),
                        }}
                        saving={saving}
                        error={error}
                        onTest={handleTest}
                        testState={testState}
                        onSubmit={handleSubmit}
                        onCancel={() => onOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
