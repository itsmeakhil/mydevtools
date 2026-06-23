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

const MAX_SCAN_LIMIT = 100_000; // ponytail: cap to prevent runaway scans on huge DBs

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, pattern, dryRun = false } = await request.json() as {
            redisUrl: string;
            db?: number;
            pattern: string;
            dryRun?: boolean;
        };
        if (!redisUrl || !pattern) {
            return NextResponse.json(
                { error: "redisUrl and pattern are required" },
                { status: 400 }
            );
        }
        if (pattern === "*") {
            return NextResponse.json(
                { error: "Pattern '*' is not allowed here — use Flush." },
                { status: 400 }
            );
        }

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            let cursor = "0";
            let scanned = 0;
            let affected = 0;
            const sample: string[] = [];

            do {
                const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 500);
                cursor = next;
                scanned += keys.length;
                if (keys.length > 0) {
                    if (sample.length < 20) {
                        for (const k of keys) {
                            if (sample.length >= 20) break;
                            sample.push(k);
                        }
                    }
                    if (dryRun) {
                        affected += keys.length;
                    } else {
                        affected += await client.del(...keys);
                    }
                }
                if (scanned >= MAX_SCAN_LIMIT) break;
            } while (cursor !== "0");

            return NextResponse.json({
                dryRun,
                affected,
                scanned,
                sample,
                truncated: scanned >= MAX_SCAN_LIMIT && cursor !== "0",
            });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
