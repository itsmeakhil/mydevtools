"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconSearch, IconRefresh, IconChevronRight, IconDatabase } from "@tabler/icons-react";
import { RedisKeyInfo, RedisValueType } from "./types";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<RedisValueType | string, string> = {
    string: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    list: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    set: "bg-green-500/10 text-green-600 dark:text-green-400",
    zset: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    hash: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    none: "bg-muted text-muted-foreground",
};

interface KeyBrowserProps {
    redisUrl: string;
    selectedKey: string | null;
    onSelectKey: (key: string) => void;
    dbSize: number;
    onDbSizeChange: (size: number) => void;
}

export function KeyBrowser({
    redisUrl,
    selectedKey,
    onSelectKey,
    dbSize,
    onDbSizeChange,
}: KeyBrowserProps) {
    const [pattern, setPattern] = useState("*");
    const [keys, setKeys] = useState<RedisKeyInfo[]>([]);
    const [cursor, setCursor] = useState("0");
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");
    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const cursorRef = useRef("0");

    const fetchPage = useCallback(
        async (reset: boolean) => {
            if (loadingRef.current) return;
            const currentCursor = reset ? "0" : cursorRef.current;
            if (!reset && currentCursor === "0") return;

            loadingRef.current = true;
            setLoading(true);
            try {
                const res = await fetch("/api/redis-commander/keys", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        redisUrl,
                        pattern,
                        cursor: currentCursor,
                        count: 200,
                    }),
                });
                const data = await res.json() as {
                    cursor: string;
                    keys: RedisKeyInfo[];
                    dbSize: number;
                    error?: string;
                };
                if (data.error) throw new Error(data.error);
                cursorRef.current = data.cursor;
                setCursor(data.cursor);
                setKeys((prev) => (reset ? data.keys : [...prev, ...data.keys]));
                setHasMore(data.cursor !== "0");
                onDbSizeChange(data.dbSize);
            } catch {
                // swallow
            } finally {
                loadingRef.current = false;
                setLoading(false);
            }
        },
        [redisUrl, pattern, onDbSizeChange]
    );

    // Reset on redisUrl change
    useEffect(() => {
        cursorRef.current = "0";
        setKeys([]);
        setCursor("0");
        setHasMore(false);
        fetchPage(true);
    }, [redisUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && hasMore && !loadingRef.current) {
                    fetchPage(false);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, fetchPage]);

    const filtered = filter
        ? keys.filter((k) => k.key.toLowerCase().includes(filter.toLowerCase()))
        : keys;

    function handleSearch() {
        cursorRef.current = "0";
        setKeys([]);
        setCursor("0");
        setHasMore(false);
        fetchPage(true);
    }

    return (
        <div className="flex h-full flex-col">
            <div className="space-y-2 p-3 border-b">
                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Pattern (e.g. user:*)"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="pl-8 h-8 text-sm font-mono"
                        />
                    </div>
                    <Button
                        size="icon"
                        variant="outline"
                        className="size-8 shrink-0"
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
                    </Button>
                </div>
                <div className="relative">
                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                    <Input
                        placeholder="Filter loaded keys…"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-7 text-xs pl-7"
                    />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconDatabase className="size-3" />
                    <span>
                        {dbSize.toLocaleString()} total
                    </span>
                    <span className="mx-1">·</span>
                    <span>{keys.length} loaded</span>
                    {filter && <span className="ml-auto">{filtered.length} match</span>}
                </div>
            </div>

            <ScrollArea className="flex-1">
                {filtered.length === 0 && !loading && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No keys found
                    </div>
                )}
                <div className="p-1">
                    {filtered.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => onSelectKey(item.key)}
                            className={cn(
                                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-accent",
                                selectedKey === item.key && "bg-accent"
                            )}
                        >
                            <span
                                className={cn(
                                    "shrink-0 rounded px-1 py-0.5 text-[10px] font-mono font-semibold uppercase",
                                    TYPE_COLORS[item.type] ?? TYPE_COLORS.none
                                )}
                            >
                                {item.type}
                            </span>
                            <span className="flex-1 truncate font-mono text-xs">{item.key}</span>
                            {item.ttl > 0 && (
                                <Badge variant="outline" className="shrink-0 text-[10px] h-4 px-1">
                                    {item.ttl}s
                                </Badge>
                            )}
                            <IconChevronRight className="size-3 shrink-0 text-muted-foreground" />
                        </button>
                    ))}
                </div>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />

                {loading && (
                    <div className="px-3 pb-3 text-center text-xs text-muted-foreground animate-pulse">
                        Loading…
                    </div>
                )}
                {!hasMore && keys.length > 0 && !filter && (
                    <div className="pb-2 text-center text-[10px] text-muted-foreground/50">
                        All {keys.length} keys loaded
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
