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

const MAX_EXPORT_KEYS = 10_000;

interface ExportedKey {
    key: string;
    type: string;
    ttl: number;
    value: unknown;
}

async function fetchValue(client: Redis, key: string, type: string): Promise<unknown> {
    switch (type) {
        case "string":
            return await client.get(key);
        case "list":
            return await client.lrange(key, 0, -1);
        case "set":
            return await client.smembers(key);
        case "zset": {
            const raw = await client.zrange(key, 0, -1, "WITHSCORES");
            const pairs: { member: string; score: number }[] = [];
            for (let i = 0; i < raw.length; i += 2) {
                pairs.push({ member: raw[i]!, score: parseFloat(raw[i + 1]!) });
            }
            return pairs;
        }
        case "hash":
            return await client.hgetall(key);
        default:
            return null;
    }
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, pattern = "*" } = await request.json() as {
            redisUrl: string;
            db?: number;
            pattern?: string;
        };
        if (!redisUrl) return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const keys: string[] = [];
            let cursor = "0";
            do {
                const [next, batch] = await client.scan(cursor, "MATCH", pattern, "COUNT", 500);
                cursor = next;
                for (const k of batch) {
                    if (keys.length >= MAX_EXPORT_KEYS) break;
                    keys.push(k);
                }
                if (keys.length >= MAX_EXPORT_KEYS) break;
            } while (cursor !== "0");

            const out: ExportedKey[] = [];
            // ponytail: small concurrency cap; raise if export latency dominates
            const CHUNK = 25;
            for (let i = 0; i < keys.length; i += CHUNK) {
                const slice = keys.slice(i, i + CHUNK);
                const detailed = await Promise.all(
                    slice.map(async (key) => {
                        const [type, ttl] = await Promise.all([client.type(key), client.ttl(key)]);
                        const value = await fetchValue(client, key, type);
                        return { key, type, ttl, value };
                    }),
                );
                out.push(...detailed);
            }

            return NextResponse.json({
                exportedAt: Date.now(),
                pattern,
                count: out.length,
                truncated: keys.length >= MAX_EXPORT_KEYS,
                keys: out,
            });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
