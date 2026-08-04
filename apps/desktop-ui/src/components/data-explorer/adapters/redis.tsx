"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { IconBrandRedux, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { sanitizeError } from "@/lib/nosql-error-sanitizer";
import { CONNECTION_COLORS } from "@/components/nosql-explorer/connection-form";
import type { ConnectionFormProps, SourceAdapter } from "../types";

export interface RedisConfig {
    redisUrl: string;
}

export interface RedisTabState {
    db: number;
    selectedKey: string | null;
    /** Bumped to force the key browser to refetch. */
    refreshTick: number;
}

/** Ported verbatim from redis-commander/connection-form.tsx:33-43. */
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
 * Two-mode layout ported from redis-commander/connection-form.tsx: a raw URL
 * input, or a host/port/user/password/db/TLS builder that feeds `buildRedisUrl`.
 * Unlike that legacy form, this one never calls the connection service or a
 * store directly — it only ever reports `{ redisUrl }` up through `onSubmit`.
 */
function RedisConnectionForm({ initial, saving, error, onSubmit, onCancel }: ConnectionFormProps<RedisConfig>) {
    const t = useTranslations("DataExplorer.connectionDialog");
    const tr = useTranslations("DataExplorer.redis");
    const [name, setName] = useState(initial.name);
    const [folder, setFolder] = useState(initial.folder ?? "");
    const [color, setColor] = useState<string | null>(initial.color ?? null);
    const [readOnly, setReadOnly] = useState(initial.readOnly ?? false);

    const [mode, setMode] = useState<"url" | "builder">("url");
    const [redisUrl, setRedisUrl] = useState(initial.config.redisUrl);

    // Builder fields — only assembled into a URL on submit/preview, never
    // stored independently, so the URL input stays the single source of truth.
    const [host, setHost] = useState("localhost");
    const [port, setPort] = useState("6379");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [dbIdx, setDbIdx] = useState("");
    const [useTls, setUseTls] = useState(false);

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const url =
            mode === "builder"
                ? buildRedisUrl({ host, port, username, password, db: dbIdx, tls: useTls })
                : redisUrl.trim();
        onSubmit({ name, folder, color, readOnly, config: { redisUrl: url } });
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
                                onChange={(e) => setPassword(e.target.value)}
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

export const redisAdapter: SourceAdapter<RedisConfig, RedisTabState> = {
    id: "redis",
    label: "Redis",
    icon: IconBrandRedux,
    accent: "text-red-500",
    blankConfig,
    validate,
    testConnection,
    ConnectionForm: RedisConnectionForm,
    // Filled in by Task 13.
    SidebarTree: () => null,
    // Filled in by Task 13.
    Pane: () => null,
};
