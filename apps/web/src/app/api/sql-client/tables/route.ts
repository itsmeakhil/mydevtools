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

            const tablesRes = await client.query(`
                SELECT
                    t.table_schema AS schema,
                    t.table_name AS name,
                    t.table_type AS type,
                    (
                        SELECT COUNT(*)::int
                        FROM information_schema.columns c
                        WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
                    ) AS column_count
                FROM information_schema.tables t
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY t.table_schema, t.table_name
            `);

            const columnsRes = await client.query(`
                SELECT
                    c.table_schema AS schema,
                    c.table_name,
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    c.column_default,
                    c.ordinal_position
                FROM information_schema.columns c
                WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
                ORDER BY c.table_schema, c.table_name, c.ordinal_position
            `);

            client.release();
            await pool.end();

            return NextResponse.json({ tables: tablesRes.rows, columns: columnsRes.rows });
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

            const [tables] = await conn.execute(`
                SELECT
                    TABLE_SCHEMA AS \`schema\`,
                    TABLE_NAME AS name,
                    TABLE_TYPE AS type,
                    TABLE_ROWS AS row_estimate
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                ORDER BY TABLE_NAME
            `);

            const [columns] = await conn.execute(`
                SELECT
                    TABLE_SCHEMA AS \`schema\`,
                    TABLE_NAME AS table_name,
                    COLUMN_NAME AS column_name,
                    DATA_TYPE AS data_type,
                    IS_NULLABLE AS is_nullable,
                    COLUMN_DEFAULT AS column_default,
                    ORDINAL_POSITION AS ordinal_position
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                ORDER BY TABLE_NAME, ORDINAL_POSITION
            `);

            await conn.end();

            return NextResponse.json({ tables, columns });
        }

        return NextResponse.json({ error: `Unsupported database type: ${type}` }, { status: 400 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
