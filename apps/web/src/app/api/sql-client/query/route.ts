import { NextResponse } from "next/server";
import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";

const MAX_ROWS = 5000;
const TIMEOUT_MS = 30000;

export async function POST(request: Request) {
    try {
        const { type, host, port, database, username, password, ssl, query, limit } =
            await request.json();

        if (!type || !host || !database || !query) {
            return NextResponse.json(
                { error: "type, host, database, and query are required" },
                { status: 400 }
            );
        }

        const rowLimit = Math.min(Number(limit) || 500, MAX_ROWS);
        const start = Date.now();

        if (type === "postgresql") {
            const pool = new PgPool({
                host,
                port: port || 5432,
                database,
                user: username,
                password,
                ssl: ssl ? { rejectUnauthorized: false } : false,
                connectionTimeoutMillis: TIMEOUT_MS,
                statement_timeout: TIMEOUT_MS,
            });

            const client = await pool.connect();
            try {
                // Split statements by semicolon and execute each, returning last result
                const statements = query
                    .split(";")
                    .map((s: string) => s.trim())
                    .filter(Boolean);

                let result = null;
                for (const stmt of statements) {
                    result = await client.query(stmt);
                }

                const elapsed = Date.now() - start;
                const rows = result?.rows?.slice(0, rowLimit) ?? [];
                const columns = result?.fields?.map((f: { name: string }) => f.name) ?? [];
                const rowCount = result?.rowCount ?? rows.length;

                return NextResponse.json({ rows, columns, rowCount, executionTime: elapsed });
            } finally {
                client.release();
                await pool.end();
            }
        }

        if (type === "mysql" || type === "mariadb") {
            const conn = await mysql.createConnection({
                host,
                port: port || 3306,
                database,
                user: username,
                password,
                ssl: ssl ? { rejectUnauthorized: false } : undefined,
                connectTimeout: TIMEOUT_MS,
                multipleStatements: true,
            });

            try {
                const [rawRows, rawFields] = await conn.execute(query);
                const elapsed = Date.now() - start;

                // multipleStatements may return arrays of result sets
                const isMulti = Array.isArray(rawRows) && Array.isArray(rawRows[0]);
                const rows = isMulti
                    ? (((rawRows as unknown) as unknown[][]).at(-1) as Record<string, unknown>[]) ?? []
                    : (rawRows as Record<string, unknown>[]);

                const fields = isMulti
                    ? (((rawFields as unknown) as unknown[][]).at(-1) as { name: string }[]) ?? []
                    : (rawFields as { name: string }[]);

                const slicedRows = Array.isArray(rows) ? rows.slice(0, rowLimit) : [];
                const columns = Array.isArray(fields) ? fields.map((f) => f.name) : [];

                return NextResponse.json({
                    rows: slicedRows,
                    columns,
                    rowCount: Array.isArray(rows) ? rows.length : 0,
                    executionTime: elapsed,
                });
            } finally {
                await conn.end();
            }
        }

        return NextResponse.json({ error: `Unsupported database type: ${type}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
