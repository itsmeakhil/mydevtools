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

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, key, db } = await request.json() as { redisUrl: string; key: string; db?: number };

        if (!redisUrl || !key) {
            return NextResponse.json({ error: "redisUrl and key are required" }, { status: 400 });
        }

        const client = makeClient(redisUrl, db);
        await client.connect();

        const [type, ttl] = await Promise.all([client.type(key), client.ttl(key)]);

        let value: unknown = null;

        switch (type) {
            case "string":
                value = await client.get(key);
                break;
            case "list":
                value = await client.lrange(key, 0, -1);
                break;
            case "set":
                value = await client.smembers(key);
                break;
            case "zset": {
                const raw = await client.zrange(key, 0, -1, "WITHSCORES");
                const pairs: { member: string; score: number }[] = [];
                for (let i = 0; i < raw.length; i += 2) {
                    pairs.push({ member: raw[i]!, score: parseFloat(raw[i + 1]!) });
                }
                value = pairs;
                break;
            }
            case "hash":
                value = await client.hgetall(key);
                break;
            default:
                value = null;
        }

        await client.quit();
        return NextResponse.json({ key, type, ttl, value });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, key, type, value, ttl, db } = await request.json() as {
            redisUrl: string;
            key: string;
            type: string;
            value: unknown;
            ttl?: number;
            db?: number;
        };

        if (!redisUrl || !key || !type) {
            return NextResponse.json(
                { error: "redisUrl, key, and type are required" },
                { status: 400 }
            );
        }

        const client = makeClient(redisUrl, db);
        await client.connect();

        const pipeline = client.pipeline();

        switch (type) {
            case "string":
                pipeline.set(key, String(value));
                break;
            case "list":
                pipeline.del(key);
                if (Array.isArray(value) && value.length > 0) {
                    pipeline.rpush(key, ...(value as string[]));
                }
                break;
            case "set":
                pipeline.del(key);
                if (Array.isArray(value) && value.length > 0) {
                    pipeline.sadd(key, ...(value as string[]));
                }
                break;
            case "zset":
                pipeline.del(key);
                if (Array.isArray(value)) {
                    for (const item of value as { member: string; score: number }[]) {
                        pipeline.zadd(key, item.score, item.member);
                    }
                }
                break;
            case "hash":
                pipeline.del(key);
                if (value && typeof value === "object") {
                    const flat: string[] = [];
                    for (const [k, v] of Object.entries(value as Record<string, string>)) {
                        flat.push(k, v);
                    }
                    if (flat.length > 0) pipeline.hset(key, ...flat);
                }
                break;
            default:
                await client.quit();
                return NextResponse.json({ error: `Unsupported type: ${type}` }, { status: 400 });
        }

        if (ttl && ttl > 0) {
            pipeline.expire(key, ttl);
        } else if (ttl === -1) {
            pipeline.persist(key);
        }

        await pipeline.exec();
        await client.quit();

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, key, db } = await request.json() as { redisUrl: string; key: string; db?: number };

        if (!redisUrl || !key) {
            return NextResponse.json({ error: "redisUrl and key are required" }, { status: 400 });
        }

        const client = makeClient(redisUrl, db);
        await client.connect();
        const deleted = await client.del(key);
        await client.quit();

        return NextResponse.json({ deleted });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
