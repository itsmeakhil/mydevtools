import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";

export const maxDuration = 30;

export async function POST(request: Request) {
    const authError = await requireBackendSession(request);
    if (authError) return authError;

    try {
        const { type, host, port, username, password, ssl } = await request.json();

        if (!type || !host) {
            return NextResponse.json({ error: "type and host are required" }, { status: 400 });
        }

        if (type === "postgresql") {
            const pool = new PgPool({
                host,
                port: port || 5432,
                database: "postgres",
                user: username,
                password,
                ssl: ssl ? { rejectUnauthorized: false } : false,
                connectionTimeoutMillis: 10000,
            });
            const client = await pool.connect();
            const res = await client.query(
                "SELECT datname AS name FROM pg_database WHERE datistemplate = false ORDER BY datname"
            );
            client.release();
            await pool.end();
            return NextResponse.json({ databases: res.rows.map((r: { name: string }) => r.name) });
        }

        if (type === "mysql" || type === "mariadb") {
            const conn = await mysql.createConnection({
                host,
                port: port || 3306,
                user: username,
                password,
                ssl: ssl ? { rejectUnauthorized: false } : undefined,
                connectTimeout: 10000,
            });
            const [rows] = await conn.execute("SHOW DATABASES");
            await conn.end();
            const databases = (rows as { Database: string }[]).map((r) => r.Database);
            return NextResponse.json({ databases });
        }

        return NextResponse.json({ error: `Unsupported database type: ${type}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
