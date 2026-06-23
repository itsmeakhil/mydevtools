import { requireBackendSession } from "@/lib/require-backend-session";
import Redis from "ioredis";

function makeClient(redisUrl: string, db?: number) {
    return new Redis(redisUrl, {
        connectTimeout: 10000,
        lazyConnect: true,
        db: typeof db === "number" ? db : undefined,
        tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    });
}

/** SSE stream of MONITOR output. GET ?redisUrl=...&db=... */
export async function GET(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const redisUrl = url.searchParams.get("redisUrl");
    const db = url.searchParams.get("db");
    if (!redisUrl) return new Response("redisUrl required", { status: 400 });

    const client = makeClient(redisUrl, db ? parseInt(db, 10) : undefined);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            function send(event: string, data: unknown) {
                try {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                } catch { /* closed */ }
            }

            try {
                await client.connect();
                // ponytail: MONITOR loads the server. Caller UI must warn + start/stop.
                const monitor = await (client as unknown as {
                    monitor: () => Promise<{ on: (ev: string, cb: (...a: unknown[]) => void) => void; disconnect: () => void }>;
                }).monitor();

                monitor.on("monitor", (...a: unknown[]) => {
                    const [time, args, source, database] = a as [number, string[], string, string];
                    send("cmd", { time, args, source, database, ts: Date.now() });
                });
                send("ready", { startedAt: Date.now() });

                const heartbeat = setInterval(() => {
                    try { controller.enqueue(encoder.encode(`: ping\n\n`)); }
                    catch { clearInterval(heartbeat); }
                }, 15000);

                request.signal.addEventListener("abort", async () => {
                    clearInterval(heartbeat);
                    try { monitor.disconnect(); } catch { /* noop */ }
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
