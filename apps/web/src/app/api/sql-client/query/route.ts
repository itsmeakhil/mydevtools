import { requireBackendSession } from "@/lib/require-backend-session";
import { NextResponse } from "next/server";
import { getSqlPool, releaseSqlPool, SqlDbType } from "@/lib/sql-client-pool";
import { splitSqlStatements } from "@/lib/sql-split";

const MAX_ROWS = 5000;

interface StatementResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

export async function POST(request: Request) {
  const authError = await requireBackendSession(request);
  if (authError) return authError;

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
    const statements = splitSqlStatements(query);
    if (statements.length === 0) {
      return NextResponse.json({ error: "No SQL statement provided" }, { status: 400 });
    }

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
      const results: StatementResult[] = [];

      for (const stmt of statements) {
        // ponytail: cooperative abort between statements only. True mid-statement
        // cancel needs pg_cancel_backend / conn.destroy(); add if long queries need killing.
        if (request.signal.aborted) throw new Error("Query aborted");

        if (handle.pg) {
          const r = await handle.pg.query(stmt);
          const rows = (r.rows ?? []) as Record<string, unknown>[];
          results.push({
            rows: rows.slice(0, rowLimit),
            columns: r.fields?.map((f: { name: string }) => f.name) ?? [],
            rowCount: r.rowCount ?? rows.length,
          });
        } else if (handle.mysql) {
          const [rawRows, rawFields] = await handle.mysql.query(stmt);
          const rows = Array.isArray(rawRows) ? (rawRows as Record<string, unknown>[]) : [];
          const fields = Array.isArray(rawFields) ? (rawFields as { name: string }[]) : [];
          results.push({
            rows: rows.slice(0, rowLimit),
            columns: fields.map((f) => f.name),
            rowCount: rows.length,
          });
        }
      }

      const last = results[results.length - 1] ?? { rows: [], columns: [], rowCount: 0 };
      return NextResponse.json({
        rows: last.rows,
        columns: last.columns,
        rowCount: last.rowCount,
        executionTime: Date.now() - start,
        results,
      });
    } finally {
      releaseSqlPool(handle.key);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
