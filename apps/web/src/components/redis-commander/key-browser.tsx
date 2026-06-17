"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconSearch, IconRefresh, IconChevronRight, IconDatabase } from "@tabler/icons-react";
import { RedisKeyInfo, RedisValueType, SearchMode } from "./types";
import { cn } from "@/lib/utils";
import { detectSearchMode, globMatch, regexMatch, fuzzyMatch, getMatchIndices } from "./search-utils";
import { SearchBar } from "./search-bar";
import { AdvancedSearchPanel } from "./advanced-search-panel";

const TYPE_COLORS: Record<RedisValueType | string, string> = {
    string: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    list: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    set: "bg-green-500/10 text-green-600 dark:text-green-400",
    zset: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    hash: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    none: "bg-muted text-muted-foreground",
};

interface HighlightedKeyTextProps {
    text: string;
    indices: number[];
    mode: SearchMode;
}

function HighlightedKeyText({ text, indices, mode }: HighlightedKeyTextProps) {
    if (indices.length === 0) return <span>{text}</span>;

    if (mode === "fuzzy") {
        // indices are individual char positions
        // Create a Set for fast lookup
        const indexSet = new Set(indices);
        const chars = text.split("");
        const elements: React.ReactNode[] = [];

        chars.forEach((char, i) => {
            if (indexSet.has(i)) {
                elements.push(
                    <span key={i} className="bg-yellow-200/50 dark:bg-yellow-900/50">
                        {char}
                    </span>
                );
            } else {
                elements.push(char);
            }
        });

        return <span>{elements}</span>;
    } else {
        // glob or regex: indices are [start, end]
        const start = indices[0] ?? 0;
        const end = indices[1] ?? text.length;

        return (
            <span>
                {text.slice(0, start)}
                <span className="bg-blue-200/50 dark:bg-blue-900/50">
                    {text.slice(start, end)}
                </span>
                {text.slice(end)}
            </span>
        );
    }
}

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
                    matchedKeys = result.matches;
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
                const res = await fetch("/api/redis-commander/keys", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        redisUrl,
                        pattern,
                        cursor: currentCursor,
                        count: 200,
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
                                          : r.matches;
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
        [redisUrl, pattern, onDbSizeChange, searchState.input, searchState.userModeOverride, searchState.detectedMode]
    );

    // Reset on redisUrl change
    useEffect(() => {
        cursorRef.current = "0";
        setAllKeys([]);
        setDisplayedKeys([]);
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

    // Clear search when connection changes
    useEffect(() => {
        handleClearSearch();
    }, [redisUrl, handleClearSearch]);

    function handleSearch() {
        cursorRef.current = "0";
        setAllKeys([]);
        setDisplayedKeys([]);
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

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconDatabase className="size-3" />
                    <span>{dbSize.toLocaleString()} total</span>
                    <span className="mx-1">·</span>
                    <span>{allKeys.length} loaded</span>
                    {searchState.input && (
                        <span className="ml-auto">{searchState.matchCount} match</span>
                    )}
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
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {searchState.input ? (
                            <>No keys match &quot;{searchState.input}&quot;</>
                        ) : (
                            "No keys found"
                        )}
                    </div>
                )}
                <div className="p-1">
                    {displayedKeys.map((item) => {
                        const highlightIndices = searchState.input
                            ? getMatchIndices(item.key, searchState.input, searchState.userModeOverride || searchState.detectedMode)
                            : [];
                        return (
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
                                <span className="flex-1 truncate font-mono text-xs">
                                    <HighlightedKeyText
                                        text={item.key}
                                        indices={highlightIndices}
                                        mode={searchState.userModeOverride || searchState.detectedMode}
                                    />
                                </span>
                                {item.ttl > 0 && (
                                    <Badge variant="outline" className="shrink-0 text-[10px] h-4 px-1">
                                        {item.ttl}s
                                    </Badge>
                                )}
                                <IconChevronRight className="size-3 shrink-0 text-muted-foreground" />
                            </button>
                        );
                    })}
                </div>

                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-4" />

                {loading && (
                    <div className="px-3 pb-3 text-center text-xs text-muted-foreground animate-pulse">
                        Loading…
                    </div>
                )}
                {!hasMore && allKeys.length > 0 && !searchState.input && (
                    <div className="pb-2 text-center text-[10px] text-muted-foreground/50">
                        All {allKeys.length} keys loaded
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
