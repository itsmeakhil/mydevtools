import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import Redis from "ioredis";

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl } = await request.json();

        if (!redisUrl) {
            return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });
        }

        if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
            return NextResponse.json(
                { error: "redisUrl must start with redis:// or rediss://" },
                { status: 400 }
            );
        }

        const client = new Redis(redisUrl, {
            connectTimeout: 10000,
            lazyConnect: true,
            tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        });

        await client.connect();
        const info = await client.info("server");
        const pong = await client.ping();
        await client.quit();

        const versionMatch = info.match(/redis_version:([^\r\n]+)/);
        const version = versionMatch ? versionMatch[1]!.trim() : "unknown";

        return NextResponse.json({ success: true, version, pong });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
