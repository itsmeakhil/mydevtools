"use client";

import React, { useCallback, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    IconActivity,
    IconBrandRedux,
    IconBroadcast,
    IconChartBar,
    IconDatabase,
    IconEye,
    IconSearch,
    IconTerminal2,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { sanitizeError } from "@/lib/nosql-error-sanitizer";
import { CONNECTION_COLORS } from "@/components/data-explorer/connection-colors";
import { KeyBrowser } from "@/components/data-explorer/redis/key-browser";
import { ValueEditor } from "@/components/data-explorer/redis/value-editor";
import { CommandPanel } from "@/components/data-explorer/redis/command-panel";
import { ServerDashboard } from "@/components/data-explorer/redis/server-dashboard";
import { MetricsPane } from "@/components/data-explorer/redis/metrics-pane";
import { BulkActions } from "@/components/data-explorer/redis/bulk-actions";
import { PubSubPane } from "@/components/data-explorer/redis/pubsub-pane";
import { MonitorPane } from "@/components/data-explorer/redis/monitor-pane";
import { ScannerPane } from "@/components/data-explorer/redis/scanner-pane";
import { SearchWorkbench } from "@/components/data-explorer/redis/search-workbench";
import type { ConnectionFormProps, PaneProps, SidebarTreeProps, SourceAdapter } from "../types";

export interface RedisConfig {
    redisUrl: string;
}

export interface RedisTabState {
    db: number;
    selectedKey: string | null;
    /** Bumped to force the key browser to refetch. */
    refreshTick: number;
}

/** Ported verbatim from ../redis/connection-form.tsx. */
export function buildRedisUrl(opts: {
    host: string;
    port: string;
    username: string;
    password: string;
    db: string;
    tls: boolean;
}): string {
    const proto = opts.tls ? "rediss" : "redis";
    const auth =
        opts.username || opts.password
            ? `${encodeURIComponent(opts.username)}:${encodeURIComponent(opts.password)}@`
            : "";
    const host = opts.host || "localhost";
    const port = opts.port || "6379";
    const db = opts.db ? `/${opts.db}` : "";
    return `${proto}://${auth}${host}:${port}${db}`;
}

/**
 * Inverse of `buildRedisUrl`: splits a stored URL back into builder fields so
 * editing a saved connection and switching to the Builder tab does not rebuild
 * `redis://localhost:6379` over the real one. Returns `null` when the URL is
 * not a parseable redis(s) URL — the caller then keeps its defaults rather
 * than throwing. The password comes back for re-assembly only; the caller
 * never renders or logs it.
 */
export function parseRedisUrl(url: string): {
    host: string;
    port: string;
    username: string;
    password: string;
    db: string;
    tls: boolean;
} | null {
    try {
        const parsed = new URL(url.trim());
        const protocol = parsed.protocol.toLowerCase();
        if (protocol !== "redis:" && protocol !== "rediss:") return null;
        // `redis://` parses with an empty host under WHATWG's non-special
        // scheme rules; nothing usable to seed from.
        if (!parsed.hostname) return null;
        return {
            host: parsed.hostname,
            port: parsed.port || "6379",
            username: safeDecode(parsed.username),
            password: safeDecode(parsed.password),
            db: parsed.pathname.replace(/^\//, ""),
            tls: protocol === "rediss:",
        };
    } catch {
        return null;
    }
}

function blankConfig(): RedisConfig {
    return { redisUrl: "redis://localhost:6379" };
}

// `validate` returns an i18n KEY under the `DataExplorer` namespace, never
// English prose — the dialog resolves it with `t()`. Contract established in
// Task 8; add these keys to the `DataExplorer.validation` block in en.json.
function validate(config: RedisConfig): string | null {
    const value = config.redisUrl.trim();
    if (!value) return "validation.redisUrlRequired";
    if (!/^rediss?:\/\//i.test(value)) return "validation.redisUrlScheme";
    return null;
}

function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Strip credentials before any message reaches the UI. Fail-CLOSED: every
 * path runs the message through regex scrubbing first, so a message survives
 * sanitised even when `redisUrl` is too malformed for `new URL()` to parse —
 * `validate()` only checks the scheme, not full URL well-formedness, so that
 * case is reachable.
 */
export function sanitizeRedisError(message: string, redisUrl: string): string {
    // 1. Scrub any redis(s):// URL in the message wholesale — mirrors
    //    nosql-error-sanitizer's mongodb pattern — so the whole URL never
    //    survives regardless of what credentials it embeds.
    let out = message.replace(/rediss?:\/\/[^/\s]+(\/[^\s]*)*/gi, "redis://***SANITIZED***");
    // 2. Generic `user:password@` and email-style-username scrub shared with
    //    the Mongo adapter.
    out = sanitizeError(out);

    // 3. Best-effort extra layer: strip this connection's specific
    //    credentials in both their raw and percent-encoded forms, in case one
    //    leaked into the message outside URL shape (e.g. a driver echoing
    //    just the password). Additive only — steps 1-2 already sanitised
    //    `out` unconditionally, so a parse failure here changes nothing.
    try {
        const parsed = new URL(redisUrl);
        for (const encoded of [parsed.username, parsed.password]) {
            if (!encoded) continue;
            const decoded = safeDecode(encoded);
            out = out.split(encoded).join("***").split(decoded).join("***");
        }
    } catch {
        // redisUrl itself didn't parse — nothing more to strip; `out` is
        // already sanitised by steps 1-2.
    }

    return out;
}

async function testConnection(config: RedisConfig): Promise<void> {
    const redisUrl = config.redisUrl.trim();
    const res = await apiFetch("/api/redis-commander/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redisUrl, db: 0 }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
        // Real server errors pass through the sanitiser (they are user-facing
        // and untranslatable). With nothing reportable, throw an EMPTY message
        // — the dialog then renders `t("connectionDialog.testFailed")`.
        // Contract established in Task 8.
        throw new Error(data.error ? sanitizeRedisError(data.error, redisUrl) : "");
    }
}

/**
 * Controlled-input form: reports values up via `onSubmit`. Never persists,
 * never calls the connection service, never toasts — the connection dialog
 * owns validate → testConnection → persist and renders `error` inline.
 *
 * Two-mode layout ported from ../redis/connection-form.tsx: a raw URL
 * input, or a host/port/user/password/db/TLS builder that feeds `buildRedisUrl`.
 * Unlike that legacy form, this one never calls the connection service or a
 * store directly — it only ever reports `{ redisUrl }` up through `onSubmit`.
 */
function RedisConnectionForm({
    initial,
    saving,
    error,
    onTest,
    testState,
    onSubmit,
    onCancel,
}: ConnectionFormProps<RedisConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const tr = useTranslations("DataExplorer.redis");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);

    const [mode, setMode] = useState<"url" | "builder">("url");
    const [redisUrl, setRedisUrl] = useState(initial.config.redisUrl);

    // Builder fields — only assembled into a URL on submit/preview, never
    // stored independently, so the URL input stays the single source of truth.
    // Seeded from the connection being edited (parsed once): without this,
    // opening the Builder tab on a saved connection and saving would submit
    // the defaults and silently destroy the stored host and credentials.
    const [seed] = useState(() => parseRedisUrl(initial.config.redisUrl));
    const [host, setHost] = useState(seed?.host ?? "localhost");
    const [port, setPort] = useState(seed?.port ?? "6379");
    const [username, setUsername] = useState(seed?.username ?? "");
    // The stored password is deliberately NOT seeded into the input — it is
    // never rendered. It is re-attached on submit unless the user types a
    // replacement, so a builder save keeps the existing credential.
    const [password, setPassword] = useState("");
    const [passwordEdited, setPasswordEdited] = useState(false);
    const [dbIdx, setDbIdx] = useState(seed?.db ?? "");
    const [useTls, setUseTls] = useState(seed?.tls ?? false);

    function currentUrl(): string {
        if (mode !== "builder") return redisUrl.trim();
        return buildRedisUrl({
            host,
            port,
            username,
            password: passwordEdited ? password : seed?.password ?? "",
            db: dbIdx,
            tls: useTls,
        });
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        // `readOnly` is passed through untouched, never edited here — see the
        // note where the switch used to be.
        onSubmit({ name, folder, color, readOnly: initial.readOnly, config: { redisUrl: currentUrl() } });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="redis-name">{t("name")}</Label>
                <Input
                    id="redis-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("namePlaceholder")}
                    disabled={saving}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="redis-folder">{t("folder")}</Label>
                <Input
                    id="redis-folder"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder={t("folderPlaceholder")}
                    disabled={saving}
                />
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "builder")}>
                <TabsList className="h-8 w-full">
                    <TabsTrigger value="url" className="flex-1 text-xs" disabled={saving}>
                        {tr("urlMode")}
                    </TabsTrigger>
                    <TabsTrigger value="builder" className="flex-1 text-xs" disabled={saving}>
                        {tr("builderMode")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="mt-3 space-y-2">
                    <Label htmlFor="redis-url">{tr("url")}</Label>
                    <Input
                        id="redis-url"
                        value={redisUrl}
                        onChange={(e) => setRedisUrl(e.target.value)}
                        placeholder={tr("urlPlaceholder")}
                        disabled={saving}
                        className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">{tr("urlHint")}</p>
                </TabsContent>

                <TabsContent value="builder" className="mt-3 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">{tr("host")}</Label>
                            <Input
                                value={host}
                                onChange={(e) => setHost(e.target.value)}
                                disabled={saving}
                                className="h-8 font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{tr("port")}</Label>
                            <Input
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                                disabled={saving}
                                className="h-8 font-mono text-xs"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">{tr("username")}</Label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={tr("usernamePlaceholder")}
                                disabled={saving}
                                className="h-8 font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{tr("password")}</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordEdited(true);
                                }}
                                // Language-neutral marker that a stored
                                // password is kept unless replaced. The
                                // password itself is never put in the DOM.
                                placeholder={seed?.password ? "••••••••" : undefined}
                                disabled={saving}
                                className="h-8 font-mono text-xs"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">{tr("dbIndex")}</Label>
                            <Input
                                value={dbIdx}
                                onChange={(e) => setDbIdx(e.target.value)}
                                placeholder={tr("dbIndexPlaceholder")}
                                disabled={saving}
                                className="h-8 font-mono text-xs"
                            />
                        </div>
                        <label className="flex cursor-pointer items-end gap-2 pb-1.5 text-xs">
                            <input
                                type="checkbox"
                                checked={useTls}
                                onChange={(e) => setUseTls(e.target.checked)}
                                disabled={saving}
                            />
                            {tr("tls")}
                        </label>
                    </div>
                </TabsContent>
            </Tabs>

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

            {/* No read-only switch for Redis. `connectionDialog.readOnlyHint`
                promises "blocks every write operation", and this adapter cannot
                keep that promise: ValueEditor (save/delete/rename/copy) and
                CommandPanel (arbitrary DEL / FLUSHALL) live in
                components/data-explorer/redis/ and accept no `readOnly` prop, so the
                flag would only hide Flush and BulkActions. The field itself stays
                in the data model — an already-read-only connection keeps that
                partial gating in the pane. Restore this switch when
                value-editor.tsx, command-panel.tsx and bulk-actions.tsx all
                accept a `readOnly` prop. */}

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
                    onClick={() => onTest({ redisUrl: currentUrl() })}
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

/** Redis has a fixed 16 logical databases; there is nothing to fetch. */
const DB_INDEXES = Array.from({ length: 16 }, (_, i) => i);

interface DbRowProps {
    index: number;
    label: string;
    /** Takes the index so the parent can keep one `useCallback`-stable handler —
     *  an inline arrow per row would defeat React.memo. */
    onOpen: (index: number) => void;
}

const DbRow = React.memo(function DbRow({ index, label, onOpen }: DbRowProps) {
    return (
        <button
            type="button"
            onClick={() => onOpen(index)}
            className="flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-muted/60"
        >
            <IconDatabase className="size-3.5 shrink-0 text-red-500" />
            <span className="min-w-0 flex-1 truncate">{label}</span>
        </button>
    );
});

function RedisSidebarTree({
    connection,
    openTab,
    searchQuery,
}: SidebarTreeProps<RedisConfig, RedisTabState>) {
    const t = useTranslations("DataExplorer");

    const openDb = useCallback(
        (index: number) => {
            openTab({
                key: `db${index}`,
                title: `db ${index}`,
                subtitle: connection.name,
                state: { db: index, selectedKey: null, refreshTick: 0 },
            });
        },
        [openTab, connection.name]
    );

    // Search comes from the shell's one box (never a second input here). A
    // connection whose own name matches shows all 16; otherwise the rows filter
    // on their own labels — same rule as the Mongo tree.
    const q = searchQuery.trim().toLowerCase();
    const showAll = !q || connection.name.toLowerCase().includes(q);
    const rows = DB_INDEXES.map((index) => ({ index, label: t("redis.dbLabel", { index }) })).filter(
        (row) => showAll || row.label.toLowerCase().includes(q)
    );

    if (rows.length === 0) {
        return <p className="px-2 py-1 text-xs text-muted-foreground">{t("redis.noMatches")}</p>;
    }

    return (
        <div className="space-y-0.5 py-0.5">
            {rows.map((row) => (
                <DbRow key={row.index} index={row.index} label={row.label} onOpen={openDb} />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ pane */

const INNER_TAB =
    "h-8 rounded-none border-r px-3 text-xs data-[state=active]:bg-accent data-[state=active]:shadow-none";

/**
 * Key-browsing workbench.
 *
 * Every imported pane takes `{ redisUrl, db }` and fetches for itself, so this
 * is composition: the only shared state is the selected key (browser →
 * editor), the db index, and a refresh tick that remounts `KeyBrowser`.
 *
 * `ValueEditor`'s `onKeyDeleted` / `onKeyRenamed` fire *after* the mutation has
 * already succeeded inside the editor (value-editor.tsx:172,198) — they are
 * notifications, not actions, so reacting to them is safe.
 *
 * Known and inherited: the imported panes carry hardcoded English. Only the
 * chrome written here is translated.
 */
function RedisPane({ connection, config, tab, state, setState }: PaneProps<RedisConfig, RedisTabState>) {
    const t = useTranslations("DataExplorer");
    const readOnly = !!connection.readOnly;
    // Reported up by KeyBrowser and rendered back into it; pane-local because
    // nothing else needs it and it must not survive a tab restore.
    const [dbSize, setDbSize] = useState(0);
    const [flushOpen, setFlushOpen] = useState(false);
    const [flushPattern, setFlushPattern] = useState("");
    const [flushing, setFlushing] = useState(false);

    const bumpRefresh = () => setState((prev) => ({ ...prev, refreshTick: prev.refreshTick + 1 }));
    const selectKey = (key: string) => setState((prev) => ({ ...prev, selectedKey: key }));

    /** Errors are sanitised —
     *  a Redis URL can carry a username and password. */
    async function handleFlush() {
        setFlushing(true);
        try {
            const res = await apiFetch("/api/redis-commander/flush", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    redisUrl: config.redisUrl,
                    db: state.db,
                    pattern: flushPattern.trim() || undefined,
                }),
            });
            const data = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
            // The legacy page only checked `data.error`; a non-OK response with
            // no error body silently read as success. `!res.ok` closes that.
            if (!res.ok || data.error) throw new Error(data.error ?? "");
            // `deleted === -1` is the FLUSHDB (no pattern) reply — a count is
            // meaningless there.
            toast.success(
                data.deleted === -1
                    ? t("redis.flushedAll")
                    : t("redis.flushedKeys", { count: data.deleted ?? 0 })
            );
            setState((prev) => ({
                ...prev,
                selectedKey: null,
                refreshTick: prev.refreshTick + 1,
            }));
        } catch (err) {
            const raw = err instanceof Error ? err.message : "";
            toast.error(raw ? sanitizeRedisError(raw, config.redisUrl) : t("redis.flushFailed"));
        } finally {
            setFlushing(false);
            setFlushOpen(false);
            setFlushPattern("");
        }
    }

    return (
        <div className="flex h-full flex-col">
            {/* No db selector here: the tab's id and title encode the db and are
                shell-owned, so switching db in-pane would leave the tab strip
                lying about which database it shows (and let a second tab open on
                the same one). The sidebar tree is the only way to switch — it
                opens or focuses the correctly-identified tab. */}
            {!readOnly && (
                <div className="flex shrink-0 items-center justify-end gap-2 border-b px-2 py-1">
                    <BulkActions redisUrl={config.redisUrl} db={state.db} onChanged={bumpRefresh} />
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setFlushOpen(true)}
                    >
                        <IconTrash className="size-3.5" />
                        {t("redis.flush")}
                    </Button>
                </div>
            )}

            <div className="min-h-0 flex-1">
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    <ResizablePanel defaultSize={22} minSize={16} maxSize={40}>
                        <KeyBrowser
                            // Remount on db switch or refresh tick — the browser
                            // holds its own paged key list and pattern state.
                            key={`${tab.id}-${state.db}-${state.refreshTick}`}
                            redisUrl={config.redisUrl}
                            db={state.db}
                            selectedKey={state.selectedKey}
                            onSelectKey={selectKey}
                            dbSize={dbSize}
                            onDbSizeChange={setDbSize}
                        />
                    </ResizablePanel>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={78} minSize={40}>
                        <Tabs defaultValue="editor" className="flex h-full flex-col">
                            <TabsList className="h-8 w-full shrink-0 justify-start gap-0 rounded-none border-b bg-transparent p-0">
                                <TabsTrigger value="editor" className={INNER_TAB}>
                                    <IconDatabase className="mr-1.5 size-3.5" />
                                    {t("redis.tabKeyEditor")}
                                </TabsTrigger>
                                <TabsTrigger value="console" className={INNER_TAB}>
                                    <IconTerminal2 className="mr-1.5 size-3.5" />
                                    {t("redis.tabConsole")}
                                </TabsTrigger>
                                <TabsTrigger value="dashboard" className={INNER_TAB}>
                                    <IconActivity className="mr-1.5 size-3.5" />
                                    {t("redis.tabServer")}
                                </TabsTrigger>
                                <TabsTrigger value="pubsub" className={INNER_TAB}>
                                    <IconBroadcast className="mr-1.5 size-3.5" />
                                    {t("redis.tabPubSub")}
                                </TabsTrigger>
                                <TabsTrigger value="monitor" className={INNER_TAB}>
                                    <IconEye className="mr-1.5 size-3.5" />
                                    {t("redis.tabMonitor")}
                                </TabsTrigger>
                                <TabsTrigger value="scanner" className={INNER_TAB}>
                                    <IconChartBar className="mr-1.5 size-3.5" />
                                    {t("redis.tabScanner")}
                                </TabsTrigger>
                                <TabsTrigger value="search" className={INNER_TAB}>
                                    <IconSearch className="mr-1.5 size-3.5" />
                                    {t("redis.tabSearch")}
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="editor" className="mt-0 min-h-0 flex-1">
                                <ValueEditor
                                    redisUrl={config.redisUrl}
                                    db={state.db}
                                    selectedKey={state.selectedKey}
                                    onKeyDeleted={(k) =>
                                        setState((prev) => ({
                                            ...prev,
                                            selectedKey: prev.selectedKey === k ? null : prev.selectedKey,
                                            refreshTick: prev.refreshTick + 1,
                                        }))
                                    }
                                    onKeyRenamed={(oldKey, newKey) =>
                                        setState((prev) =>
                                            prev.selectedKey === oldKey
                                                ? { ...prev, selectedKey: newKey }
                                                : prev
                                        )
                                    }
                                    onRefreshKeys={bumpRefresh}
                                />
                            </TabsContent>
                            <TabsContent value="console" className="mt-0 min-h-0 flex-1">
                                <CommandPanel
                                    redisUrl={config.redisUrl}
                                    db={state.db}
                                    connectionId={connection.id}
                                />
                            </TabsContent>
                            <TabsContent value="dashboard" className="mt-0 min-h-0 flex-1 overflow-auto">
                                <div className="border-b p-3">
                                    <MetricsPane redisUrl={config.redisUrl} db={state.db} />
                                </div>
                                <ServerDashboard redisUrl={config.redisUrl} db={state.db} />
                            </TabsContent>
                            <TabsContent value="pubsub" className="mt-0 min-h-0 flex-1">
                                <PubSubPane redisUrl={config.redisUrl} db={state.db} />
                            </TabsContent>
                            <TabsContent value="monitor" className="mt-0 min-h-0 flex-1">
                                <MonitorPane redisUrl={config.redisUrl} db={state.db} />
                            </TabsContent>
                            <TabsContent value="scanner" className="mt-0 min-h-0 flex-1">
                                <ScannerPane
                                    redisUrl={config.redisUrl}
                                    db={state.db}
                                    onSelectKey={selectKey}
                                />
                            </TabsContent>
                            <TabsContent value="search" className="mt-0 min-h-0 flex-1">
                                <SearchWorkbench
                                    redisUrl={config.redisUrl}
                                    db={state.db}
                                    onSelectKey={selectKey}
                                />
                            </TabsContent>
                        </Tabs>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            <AlertDialog open={flushOpen} onOpenChange={(open) => { if (!flushing) setFlushOpen(open); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("redis.flushTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("redis.flushDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1.5 py-2">
                        <Label>{t("redis.flushPatternLabel")}</Label>
                        <Input
                            placeholder={t("redis.flushPatternPlaceholder")}
                            value={flushPattern}
                            onChange={(e) => setFlushPattern(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={flushing}>
                            {t("connectionDialog.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => {
                                e.preventDefault();
                                void handleFlush();
                            }}
                            disabled={flushing}
                        >
                            {flushing ? t("redis.flushing") : t("redis.flush")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export const redisAdapter: SourceAdapter<RedisConfig, RedisTabState> = {
    id: "redis",
    label: "Redis",
    icon: IconBrandRedux,
    accent: "text-red-500",
    blankConfig,
    validate,
    testConnection,
    ConnectionForm: RedisConnectionForm,
    SidebarTree: RedisSidebarTree,
    Pane: RedisPane,
};
