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
                    const tablesRes = await handle.pg.query(`
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

                    const columnsRes = await handle.pg.query(`
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

                    return NextResponse.json({ tables: tablesRes.rows, columns: columnsRes.rows });
                }

                const [tables] = await handle.mysql!.query(`
                    SELECT
                        TABLE_SCHEMA AS \`schema\`,
                        TABLE_NAME AS name,
                        TABLE_TYPE AS type,
                        TABLE_ROWS AS row_estimate
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = DATABASE()
                    ORDER BY TABLE_NAME
                `);

                const [columns] = await handle.mysql!.query(`
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

                return NextResponse.json({ tables, columns });
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
