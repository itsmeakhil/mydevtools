import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import { getSqlPool, releaseSqlPool, SqlDbType } from "@/lib/sql-client-pool";

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { type, host, port, database, username, password, ssl } = await request.json();

        if (!type || !host || !database) {
            return NextResponse.json({ error: "type, host, and database are required" }, { status: 400 });
        }

        if (type === "postgresql" || type === "mysql" || type === "mariadb") {
            const handle = await getSqlPool({
                type: type as SqlDbType,
                host,
                port: Number(port) || 0,
                database,
                username,
                password,
                ssl: Boolean(ssl),
            });

            try {
                if (handle.pg) {
                    const res = await handle.pg.query("SELECT version()");
                    return NextResponse.json({ success: true, version: res.rows[0]?.version });
                }

                const [rows] = await handle.mysql!.query("SELECT VERSION() as version");
                const version = (rows as { version: string }[])[0]?.version;
                return NextResponse.json({ success: true, version });
            } finally {
                releaseSqlPool(handle.key);
            }
        }

        return NextResponse.json({ error: `Unsupported database type: ${type}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
