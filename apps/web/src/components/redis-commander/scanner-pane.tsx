"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IconPlayerPlay } from "@tabler/icons-react";

interface KeySample {
    key: string;
    type: string;
    bytes: number;
    ttl: number;
}

interface ScanResult {
    pattern: string;
    sampledKeys: number;
    truncated: boolean;
    totalBytes: number;
    byType: Record<string, { count: number; bytes: number }>;
    topByBytes: KeySample[];
    ttlSummary: { noTtl: number; expiring: number; expired: number };
}

function humanBytes(b: number): string {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ScannerPane({ redisUrl, db, onSelectKey }: { redisUrl: string; db: number; onSelectKey?: (k: string) => void }) {
    const [pattern, setPattern] = useState("*");
    const [sampleSize, setSampleSize] = useState(1000);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);

    async function run() {
        setBusy(true);
        setResult(null);
        try {
            const res = await fetch("/api/redis-commander/scanner", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, pattern: pattern.trim() || "*", sampleSize }),
            });
            const body = await res.json() as ScanResult & { error?: string };
            if (body.error) throw new Error(body.error);
            setResult(body);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Scan failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-3 space-y-2 shrink-0">
                <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs">Pattern</Label>
                        <Input
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            className="h-8 text-xs font-mono"
                            placeholder="*"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Sample</Label>
                        <select
                            value={sampleSize}
                            onChange={(e) => setSampleSize(parseInt(e.target.value, 10))}
                            className="h-8 rounded border bg-background px-2 text-xs font-mono"
                        >
                            {[200, 500, 1000, 2000, 5000].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                    <Button size="sm" className="h-8 gap-1 text-xs" onClick={run} disabled={busy}>
                        <IconPlayerPlay className="size-3.5" />
                        {busy ? "Scanning…" : "Scan"}
                    </Button>
                </div>
                <div className="text-[10px] text-muted-foreground">
                    Uses SCAN + MEMORY USAGE. Capped at 5,000 keys. Bigger samples take longer.
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {!result && !busy && (
                        <div className="text-center text-xs text-muted-foreground p-6">
                            Run a scan to see results
                        </div>
                    )}
                    {result && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Stat label="Keys sampled" value={result.sampledKeys.toLocaleString()} />
                                <Stat label="Total bytes" value={humanBytes(result.totalBytes)} />
                                <Stat label="Avg / key" value={result.sampledKeys ? humanBytes(Math.round(result.totalBytes / result.sampledKeys)) : "—"} />
                                <Stat label="Truncated" value={result.truncated ? "Yes" : "No"} />
                            </div>

                            <div>
                                <div className="text-[11px] uppercase text-muted-foreground mb-1">By type</div>
                                <div className="rounded border bg-muted/20 p-2 space-y-1">
                                    {Object.entries(result.byType)
                                        .sort((a, b) => b[1].bytes - a[1].bytes)
                                        .map(([type, agg]) => (
                                            <div key={type} className="flex items-center gap-2 text-xs">
                                                <Badge variant="outline" className="text-[10px] font-mono uppercase">{type}</Badge>
                                                <div className="flex-1 text-muted-foreground">
                                                    {agg.count.toLocaleString()} keys
                                                </div>
                                                <div className="font-mono">{humanBytes(agg.bytes)}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-[11px] uppercase text-muted-foreground mb-1">
                                    Top 50 by memory
                                </div>
                                <div className="rounded border bg-muted/20">
                                    <table className="w-full text-xs">
                                        <thead className="text-[10px] uppercase text-muted-foreground">
                                            <tr className="border-b">
                                                <th className="text-left py-1 px-2">Key</th>
                                                <th className="text-left py-1 px-2 w-16">Type</th>
                                                <th className="text-right py-1 px-2 w-20">TTL</th>
                                                <th className="text-right py-1 px-2 w-24">Bytes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.topByBytes.map((row) => (
                                                <tr
                                                    key={row.key}
                                                    className="border-b last:border-b-0 hover:bg-accent/50 cursor-pointer"
                                                    onClick={() => onSelectKey?.(row.key)}
                                                >
                                                    <td className="py-1 px-2 font-mono truncate max-w-[280px]">{row.key}</td>
                                                    <td className="py-1 px-2 font-mono text-[10px]">{row.type}</td>
                                                    <td className="py-1 px-2 font-mono text-right text-muted-foreground">
                                                        {row.ttl === -1 ? "∞" : row.ttl === -2 ? "—" : `${row.ttl}s`}
                                                    </td>
                                                    <td className="py-1 px-2 font-mono text-right">{humanBytes(row.bytes)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Stat label="No TTL" value={result.ttlSummary.noTtl.toLocaleString()} />
                                <Stat label="Expiring" value={result.ttlSummary.expiring.toLocaleString()} />
                                <Stat label="Expired" value={result.ttlSummary.expired.toLocaleString()} />
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
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
