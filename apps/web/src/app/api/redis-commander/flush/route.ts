import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import Redis from "ioredis";

const DANGER_ZONE = process.env.DANGER_ZONE === "true";

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, pattern } = await request.json() as {
            redisUrl: string;
            pattern?: string;
        };

        if (!redisUrl) {
            return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });
        }

        const isFlushAll = !pattern || pattern === "*";

        if (isFlushAll && !DANGER_ZONE) {
            return NextResponse.json(
                {
                    error:
                        "Flushing the entire database is blocked. Set DANGER_ZONE=true to enable FLUSHDB.",
                },
                { status: 403 }
            );
        }

        const client = new Redis(redisUrl, {
            connectTimeout: 10000,
            lazyConnect: true,
            tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        });

        await client.connect();

        let deleted = 0;

        if (isFlushAll) {
            await client.flushdb();
            deleted = -1;
        } else {
            let cursor = "0";
            do {
                const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern!, "COUNT", 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    deleted += await client.del(...keys);
                }
            } while (cursor !== "0");
        }

        await client.quit();

        return NextResponse.json({ success: true, deleted });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
