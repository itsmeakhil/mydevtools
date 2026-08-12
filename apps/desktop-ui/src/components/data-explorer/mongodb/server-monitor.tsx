"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/desktop/api-fetch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/data-explorer/redis/sparkline";
import { IconRefresh, IconSkull, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mirrors data-explorer/redis/metrics-pane: inline SVG sparklines, hardcoded
// technical labels, best-effort polling. serverStatus opcounters are
// cumulative, so ops/sec is a delta over elapsed wall-clock.

const POLL_MS = 2000;
const MAX_POINTS = 30;

function push(arr: number[], v: number): number[] {
    const next = arr.concat(v);
    return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
}

interface ServerStatus {
    opcounters?: Record<string, number>;
    connections?: { current?: number; available?: number; active?: number };
    mem?: { resident?: number; virtual?: number };
    network?: { bytesIn?: number; bytesOut?: number };
    uptime?: number;
    version?: string;
    host?: string;
}

interface Op {
    opid?: unknown;
    op?: string;
    ns?: string;
    secs_running?: number;
    microsecs_running?: number;
    desc?: string;
    client?: string;
    active?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    command?: any;
}

export function ServerMonitor({
    connectionString,
    name,
    readOnly = false,
    open,
    onClose,
}: {
    connectionString: string;
    name: string;
    readOnly?: boolean;
    open: boolean;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"metrics" | "ops">("metrics");
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-4 py-3 border-b">
                    <DialogTitle className="text-sm font-medium flex items-center gap-2">
                        Server monitor
                        <span className="text-muted-foreground font-mono text-xs truncate">{name}</span>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex border-b bg-muted/30 text-xs shrink-0">
                    {(["metrics", "ops"] as const).map((tb) => (
                        <button
                            key={tb}
                            className={cn(
                                "px-4 py-2 font-medium transition-colors",
                                tab === tb ? "text-foreground border-b-2 border-primary bg-background" : "text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => setTab(tb)}
                        >
                            {tb === "metrics" ? "Live metrics" : "Operations"}
                        </button>
                    ))}
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-4">
                    {open && tab === "metrics" ? (
                        <MetricsTab connectionString={connectionString} active={open && tab === "metrics"} />
                    ) : open ? (
                        <OpsTab connectionString={connectionString} readOnly={readOnly} />
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function MetricsTab({ connectionString, active }: { connectionString: string; active: boolean }) {
    const [series, setSeries] = useState({ ops: [] as number[], conns: [] as number[], mem: [] as number[], net: [] as number[] });
    const [latest, setLatest] = useState<ServerStatus | null>(null);
    const [paused, setPaused] = useState(false);
    const prevOps = useRef<number | null>(null);
    const prevNet = useRef<number | null>(null);
    const prevT = useRef<number | null>(null);

    useEffect(() => {
        if (!active) return;
        let abort = false;
        async function tick() {
            try {
                const res = await apiFetch("/api/nosql/server-stats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ connectionString }),
                });
                const body = (await res.json()) as ServerStatus & { error?: string };
                if (abort || body.error) return;
                setLatest(body);
                const now = Date.now();
                const dt = prevT.current ? Math.max((now - prevT.current) / 1000, 0.001) : 1;
                const opsTotal = Object.values(body.opcounters ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
                const netTotal = (body.network?.bytesIn ?? 0) + (body.network?.bytesOut ?? 0);
                const opsPerSec = prevOps.current !== null ? Math.max((opsTotal - prevOps.current) / dt, 0) : 0;
                const netPerSec = prevNet.current !== null ? Math.max((netTotal - prevNet.current) / dt, 0) / 1024 : 0; // KB/s
                prevOps.current = opsTotal;
                prevNet.current = netTotal;
                prevT.current = now;
                setSeries((s) => ({
                    ops: push(s.ops, opsPerSec),
                    conns: push(s.conns, body.connections?.current ?? 0),
                    mem: push(s.mem, body.mem?.resident ?? 0),
                    net: push(s.net, netPerSec),
                }));
            } catch {
                // swallow — next tick retries
            }
        }
        void tick();
        if (paused) return () => { abort = true; };
        const id = setInterval(tick, POLL_MS);
        return () => { abort = true; clearInterval(id); };
    }, [connectionString, paused, active]);

    const last = (a: number[], d = 0) => (a.length ? a[a.length - 1]!.toFixed(d) : "—");
    const uptime = latest?.uptime ? formatUptime(latest.uptime) : "—";

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    Polling every {POLL_MS / 1000}s
                    {latest?.version && <span className="ml-2 font-mono">v{latest.version}</span>}
                    {latest?.uptime !== undefined && <span className="ml-2">up {uptime}</span>}
                </span>
                <button onClick={() => setPaused((p) => !p)} className="rounded border px-2 py-0.5 hover:bg-accent transition-colors">
                    {paused ? "Resume" : "Pause"}
                </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <MetricCard label="Ops/sec" value={last(series.ops)} points={series.ops} color="rgb(59 130 246)" />
                <MetricCard label="Connections" value={last(series.conns)} points={series.conns} color="rgb(34 197 94)" />
                <MetricCard label="Resident (MB)" value={last(series.mem)} points={series.mem} color="rgb(245 158 11)" />
                <MetricCard label="Network KB/s" value={last(series.net, 1)} points={series.net} color="rgb(168 85 247)" />
            </div>
        </div>
    );
}

function MetricCard({ label, value, points, color }: { label: string; value: string; points: number[]; color: string }) {
    return (
        <div className="rounded border bg-muted/20 px-3 py-2">
            <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground">{label}</div>
                <div className="text-sm font-mono font-semibold">{value}</div>
            </div>
            <div className="mt-1" style={{ color }}>
                <Sparkline points={points} />
            </div>
        </div>
    );
}

function OpsTab({ connectionString, readOnly }: { connectionString: string; readOnly: boolean }) {
    const [ops, setOps] = useState<Op[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [killing, setKilling] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/nosql/current-ops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString }),
            });
            const body = (await res.json()) as { inprog?: Op[]; error?: string };
            if (body.error) throw new Error(body.error);
            // Hide idle connections — only ops actually doing work.
            setOps((body.inprog ?? []).filter((o) => o.active !== false && o.op && o.op !== "none"));
        } catch (e: any) {
            toast.error(e.message || "Failed to load operations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [connectionString]);

    const kill = async (opid: unknown) => {
        const key = String(opid);
        setKilling(key);
        try {
            const res = await apiFetch("/api/nosql/kill-op", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString, opid }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error);
            toast.success("Operation killed");
            void load();
        } catch (e: any) {
            toast.error(e.message || "Failed to kill operation");
        } finally {
            setKilling(null);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{ops ? `${ops.length} active operation(s)` : ""}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={load} disabled={loading}>
                    <IconRefresh className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>
            {ops && ops.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10">No active operations</div>
            ) : (
                <div className="border rounded-md overflow-auto">
                    <table className="w-full text-xs">
                        <thead className="text-muted-foreground uppercase bg-muted sticky top-0">
                            <tr>
                                <th className="px-2 py-2 text-left font-medium">opid</th>
                                <th className="px-2 py-2 text-left font-medium">op</th>
                                <th className="px-2 py-2 text-left font-medium">ns</th>
                                <th className="px-2 py-2 text-right font-medium">secs</th>
                                {!readOnly && <th className="px-2 py-2 w-10" />}
                            </tr>
                        </thead>
                        <tbody>
                            {(ops ?? []).map((o, i) => (
                                <tr key={i} className="border-b hover:bg-muted/40">
                                    <td className="px-2 py-1.5 font-mono">{String(o.opid ?? "—")}</td>
                                    <td className="px-2 py-1.5 font-mono">{o.op ?? "—"}</td>
                                    <td className="px-2 py-1.5 font-mono truncate max-w-[220px]" title={o.ns}>{o.ns ?? "—"}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{o.secs_running ?? 0}</td>
                                    {!readOnly && (
                                        <td className="px-2 py-1.5 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:text-destructive"
                                                onClick={() => kill(o.opid)}
                                                disabled={killing === String(o.opid) || o.opid === undefined}
                                                title="Kill operation"
                                            >
                                                {killing === String(o.opid) ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconSkull className="h-3.5 w-3.5" />}
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function formatUptime(sec: number): string {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}
