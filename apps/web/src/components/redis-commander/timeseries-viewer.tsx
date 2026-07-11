"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkline } from "./sparkline";
import { toast } from "sonner";
import { IconRefresh } from "@tabler/icons-react";

interface Sample {
    ts: number;
    value: number;
}

export function TimeSeriesViewer({ redisUrl, db, keyName }: { redisUrl: string; db: number; keyName: string }) {
    const [samples, setSamples] = useState<Sample[]>([]);
    const [loading, setLoading] = useState(false);
    const [count, setCount] = useState(500);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/redis-commander/timeseries", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, key: keyName, action: "range", from: "-", to: "+", count }),
            });
            const body = await res.json() as { samples?: Sample[]; error?: string };
            if (body.error) throw new Error(body.error);
            setSamples(body.samples ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "TS.RANGE failed");
        } finally {
            setLoading(false);
        }
    }, [redisUrl, db, keyName, count]);

    useEffect(() => { void load(); }, [load]);

    const min = samples.length ? Math.min(...samples.map((s) => s.value)) : 0;
    const max = samples.length ? Math.max(...samples.map((s) => s.value)) : 0;
    const avg = samples.length ? samples.reduce((a, s) => a + s.value, 0) / samples.length : 0;
    const last = samples.length ? samples[samples.length - 1]! : null;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
                <Label className="text-[10px] text-muted-foreground">Last</Label>
                <Input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value, 10) || 500)}
                    className="h-7 w-20 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">samples</span>
                <Button size="icon" variant="ghost" className="size-7 ml-auto" onClick={load} disabled={loading}>
                    <IconRefresh className={loading ? "size-3.5 animate-spin" : "size-3.5"} />
                </Button>
            </div>
            <div className="p-4 space-y-4 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Stat label="Samples" value={samples.length.toLocaleString()} />
                    <Stat label="Min" value={min.toLocaleString()} />
                    <Stat label="Max" value={max.toLocaleString()} />
                    <Stat label="Avg" value={avg.toFixed(2)} />
                </div>
                <div className="rounded border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                        {last && `Latest: ${last.value} at ${new Date(last.ts).toLocaleString()}`}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                        <Sparkline points={samples.map((s) => s.value)} width={600} height={120} />
                    </div>
                </div>
                <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Raw samples (last 50)</summary>
                    <table className="mt-2 w-full font-mono text-[11px]">
                        <thead className="text-muted-foreground">
                            <tr><th className="text-left">Time</th><th className="text-right">Value</th></tr>
                        </thead>
                        <tbody>
                            {samples.slice(-50).reverse().map((s) => (
                                <tr key={s.ts} className="border-b last:border-b-0">
                                    <td>{new Date(s.ts).toLocaleString()}</td>
                                    <td className="text-right">{s.value}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </details>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded border bg-muted/20 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="text-xs font-mono">{value}</div>
        </div>
    );
}
