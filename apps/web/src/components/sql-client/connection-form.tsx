"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    IconTrash,
    IconPencil,
    IconPlugConnected,
    IconHistory,
    IconServer,
    IconX,
    IconLoader2,
    IconShieldLock,
    IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { DbType, SavedSqlConnection, SqlConnectionConfig } from "./types";
import { saveConnection, updateConnection, deleteConnection } from "./connection-service";
import { useMasterKeyStore } from "@/store/master-key-store";
import { formatDistanceToNow } from "date-fns";
import { DbIcon, dbTypeLabel } from "./db-icon";

const DB_TYPES: { value: DbType; label: string; color: string }[] = [
    { value: "postgresql", label: "PostgreSQL", color: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20" },
    { value: "mysql", label: "MySQL", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/20" },
    { value: "mariadb", label: "MariaDB", color: "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20" },
];

const DB_DEFAULTS: Record<DbType, number> = {
    postgresql: 5432,
    mysql: 3306,
    mariadb: 3306,
};

interface ConnectionFormProps {
    savedConnections: SavedSqlConnection[];
    onConnected: (conn: SavedSqlConnection) => void;
    onConnectionsChanged: () => void;
}

const defaultConfig = (): SqlConnectionConfig => ({
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "",
    username: "",
    password: "",
    ssl: false,
});

export function ConnectionForm({
    savedConnections,
    onConnected,
    onConnectionsChanged,
}: ConnectionFormProps) {
    const t = useTranslations("SqlClient.connection");
    const { encryptionKey } = useMasterKeyStore();
    const [config, setConfig] = useState<SqlConnectionConfig>(defaultConfig());
    const [name, setName] = useState("My Connection");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const set = <K extends keyof SqlConnectionConfig>(k: K, v: SqlConnectionConfig[K]) =>
        setConfig((prev) => ({ ...prev, [k]: v }));

    const handleTypeChange = (type: DbType) => {
        set("type", type);
        set("port", DB_DEFAULTS[type]);
    };

    const handleTest = async () => {
        if (!config.host || !config.database) {
            toast.error(t("toastFillFields"));
            return;
        }
        setIsTesting(true);
        try {
            const res = await fetch("/api/sql-client/connect", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(t("toastConnectOk", { version: data.version ?? "" }));
        } catch (err) {
            toast.error(t("toastConnectFail", { message: err instanceof Error ? err.message : String(err) }));
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!encryptionKey) {
            toast.error(t("toastUnlockVault"));
            return;
        }
        if (!config.host || !config.database) {
            toast.error(t("toastFieldsRequired"));
            return;
        }
        setIsSaving(true);
        try {
            if (editingId) {
                await updateConnection(editingId, { config, name }, encryptionKey);
                toast.success(t("toastUpdated"));
                onConnectionsChanged();
                handleCancel();
            } else {
                const conn = await saveConnection(config, name, encryptionKey);
                toast.success(t("toastSaved"));
                onConnectionsChanged();
                onConnected(conn);
            }
        } catch (err) {
            toast.error(t("toastSaveFail", { message: err instanceof Error ? err.message : String(err) }));
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (e: React.MouseEvent, conn: SavedSqlConnection) => {
        e.stopPropagation();
        setEditingId(conn.id);
        setConfig(conn.config ?? defaultConfig());
        setName(conn.name);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm(t("confirmDelete"))) return;
        try {
            await deleteConnection(id);
            toast.success(t("toastDeleted"));
            if (editingId === id) handleCancel();
            onConnectionsChanged();
        } catch {
            toast.error(t("toastDeleteFail"));
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setConfig(defaultConfig());
        setName("My Connection");
    };

    return (
        <div className="flex gap-0 h-full">
            {/* ── Left: form ── */}
            <div className="flex-1 min-w-0 flex flex-col">
                <form onSubmit={handleSave} className="flex flex-col gap-5 p-6 overflow-y-auto">
                    {/* DB type picker */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{t("labelDbType")}</Label>
                        <div className="flex gap-2">
                            {DB_TYPES.map(({ value, label, color }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => handleTypeChange(value)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                        config.type === value
                                            ? color + " ring-1 ring-offset-1 ring-current"
                                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                                    )}
                                >
                                    <DbIcon type={value} className="w-3.5 h-3.5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Connection name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="conn-name" className="text-sm font-medium">
                            {t("labelName")}
                        </Label>
                        <Input
                            id="conn-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("placeholderName")}
                        />
                    </div>

                    {/* Host + Port on one row */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">{t("labelHostPort")}</Label>
                        <div className="flex gap-2">
                            <Input
                                id="conn-host"
                                value={config.host}
                                onChange={(e) => set("host", e.target.value)}
                                placeholder="localhost"
                                className="flex-1 font-mono text-sm"
                            />
                            <Input
                                id="conn-port"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={config.port}
                                onChange={(e) => set("port", Number(e.target.value.replace(/\D/g, "")) || DB_DEFAULTS[config.type])}
                                className="w-[90px] font-mono text-sm text-center"
                                placeholder="5432"
                            />
                        </div>
                    </div>

                    {/* Database name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="conn-db" className="text-sm font-medium">
                            {t("labelDatabase")}
                        </Label>
                        <Input
                            id="conn-db"
                            value={config.database}
                            onChange={(e) => set("database", e.target.value)}
                            placeholder={t("placeholderDatabase")}
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                        <Label htmlFor="conn-user" className="text-sm font-medium">
                            {t("labelUsername")}
                        </Label>
                        <Input
                            id="conn-user"
                            value={config.username}
                            onChange={(e) => set("username", e.target.value)}
                            placeholder={config.type === "postgresql" ? "postgres" : "root"}
                            autoComplete="off"
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <Label htmlFor="conn-pass" className="text-sm font-medium">
                            {t("labelPassword")}
                        </Label>
                        <Input
                            id="conn-pass"
                            type="password"
                            value={config.password}
                            onChange={(e) => set("password", e.target.value)}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="font-mono text-sm"
                        />
                    </div>

                    {/* SSL */}
                    <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30">
                        <div>
                            <p className="text-sm font-medium">{t("labelSsl")}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t("sslDesc")}</p>
                        </div>
                        <Switch
                            id="conn-ssl"
                            checked={config.ssl}
                            onCheckedChange={(v) => set("ssl", v)}
                        />
                    </div>

                    {/* Security note */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                        <IconShieldLock className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
                        {t("securityNote")}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={handleTest}
                                disabled={isTesting || isSaving}
                            >
                                {isTesting
                                    ? <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
                                    : <IconPlugConnected className="w-4 h-4 mr-2" />
                                }
                                {t("btnTest")}
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1"
                                disabled={isSaving || isTesting}
                            >
                                {isSaving
                                    ? <IconLoader2 className="w-4 h-4 animate-spin mr-2" />
                                    : null
                                }
                                {editingId ? t("btnUpdate") : t("btnSave")}
                            </Button>
                        </div>

                        {editingId && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={handleCancel}
                            >
                                <IconX className="w-3.5 h-3.5 mr-1" />
                                {t("btnCancelEdit")}
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            {/* ── Divider ── */}
            <Separator orientation="vertical" className="h-auto" />

            {/* ── Right: saved connections ── */}
            <div className="w-[260px] flex-shrink-0 flex flex-col">
                <div className="flex items-center justify-between px-4 pt-5 pb-3">
                    <span className="text-sm font-medium">{t("savedConnections")}</span>
                    <Badge variant="secondary" className="text-xs tabular-nums">
                        {savedConnections.length}
                    </Badge>
                </div>

                <ScrollArea className="flex-1">
                    <div className="px-3 pb-4 space-y-1.5">
                        {savedConnections.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                                <IconServer className="w-9 h-9 opacity-15" />
                                <p className="text-xs text-center">
                                    {t("emptySaved")}
                                </p>
                            </div>
                        ) : (
                            savedConnections.map((conn) => (
                                <div
                                    key={conn.id}
                                    className={cn(
                                        "group relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                        editingId === conn.id
                                            ? "border-primary bg-primary/5"
                                            : "border-transparent bg-muted/40 hover:bg-muted/80 hover:border-border"
                                    )}
                                    onClick={() => onConnected(conn)}
                                >
                                    <DbIcon type={conn.type} className="w-8 h-8 flex-shrink-0 rounded-lg" />

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate leading-none mb-1">
                                            {conn.name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                                            {conn.config?.host}/{conn.config?.database}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                                            <IconHistory className="w-2.5 h-2.5" />
                                            {formatDistanceToNow(new Date(conn.lastUsedAt), { addSuffix: true })}
                                        </p>
                                    </div>

                                    <IconChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 group-hover:text-muted-foreground transition-colors" />

                                    {/* Edit/Delete on hover */}
                                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-background border rounded-md shadow-sm p-0.5">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:text-primary"
                                            onClick={(e) => handleEdit(e, conn)}
                                        >
                                            <IconPencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => handleDelete(e, conn.id)}
                                        >
                                            <IconTrash className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
