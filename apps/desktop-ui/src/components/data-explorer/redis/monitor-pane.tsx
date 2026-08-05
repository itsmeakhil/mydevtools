"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    IconPlayerPlay,
    IconPlayerStop,
    IconAlertTriangle,
    IconTrash,
} from "@tabler/icons-react";

const MAX_LOG = 1000;

interface CmdEvent {
    time: number;
    args: string[];
    source: string;
    database: string;
    ts: number;
}

export function MonitorPane({ redisUrl, db }: { redisUrl: string; db: number }) {
    const [running, setRunning] = useState(false);
    const [events, setEvents] = useState<CmdEvent[]>([]);
    const sourceRef = useRef<EventSource | null>(null);

    function stop() {
        if (sourceRef.current) {
            sourceRef.current.close();
            sourceRef.current = null;
        }
        setRunning(false);
    }

    function start() {
        stop();
        const url = new URL("/api/redis-commander/monitor", window.location.origin);
        url.searchParams.set("redisUrl", redisUrl);
        url.searchParams.set("db", String(db));
        const es = new EventSource(url.toString(), { withCredentials: true });
        es.addEventListener("ready", () => setRunning(true));
        es.addEventListener("cmd", (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data) as CmdEvent;
                setEvents((prev) => [data, ...prev].slice(0, MAX_LOG));
            } catch { /* noop */ }
        });
        es.addEventListener("error", () => stop());
        sourceRef.current = es;
    }

    useEffect(() => () => stop(), []);
    useEffect(() => {
        stop();
        setEvents([]);
    }, [redisUrl, db]);

    return (
        <div className="flex h-full flex-col">
            <div className="border-b p-3 space-y-2 shrink-0">
                <div className="flex items-start gap-2 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded p-2">
                    <IconAlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <div>
                        MONITOR streams every command executed on the server — it can degrade throughput
                        50%+ on busy instances. Use briefly, stop when done.
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        {running ? `Live · ${events.length} cmd` : "Idle"}
                    </div>
                    {running ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={stop}>
                            <IconPlayerStop className="size-3.5" /> Stop
                        </Button>
                    ) : (
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={start}>
                            <IconPlayerPlay className="size-3.5" /> Start
                        </Button>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 font-mono text-[11px] space-y-0.5">
                    {events.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground p-6">
                            {running ? "Waiting for commands…" : "Press Start to begin MONITOR"}
                        </div>
                    ) : (
                        events.map((e, i) => (
                            <div key={`${e.ts}-${i}`} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">
                                    {new Date(e.ts).toLocaleTimeString()}
                                </span>
                                <span className="text-muted-foreground shrink-0">{e.source}</span>
                                <span className="text-blue-600 dark:text-blue-400 shrink-0">[{e.database}]</span>
                                <span className="truncate">{e.args.join(" ")}</span>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {events.length > 0 && (
                <div className="border-t px-3 py-1.5 flex justify-end shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => setEvents([])}>
                        <IconTrash className="size-3" /> Clear
                    </Button>
                </div>
            )}
        </div>
    );
}
