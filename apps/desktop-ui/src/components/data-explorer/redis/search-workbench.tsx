"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IconSearch, IconRefresh, IconQuestionMark } from "@tabler/icons-react";

interface SearchResult {
    key: string;
    fields: Record<string, string>;
}

export function SearchWorkbench({ redisUrl, db, onSelectKey }: { redisUrl: string; db: number; onSelectKey?: (k: string) => void }) {
    const [indexes, setIndexes] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState("");
    const [query, setQuery] = useState("*");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [busy, setBusy] = useState(false);
    const [indexInfo, setIndexInfo] = useState<unknown | null>(null);
    const [explain, setExplain] = useState<string | null>(null);
    const [moduleMissing, setModuleMissing] = useState(false);

    const loadIndexes = useCallback(async () => {
        setBusy(true);
        try {
            const res = await apiFetch("/api/redis-commander/search", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "list" }),
            });
            const body = await res.json() as { indexes?: unknown[]; error?: string };
            if (body.error) {
                if (/unknown command/i.test(body.error)) {
                    setModuleMissing(true);
                    return;
                }
                throw new Error(body.error);
            }
            const names = (body.indexes ?? []).map((x) => String(x));
            setIndexes(names);
            if (names.length && !selectedIndex) setSelectedIndex(names[0]!);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "FT._LIST failed");
        } finally {
            setBusy(false);
        }
    }, [redisUrl, db, selectedIndex]);

    useEffect(() => { void loadIndexes(); }, [loadIndexes]);

    async function loadInfo() {
        if (!selectedIndex) return;
        try {
            const res = await apiFetch("/api/redis-commander/search", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "info", index: selectedIndex }),
            });
            const body = await res.json() as { info?: unknown; error?: string };
            if (body.error) throw new Error(body.error);
            setIndexInfo(body.info);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "FT.INFO failed");
        }
    }

    async function runSearch() {
        if (!selectedIndex || !query.trim()) return;
        setBusy(true);
        try {
            const res = await apiFetch("/api/redis-commander/search", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "search", index: selectedIndex, query, limit: 50 }),
            });
            const body = await res.json() as { total?: number; results?: SearchResult[]; error?: string };
            if (body.error) throw new Error(body.error);
            setTotal(body.total ?? 0);
            setResults(body.results ?? []);
            setExplain(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "FT.SEARCH failed");
        } finally {
            setBusy(false);
        }
    }

    async function runExplain() {
        if (!selectedIndex || !query.trim()) return;
        try {
            const res = await apiFetch("/api/redis-commander/search", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, action: "explain", index: selectedIndex, query }),
            });
            const body = await res.json() as { explain?: string; error?: string };
            if (body.error) throw new Error(body.error);
            setExplain(String(body.explain ?? ""));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "FT.EXPLAIN failed");
        }
    }

    if (moduleMissing) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="text-center text-xs text-muted-foreground max-w-md">
                    RediSearch module is not loaded on this server. FT.* commands unavailable.
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0 space-y-2 border-b border-border p-3">
                <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs">Index</Label>
                        <select
                            value={selectedIndex}
                            onChange={(e) => setSelectedIndex(e.target.value)}
                            className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-xs"
                        >
                            <option value="">— select —</option>
                            {indexes.map((i) => (
                                <option key={i} value={i}>{i}</option>
                            ))}
                        </select>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={loadIndexes} disabled={busy}>
                        <IconRefresh className={busy ? "size-3.5 animate-spin" : "size-3.5"} />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={loadInfo} disabled={!selectedIndex}>
                        <IconQuestionMark className="size-3.5" /> FT.INFO
                    </Button>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Query</Label>
                    <Textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={2}
                        className="font-mono text-xs"
                        placeholder='@title:"redis" @price:[0 100]'
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={runSearch} disabled={busy || !selectedIndex || !query.trim()}>
                        <IconSearch className="size-3.5" /> FT.SEARCH
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={runExplain} disabled={!selectedIndex || !query.trim()}>
                        Explain
                    </Button>
                    <div className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {total > 0 && `${total.toLocaleString()} total · showing ${results.length}`}
                    </div>
                </div>
                {explain && (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 font-mono text-[11px]">
                        {explain}
                    </pre>
                )}
                {indexInfo ? (
                    <details className="text-[11px]">
                        <summary className="text-muted-foreground hover:text-foreground">FT.INFO output</summary>
                        <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 font-mono">
                            {JSON.stringify(indexInfo, null, 2)}
                        </pre>
                    </details>
                ) : null}
            </div>
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {results.length === 0 && (
                        <div className="p-6 text-center text-[13px] text-muted-foreground">
                            {busy ? "Searching…" : "Run a query to see results"}
                        </div>
                    )}
                    {results.map((r) => (
                        <div
                            key={r.key}
                            className="rounded-md border border-border bg-muted/40 p-2 text-xs transition-colors hover:bg-foreground/[0.05]"
                            onClick={() => onSelectKey?.(r.key)}
                        >
                            <Badge variant="outline" className="mb-1 font-mono">{r.key}</Badge>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[11px]">
                                {Object.entries(r.fields).map(([k, v]) => (
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
        </div>
    );
}
