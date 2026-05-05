import { NextResponse } from "next/server";
import Redis from "ioredis";

const DANGEROUS_COMMANDS = new Set([
    "FLUSHALL",
    "FLUSHDB",
    "CONFIG",
    "DEBUG",
    "SHUTDOWN",
    "SLAVEOF",
    "REPLICAOF",
    "BGREWRITEAOF",
    "BGSAVE",
    "SAVE",
]);

const DANGER_ZONE = process.env.DANGER_ZONE === "true";

export async function POST(request: Request) {
    try {
        const { redisUrl, command } = await request.json() as {
            redisUrl: string;
            command: [string, ...string[]];
        };

        if (!redisUrl || !Array.isArray(command) || command.length === 0) {
            return NextResponse.json(
                { error: "redisUrl and command array are required" },
                { status: 400 }
            );
        }

        const [cmd, ...args] = command;
        const upperCmd = cmd!.toUpperCase();

        if (DANGEROUS_COMMANDS.has(upperCmd) && !DANGER_ZONE) {
            return NextResponse.json(
                {
                    error: `Command '${upperCmd}' is blocked. Set DANGER_ZONE=true to enable dangerous commands.`,
                },
                { status: 403 }
            );
        }

        const client = new Redis(redisUrl, {
            connectTimeout: 10000,
            lazyConnect: true,
            tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        });

        await client.connect();

        const start = Date.now();
        const result = await (client as unknown as Record<string, (...a: string[]) => Promise<unknown>>)[upperCmd.toLowerCase()]!(...args);
        const executionTime = Date.now() - start;

        await client.quit();

        return NextResponse.json({ result, executionTime });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
