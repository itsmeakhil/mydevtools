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

function parseInfo(raw: string): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {};
    let section = "default";
    for (const lineRaw of raw.split(/\r?\n/)) {
        const line = lineRaw.trim();
        if (!line) continue;
        if (line.startsWith("#")) {
            section = line.slice(1).trim().toLowerCase() || "default";
            out[section] ??= {};
            continue;
        }
        const idx = line.indexOf(":");
        if (idx <= 0) continue;
        (out[section] ??= {})[line.slice(0, idx)] = line.slice(idx + 1);
    }
    return out;
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db } = await request.json() as { redisUrl: string; db?: number };
        if (!redisUrl) return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const [infoRaw, dbsize] = await Promise.all([client.info(), client.dbsize()]);
            return NextResponse.json({ sections: parseInfo(infoRaw), dbsize });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
