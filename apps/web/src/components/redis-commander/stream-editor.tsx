"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    IconRefresh,
    IconPlus,
    IconTrash,
} from "@tabler/icons-react";

interface Entry {
    id: string;
    fields: Record<string, string>;
}

interface Props {
    redisUrl: string;
    db: number;
    streamKey: string;
    onRefresh: () => void;
}

export function StreamEditor({ redisUrl, db, streamKey, onRefresh }: Props) {
    return (
        <Tabs defaultValue="entries" className="h-full flex flex-col">
            <TabsList className="h-7 rounded-none border-b w-full justify-start gap-0 p-0 bg-transparent shrink-0">
                <TabsTrigger value="entries" className="h-7 rounded-none border-r px-3 text-[11px] data-[state=active]:bg-accent data-[state=active]:shadow-none">
                    Entries
                </TabsTrigger>
                <TabsTrigger value="groups" className="h-7 rounded-none border-r px-3 text-[11px] data-[state=active]:bg-accent data-[state=active]:shadow-none">
                    Consumer groups
                </TabsTrigger>
            </TabsList>
            <TabsContent value="entries" className="flex-1 min-h-0 mt-0">
                <EntriesPane redisUrl={redisUrl} db={db} streamKey={streamKey} onRefresh={onRefresh} />
            </TabsContent>
            <TabsContent value="groups" className="flex-1 min-h-0 mt-0">
                <GroupsPane redisUrl={redisUrl} db={db} streamKey={streamKey} />
            </TabsContent>
        </Tabs>
    );
}

function EntriesPane({ redisUrl, db, streamKey, onRefresh }: Props) {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [start, setStart] = useState("-");
    const [end, setEnd] = useState("+");
    const [count, setCount] = useState(50);
    const [addOpen, setAddOpen] = useState(false);
    const [addFields, setAddFields] = useState<{ field: string; value: string }[]>([
        { field: "", value: "" },
    ]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/streams", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: streamKey, action: "range", start, end, count }),
            });
            const body = await res.json() as { entries?: Entry[]; error?: string };
            if (body.error) throw new Error(body.error);
            setEntries(body.entries ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "XRANGE failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db, streamKey, start, end, count]);

    useEffect(() => { void load(); }, [load]);

    async function addEntry() {
        const fields = Object.fromEntries(addFields.filter((f) => f.field.trim()).map((f) => [f.field, f.value]));
        if (Object.keys(fields).length === 0) {
            toast.error("At least one field required");
            return;
        }
        try {
            const res = await apiFetch("/api/redis-commander/streams", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: streamKey, action: "add", fields }),
            });
            const body = await res.json() as { id?: string; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`Added ${body.id}`);
            setAddOpen(false);
            setAddFields([{ field: "", value: "" }]);
            await load();
            onRefresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "XADD failed");
        }
    }

    async function deleteEntry(id: string) {
        try {
            const res = await apiFetch("/api/redis-commander/streams", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: streamKey, action: "del", ids: [id] }),
            });
            const body = await res.json() as { deleted?: number; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`Deleted ${body.deleted ?? 0}`);
            await load();
            onRefresh();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "XDEL failed");
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0 flex-wrap">
                <Label className="text-[10px] text-muted-foreground">Start</Label>
                <Input value={start} onChange={(e) => setStart(e.target.value)} className="h-7 w-20 text-xs font-mono" />
                <Label className="text-[10px] text-muted-foreground">End</Label>
                <Input value={end} onChange={(e) => setEnd(e.target.value)} className="h-7 w-20 text-xs font-mono" />
                <Label className="text-[10px] text-muted-foreground">Count</Label>
                <Input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10) || 50)}
                    className="h-7 w-16 text-xs font-mono"
                />
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
                    <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                </Button>
                <div className="ml-auto">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
                        <IconPlus className="size-3.5" /> XADD
                    </Button>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {entries.length === 0 && !loading && (
                        <div className="text-center text-xs text-muted-foreground p-6">No entries</div>
                    )}
                    {entries.map((e) => (
                        <div key={e.id} className="rounded border bg-muted/20 p-2 text-xs">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-[10px]">{e.id}</Badge>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-5 text-destructive hover:text-destructive"
                                    onClick={() => deleteEntry(e.id)}
                                    title="XDEL"
                                >
                                    <IconTrash className="size-3" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[11px]">
                                {Object.entries(e.fields).map(([k, v]) => (
                                    <div key={k} className="flex gap-2">
                                        <span className="text-muted-foreground shrink-0">{k}:</span>
                                        <span className="truncate">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>XADD — new entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-1">
                        <Label className="text-xs">Fields</Label>
                        {addFields.map((f, i) => (
                            <div key={i} className="flex gap-1">
                                <Input
                                    value={f.field}
                                    onChange={(e) => {
                                        const copy = [...addFields];
                                        copy[i] = { ...copy[i]!, field: e.target.value };
                                        setAddFields(copy);
                                    }}
                                    placeholder="field"
                                    className="h-7 text-xs font-mono w-40 shrink-0"
                                />
                                <Input
                                    value={f.value}
                                    onChange={(e) => {
                                        const copy = [...addFields];
                                        copy[i] = { ...copy[i]!, value: e.target.value };
                                        setAddFields(copy);
                                    }}
                                    placeholder="value"
                                    className="h-7 text-xs font-mono flex-1"
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 text-destructive shrink-0"
                                    onClick={() => setAddFields((p) => p.filter((_, j) => j !== i))}
                                >
                                    <IconTrash className="size-3" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px]"
                            onClick={() => setAddFields((p) => [...p, { field: "", value: "" }])}
                        >
                            + Field
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button onClick={addEntry}>XADD *</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function GroupsPane({ redisUrl, db, streamKey }: Pick<Props, "redisUrl" | "db" | "streamKey">) {
    const [groups, setGroups] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/streams", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: streamKey, action: "groups" }),
            });
            const body = await res.json() as { groups?: unknown[]; error?: string };
            if (body.error) throw new Error(body.error);
            setGroups(body.groups ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "XINFO GROUPS failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db, streamKey]);

    useEffect(() => { void load(); }, [load]);

    // ponytail: XINFO returns nested arrays — render as JSON tree for now; tabular view if usage grows
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-3 py-2 shrink-0">
                <div className="text-xs text-muted-foreground">{groups.length} group(s)</div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
                    <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                    Refresh
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-3">
                    {groups.length === 0 && !loading ? (
                        <div className="text-center text-xs text-muted-foreground p-6">No consumer groups</div>
                    ) : (
                        <pre className="text-[11px] font-mono whitespace-pre-wrap">
                            {JSON.stringify(groups, null, 2)}
                        </pre>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
