"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { IconDatabase, IconTrash, IconHistory, IconPencil, IconPlugConnected, IconCheck, IconX, IconBrandMongodb, IconServer, IconCopy } from "@tabler/icons-react";
import { SavedConnection } from "./types";
import { getConnections, deleteConnection, saveConnection, updateConnectionDetails } from "./connection-service";
import { backendFetch } from "@/lib/backend-auth";
import useAuth from "@/utils/useAuth";
import { useMasterKeyStore } from "@/store/master-key-store";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { af, ar, ca, cs as csLocale, da, de, el, enUS, es, faIR, fr as frLocale, ms, nb, nl, pt, zhCN } from "date-fns/locale";

interface ConnectionFormProps {
    onConnect: (connectionString: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}

export function ConnectionForm({ onConnect, loading, error }: ConnectionFormProps) {
    const t = useTranslations("NoSqlExplorer.connection");
    const locale = useLocale();
    const DATE_LOCALE_MAP: Record<string, Locale> = {
        fr: frLocale, es, ar, ca, zh: zhCN, cs: csLocale,
        el, de, da, af, fa: faIR, ms, nb, nl, pt,
    };
    const dateLocale = DATE_LOCALE_MAP[locale] ?? enUS;
    const [connectionString, setConnectionString] = useState("");
    const [name, setName] = useState("My Connection");
    const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
    const { user } = useAuth();
    const { encryptionKey } = useMasterKeyStore();
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadConnections();
        }
    }, [user]);

    const loadConnections = async () => {
        if (!user || !encryptionKey) return;
        setIsLoadingConnections(true);
        try {
            const connections = await getConnections(user.uid, encryptionKey);
            setSavedConnections(connections);
        } catch (error) {
            console.error("Failed to load connections", error);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleTestConnection = async () => {
        if (!connectionString) return;
        setIsTesting(true);
        try {
            const res = await backendFetch("/api/nosql/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(t("toastTestOk"));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(t("toastTestFail", { message }));
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectionString || !user || !encryptionKey) return;

        try {
            if (editingId) {
                await updateConnectionDetails(user.uid, editingId, { name, connectionString }, encryptionKey);
                toast.success(t("toastUpdated"));
            } else {
                await saveConnection(user.uid, connectionString, name, encryptionKey);
            }
            await loadConnections();
        } catch (e) {
            console.error("Failed to save connection", e);
            toast.error(t("toastConnectFail", { name }));
            return;
        }

        setEditingId(null);
        await onConnect(connectionString);
    };

    const handleSelectConnection = (conn: SavedConnection) => {
        setConnectionString(conn.connectionString);
        setName(conn.name);
        setEditingId(null);
    };

    const handleEditConnection = (e: React.MouseEvent, conn: SavedConnection) => {
        e.stopPropagation();
        setEditingId(conn.id);
        setConnectionString(conn.connectionString);
        setName(conn.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setConnectionString("");
        setName("My Connection");
    };

    const handleDeleteConnection = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!user) return;
        if (!confirm(t("confirmDelete"))) return;

        try {
            await deleteConnection(user.uid, id);
            toast.success(t("toastDeletedConn"));
            if (editingId === id) handleCancelEdit();
            loadConnections();
        } catch (error) {
            toast.error(t("toastDeleteFail"));
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 max-h-[70vh] overflow-hidden">
            <div className="space-y-6 overflow-y-auto">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <IconBrandMongodb className="w-8 h-8 text-green-500" />
                        {editingId ? t("titleEdit") : t("titleConnect")}
                    </h2>
                    <p className="text-muted-foreground">
                        {editingId ? t("subtitleEdit") : t("subtitleConnect")}
                    </p>
                </div>

                <Card className="border-muted/50 shadow-lg bg-card/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="connection-name" className="text-xs font-medium uppercase text-muted-foreground">{t("labelName")}</Label>
                                <Input
                                    id="connection-name"
                                    placeholder={t("placeholderName")}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={loading}
                                    className="bg-background/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="connection-string" className="text-xs font-medium uppercase text-muted-foreground">{t("labelConnectionString")}</Label>
                                <div className="relative">
                                    <Input
                                        id="connection-string"
                                        placeholder={t("placeholderConnectionString")}
                                        value={connectionString}
                                        onChange={(e) => setConnectionString(e.target.value)}
                                        disabled={loading}
                                        className="bg-background/50 font-mono text-sm pl-9"
                                    />
                                    <IconDatabase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    {t("hintFormat")}
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                                    <IconX className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={handleTestConnection}
                                    disabled={loading || isTesting || !connectionString}
                                >
                                    {isTesting ? <IconHistory className="w-4 h-4 animate-spin mr-2" /> : <IconPlugConnected className="w-4 h-4 mr-2" />}
                                    {t("testConnection")}
                                </Button>
                                <Button type="submit" className="flex-1" disabled={loading || !connectionString}>
                                    {loading ? t("connecting") : (editingId ? t("updateConnect") : t("connect"))}
                                </Button>
                            </div>

                            {editingId && (
                                <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground" onClick={handleCancelEdit}>
                                    {t("cancelEdit")}
                                </Button>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col space-y-4 min-h-0">
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 font-semibold">
                        <IconHistory className="w-5 h-5 text-primary" />
                        {t("savedConnections")}
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {savedConnections.length}
                    </span>
                </div>

                <Card className="flex-1 flex flex-col border-muted/50 shadow-inner bg-muted/10 min-h-0 overflow-hidden">
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full max-h-[350px] pr-4 p-4">
                            {savedConnections.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 gap-2">
                                    <IconServer className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">{t("emptySaved")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {savedConnections.map((conn) => (
                                        <div
                                            key={conn.id}
                                            className={cn(
                                                "relative flex items-start justify-between p-4 border rounded-xl cursor-pointer group transition-all duration-200",
                                                editingId === conn.id
                                                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                    : "bg-card hover:bg-card/80 hover:border-primary/30 hover:shadow-md"
                                            )}
                                            onClick={() => handleSelectConnection(conn)}
                                        >
                                            <div className="flex-1 overflow-hidden space-y-1.5">
                                                <div className="font-semibold text-sm truncate flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", editingId === conn.id ? "bg-primary" : "bg-green-500/50")} />
                                                    {conn.name}
                                                </div>
                                                <div className="flex items-center gap-1.5 max-w-full">
                                                    <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-1.5 rounded-md border border-border/50 truncate max-w-[200px]" title={conn.connectionString.replace(/:([^@]+)@/, ":****@")}>
                                                        {conn.connectionString.replace(/:([^@]+)@/, ":****@")}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 flex-shrink-0 hover:text-primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(conn.connectionString);
                                                            toast.success(t("toastStringCopied"));
                                                        }}
                                                        title={t("copyStringTitle")}
                                                    >
                                                        <IconCopy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                                                    <IconHistory className="w-3 h-3" />
                                                    {t("lastUsed", {
                                                        time: formatDistanceToNow(
                                                            typeof conn.lastUsedAt === "number"
                                                                ? new Date(conn.lastUsedAt)
                                                                : conn.lastUsedAt?.toDate
                                                                    ? conn.lastUsedAt.toDate()
                                                                    : new Date(),
                                                            { addSuffix: true, locale: dateLocale }
                                                        ),
                                                    })}
                                                </div>
                                            </div>

                                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md p-0.5 shadow-sm border">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 hover:text-primary"
                                                    onClick={(e) => handleEditConnection(e, conn)}
                                                    title={t("editTitle")}
                                                >
                                                    <IconPencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={(e) => handleDeleteConnection(e, conn.id)}
                                                    title={t("deleteTitle")}
                                                >
                                                    <IconTrash className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
