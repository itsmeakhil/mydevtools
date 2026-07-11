"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IconRefresh, IconTrash } from "@tabler/icons-react";

type Props = { redisUrl: string; db: number };

interface InfoData {
    sections: Record<string, Record<string, string>>;
    dbsize: number;
}

interface SlowLogEntry {
    id: number;
    ts: number;
    durationMicros: number;
    command: string[];
    clientAddr?: string;
    clientName?: string;
}

interface ClientRow {
    id: string;
    addr: string;
    name: string;
    age: string;
    idle: string;
    db: string;
    cmd: string;
    user: string;
}

const KEY_INFO_FIELDS: { section: string; key: string; label: string }[] = [
    { section: "server", key: "redis_version", label: "Version" },
    { section: "server", key: "uptime_in_seconds", label: "Uptime (s)" },
    { section: "server", key: "os", label: "OS" },
    { section: "clients", key: "connected_clients", label: "Connected clients" },
    { section: "memory", key: "used_memory_human", label: "Memory used" },
    { section: "memory", key: "used_memory_peak_human", label: "Memory peak" },
    { section: "memory", key: "maxmemory_human", label: "Max memory" },
    { section: "memory", key: "mem_fragmentation_ratio", label: "Frag ratio" },
    { section: "stats", key: "instantaneous_ops_per_sec", label: "Ops/sec" },
    { section: "stats", key: "total_connections_received", label: "Total conns" },
    { section: "stats", key: "total_commands_processed", label: "Total commands" },
    { section: "stats", key: "keyspace_hits", label: "Keyspace hits" },
    { section: "stats", key: "keyspace_misses", label: "Keyspace misses" },
    { section: "stats", key: "evicted_keys", label: "Evicted keys" },
    { section: "stats", key: "expired_keys", label: "Expired keys" },
    { section: "replication", key: "role", label: "Role" },
    { section: "replication", key: "connected_slaves", label: "Connected replicas" },
    { section: "persistence", key: "rdb_last_save_time", label: "Last save (epoch)" },
    { section: "cpu", key: "used_cpu_sys", label: "CPU sys" },
    { section: "cpu", key: "used_cpu_user", label: "CPU user" },
];

export function InfoPane({ redisUrl, db }: Props) {
    const [data, setData] = useState<InfoData | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/info", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db }),
            });
            const body = await res.json() as InfoData & { error?: string };
            if (body.error) throw new Error(body.error);
            setData(body);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "INFO failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, [autoRefresh, load]);

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2 shrink-0">
                <div className="text-xs text-muted-foreground">
                    {data ? `${data.dbsize.toLocaleString()} keys in DB ${db}` : "—"}
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh 5s
                    </label>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
                        <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                        Refresh
                    </Button>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {data && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {KEY_INFO_FIELDS.map(({ section, key, label }) => {
                                    const val = data.sections[section]?.[key];
                                    if (val === undefined) return null;
                                    return (
                                        <div key={`${section}-${key}`} className="rounded border bg-muted/20 px-2 py-1.5">
                                            <div className="text-[10px] text-muted-foreground">{label}</div>
                                            <div className="text-xs font-mono truncate">{val}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    All sections
                                </summary>
                                <div className="mt-2 space-y-3">
                                    {Object.entries(data.sections).map(([sec, fields]) => (
                                        <div key={sec}>
                                            <div className="text-[11px] font-semibold uppercase text-muted-foreground border-b pb-0.5 mb-1">
                                                {sec}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 font-mono text-[11px]">
                                                {Object.entries(fields).map(([k, v]) => (
                                                    <div key={k} className="flex gap-2">
                                                        <span className="text-muted-foreground shrink-0">{k}:</span>
                                                        <span className="truncate">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </>
                    )}
                    {!data && !loading && <div className="text-xs text-muted-foreground">No data</div>}
                </div>
            </ScrollArea>
        </div>
    );
}

export function SlowLogPane({ redisUrl, db }: Props) {
    const [entries, setEntries] = useState<SlowLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [count, setCount] = useState<number>(50);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/slowlog", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "get", count }),
            });
            const body = await res.json() as { entries?: SlowLogEntry[]; error?: string };
            if (body.error) throw new Error(body.error);
            setEntries(body.entries ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "SLOWLOG GET failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db, count]);

    useEffect(() => { void load(); }, [load]);

    async function reset() {
        try {
            const res = await apiFetch("/api/redis-commander/slowlog", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "reset" }),
            });
            const body = await res.json() as { error?: string };
            if (body.error) throw new Error(body.error);
            toast.success("Slow log reset");
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Reset failed");
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2 shrink-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entries.length} entries</span>
                    <label className="flex items-center gap-1">
                        Show
                        <select
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value, 10))}
                            className="h-6 rounded border bg-background px-1 text-[10px] font-mono"
                        >
                            {[10, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
                        <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                        Refresh
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/40" onClick={reset}>
                        <IconTrash className="size-3.5" /> Reset
                    </Button>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {entries.length === 0 && !loading && (
                        <div className="text-center text-xs text-muted-foreground p-6">No slow entries</div>
                    )}
                    <table className="w-full text-xs">
                        <thead className="text-[10px] uppercase text-muted-foreground">
                            <tr className="border-b">
                                <th className="text-left py-1 px-2">ID</th>
                                <th className="text-left py-1 px-2">Time</th>
                                <th className="text-right py-1 px-2">Duration (µs)</th>
                                <th className="text-left py-1 px-2">Client</th>
                                <th className="text-left py-1 px-2">Command</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((e) => (
                                <tr key={e.id} className="border-b last:border-b-0 hover:bg-accent/50">
                                    <td className="py-1 px-2 font-mono">{e.id}</td>
                                    <td className="py-1 px-2 font-mono text-muted-foreground">
                                        {new Date(e.ts * 1000).toLocaleString()}
                                    </td>
                                    <td className="py-1 px-2 font-mono text-right">{e.durationMicros.toLocaleString()}</td>
                                    <td className="py-1 px-2 font-mono text-muted-foreground truncate max-w-[120px]">
                                        {e.clientAddr ?? ""}
                                    </td>
                                    <td className="py-1 px-2 font-mono truncate max-w-[260px]">
                                        {e.command.join(" ")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ScrollArea>
        </div>
    );
}

export function ClientsPane({ redisUrl, db }: Props) {
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/clients", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "list" }),
            });
            const body = await res.json() as { clients?: ClientRow[]; error?: string };
            if (body.error) throw new Error(body.error);
            setClients(body.clients ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "CLIENT LIST failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db]);

    useEffect(() => { void load(); }, [load]);

    async function kill(clientId: string) {
        try {
            const res = await apiFetch("/api/redis-commander/clients", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "kill", clientId }),
            });
            const body = await res.json() as { killed?: number; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`Killed ${body.killed ?? 0} client(s)`);
            await load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Kill failed");
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2 shrink-0">
                <div className="text-xs text-muted-foreground">{clients.length} connections</div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={load} disabled={loading}>
                    <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                    Refresh
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {clients.length === 0 && !loading && (
                        <div className="text-center text-xs text-muted-foreground p-6">No clients</div>
                    )}
                    <table className="w-full text-xs">
                        <thead className="text-[10px] uppercase text-muted-foreground">
                            <tr className="border-b">
                                <th className="text-left py-1 px-2">ID</th>
                                <th className="text-left py-1 px-2">Addr</th>
                                <th className="text-left py-1 px-2">Name</th>
                                <th className="text-left py-1 px-2">User</th>
                                <th className="text-right py-1 px-2">Age</th>
                                <th className="text-right py-1 px-2">Idle</th>
                                <th className="text-left py-1 px-2">DB</th>
                                <th className="text-left py-1 px-2">Cmd</th>
                                <th className="text-right py-1 px-2">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map((c) => (
                                <tr key={c.id} className="border-b last:border-b-0 hover:bg-accent/50">
                                    <td className="py-1 px-2 font-mono">{c.id}</td>
                                    <td className="py-1 px-2 font-mono truncate max-w-[140px]">{c.addr}</td>
                                    <td className="py-1 px-2 font-mono truncate max-w-[100px]">
                                        {c.name || <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="py-1 px-2 font-mono">{c.user}</td>
                                    <td className="py-1 px-2 font-mono text-right">{c.age}</td>
                                    <td className="py-1 px-2 font-mono text-right">{c.idle}</td>
                                    <td className="py-1 px-2"><Badge variant="outline" className="text-[10px]">{c.db}</Badge></td>
                                    <td className="py-1 px-2 font-mono truncate max-w-[120px]">{c.cmd}</td>
                                    <td className="py-1 px-2 text-right">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-6 text-destructive hover:text-destructive"
                                            onClick={() => kill(c.id)}
                                            title={`KILL client ${c.id}`}
                                        >
                                            <IconTrash className="size-3" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ScrollArea>
        </div>
    );
}
