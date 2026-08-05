"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useEffect, useRef, useState } from "react";
import { Sparkline } from "./sparkline";

const POLL_MS = 2000;
const MAX_POINTS = 30;

interface InfoData {
    sections: Record<string, Record<string, string>>;
    dbsize: number;
}

interface Series {
    ops: number[];
    memory: number[];
    clients: number[];
    hitRatio: number[];
}

function num(v: string | undefined): number {
    if (!v) return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

function push(arr: number[], v: number): number[] {
    const next = arr.concat(v);
    return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
}

export function MetricsPane({ redisUrl, db }: { redisUrl: string; db: number }) {
    const [series, setSeries] = useState<Series>({ ops: [], memory: [], clients: [], hitRatio: [] });
    const [latest, setLatest] = useState<InfoData | null>(null);
    const [paused, setPaused] = useState(false);
    const prevHits = useRef<number | null>(null);
    const prevMisses = useRef<number | null>(null);

    useEffect(() => {
        let abort = false;
        async function tick() {
            try {
                const res = await apiFetch("/api/redis-commander/info", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ redisUrl, db }),
                });
                const body = await res.json() as InfoData & { error?: string };
                if (abort || body.error) return;
                setLatest(body);
                const ops = num(body.sections.stats?.instantaneous_ops_per_sec);
                const memory = num(body.sections.memory?.used_memory) / (1024 * 1024); // MB
                const clients = num(body.sections.clients?.connected_clients);
                const hits = num(body.sections.stats?.keyspace_hits);
                const misses = num(body.sections.stats?.keyspace_misses);
                let ratio = 0;
                if (prevHits.current !== null && prevMisses.current !== null) {
                    const dh = hits - prevHits.current;
                    const dm = misses - prevMisses.current;
                    const tot = dh + dm;
                    ratio = tot > 0 ? (dh / tot) * 100 : 0;
                }
                prevHits.current = hits;
                prevMisses.current = misses;
                setSeries((s) => ({
                    ops: push(s.ops, ops),
                    memory: push(s.memory, memory),
                    clients: push(s.clients, clients),
                    hitRatio: push(s.hitRatio, ratio),
                }));
            } catch {
                // swallow — next tick retries
            }
        }
        void tick();
        if (paused) return () => { abort = true; };
        const id = setInterval(tick, POLL_MS);
        return () => {
            abort = true;
            clearInterval(id);
        };
    }, [redisUrl, db, paused]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Live metrics — polling every {POLL_MS / 1000}s</span>
                <button
                    onClick={() => setPaused((p) => !p)}
                    className="rounded border px-2 py-0.5 hover:bg-accent transition-colors"
                >
                    {paused ? "Resume" : "Pause"}
                </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                <MetricCard
                    label="Ops/sec"
                    value={series.ops.length ? series.ops[series.ops.length - 1]!.toFixed(0) : "—"}
                    points={series.ops}
                    color="rgb(59 130 246)"
                />
                <MetricCard
                    label="Memory (MB)"
                    value={latest?.sections.memory?.used_memory_human ?? "—"}
                    points={series.memory}
                    color="rgb(245 158 11)"
                />
                <MetricCard
                    label="Clients"
                    value={series.clients.length ? series.clients[series.clients.length - 1]!.toFixed(0) : "—"}
                    points={series.clients}
                    color="rgb(34 197 94)"
                />
                <MetricCard
                    label="Hit ratio %"
                    value={series.hitRatio.length ? series.hitRatio[series.hitRatio.length - 1]!.toFixed(1) : "—"}
                    points={series.hitRatio}
                    color="rgb(168 85 247)"
                />
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
