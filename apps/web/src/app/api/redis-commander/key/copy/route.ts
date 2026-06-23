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
        const { redisUrl, key, destination, overwrite, db, destinationDb } = await request.json() as {
            redisUrl: string;
            key: string;
            destination: string;
            overwrite?: boolean;
            db?: number;
            destinationDb?: number;
        };

        if (!redisUrl || !key || !destination) {
            return NextResponse.json(
                { error: "redisUrl, key, and destination are required" },
                { status: 400 }
            );
        }

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const args: (string | number)[] = [key, destination];
            if (typeof destinationDb === "number") {
                args.push("DB", destinationDb);
            }
            if (overwrite) {
                args.push("REPLACE");
            }
            // ponytail: ioredis lacks typed copy(); fall through to generic call
            const ok = await (client as unknown as { call: (...a: (string | number)[]) => Promise<number> })
                .call("COPY", ...args);
            if (ok === 0) {
                return NextResponse.json(
                    { error: `Destination '${destination}' already exists. Enable overwrite to replace.` },
                    { status: 409 }
                );
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
