"use client";

import type React from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { IconBrandMongodb, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { sanitizeError } from "@/lib/nosql-error-sanitizer";
import {
    DB_DIALECTS,
    DB_TYPE_ORDER,
    normalizeConnectionString,
    type DbType,
} from "@/lib/nosql-dialects";
import { CONNECTION_COLORS } from "@/components/nosql-explorer/connection-form";
import type { ConnectionFormProps, SourceAdapter } from "../types";

export interface MongoConfig {
    connectionString: string;
    dbType: DbType;
}

export interface MongoTabState {
    dbName: string;
    collectionName: string;
    page: number;
    limit: number;
    query: string;
    sortField: string | null;
    sortDirection: "asc" | "desc";
}

function blankConfig(): MongoConfig {
    return { connectionString: "", dbType: "mongodb" };
}

/** Keys are relative to the `DataExplorer` namespace; the dialog resolves them via t(). */
function validate(config: MongoConfig): string | null {
    const value = config.connectionString.trim();
    if (!value) return "validation.connectionStringRequired";
    if (!/^mongodb(\+srv)?:\/\//i.test(value)) {
        return "validation.connectionStringScheme";
    }
    return null;
}

async function testConnection(config: MongoConfig): Promise<void> {
    const connectionString = normalizeConnectionString(
        config.dbType,
        config.connectionString.trim()
    );
    const res = await apiFetch("/api/nosql/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
    });
    const data = await res.json();
    // Sanitised so credentials embedded in the connection string never surface.
    // No server message to report → empty message; the dialog supplies its own copy.
    if (!res.ok || !data.success) throw new Error(data.error ? sanitizeError(data.error) : "");
}

/**
 * Controlled-input form: reports values up via `onSubmit`. Never persists,
 * never calls the connection service, never toasts — the connection dialog
 * owns validate → testConnection → persist and renders `error` inline.
 */
function MongoConnectionForm({ initial, saving, error, onSubmit, onCancel }: ConnectionFormProps<MongoConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
    const [connectionString, setConnectionString] = useState(initial.config.connectionString);
    const [dbType, setDbType] = useState<DbType>(initial.config.dbType);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit({ name, folder, color, readOnly, config: { connectionString, dbType } });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="mongo-name">{t("name")}</Label>
                <Input
                    id="mongo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="mongo-folder">{t("folder")}</Label>
                <Input
                    id="mongo-folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t("folderPlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label>{t("dbType")}</Label>
                <div className="grid grid-cols-2 gap-2">
                    {DB_TYPE_ORDER.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setDbType(type)}
                            disabled={saving}
                            className={cn(
                                "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                                dbType === type
                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                    : "border-border bg-background/50 hover:border-primary/30"
                            )}
                        >
                            {DB_DIALECTS[type].label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="mongo-connection-string">{t("connectionString")}</Label>
                <Input
                    id="mongo-connection-string"
                    value={connectionString}
                    onChange={(e) => setConnectionString(e.target.value)}
                    placeholder={DB_DIALECTS[dbType].placeholder}
                    disabled={saving}
                    className="font-mono text-sm"
                />
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

            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 pr-3">
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

            <div className="flex justify-end gap-2 pt-2">
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

export const mongodbAdapter: SourceAdapter<MongoConfig, MongoTabState> = {
    id: "mongodb",
    label: "MongoDB",
    icon: IconBrandMongodb,
    accent: "text-green-500",
    blankConfig,
    validate,
    testConnection,
    ConnectionForm: MongoConnectionForm,
    // Replaced in Task 10.
    SidebarTree: () => null,
    // Replaced in Task 11.
    Pane: () => null,
};
