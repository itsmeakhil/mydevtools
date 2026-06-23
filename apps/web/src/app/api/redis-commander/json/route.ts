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

/** RedisJSON wrapper: POST { redisUrl, db?, key, action, path?, value? } */
export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, key, action, path = "$", value, modules } = await request.json() as {
            redisUrl: string;
            db?: number;
            key: string;
            action: "get" | "set" | "del" | "type" | "modules";
            path?: string;
            value?: unknown;
            modules?: boolean;
        };
        if (!redisUrl) return NextResponse.json({ error: "redisUrl required" }, { status: 400 });

        const client = makeClient(redisUrl, db);
        await client.connect();
        const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
        try {
            if (action === "modules") {
                const list = await call("MODULE", "LIST");
                return NextResponse.json({ modules: list });
            }
            if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

            switch (action) {
                case "get": {
                    const raw = await call("JSON.GET", key, path);
                    return NextResponse.json({ value: raw });
                }
                case "set": {
                    if (value === undefined) {
                        return NextResponse.json({ error: "value required" }, { status: 400 });
                    }
                    const result = await call("JSON.SET", key, path, JSON.stringify(value));
                    return NextResponse.json({ result });
                }
                case "del": {
                    const deleted = await call("JSON.DEL", key, path);
                    return NextResponse.json({ deleted });
                }
                case "type": {
                    const t = await call("JSON.TYPE", key, path);
                    return NextResponse.json({ type: t });
                }
                default:
                    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
            }
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Required modules — modules check: GET ?redisUrl=... */
export async function GET(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const redisUrl = url.searchParams.get("redisUrl");
    const db = url.searchParams.get("db");
    if (!redisUrl) return new Response("redisUrl required", { status: 400 });

    const client = makeClient(redisUrl, db ? parseInt(db, 10) : undefined);
    try {
        await client.connect();
        const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
        const list = (await call("MODULE", "LIST")) as unknown[];
        const names: string[] = [];
        for (const entry of list ?? []) {
            const arr = entry as unknown[];
            // Each entry is array: [name, "ReJSON", ver, N, ...]
            for (let i = 0; i < arr.length; i += 2) {
                if (arr[i] === "name") names.push(String(arr[i + 1]));
            }
        }
        return NextResponse.json({ modules: names });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        try { await client.quit(); } catch { /* noop */ }
    }
}
