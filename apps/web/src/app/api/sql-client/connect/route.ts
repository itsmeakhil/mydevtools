import { NextResponse } from "next/server";
import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";

export async function POST(request: Request) {
    try {
        const { type, host, port, database, username, password, ssl } = await request.json();

        if (!type || !host || !database) {
            return NextResponse.json({ error: "type, host, and database are required" }, { status: 400 });
        }

        if (type === "postgresql") {
            const pool = new PgPool({
                host,
                port: port || 5432,
                database,
                user: username,
                password,
                ssl: ssl ? { rejectUnauthorized: false } : false,
                connectionTimeoutMillis: 10000,
            });
            const client = await pool.connect();
            const res = await client.query("SELECT version()");
            client.release();
            await pool.end();
            return NextResponse.json({ success: true, version: res.rows[0]?.version });
        }

        if (type === "mysql" || type === "mariadb") {
            const conn = await mysql.createConnection({
                host,
                port: port || 3306,
                database,
                user: username,
                password,
                ssl: ssl ? { rejectUnauthorized: false } : undefined,
                connectTimeout: 10000,
            });
            const [rows] = await conn.execute("SELECT VERSION() as version");
            await conn.end();
            const version = (rows as { version: string }[])[0]?.version;
            return NextResponse.json({ success: true, version });
        }

        return NextResponse.json({ error: `Unsupported database type: ${type}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
