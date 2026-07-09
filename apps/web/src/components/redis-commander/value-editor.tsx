"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    IconDeviceFloppy,
    IconTrash,
    IconClock,
    IconRefresh,
    IconEdit,
    IconCopy,
} from "@tabler/icons-react";
import { RedisKeyDetail, ZSetMember } from "./types";
import { cn } from "@/lib/utils";
import { decode, DECODER_LABELS, type DecoderKind } from "./value-decoders";
import { StreamEditor } from "./stream-editor";
import { JsonEditor } from "./json-editor";
import { TimeSeriesViewer } from "./timeseries-viewer";
import { DecodedView } from "./decoded-view";
import { RenameOrCopyDialog } from "./rename-or-copy-dialog";

const TTL_PRESETS: { label: string; seconds: number }[] = [
    { label: "60s", seconds: 60 },
    { label: "1h", seconds: 3600 },
    { label: "1d", seconds: 86400 },
    { label: "1w", seconds: 604800 },
];
const DECODERS: DecoderKind[] = ["plain", "json", "hex", "base64"];

interface ValueEditorProps {
    redisUrl: string;
    db: number;
    selectedKey: string | null;
    onKeyDeleted: (key: string) => void;
    onKeyRenamed?: (oldKey: string, newKey: string) => void;
    onRefreshKeys: () => void;
}

export function ValueEditor({ redisUrl, db, selectedKey, onKeyDeleted, onKeyRenamed, onRefreshKeys }: ValueEditorProps) {
    const [detail, setDetail] = useState<RedisKeyDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [ttlInput, setTtlInput] = useState("");
    const [renameOpen, setRenameOpen] = useState(false);
    const [copyOpen, setCopyOpen] = useState(false);
    const [targetKey, setTargetKey] = useState("");
    const [overwrite, setOverwrite] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [decoder, setDecoder] = useState<DecoderKind>("plain");

    // String edit state
    const [stringVal, setStringVal] = useState("");
    // Hash edit state
    const [hashEntries, setHashEntries] = useState<{ field: string; value: string }[]>([]);
    // List/Set edit state
    const [listItems, setListItems] = useState<string[]>([]);
    // ZSet edit state
    const [zsetMembers, setZsetMembers] = useState<ZSetMember[]>([]);

    async function loadKey(key: string) {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/key", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key }),
            });
            const data = await res.json() as RedisKeyDetail & { error?: string };
            if (data.error) throw new Error(data.error);
            setDetail(data);
            setTtlInput(data.ttl > 0 ? String(data.ttl) : "");
            // Init edit state
            switch (data.type) {
                case "string":
                    setStringVal((data.value as string) ?? "");
                    break;
                case "hash":
                    setHashEntries(
                        Object.entries((data.value as Record<string, string>) ?? {}).map(([field, value]) => ({
                            field,
                            value,
                        }))
                    );
                    break;
                case "list":
                case "set":
                    setListItems((data.value as string[]) ?? []);
                    break;
                case "zset":
                    setZsetMembers((data.value as ZSetMember[]) ?? []);
                    break;
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load key");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (selectedKey) loadKey(selectedKey);
        else setDetail(null);
    }, [selectedKey, redisUrl, db]); // eslint-disable-line react-hooks/exhaustive-deps

    async function handleSave() {
        if (!detail) return;
        setSaving(true);
        try {
            let value: unknown;
            switch (detail.type) {
                case "string":
                    value = stringVal;
                    break;
                case "hash":
                    value = Object.fromEntries(hashEntries.map((e) => [e.field, e.value]));
                    break;
                case "list":
                case "set":
                    value = listItems;
                    break;
                case "zset":
                    value = zsetMembers;
                    break;
                default:
                    return;
            }
            const ttl = ttlInput ? parseInt(ttlInput) : -1;
            const res = await apiFetch("/api/redis-commander/key", {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: detail.key, type: detail.type, value, ttl }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.error) throw new Error(data.error);
            toast.success("Key saved");
            onRefreshKeys();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!detail) return;
        try {
            const res = await apiFetch("/api/redis-commander/key", {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: detail.key }),
            });
            const data = await res.json() as { deleted?: number; error?: string };
            if (data.error) throw new Error(data.error);
            toast.success("Key deleted");
            onKeyDeleted(detail.key);
            setDetail(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Delete failed");
        }
    }

    async function handleRename() {
        if (!detail) return;
        const newKey = targetKey.trim();
        if (!newKey || newKey === detail.key) return;
        setActionBusy(true);
        try {
            const res = await apiFetch("/api/redis-commander/key/rename", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: detail.key, newKey, overwrite }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.error) throw new Error(data.error);
            const oldKey = detail.key;
            toast.success(`Renamed to ${newKey}`);
            setRenameOpen(false);
            setTargetKey("");
            setOverwrite(false);
            onKeyRenamed?.(oldKey, newKey);
            onRefreshKeys();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Rename failed");
        } finally {
            setActionBusy(false);
        }
    }

    async function handleCopy() {
        if (!detail) return;
        const destination = targetKey.trim();
        if (!destination || destination === detail.key) return;
        setActionBusy(true);
        try {
            const res = await apiFetch("/api/redis-commander/key/copy", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: detail.key, destination, overwrite }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.error) throw new Error(data.error);
            toast.success(`Copied to ${destination}`);
            setCopyOpen(false);
            setTargetKey("");
            setOverwrite(false);
            onRefreshKeys();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Copy failed");
        } finally {
            setActionBusy(false);
        }
    }

    function openRename() {
        if (!detail) return;
        setTargetKey(detail.key);
        setOverwrite(false);
        setRenameOpen(true);
    }

    function openCopy() {
        if (!detail) return;
        setTargetKey(`${detail.key}:copy`);
        setOverwrite(false);
        setCopyOpen(true);
    }

    if (!selectedKey) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a key to inspect or edit
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading…
            </div>
        );
    }

    if (!detail) return null;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm font-semibold truncate">{detail.key}</span>
                    <Badge variant="outline" className="shrink-0 text-xs uppercase">
                        {detail.type}
                    </Badge>
                    {detail.ttl > 0 && (
                        <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                            <IconClock className="size-3" />
                            {detail.ttl}s
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => loadKey(detail.key)}
                        title="Refresh"
                    >
                        <IconRefresh className="size-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={openRename}
                        title="Rename key"
                    >
                        <IconEdit className="size-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={openCopy}
                        title="Duplicate key (COPY)"
                    >
                        <IconCopy className="size-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={handleDelete}
                        title="Delete key"
                    >
                        <IconTrash className="size-3.5" />
                    </Button>
                    {(detail.type as string) !== "stream" && (detail.type as string) !== "ReJSON-RL" && (detail.type as string) !== "TSDB-TYPE" && (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
                            <IconDeviceFloppy className="size-3.5" />
                            {saving ? "Saving…" : "Save"}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Label className="w-12 shrink-0 text-xs">TTL (s)</Label>
                    <Input
                        placeholder="-1 = no expiry"
                        value={ttlInput}
                        onChange={(e) => setTtlInput(e.target.value)}
                        className="h-7 w-32 text-xs font-mono"
                    />
                    <div className="flex items-center gap-1">
                        {TTL_PRESETS.map((p) => (
                            <Button
                                key={p.label}
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => setTtlInput(String(p.seconds))}
                                type="button"
                            >
                                {p.label}
                            </Button>
                        ))}
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => setTtlInput("-1")}
                            type="button"
                            title="PERSIST (remove TTL)"
                        >
                            persist
                        </Button>
                    </div>
                </div>

                {detail.type === "string" && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Value</Label>
                            <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-muted-foreground">View</span>
                                <select
                                    value={decoder}
                                    onChange={(e) => setDecoder(e.target.value as DecoderKind)}
                                    className="h-5 rounded border bg-background px-1 font-mono"
                                >
                                    {DECODERS.map((d) => (
                                        <option key={d} value={d}>{DECODER_LABELS[d]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {decoder === "plain" ? (
                            <Textarea
                                value={stringVal}
                                onChange={(e) => setStringVal(e.target.value)}
                                className="font-mono text-xs min-h-[200px] resize-y"
                            />
                        ) : (
                            <DecodedView raw={stringVal} kind={decoder} />
                        )}
                    </div>
                )}

                {(detail.type === "list" || detail.type === "set") && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">{detail.type === "list" ? "Items (ordered)" : "Members"}</Label>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => setListItems((p) => [...p, ""])}
                            >
                                + Add
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {listItems.map((item, i) => (
                                <div key={i} className="flex gap-1">
                                    <span className="flex items-center text-xs text-muted-foreground w-6 shrink-0">
                                        {i}
                                    </span>
                                    <Input
                                        value={item}
                                        onChange={(e) => {
                                            const copy = [...listItems];
                                            copy[i] = e.target.value;
                                            setListItems(copy);
                                        }}
                                        className="h-7 text-xs font-mono flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-destructive hover:text-destructive shrink-0"
                                        onClick={() => setListItems((p) => p.filter((_, j) => j !== i))}
                                    >
                                        <IconTrash className="size-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {detail.type === "zset" && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Members with Scores</Label>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => setZsetMembers((p) => [...p, { member: "", score: 0 }])}
                            >
                                + Add
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {zsetMembers.map((item, i) => (
                                <div key={i} className="flex gap-1">
                                    <Input
                                        value={item.member}
                                        onChange={(e) => {
                                            const copy = [...zsetMembers];
                                            copy[i] = { ...copy[i]!, member: e.target.value };
                                            setZsetMembers(copy);
                                        }}
                                        placeholder="member"
                                        className="h-7 text-xs font-mono flex-1"
                                    />
                                    <Input
                                        type="number"
                                        value={item.score}
                                        onChange={(e) => {
                                            const copy = [...zsetMembers];
                                            copy[i] = { ...copy[i]!, score: parseFloat(e.target.value) || 0 };
                                            setZsetMembers(copy);
                                        }}
                                        placeholder="score"
                                        className="h-7 text-xs font-mono w-24 shrink-0"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-destructive hover:text-destructive shrink-0"
                                        onClick={() => setZsetMembers((p) => p.filter((_, j) => j !== i))}
                                    >
                                        <IconTrash className="size-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Streams + RedisJSON render their own editors below the TTL row */}
                {(detail.type as string) === "stream" && (
                    <div className="h-[400px] -mx-4 -mb-4 border-t">
                        <StreamEditor
                            redisUrl={redisUrl}
                            db={db}
                            streamKey={detail.key}
                            onRefresh={onRefreshKeys}
                        />
                    </div>
                )}
                {(detail.type as string) === "ReJSON-RL" && (
                    <div className="h-[400px] -mx-4 -mb-4 border-t">
                        <JsonEditor
                            redisUrl={redisUrl}
                            db={db}
                            keyName={detail.key}
                            onChanged={onRefreshKeys}
                        />
                    </div>
                )}
                {(detail.type as string) === "TSDB-TYPE" && (
                    <div className="h-[480px] -mx-4 -mb-4 border-t">
                        <TimeSeriesViewer
                            redisUrl={redisUrl}
                            db={db}
                            keyName={detail.key}
                        />
                    </div>
                )}

                {detail.type === "hash" && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Fields</Label>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => setHashEntries((p) => [...p, { field: "", value: "" }])}
                            >
                                + Add Field
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {hashEntries.map((entry, i) => (
                                <div key={i} className="flex gap-1">
                                    <Input
                                        value={entry.field}
                                        onChange={(e) => {
                                            const copy = [...hashEntries];
                                            copy[i] = { ...copy[i]!, field: e.target.value };
                                            setHashEntries(copy);
                                        }}
                                        placeholder="field"
                                        className={cn("h-7 text-xs font-mono w-36 shrink-0")}
                                    />
                                    <Input
                                        value={entry.value}
                                        onChange={(e) => {
                                            const copy = [...hashEntries];
                                            copy[i] = { ...copy[i]!, value: e.target.value };
                                            setHashEntries(copy);
                                        }}
                                        placeholder="value"
                                        className="h-7 text-xs font-mono flex-1"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-destructive hover:text-destructive shrink-0"
                                        onClick={() => setHashEntries((p) => p.filter((_, j) => j !== i))}
                                    >
                                        <IconTrash className="size-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <RenameOrCopyDialog
                open={renameOpen}
                onOpenChange={setRenameOpen}
                title="Rename key"
                actionLabel="Rename"
                sourceKey={detail.key}
                targetKey={targetKey}
                onTargetKeyChange={setTargetKey}
                overwrite={overwrite}
                onOverwriteChange={setOverwrite}
                busy={actionBusy}
                onConfirm={handleRename}
            />
            <RenameOrCopyDialog
                open={copyOpen}
                onOpenChange={setCopyOpen}
                title="Duplicate key"
                actionLabel="Copy"
                sourceKey={detail.key}
                targetKey={targetKey}
                onTargetKeyChange={setTargetKey}
                overwrite={overwrite}
                onOverwriteChange={setOverwrite}
                busy={actionBusy}
                onConfirm={handleCopy}
            />
        </div>
    );
}
