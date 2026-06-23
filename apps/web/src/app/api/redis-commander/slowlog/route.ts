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

interface SlowLogEntry {
    id: number;
    ts: number;
    durationMicros: number;
    command: string[];
    clientAddr?: string;
    clientName?: string;
}

function normalizeEntries(raw: unknown): SlowLogEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => {
        const r = row as unknown[];
        return {
            id: Number(r[0] ?? 0),
            ts: Number(r[1] ?? 0),
            durationMicros: Number(r[2] ?? 0),
            command: Array.isArray(r[3]) ? (r[3] as unknown[]).map(String) : [],
            clientAddr: r[4] ? String(r[4]) : undefined,
            clientName: r[5] ? String(r[5]) : undefined,
        };
    });
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, action = "get", count = 50 } = await request.json() as {
            redisUrl: string;
            db?: number;
            action?: "get" | "reset" | "len";
            count?: number;
        };
        if (!redisUrl) return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
            if (action === "reset") {
                await call("SLOWLOG", "RESET");
                return NextResponse.json({ success: true });
            }
            if (action === "len") {
                const len = await call("SLOWLOG", "LEN");
                return NextResponse.json({ length: Number(len) });
            }
            const raw = await call("SLOWLOG", "GET", count);
            return NextResponse.json({ entries: normalizeEntries(raw) });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
