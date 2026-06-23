import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import Redis from "ioredis";

function makeClient(redisUrl: string, db?: number) {
    return new Redis(redisUrl, {
        connectTimeout: 10000,
        lazyConnect: true,
        db: typeof db === "number" ? db : undefined,
        tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    });
}

/** Publish a message: POST { redisUrl, db?, channel, message } */
export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, channel, message } = await request.json() as {
            redisUrl: string;
            db?: number;
            channel: string;
            message: string;
        };
        if (!redisUrl || !channel) {
            return NextResponse.json({ error: "redisUrl and channel are required" }, { status: 400 });
        }
        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const receivers = await client.publish(channel, message ?? "");
            return NextResponse.json({ receivers });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Subscribe via SSE: GET ?redisUrl=...&channels=ch1,ch2&patterns=p* */
export async function GET(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const redisUrl = url.searchParams.get("redisUrl");
    const db = url.searchParams.get("db");
    const channels = (url.searchParams.get("channels") ?? "")
        .split(",").map((c) => c.trim()).filter(Boolean);
    const patterns = (url.searchParams.get("patterns") ?? "")
        .split(",").map((p) => p.trim()).filter(Boolean);

    if (!redisUrl) {
        return new Response("redisUrl required", { status: 400 });
    }
    if (channels.length === 0 && patterns.length === 0) {
        return new Response("channels or patterns required", { status: 400 });
    }

    const client = makeClient(redisUrl, db ? parseInt(db, 10) : undefined);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            function send(event: string, data: unknown) {
                try {
                    controller.enqueue(
                        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                    );
                } catch {
                    // controller closed
                }
            }

            try {
                await client.connect();
                if (channels.length > 0) await client.subscribe(...channels);
                if (patterns.length > 0) await client.psubscribe(...patterns);

                client.on("message", (channel, message) => {
                    send("message", { kind: "channel", channel, message, ts: Date.now() });
                });
                client.on("pmessage", (pattern, channel, message) => {
                    send("message", { kind: "pattern", pattern, channel, message, ts: Date.now() });
                });
                client.on("error", (err) => {
                    send("error", { message: err.message });
                });
                send("ready", { channels, patterns });

                // Heartbeat — keeps proxies from killing idle stream
                const heartbeat = setInterval(() => {
                    try {
                        controller.enqueue(encoder.encode(`: ping\n\n`));
                    } catch {
                        clearInterval(heartbeat);
                    }
                }, 15000);

                request.signal.addEventListener("abort", async () => {
                    clearInterval(heartbeat);
                    try { await client.quit(); } catch { /* noop */ }
                    try { controller.close(); } catch { /* noop */ }
                });
            } catch (err) {
                send("error", { message: err instanceof Error ? err.message : String(err) });
                try { await client.quit(); } catch { /* noop */ }
                try { controller.close(); } catch { /* noop */ }
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
