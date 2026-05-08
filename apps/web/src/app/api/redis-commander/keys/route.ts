import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import Redis from "ioredis";

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, pattern = "*", cursor = "0", count = 100 } = await request.json() as {
            redisUrl: string;
            pattern?: string;
            cursor?: string;
            count?: number;
        };

        if (!redisUrl) {
            return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });
        }

        const client = new Redis(redisUrl, {
            connectTimeout: 10000,
            lazyConnect: true,
            tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        });

        await client.connect();

        const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", count);

        const keyDetails = await Promise.all(
            keys.map(async (key) => {
                const [type, ttl] = await Promise.all([client.type(key), client.ttl(key)]);
                return { key, type, ttl };
            })
        );

        const dbSize = await client.dbsize();
        await client.quit();

        return NextResponse.json({ cursor: nextCursor, keys: keyDetails, dbSize });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
