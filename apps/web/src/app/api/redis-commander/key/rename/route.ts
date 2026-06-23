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
        const { redisUrl, key, newKey, overwrite, db } = await request.json() as {
            redisUrl: string;
            key: string;
            newKey: string;
            overwrite?: boolean;
            db?: number;
        };

        if (!redisUrl || !key || !newKey) {
            return NextResponse.json(
                { error: "redisUrl, key, and newKey are required" },
                { status: 400 }
            );
        }
        if (key === newKey) {
            return NextResponse.json({ error: "newKey must differ from key" }, { status: 400 });
        }

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            if (overwrite) {
                await client.rename(key, newKey);
            } else {
                const ok = await client.renamenx(key, newKey);
                if (ok === 0) {
                    return NextResponse.json(
                        { error: `Destination '${newKey}' already exists. Enable overwrite to replace.` },
                        { status: 409 }
                    );
                }
            }
            return NextResponse.json({ success: true });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
