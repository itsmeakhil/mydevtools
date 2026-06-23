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

interface StreamEntry {
    id: string;
    fields: Record<string, string>;
}

function fieldsArrayToObject(arr: unknown): Record<string, string> {
    if (!Array.isArray(arr)) return {};
    const out: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) {
        const k = String(arr[i] ?? "");
        const v = String(arr[i + 1] ?? "");
        if (k) out[k] = v;
    }
    return out;
}

function normalizeEntries(raw: unknown): StreamEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => {
        const r = row as [string, unknown];
        return { id: String(r[0]), fields: fieldsArrayToObject(r[1]) };
    });
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const body = await request.json() as {
            redisUrl: string;
            db?: number;
            key: string;
            action: "range" | "add" | "del" | "groups" | "pending" | "ack" | "claim" | "info" | "trim";
            start?: string;
            end?: string;
            count?: number;
            fields?: Record<string, string>;
            id?: string;
            ids?: string[];
            group?: string;
            consumer?: string;
            maxlen?: number;
            minIdle?: number;
        };
        const { redisUrl, db, key, action } = body;
        if (!redisUrl || !key || !action) {
            return NextResponse.json({ error: "redisUrl, key, action required" }, { status: 400 });
        }

        const client = makeClient(redisUrl, db);
        await client.connect();
        const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
        try {
            switch (action) {
                case "info": {
                    const info = await call("XINFO", "STREAM", key);
                    // Return as raw key-value pairs (Redis nested array)
                    return NextResponse.json({ info });
                }
                case "range": {
                    const start = body.start ?? "-";
                    const end = body.end ?? "+";
                    const count = body.count ?? 50;
                    const raw = await call("XRANGE", key, start, end, "COUNT", count);
                    return NextResponse.json({ entries: normalizeEntries(raw) });
                }
                case "add": {
                    const flat: string[] = [];
                    for (const [k, v] of Object.entries(body.fields ?? {})) flat.push(k, v);
                    if (flat.length === 0) {
                        return NextResponse.json({ error: "fields required" }, { status: 400 });
                    }
                    const id = await call("XADD", key, body.id ?? "*", ...flat);
                    return NextResponse.json({ id });
                }
                case "del": {
                    if (!body.ids || body.ids.length === 0) {
                        return NextResponse.json({ error: "ids required" }, { status: 400 });
                    }
                    const deleted = await call("XDEL", key, ...body.ids);
                    return NextResponse.json({ deleted });
                }
                case "trim": {
                    if (typeof body.maxlen !== "number") {
                        return NextResponse.json({ error: "maxlen required" }, { status: 400 });
                    }
                    const trimmed = await call("XTRIM", key, "MAXLEN", "~", body.maxlen);
                    return NextResponse.json({ trimmed });
                }
                case "groups": {
                    const groups = await call("XINFO", "GROUPS", key);
                    return NextResponse.json({ groups });
                }
                case "pending": {
                    if (!body.group) return NextResponse.json({ error: "group required" }, { status: 400 });
                    const pending = await call("XPENDING", key, body.group);
                    return NextResponse.json({ pending });
                }
                case "ack": {
                    if (!body.group || !body.ids || body.ids.length === 0) {
                        return NextResponse.json({ error: "group + ids required" }, { status: 400 });
                    }
                    const acked = await call("XACK", key, body.group, ...body.ids);
                    return NextResponse.json({ acked });
                }
                case "claim": {
                    if (!body.group || !body.consumer || !body.ids || body.ids.length === 0) {
                        return NextResponse.json({ error: "group + consumer + ids required" }, { status: 400 });
                    }
                    const minIdle = body.minIdle ?? 0;
                    const claimed = await call("XCLAIM", key, body.group, body.consumer, minIdle, ...body.ids);
                    return NextResponse.json({ claimed: normalizeEntries(claimed) });
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
