"use client";

import React, { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { IconFlame, IconFolder, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CONNECTION_COLORS } from "@/components/nosql-explorer/connection-form";
import {
    databasePath,
    firestoreFetch,
    listCollectionIds,
    parseServiceAccount,
    sanitizeFirestoreError,
    type FirestoreConfig,
} from "@/lib/data-explorer/firestore-api";
import type { ConnectionFormProps, PaneProps, SidebarTreeProps, SourceAdapter } from "../types";

export type { FirestoreConfig };

export interface FirestoreTabState {
    /** Full collection path from the documents root, e.g. "users/u1/orders". */
    collectionPath: string;
    filterField: string;
    filterOp: string;
    filterValue: string;
    orderByField: string;
    orderByDir: "asc" | "desc";
    pageSize: number;
    /** Bumped to force a refetch. */
    refreshTick: number;
}

export function blankTabState(collectionPath: string): FirestoreTabState {
    return {
        collectionPath,
        filterField: "",
        filterOp: "==",
        filterValue: "",
        orderByField: "",
        orderByDir: "asc",
        pageSize: 25,
        refreshTick: 0,
    };
}

function blankConfig(): FirestoreConfig {
    return { serviceAccountJson: "", databaseId: "(default)" };
}

const DATABASE_ID_RE = /^[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$/;

function validate(config: FirestoreConfig): string | null {
    if (!config.serviceAccountJson.trim()) return "validation.serviceAccountRequired";
    const parsed = parseServiceAccount(config.serviceAccountJson);
    if ("errorKey" in parsed) return parsed.errorKey;
    const db = config.databaseId.trim();
    if (db && db !== "(default)" && !DATABASE_ID_RE.test(db))
        return "validation.databaseIdInvalid";
    return null;
}

/**
 * Cheap authed metadata call: surfaces bad keys, SERVICE_DISABLED,
 * PERMISSION_DENIED and a wrong database id before anything is saved.
 * Also rejects Datastore-mode databases — the Firestore document API
 * cannot browse those.
 */
async function testConnection(config: FirestoreConfig): Promise<void> {
    try {
        const db = await firestoreFetch(config, "GET", databasePath(config));
        if (db?.type === "DATASTORE_MODE") {
            // Reuse the runtime error copy; the dialog renders thrown
            // messages as-is. Untranslatable server strings elsewhere follow
            // the same rule.
            throw new Error("This database is in Datastore mode, which Firestore tools cannot browse.");
        }
    } catch (err) {
        throw new Error(sanitizeFirestoreError(err instanceof Error ? err.message : String(err)));
    }
}

/* ------------------------------------------------------------------ form */

function FirestoreConnectionForm({
    initial,
    saving,
    error,
    onTest,
    testState,
    onSubmit,
    onCancel,
}: ConnectionFormProps<FirestoreConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const tf = useTranslations("DataExplorer.firestore");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
    const [serviceAccountJson, setServiceAccountJson] = useState(initial.config.serviceAccountJson);
    const [databaseId, setDatabaseId] = useState(
        initial.config.databaseId === "(default)" ? "" : initial.config.databaseId,
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    function currentConfig(): FirestoreConfig {
        return {
            serviceAccountJson,
            databaseId: databaseId.trim() || "(default)",
        };
    }

    // Non-sensitive echo so the user can confirm which project they pasted
    // before saving. The private key is never rendered outside the textarea.
    const parsed = parseServiceAccount(serviceAccountJson);
    const parsedOk = !("errorKey" in parsed) ? parsed : null;

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setServiceAccountJson(String(reader.result ?? ""));
        reader.readAsText(file);
        e.target.value = "";
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        onSubmit({ name, folder, color, readOnly, config: currentConfig() });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="fs-name">{t("name")}</Label>
                <Input
                    id="fs-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="fs-folder">{t("folder")}</Label>
                <Input
                    id="fs-folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t("folderPlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="fs-sa">{tf("serviceAccount")}</Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving}
                    >
                        {tf("loadFromFile")}
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleFile}
                    />
                </div>
                <Textarea
                    id="fs-sa"
                    value={serviceAccountJson}
                    onChange={(e) => setServiceAccountJson(e.target.value)}
                    placeholder={tf("serviceAccountPlaceholder")}
                    disabled={saving}
                    rows={5}
                    className="font-mono text-xs"
                />
                {parsedOk ? (
                    <p className="text-xs text-muted-foreground">
                        {tf("parsedProject")}{" "}
                        <span className="font-mono">
                            {parsedOk.projectId} · {parsedOk.clientEmail}
                        </span>
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">{tf("serviceAccountHint")}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="fs-db">{tf("databaseId")}</Label>
                <Input
                    id="fs-db"
                    value={databaseId}
                    onChange={(e) => setDatabaseId(e.target.value)}
                    placeholder={tf("databaseIdPlaceholder")}
                    disabled={saving}
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{tf("databaseIdHint")}</p>
            </div>

            <div className="space-y-2">
                <Label>{t("color")}</Label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setColor(null)}
                        disabled={saving}
                        className={cn(
                            "flex size-6 items-center justify-center rounded-full border-2 text-muted-foreground transition-transform",
                            color === null ? "border-primary scale-110" : "border-border hover:scale-105"
                        )}
                        aria-label={t("colorNone")}
                    >
                        <IconX className="size-3" />
                    </button>
                    {CONNECTION_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            disabled={saving}
                            className={cn(
                                "size-6 rounded-full border-2 transition-transform",
                                color === c ? "border-primary scale-110" : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: c }}
                            aria-label={c}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                    <Label className="text-xs font-medium">{t("readOnly")}</Label>
                    <p className="text-[10px] text-muted-foreground">{t("readOnlyHint")}</p>
                </div>
                <Switch checked={readOnly} onCheckedChange={setReadOnly} disabled={saving} />
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {error}
                </div>
            )}
            {testState === "ok" && !error && (
                <div className="rounded-md bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {t("testOk")}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onTest(currentConfig())}
                    disabled={saving || testState === "testing"}
                >
                    {t("test")}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
                    {t("cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                    {t("save")}
                </Button>
            </div>
        </form>
    );
}

/* ------------------------------------------------------------------ tree */

interface CollectionRowProps {
    id: string;
    onOpen: (id: string) => void;
}

const CollectionRow = React.memo(function CollectionRow({ id, onOpen }: CollectionRowProps) {
    return (
        <button
            type="button"
            onClick={() => onOpen(id)}
            className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/60"
        >
            <IconFolder className="size-3.5 shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1 truncate">{id}</span>
        </button>
    );
});

function FirestoreSidebarTree({
    connection,
    config,
    openTab,
    searchQuery,
}: SidebarTreeProps<FirestoreConfig, FirestoreTabState>) {
    const t = useTranslations("DataExplorer.firestore");
    const [collections, setCollections] = useState<string[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        listCollectionIds(config)
            .then((ids) => {
                if (!cancelled) setCollections(ids);
            })
            .catch((err) => {
                if (!cancelled)
                    setError(sanitizeFirestoreError(err instanceof Error ? err.message : String(err)));
            });
        return () => {
            cancelled = true;
        };
        // Refetch when the connection's config changes (e.g. edited SA).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.serviceAccountJson, config.databaseId]);

    const openCollection = useCallback(
        (id: string) => {
            openTab({
                key: id,
                title: id,
                subtitle: connection.name,
                state: blankTabState(id),
            });
        },
        [openTab, connection.name]
    );

    if (error) {
        return <p className="px-2 py-1 text-xs text-destructive">{error}</p>;
    }
    if (collections === null) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">…</p>;
    }
    if (collections.length === 0) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">{t("noCollections")}</p>;
    }

    // Search comes from the shell's one box. A connection whose own name
    // matches shows everything; otherwise rows filter on their ids — same
    // rule as the Mongo and Redis trees.
    const q = searchQuery.trim().toLowerCase();
    const showAll = !q || connection.name.toLowerCase().includes(q);
    const rows = collections.filter((id) => showAll || id.toLowerCase().includes(q));

    if (rows.length === 0) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">{t("noMatches")}</p>;
    }

    return (
        <div className="space-y-0.5 py-0.5">
            {rows.map((id) => (
                <CollectionRow key={id} id={id} onOpen={openCollection} />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ pane */

// Placeholder until the collection workbench lands; keeps the adapter
// contract satisfied so connections can already be created and browsed.
function FirestorePane({ state }: PaneProps<FirestoreConfig, FirestoreTabState>) {
    return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {state.collectionPath}
        </div>
    );
}

export const firestoreAdapter: SourceAdapter<FirestoreConfig, FirestoreTabState> = {
    id: "firestore",
    label: "Firestore",
    icon: IconFlame,
    accent: "text-amber-500",
    blankConfig,
    validate,
    testConnection,
    ConnectionForm: FirestoreConnectionForm,
    SidebarTree: FirestoreSidebarTree,
    Pane: FirestorePane,
};
