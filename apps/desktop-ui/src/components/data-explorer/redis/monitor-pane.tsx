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
            <div className="shrink-0 space-y-2 border-b border-border p-3">
                <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                    <IconAlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <div>
                        MONITOR streams every command executed on the server — it can degrade throughput
                        50%+ on busy instances. Use briefly, stop when done.
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs tabular-nums text-muted-foreground">
                        {running ?`Live · ${events.length} cmd` : "Idle"}
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
                        <div className="p-6 text-center font-sans text-[13px] text-muted-foreground">
                            {running ? "Waiting for commands…" : "Press Start to begin MONITOR"}
                        </div>
                    ) : (
                        events.map((e, i) => (
                            <div key={`${e.ts}-${i}`} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">
                                    {new Date(e.ts).toLocaleTimeString()}
                                </span>
                                <span className="text-muted-foreground shrink-0">{e.source}</span>
                                <span className="shrink-0 text-primary">[{e.database}]</span>
                                <span className="truncate">{e.args.join(" ")}</span>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {events.length > 0 && (
                <div className="flex h-9 shrink-0 items-center justify-end border-t border-border px-2">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEvents([])}>
                        <IconTrash className="size-3" /> Clear
                    </Button>
                </div>
            )}
        </div>
    );
}
