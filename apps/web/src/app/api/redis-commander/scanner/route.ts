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

interface KeySample {
    key: string;
    type: string;
    bytes: number;
    ttl: number;
}

const MAX_SAMPLE = 5_000; // ponytail: hard cap to bound scan duration

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, pattern = "*", sampleSize = 1000 } = await request.json() as {
            redisUrl: string;
            db?: number;
            pattern?: string;
            sampleSize?: number;
        };
        if (!redisUrl) return NextResponse.json({ error: "redisUrl required" }, { status: 400 });

        const targetN = Math.min(sampleSize, MAX_SAMPLE);
        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);

            // Collect keys up to targetN via SCAN
            const keys: string[] = [];
            let cursor = "0";
            do {
                const [next, batch] = await client.scan(cursor, "MATCH", pattern, "COUNT", 500);
                cursor = next;
                for (const k of batch) {
                    if (keys.length >= targetN) break;
                    keys.push(k);
                }
                if (keys.length >= targetN) break;
            } while (cursor !== "0");

            // Concurrently grab type + bytes + ttl per key
            const samples: KeySample[] = [];
            const CHUNK = 50;
            for (let i = 0; i < keys.length; i += CHUNK) {
                const slice = keys.slice(i, i + CHUNK);
                const rows = await Promise.all(
                    slice.map(async (key) => {
                        const [type, bytes, ttl] = await Promise.all([
                            client.type(key),
                            call("MEMORY", "USAGE", key, "SAMPLES", 0).catch(() => 0),
                            client.ttl(key),
                        ]);
                        return { key, type, bytes: Number(bytes ?? 0), ttl };
                    }),
                );
                samples.push(...rows);
            }

            // Aggregate
            const byType: Record<string, { count: number; bytes: number }> = {};
            let totalBytes = 0;
            for (const s of samples) {
                totalBytes += s.bytes;
                const slot = byType[s.type] ?? (byType[s.type] = { count: 0, bytes: 0 });
                slot.count += 1;
                slot.bytes += s.bytes;
            }

            const topByBytes = [...samples].sort((a, b) => b.bytes - a.bytes).slice(0, 50);
            const ttlSummary = {
                noTtl: samples.filter((s) => s.ttl === -1).length,
                expiring: samples.filter((s) => s.ttl > 0).length,
                expired: samples.filter((s) => s.ttl === -2).length,
            };

            return NextResponse.json({
                pattern,
                sampledKeys: samples.length,
                truncated: cursor !== "0",
                totalBytes,
                byType,
                topByBytes,
                ttlSummary,
            });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
