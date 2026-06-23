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

interface ClientRow {
    id: string;
    addr: string;
    name: string;
    age: string;
    idle: string;
    db: string;
    cmd: string;
    user: string;
    raw: Record<string, string>;
}

function parseClientList(text: string): ClientRow[] {
    return text
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((line) => {
            const fields: Record<string, string> = {};
            for (const part of line.split(" ")) {
                const i = part.indexOf("=");
                if (i > 0) fields[part.slice(0, i)] = part.slice(i + 1);
            }
            return {
                id: fields.id ?? "",
                addr: fields.addr ?? "",
                name: fields.name ?? "",
                age: fields.age ?? "",
                idle: fields.idle ?? "",
                db: fields.db ?? "",
                cmd: fields.cmd ?? "",
                user: fields.user ?? "",
                raw: fields,
            };
        });
}

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { redisUrl, db, action = "list", clientId } = await request.json() as {
            redisUrl: string;
            db?: number;
            action?: "list" | "kill";
            clientId?: string;
        };
        if (!redisUrl) return NextResponse.json({ error: "redisUrl is required" }, { status: 400 });

        const client = makeClient(redisUrl, db);
        await client.connect();
        try {
            const call = (client as unknown as { call: (...a: (string | number)[]) => Promise<unknown> }).call.bind(client);
            if (action === "kill") {
                if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
                const killed = await call("CLIENT", "KILL", "ID", clientId);
                return NextResponse.json({ killed: Number(killed) });
            }
            const raw = await call("CLIENT", "LIST");
            return NextResponse.json({ clients: parseClientList(String(raw ?? "")) });
        } finally {
            await client.quit();
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
