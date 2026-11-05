"use client";

import { apiFetch } from "@/lib/desktop/api-fetch";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    IconPlayerPlay,
    IconPlayerStop,
    IconSend,
    IconTrash,
} from "@tabler/icons-react";

const MAX_LOG = 500;

interface Message {
    kind: "channel" | "pattern";
    channel: string;
    pattern?: string;
    message: string;
    ts: number;
}

interface PubSubPaneProps {
    redisUrl: string;
    db: number;
}

export function PubSubPane({ redisUrl, db }: PubSubPaneProps) {
    const [channels, setChannels] = useState("");
    const [patterns, setPatterns] = useState("");
    const [active, setActive] = useState<{ channels: string[]; patterns: string[] } | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [pubChannel, setPubChannel] = useState("");
    const [pubMessage, setPubMessage] = useState("");
    const [publishing, setPublishing] = useState(false);
    const sourceRef = useRef<EventSource | null>(null);

    function startSubscribe() {
        const chs = channels.split(",").map((s) => s.trim()).filter(Boolean);
        const pts = patterns.split(",").map((s) => s.trim()).filter(Boolean);
        if (chs.length === 0 && pts.length === 0) {
            toast.error("Enter at least one channel or pattern");
            return;
        }
        stop();
        const url = new URL("/api/redis-commander/pubsub", window.location.origin);
        url.searchParams.set("redisUrl", redisUrl);
        url.searchParams.set("db", String(db));
        if (chs.length) url.searchParams.set("channels", chs.join(","));
        if (pts.length) url.searchParams.set("patterns", pts.join(","));
        const es = new EventSource(url.toString(), { withCredentials: true });
        es.addEventListener("ready", (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data) as { channels: string[]; patterns: string[] };
                setActive(data);
                toast.success(`Subscribed: ${[...data.channels, ...data.patterns].join(", ")}`);
            } catch { /* noop */ }
        });
        es.addEventListener("message", (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data) as Message;
                setMessages((prev) => [data, ...prev].slice(0, MAX_LOG));
            } catch { /* noop */ }
        });
        es.addEventListener("error", (ev) => {
            try {
                const data = JSON.parse((ev as MessageEvent).data ?? "{}") as { message?: string };
                if (data.message) toast.error(data.message);
            } catch { /* noop */ }
        });
        sourceRef.current = es;
    }

    function stop() {
        if (sourceRef.current) {
            sourceRef.current.close();
            sourceRef.current = null;
        }
        setActive(null);
    }

    useEffect(() => () => stop(), []);

    // Auto-stop on connection switch
    useEffect(() => {
        stop();
        setMessages([]);
    }, [redisUrl, db]);

    async function publish() {
        if (!pubChannel.trim()) return;
        setPublishing(true);
        try {
            const res = await apiFetch("/api/redis-commander/pubsub", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redisUrl, db, channel: pubChannel.trim(), message: pubMessage }),
            });
            const body = await res.json() as { receivers?: number; error?: string };
            if (body.error) throw new Error(body.error);
            toast.success(`Delivered to ${body.receivers ?? 0} subscriber(s)`);
            setPubMessage("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Publish failed");
        } finally {
            setPublishing(false);
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="shrink-0 space-y-3 border-b border-border p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Channels (comma-separated)</Label>
                        <Input
                            value={channels}
                            onChange={(e) => setChannels(e.target.value)}
                            placeholder="e.g. orders, notifications"
                            className="h-8 text-xs font-mono"
                            disabled={!!active}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Patterns (comma-separated)</Label>
                        <Input
                            value={patterns}
                            onChange={(e) => setPatterns(e.target.value)}
                            placeholder="e.g. user.*"
                            className="h-8 text-xs font-mono"
                            disabled={!!active}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                    {active ? (
                        <>
                            <div className="flex items-center gap-2 text-xs tabular-nums text-success">
                                <span className="size-1.5 rounded-full bg-success" />
                                Live · {messages.length} msg
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={stop}>
                                <IconPlayerStop className="size-3.5" /> Stop
                            </Button>
                        </>
                    ) : (
                        <>
                            <span className="text-xs text-muted-foreground">Idle</span>
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={startSubscribe}>
                                <IconPlayerPlay className="size-3.5" /> Subscribe
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex items-end gap-1 border-t border-border pt-3">
                    <div className="flex-1 space-y-1">
                        <Label className="text-xs">Publish</Label>
                        <Input
                            value={pubChannel}
                            onChange={(e) => setPubChannel(e.target.value)}
                            placeholder="channel"
                            className="h-7 text-xs font-mono"
                        />
                    </div>
                    <div className="flex-[2] space-y-1">
                        <Label className="text-xs sr-only">Message</Label>
                        <Input
                            value={pubMessage}
                            onChange={(e) => setPubMessage(e.target.value)}
                            placeholder="message"
                            className="h-7 text-xs font-mono"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !publishing && pubChannel.trim()) void publish();
                            }}
                        />
                    </div>
                    <Button
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={publish}
                        disabled={publishing || !pubChannel.trim()}
                    >
                        <IconSend className="size-3.5" /> Send
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {messages.length === 0 ? (
                        <div className="p-6 text-center text-[13px] text-muted-foreground">
                            {active ? "Waiting for messages…" : "Subscribe to a channel to start"}
                        </div>
                    ) : (
                        messages.map((m, i) => (
                            <div key={`${m.ts}-${i}`} className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs">
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="tabular-nums">{new Date(m.ts).toLocaleTimeString()}</span>
                                    {m.kind === "pattern" && m.pattern && (
                                        <Badge variant="outline" className="h-4 px-1.5 font-mono">{m.pattern}</Badge>
                                    )}
                                    <span className="font-medium text-foreground">{m.channel}</span>
                                </div>
                                <div className="break-all">{m.message}</div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {messages.length > 0 && (
                <div className="flex h-9 shrink-0 items-center justify-end border-t border-border px-2">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setMessages([])}>
                        <IconTrash className="size-3" /> Clear
                    </Button>
                </div>
            )}
        </div>
    );
}
