"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { IconDeviceFloppy, IconRefresh, IconTrash } from "@tabler/icons-react";

interface Props {
    redisUrl: string;
    db: number;
    keyName: string;
    onChanged: () => void;
}

export function JsonEditor({ redisUrl, db, keyName, onChanged }: Props) {
    const [path, setPath] = useState("$");
    const [value, setValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/json", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: keyName, action: "get", path }),
            });
            const body = await res.json() as { value?: string; error?: string };
            if (body.error) throw new Error(body.error);
            if (body.value == null) {
                setValue("");
            } else {
                try {
                    setValue(JSON.stringify(JSON.parse(body.value), null, 2));
                } catch {
                    setValue(body.value);
                }
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "JSON.GET failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db, keyName, path]);

    useEffect(() => { void load(); }, [load]);

    async function save() {
        let parsed: unknown;
        try {
            parsed = JSON.parse(value);
        } catch (e) {
            toast.error(`Invalid JSON: ${e instanceof Error ? e.message : ""}`);
            return;
        }
        setSaving(true);
        try {
            const res = await apiFetch("/api/redis-commander/json", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: keyName, action: "set", path, value: parsed }),
            });
            const body = await res.json() as { result?: string; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success("JSON.SET ok");
            onChanged();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "JSON.SET failed");
        } finally {
            setSaving(false);
        }
    }

    async function del() {
        try {
            const res = await apiFetch("/api/redis-commander/json", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: keyName, action: "del", path }),
            });
            const body = await res.json() as { deleted?: number; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`JSON.DEL: ${body.deleted ?? 0}`);
            onChanged();
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "JSON.DEL failed");
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
                <Label className="text-[10px] text-muted-foreground">Path</Label>
                <Input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="h-7 w-40 text-xs font-mono"
                    placeholder="$"
                />
                <Button size="icon" variant="ghost" className="size-7" onClick={load} disabled={loading} title="JSON.GET">
                    <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={del}
                    title="JSON.DEL"
                >
                    <IconTrash className="size-3.5" />
                </Button>
                <Button size="sm" className="h-7 text-xs gap-1 ml-auto" onClick={save} disabled={saving}>
                    <IconDeviceFloppy className="size-3.5" />
                    {saving ? "Saving…" : "JSON.SET"}
                </Button>
            </div>
            <div className="flex-1 min-h-0 p-3">
                <Textarea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-full font-mono text-xs resize-none"
                    placeholder='{"foo": "bar"}'
                />
            </div>
        </div>
    );
}
