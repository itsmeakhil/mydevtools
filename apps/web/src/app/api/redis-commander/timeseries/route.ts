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

interface Sample {
    ts: number;
    value: number;
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, key, action = "range", from = "-", to = "+", count = 500, aggregation, bucketMs } = await request.json() as {
            redisUrl: string;
            db?: number;
            key: string;
            action?: "range" | "info";
            from?: string | number;
            to?: string | number;
            count?: number;
            aggregation?: "avg" | "sum" | "min" | "max" | "count";
            bucketMs?: number;
        };
        if (!redisUrl || !key) {
            return NextResponse.json({ error: "redisUrl + key required" }, { status: 400 });
        }
        const client = makeClient(redisUrl, db);
        await client.connect();
        const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
        try {
            if (action === "info") {
                const info = await call("TS.INFO", key);
                return NextResponse.json({ info });
            }
            const args: (string | number)[] = ["TS.RANGE", key, String(from), String(to)];
            if (aggregation && bucketMs) {
                args.push("AGGREGATION", aggregation, bucketMs);
            }
            args.push("COUNT", count);
            const raw = await call(...args);
            const samples: Sample[] = Array.isArray(raw)
                ? raw.map((r) => {
                    const row = r as [number, string];
                    return { ts: Number(row[0]), value: parseFloat(String(row[1])) };
                })
                : [];
            return NextResponse.json({ samples });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
