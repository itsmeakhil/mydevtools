"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    IconSearch,
    IconRefresh,
    IconChevronRight,
    IconDatabase,
    IconList,
    IconBinaryTree2,
} from "@tabler/icons-react";
import { RedisKeyInfo, RedisValueType, SearchMode } from "./types";
import { cn } from "@/lib/utils";
import { detectSearchMode, globMatch, regexMatch, fuzzyMatch, getMatchIndices } from "./search-utils";
import { SearchBar } from "./search-bar";
import { AdvancedSearchPanel } from "./advanced-search-panel";
import { KeyTreeView } from "./key-tree-view";
import { HighlightedKeyText } from "./highlighted-key-text";

const SEPARATORS = [":", "/", "."] as const;
type ViewMode = "list" | "tree";

const TYPE_COLORS: Record<RedisValueType | string, string> = {
    string: "bg-blue-500/10 text-blue-500",
    list: "bg-amber-500/10 text-amber-500",
    set: "bg-green-500/10 text-green-500",
    zset: "bg-purple-500/10 text-purple-500",
    hash: "bg-rose-500/10 text-rose-500",
    none: "bg-muted text-muted-foreground",
};

interface SearchState {
    input: string;
    detectedMode: SearchMode;
    userModeOverride: SearchMode | null;
    regexError: string | null;
    matchCount: number;
    showAdvanced: boolean;
}

interface KeyBrowserProps {
    redisUrl: string;
    db: number;
    selectedKey: string | null;
    onSelectKey: (key: string) => void;
    dbSize: number;
    onDbSizeChange: (size: number) => void;
}

export function KeyBrowser({
    redisUrl,
    db,
    selectedKey,
    onSelectKey,
    dbSize,
    onDbSizeChange,
}: KeyBrowserProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("tree");
    const [separator, setSeparator] = useState<string>(":");
    const [pageSize, setPageSize] = useState<number>(200);
    const [loadAllBusy, setLoadAllBusy] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [pattern, setPattern] = useState("*");
    const [allKeys, setAllKeys] = useState<RedisKeyInfo[]>([]);
    const [displayedKeys, setDisplayedKeys] = useState<RedisKeyInfo[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchState, setSearchState] = useState<SearchState>({
        input: "",
        detectedMode: "fuzzy",
        userModeOverride: null,
        regexError: null,
        matchCount: 0,
        showAdvanced: false,
    });
    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const cursorRef = useRef("0");
    const debouncedSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Search / filter logic ────────────────────────────────────────────────

    const performSearch = useCallback(
        (
            input: string,
            keys: RedisKeyInfo[],
            modeOverride: SearchMode | null = null
        ) => {
            if (!input) {
                setDisplayedKeys(keys);
                setSearchState((prev) => ({
                    ...prev,
                    input: "",
                    matchCount: 0,
                    regexError: null,
                    detectedMode: "fuzzy",
                }));
                return;
            }

            const detected = detectSearchMode(input);
            const activeMode: SearchMode = modeOverride ?? detected;
            const keyStrings = keys.map((k) => k.key);
            let matchedKeys: string[] = [];
            let regexError: string | null = null;

            if (activeMode === "glob") {
                matchedKeys = globMatch(keyStrings, input);
            } else if (activeMode === "regex") {
                const result = regexMatch(keyStrings, input);
                if (result.error) {
                    // Fall back to fuzzy on regex error
                    regexError = result.error;
                    matchedKeys = fuzzyMatch(keyStrings, input);
                } else {
                    matchedKeys = result.keys;
                }
            } else {
                matchedKeys = fuzzyMatch(keyStrings, input);
            }

            const matchSet = new Set(matchedKeys);
            const filtered = keys.filter((k) => matchSet.has(k.key));

            setDisplayedKeys(filtered);
            setSearchState((prev) => ({
                ...prev,
                input,
                detectedMode: detected,
                regexError,
                matchCount: filtered.length,
            }));
        },
        []
    );

    // Debounced wrapper — rebuilds only when performSearch changes (stable)
    const debouncedSearch = useCallback(
        (input: string, keys: RedisKeyInfo[], modeOverride: SearchMode | null) => {
            if (debouncedSearchRef.current) {
                clearTimeout(debouncedSearchRef.current);
            }
            debouncedSearchRef.current = setTimeout(() => {
                performSearch(input, keys, modeOverride);
            }, 300);
        },
        [performSearch]
    );

    // ─── Search handlers ──────────────────────────────────────────────────────

    const handleSearchChange = useCallback(
        (input: string) => {
            // Update input immediately for responsive UI
            setSearchState((prev) => ({ ...prev, input }));
            debouncedSearch(input, allKeys, searchState.userModeOverride);
        },
        [allKeys, searchState.userModeOverride, debouncedSearch]
    );

    const allKeysRef = useRef<RedisKeyInfo[]>([]);
    useEffect(() => {
        allKeysRef.current = allKeys;
    }, [allKeys]);

    const handleClearSearch = useCallback(() => {
        if (debouncedSearchRef.current) {
            clearTimeout(debouncedSearchRef.current);
        }
        setDisplayedKeys(allKeysRef.current);
        setSearchState((prev) => ({
            ...prev,
            input: "",
            regexError: null,
            matchCount: allKeysRef.current.length,
            detectedMode: "fuzzy",
            userModeOverride: null,
        }));
    }, []); // No allKeys dep — uses ref so identity stays stable

    const handleModeChange = useCallback(
        (mode: SearchMode) => {
            setSearchState((prev) => ({ ...prev, userModeOverride: mode }));
            performSearch(searchState.input, allKeys, mode);
        },
        [searchState.input, allKeys, performSearch]
    );

    const handleResetMode = useCallback(() => {
        setSearchState((prev) => ({ ...prev, userModeOverride: null }));
        performSearch(searchState.input, allKeys, null);
    }, [searchState.input, allKeys, performSearch]);

    const handleToggleAdvanced = useCallback(() => {
        setSearchState((prev) => ({ ...prev, showAdvanced: !prev.showAdvanced }));
    }, []);

    // ─── Data fetching ────────────────────────────────────────────────────────

    const fetchPage = useCallback(
        async (reset: boolean) => {
            if (loadingRef.current) return;
            const currentCursor = reset ? "0" : cursorRef.current;
            if (!reset && currentCursor === "0") return;

            loadingRef.current = true;
            setLoading(true);
            try {
                const res = await apiFetch("/api/redis-commander/keys", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        redisUrl,
                        db,
                        pattern,
                        cursor: currentCursor,
                        count: pageSize,
                    }),
                });
                const data = (await res.json()) as {
                    cursor: string;
                    keys: RedisKeyInfo[];
                    dbSize: number;
                    error?: string;
                };
                if (data.error) throw new Error(data.error);
                cursorRef.current = data.cursor;

                setAllKeys((prev) => {
                    const updated = reset ? data.keys : [...prev, ...data.keys];
                    // Re-apply search against the updated key set
                    setDisplayedKeys(
                        searchState.input
                            ? (() => {
                                  const active =
                                      searchState.userModeOverride ??
                                      searchState.detectedMode;
                                  const keyStrings = updated.map((k) => k.key);
                                  let matched: string[] = [];
                                  if (active === "glob") {
                                      matched = globMatch(keyStrings, searchState.input);
                                  } else if (active === "regex") {
                                      const r = regexMatch(keyStrings, searchState.input);
                                      matched = r.error
                                          ? fuzzyMatch(keyStrings, searchState.input)
                                          : r.keys;
                                  } else {
                                      matched = fuzzyMatch(keyStrings, searchState.input);
                                  }
                                  const s = new Set(matched);
                                  return updated.filter((k) => s.has(k.key));
                              })()
                            : updated
                    );
                    return updated;
                });

                setHasMore(data.cursor !== "0");
                onDbSizeChange(data.dbSize);
            } catch {
                // swallow
            } finally {
                loadingRef.current = false;
                setLoading(false);
            }
        },
        [redisUrl, db, pattern, pageSize, onDbSizeChange, searchState.input, searchState.userModeOverride, searchState.detectedMode]
    );

    // Reset on redisUrl / db change
    useEffect(() => {
        cursorRef.current = "0";
        setAllKeys([]);
        setDisplayedKeys([]);
        setHasMore(false);
        fetchPage(true);
    }, [redisUrl, db]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Clear search when connection or db changes
    useEffect(() => {
        handleClearSearch();
    }, [redisUrl, db, handleClearSearch]);

    function handleSearch() {
        cursorRef.current = "0";
        setAllKeys([]);
        setDisplayedKeys([]);
        setHasMore(false);
        fetchPage(true);
    }

    // Auto-refresh: poll keys every 5s without resetting cursor accumulation
    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(() => {
            if (loadingRef.current) return;
            cursorRef.current = "0";
            setAllKeys([]);
            setDisplayedKeys([]);
            setHasMore(false);
            fetchPage(true);
        }, 5000);
        return () => clearInterval(id);
    }, [autoRefresh, fetchPage]);

    return (
        <div className="flex h-full flex-col">
            <div className="space-y-2 border-b border-border p-2">
                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Pattern (e.g. user:*)"
                            value={pattern}
                            onChange={(e) => setPattern(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="h-8 pl-8 font-mono text-xs"
                        />
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 shrink-0"
                        onClick={handleSearch}
                        disabled={loading}
                    >
                        <IconRefresh className={cn("size-3.5", loading && "animate-spin")} />
                    </Button>
                </div>

                {/* Search bar with mode detection */}
                <SearchBar
                    value={searchState.input}
                    onChange={handleSearchChange}
                    onClear={handleClearSearch}
                    detectedMode={searchState.detectedMode}
                    matchCount={searchState.matchCount}
                    showAdvanced={searchState.showAdvanced}
                    onToggleAdvanced={handleToggleAdvanced}
                    regexError={searchState.regexError}
                />

                <div className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                    <IconDatabase className="size-3" />
                    <span>{dbSize.toLocaleString()} total</span>
                    <span className="mx-1">·</span>
                    <span>{allKeys.length} loaded</span>
                    {searchState.input && (
                        <span className="ml-1">{searchState.matchCount} match</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => setViewMode(viewMode === "tree" ? "list" : "tree")}
                            className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                            title={viewMode === "tree" ? "Switch to list" : "Switch to tree"}
                        >
                            {viewMode === "tree" ? (
                                <IconBinaryTree2 className="size-3" />
                            ) : (
                                <IconList className="size-3" />
                            )}
                        </button>
                        {viewMode === "tree" && (
                            <select
                                value={separator}
                                onChange={(e) => setSeparator(e.target.value)}
                                className="h-6 rounded-md border border-border bg-background px-1 font-mono text-[11px]"
                                title="Tree separator"
                            >
                                {SEPARATORS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced search panel */}
            {searchState.showAdvanced && (
                <AdvancedSearchPanel
                    currentMode={searchState.userModeOverride ?? searchState.detectedMode}
                    onModeChange={handleModeChange}
                    onResetToAuto={handleResetMode}
                />
            )}

            <ScrollArea className="flex-1">
                {displayedKeys.length === 0 && !loading && (
                    <div className="p-4 text-center text-[13px] text-muted-foreground">
                        {searchState.input ? (
                            <>No keys match &quot;{searchState.input}&quot;</>
                        ) : (
                            "No keys found"
                        )}
                    </div>
                )}
                {viewMode === "tree" && displayedKeys.length > 0 && (
                    <KeyTreeView
                        keys={displayedKeys}
                        separator={separator}
                        selectedKey={selectedKey}
                        onSelectKey={onSelectKey}
                        matchedKeys={searchState.input ? displayedKeys.map((k) => k.key) : null}
                    />
                )}
                <div className={cn("p-1", viewMode === "tree" && "hidden")}>
                    {displayedKeys.map((item) => {
                        const highlightIndices = searchState.input
                            ? getMatchIndices(item.key, searchState.input, searchState.userModeOverride || searchState.detectedMode)
                            : [];
                        return (
                            <button
                                key={item.key}
                                onClick={() => onSelectKey(item.key)}
                                className={cn(
                                    "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
                                    selectedKey === item.key
                                        ? "bg-primary/[0.12] text-foreground"
                                        : "hover:bg-foreground/[0.05]"
                                )}
                            >
                                <span
                                    className={cn(
                                        "shrink-0 rounded-sm px-1.5 text-[11px] font-medium leading-4",
                                        TYPE_COLORS[item.type] ?? TYPE_COLORS.none
                                    )}
                                >
                                    {item.type}
                                </span>
                                <span className="flex-1 truncate font-mono text-xs">
                                    <HighlightedKeyText
                                        text={item.key}
                                        indices={highlightIndices}
                                        mode={searchState.userModeOverride || searchState.detectedMode}
                                    />
                                </span>
                                {item.ttl > 0 && (
                                    <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[11px] tabular-nums">
                                        {item.ttl}s
                                    </Badge>
                                )}
                                <IconChevronRight className="size-3 shrink-0 text-muted-foreground/70" />
                            </button>
                        );
                    })}
                </div>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />

                {loading && (
                    <div className="px-3 pb-3 text-center text-[11px] text-muted-foreground">
                        Loading…
                    </div>
                )}
                {!hasMore && allKeys.length > 0 && !searchState.input && (
                    <div className="pb-2 text-center text-[11px] tabular-nums text-muted-foreground/70">
                        All {allKeys.length} keys loaded
                    </div>
                )}
                {hasMore && !loading && (
                    <div className="flex justify-center pb-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={loadAllBusy}
                            onClick={async () => {
                                setLoadAllBusy(true);
                                try {
                                    // ponytail: bounded loop — cursor terminates at "0"
                                    while (cursorRef.current !== "0") {
                                        await fetchPage(false);
                                    }
                                } finally {
                                    setLoadAllBusy(false);
                                }
                            }}
                        >
                            {loadAllBusy ? "Loading…" : "Load all remaining"}
                        </Button>
                    </div>
                )}
            </ScrollArea>

            <div className="flex h-8 items-center gap-2 border-t border-border px-3 text-[11px] text-muted-foreground">
                <span>Page</span>
                <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                    className="h-6 rounded-md border border-border bg-background px-1 tabular-nums"
                    title="SCAN COUNT hint"
                >
                    {[100, 200, 500, 1000].map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
                <label className="ml-auto flex items-center gap-1 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                    />
                    Auto-refresh 5s
                </label>
            </div>
        </div>
    );
}
