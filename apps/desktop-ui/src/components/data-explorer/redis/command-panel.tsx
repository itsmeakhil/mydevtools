"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { IconTerminal2, IconSend, IconTrash, IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { loadSnippets, addSnippet, deleteSnippet, type Snippet } from "./snippets-store";

interface HistoryEntry {
    command: string;
    result: string;
    error: boolean;
    time: number;
}

interface CommandPanelProps {
    redisUrl: string;
    db: number;
    connectionId: string;
}

const SUGGESTIONS = [
    "PING",
    "INFO server",
    "DBSIZE",
    "CLIENT LIST",
    "CONFIG GET maxmemory",
    "SLOWLOG GET 10",
    "MEMORY USAGE",
    "LASTSAVE",
    "TIME",
];

export function CommandPanel({ redisUrl, db, connectionId }: CommandPanelProps) {
    const [input, setInput] = useState("");
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [snippets, setSnippets] = useState<Snippet[]>([]);

    useEffect(() => {
        setSnippets(loadSnippets(connectionId));
    }, [connectionId]);

    function saveCurrentAsSnippet() {
        if (!input.trim()) return;
        const name = window.prompt("Snippet name?", input.split(/\s+/)[0]);
        if (!name) return;
        addSnippet(connectionId, name, input);
        setSnippets(loadSnippets(connectionId));
        toast.success("Snippet saved");
    }

    function removeSnippet(id: string) {
        deleteSnippet(connectionId, id);
        setSnippets(loadSnippets(connectionId));
    }

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    async function runCommand(raw?: string) {
        const line = (raw ?? input).trim();
        if (!line) return;

        const parts = line.match(/(?:[^\s"]+|"[^"]*")+/g);
        if (!parts || parts.length === 0) return;
        const command = parts.map((p) => p.replace(/^"|"$/g, "")) as [string, ...string[]];

        setLoading(true);
        const start = Date.now();
        try {
            const res = await apiFetch("/api/redis-commander/execute", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, command }),
            });
            const data = await res.json() as { result?: unknown; executionTime?: number; error?: string };
            const elapsed = data.executionTime ?? Date.now() - start;

            if (data.error) throw new Error(data.error);

            setHistory((h) => [
                ...h,
                {
                    command: line,
                    result: typeof data.result === "string"
                        ? data.result
                        : JSON.stringify(data.result, null, 2),
                    error: false,
                    time: elapsed,
                },
            ]);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setHistory((h) => [
                ...h,
                { command: line, result: message, error: true, time: Date.now() - start },
            ]);
        } finally {
            setLoading(false);
            setCmdHistory((h) => [line, ...h.slice(0, 99)]);
            setCmdHistoryIdx(-1);
            if (!raw) setInput("");
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            runCommand();
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.min(cmdHistoryIdx + 1, cmdHistory.length - 1);
            setCmdHistoryIdx(next);
            setInput(cmdHistory[next] ?? "");
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            const next = Math.max(cmdHistoryIdx - 1, -1);
            setCmdHistoryIdx(next);
            setInput(next === -1 ? "" : (cmdHistory[next] ?? ""));
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
                <IconTerminal2 className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Command Console</span>
                <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto size-7"
                    onClick={saveCurrentAsSnippet}
                    title="Save current input as snippet"
                    disabled={!input.trim()}
                >
                    <IconBookmark className="size-3.5" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setHistory([])}
                    title="Clear console"
                >
                    <IconTrash className="size-3.5" />
                </Button>
            </div>

            {snippets.length > 0 && (
                <div className="border-b px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <IconBookmarkFilled className="size-3" />
                        Saved snippets
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {snippets.map((s) => (
                            <span
                                key={s.id}
                                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] hover:bg-accent transition-colors group"
                            >
                                <button
                                    className="font-mono"
                                    title={s.command}
                                    onClick={() => setInput(s.command)}
                                >
                                    {s.name}
                                </button>
                                <button
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                                    onClick={() => removeSnippet(s.id)}
                                    title="Delete snippet"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {history.length === 0 && (
                <div className="p-3 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Quick commands:</p>
                    <div className="flex flex-wrap gap-1">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => runCommand(s)}
                                className="rounded border px-1.5 py-0.5 text-[11px] font-mono hover:bg-accent transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1 px-3 py-2">
                <div className="space-y-2 font-mono text-xs">
                    {history.map((entry, i) => (
                        <div key={i} className="space-y-0.5">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="text-green-500 dark:text-green-400">›</span>
                                <span>{entry.command}</span>
                                <span className="ml-auto text-[10px]">{entry.time}ms</span>
                            </div>
                            <pre
                                className={cn(
                                    "whitespace-pre-wrap break-all pl-3 text-[11px]",
                                    entry.error
                                        ? "text-destructive"
                                        : "text-foreground/80"
                                )}
                            >
                                {entry.result}
                            </pre>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="border-t p-2 flex gap-1.5">
                <div className="flex items-center text-green-500 dark:text-green-400 font-mono text-xs px-1 shrink-0">
                    ›
                </div>
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="HSET user:1 name Alice  |  ↑↓ history"
                    className="h-7 text-xs font-mono border-0 shadow-none p-0 focus-visible:ring-0"
                    disabled={loading}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={() => runCommand()}
                    disabled={loading || !input.trim()}
                >
                    <IconSend className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
