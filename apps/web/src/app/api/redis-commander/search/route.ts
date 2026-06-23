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
        const body = await request.json() as {
            redisUrl: string;
            db?: number;
            action: "list" | "info" | "search" | "explain";
            index?: string;
            query?: string;
            offset?: number;
            limit?: number;
        };
        const { redisUrl, db, action } = body;
        if (!redisUrl || !action) {
            return NextResponse.json({ error: "redisUrl + action required" }, { status: 400 });
        }
        const client = makeClient(redisUrl, db);
        await client.connect();
        const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
        try {
            switch (action) {
                case "list": {
                    const indexes = await call("FT._LIST");
                    return NextResponse.json({ indexes });
                }
                case "info": {
                    if (!body.index) return NextResponse.json({ error: "index required" }, { status: 400 });
                    const info = await call("FT.INFO", body.index);
                    return NextResponse.json({ info });
                }
                case "search": {
                    if (!body.index || !body.query) {
                        return NextResponse.json({ error: "index + query required" }, { status: 400 });
                    }
                    const offset = body.offset ?? 0;
                    const limit = body.limit ?? 25;
                    const raw = await call("FT.SEARCH", body.index, body.query, "LIMIT", offset, limit);
                    // Raw shape: [total, key1, [field1, val1, ...], key2, [...], ...]
                    const arr = raw as unknown[];
                    const total = Number(arr[0] ?? 0);
                    const results: { key: string; fields: Record<string, string> }[] = [];
                    for (let i = 1; i < arr.length; i += 2) {
                        const key = String(arr[i]);
                        const fieldArr = arr[i + 1] as unknown[];
                        const fields: Record<string, string> = {};
                        if (Array.isArray(fieldArr)) {
                            for (let j = 0; j < fieldArr.length; j += 2) {
                                fields[String(fieldArr[j])] = String(fieldArr[j + 1] ?? "");
                            }
                        }
                        results.push({ key, fields });
                    }
                    return NextResponse.json({ total, results });
                }
                case "explain": {
                    if (!body.index || !body.query) {
                        return NextResponse.json({ error: "index + query required" }, { status: 400 });
                    }
                    const explain = await call("FT.EXPLAIN", body.index, body.query);
                    return NextResponse.json({ explain });
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
