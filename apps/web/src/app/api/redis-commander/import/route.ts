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

interface ImportedKey {
    key: string;
    type: string;
    ttl: number;
    value: unknown;
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, keys, overwrite = false } = await request.json() as {
            redisUrl: string;
            db?: number;
            keys: ImportedKey[];
            overwrite?: boolean;
        };
        if (!redisUrl || !Array.isArray(keys)) {
            return NextResponse.json(
                { error: "redisUrl and keys[] are required" },
                { status: 400 }
            );
        }
        if (keys.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            let imported = 0;
            let skipped = 0;
            const errors: string[] = [];

            for (const entry of keys) {
                try {
                    if (!entry.key || !entry.type) {
                        skipped++;
                        continue;
                    }
                    if (!overwrite && (await client.exists(entry.key))) {
                        skipped++;
                        continue;
                    }
                    const pipe = client.pipeline();
                    pipe.del(entry.key);
                    switch (entry.type) {
                        case "string":
                            pipe.set(entry.key, String(entry.value ?? ""));
                            break;
                        case "list":
                            if (Array.isArray(entry.value) && entry.value.length > 0) {
                                pipe.rpush(entry.key, ...(entry.value as string[]));
                            }
                            break;
                        case "set":
                            if (Array.isArray(entry.value) && entry.value.length > 0) {
                                pipe.sadd(entry.key, ...(entry.value as string[]));
                            }
                            break;
                        case "zset":
                            if (Array.isArray(entry.value)) {
                                for (const m of entry.value as { member: string; score: number }[]) {
                                    pipe.zadd(entry.key, m.score, m.member);
                                }
                            }
                            break;
                        case "hash":
                            if (entry.value && typeof entry.value === "object") {
                                const flat: string[] = [];
                                for (const [k, v] of Object.entries(entry.value as Record<string, string>)) {
                                    flat.push(k, v);
                                }
                                if (flat.length > 0) pipe.hset(entry.key, ...flat);
                            }
                            break;
                        default:
                            skipped++;
                            continue;
                    }
                    if (entry.ttl > 0) pipe.expire(entry.key, entry.ttl);
                    await pipe.exec();
                    imported++;
                } catch (e) {
                    errors.push(`${entry.key}: ${e instanceof Error ? e.message : String(e)}`);
                    skipped++;
                }
            }

            return NextResponse.json({ imported, skipped, errors });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
