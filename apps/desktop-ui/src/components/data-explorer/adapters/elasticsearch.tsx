"use client";

import React, { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { IconSearch, IconStack2, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CONNECTION_COLORS } from "@/components/data-explorer/connection-colors";
import { ElasticsearchSearchPane } from "@/components/data-explorer/elasticsearch/search-pane";
import {
    listIndices,
    pingCluster,
    sanitizeElasticsearchError,
    type ElasticsearchAuthMode,
    type ElasticsearchConfig,
    type IndexInfo,
} from "@/lib/data-explorer/elasticsearch-api";
import type { ConnectionFormProps, PaneProps, SidebarTreeProps, SourceAdapter } from "../types";

export type { ElasticsearchConfig };

export interface ElasticsearchTabState {
    index: string;
    mode: "lucene" | "dsl";
    /** Lucene query_string text (mode === "lucene"). */
    queryString: string;
    /** Raw Query DSL body (mode === "dsl"). */
    dslText: string;
    size: number;
    from: number;
    /** Bumped to force a refetch. */
    refreshTick: number;
}

export function blankTabState(index: string): ElasticsearchTabState {
    return {
        index,
        mode: "lucene",
        queryString: "",
        dslText: '{\n  "query": {\n    "match_all": {}\n  }\n}',
        size: 25,
        from: 0,
        refreshTick: 0,
    };
}

function blankConfig(): ElasticsearchConfig {
    return { baseUrl: "", authMode: "none" };
}

function validate(config: ElasticsearchConfig): string | null {
    const url = config.baseUrl.trim();
    if (!url) return "validation.esUrlRequired";
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
            return "validation.esUrlScheme";
    } catch {
        return "validation.esUrlInvalid";
    }
    if (config.authMode === "basic" && !config.username?.trim()) return "validation.esUsernameRequired";
    if (config.authMode === "apiKey" && !config.apiKey?.trim()) return "validation.esApiKeyRequired";
    if (config.authMode === "bearer" && !config.bearerToken?.trim()) return "validation.esBearerRequired";
    return null;
}

/** Cheap authed cluster-info call: surfaces a bad URL, wrong creds, or an
 * unreachable/self-signed-TLS host before anything is saved. */
async function testConnection(config: ElasticsearchConfig): Promise<void> {
    try {
        await pingCluster(config);
    } catch (err) {
        throw new Error(sanitizeElasticsearchError(err instanceof Error ? err.message : String(err)));
    }
}

/* ------------------------------------------------------------------ form */

const AUTH_MODES: ElasticsearchAuthMode[] = ["none", "basic", "apiKey", "bearer"];

function ElasticsearchConnectionForm({
    initial,
    saving,
    error,
    onTest,
    testState,
    onSubmit,
    onCancel,
}: ConnectionFormProps<ElasticsearchConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const te = useTranslations("DataExplorer.elasticsearch");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);
    const [baseUrl, setBaseUrl] = useState(initial.config.baseUrl);
    const [authMode, setAuthMode] = useState<ElasticsearchAuthMode>(initial.config.authMode);
    const [username, setUsername] = useState(initial.config.username ?? "");
    const [password, setPassword] = useState(initial.config.password ?? "");
    const [apiKey, setApiKey] = useState(initial.config.apiKey ?? "");
    const [bearerToken, setBearerToken] = useState(initial.config.bearerToken ?? "");

    function currentConfig(): ElasticsearchConfig {
        return {
            baseUrl: baseUrl.trim(),
            authMode,
            username: authMode === "basic" ? username : undefined,
            password: authMode === "basic" ? password : undefined,
            apiKey: authMode === "apiKey" ? apiKey : undefined,
            bearerToken: authMode === "bearer" ? bearerToken : undefined,
        };
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        onSubmit({ name, folder, color, readOnly, config: currentConfig() });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="es-name">{t("name")}</Label>
                <Input
                    id="es-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="es-folder">{t("folder")}</Label>
                <Input
                    id="es-folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t("folderPlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="es-url">{te("clusterUrl")}</Label>
                <Input
                    id="es-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={te("clusterUrlPlaceholder")}
                    disabled={saving}
                    className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{te("clusterUrlHint")}</p>
            </div>

            <div className="space-y-2">
                <Label>{te("auth")}</Label>
                <Select
                    value={authMode}
                    onValueChange={(v) => setAuthMode(v as ElasticsearchAuthMode)}
                    disabled={saving}
                >
                    <SelectTrigger className="text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {AUTH_MODES.map((m) => (
                            <SelectItem key={m} value={m} className="text-sm">
                                {te(`authMode.${m}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {authMode === "basic" && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label htmlFor="es-user" className="text-xs">
                            {te("username")}
                        </Label>
                        <Input
                            id="es-user"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={saving}
                            className="h-8 font-mono text-xs"
                            placeholder="elastic"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="es-pass" className="text-xs">
                            {te("password")}
                        </Label>
                        <Input
                            id="es-pass"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={saving}
                            className="h-8 font-mono text-xs"
                        />
                    </div>
                </div>
            )}

            {authMode === "apiKey" && (
                <div className="space-y-1">
                    <Label htmlFor="es-apikey" className="text-xs">
                        {te("apiKey")}
                    </Label>
                    <Input
                        id="es-apikey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={saving}
                        className="h-8 font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">{te("apiKeyHint")}</p>
                </div>
            )}

            {authMode === "bearer" && (
                <div className="space-y-1">
                    <Label htmlFor="es-bearer" className="text-xs">
                        {te("bearerToken")}
                    </Label>
                    <Input
                        id="es-bearer"
                        type="password"
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        disabled={saving}
                        className="h-8 font-mono text-xs"
                    />
                </div>
            )}

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

interface IndexRowProps {
    info: IndexInfo;
    onOpen: (index: string) => void;
}

const IndexRow = React.memo(function IndexRow({ info, onOpen }: IndexRowProps) {
    return (
        <button
            type="button"
            onClick={() => onOpen(info.index)}
            className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/60"
        >
            <IconStack2 className="size-3.5 shrink-0 text-teal-500" />
            <span className="min-w-0 flex-1 truncate">{info.index}</span>
            {info.docsCount && (
                <span className="shrink-0 text-[10px] text-muted-foreground">{info.docsCount}</span>
            )}
        </button>
    );
});

function ElasticsearchSidebarTree({
    connection,
    config,
    openTab,
    searchQuery,
}: SidebarTreeProps<ElasticsearchConfig, ElasticsearchTabState>) {
    const t = useTranslations("DataExplorer.elasticsearch");
    const [indices, setIndices] = useState<IndexInfo[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const list = await listIndices(config);
                if (!cancelled) setIndices(list);
            } catch (err) {
                if (!cancelled)
                    setError(
                        sanitizeElasticsearchError(err instanceof Error ? err.message : String(err)),
                    );
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
        // Refetch when the connection's config changes (e.g. edited URL/creds).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config.baseUrl, config.authMode, config.username, config.password, config.apiKey, config.bearerToken]);

    const openIndex = React.useCallback(
        (index: string) => {
            openTab({
                key: index,
                title: index,
                subtitle: connection.name,
                state: blankTabState(index),
            });
        },
        [openTab, connection.name],
    );

    if (error) {
        return <p className="px-2 py-1 text-xs text-destructive">{error}</p>;
    }
    if (indices === null) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">…</p>;
    }
    if (indices.length === 0) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">{t("noIndices")}</p>;
    }

    // Same search rule as the other trees: a connection whose own name matches
    // shows everything; otherwise rows filter on the index name.
    const q = searchQuery.trim().toLowerCase();
    const showAll = !q || connection.name.toLowerCase().includes(q);
    const rows = indices.filter((info) => showAll || info.index.toLowerCase().includes(q));

    if (rows.length === 0) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">{t("noMatches")}</p>;
    }

    return (
        <div className="space-y-0.5 py-0.5">
            {rows.map((info) => (
                <IndexRow key={info.index} info={info} onOpen={openIndex} />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ pane */

function ElasticsearchPane(props: PaneProps<ElasticsearchConfig, ElasticsearchTabState>) {
    return <ElasticsearchSearchPane {...props} />;
}

export const elasticsearchAdapter: SourceAdapter<ElasticsearchConfig, ElasticsearchTabState> = {
    id: "elasticsearch",
    label: "Elasticsearch",
    icon: IconSearch,
    accent: "text-teal-500",
    blankConfig,
    validate,
    testConnection,
    ConnectionForm: ElasticsearchConnectionForm,
    SidebarTree: ElasticsearchSidebarTree,
    Pane: ElasticsearchPane,
};
