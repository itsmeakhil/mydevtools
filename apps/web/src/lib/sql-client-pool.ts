import { Pool as PgPool } from "pg";
import mysql from "mysql2/promise";

export type SqlDbType = "postgresql" | "mysql" | "mariadb";

export interface SqlConnParams {
  type: SqlDbType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface SqlPoolHandle {
  key: string;
  type: SqlDbType;
  pg?: PgPool;
  mysql?: mysql.Pool;
}

interface PooledSql {
  key: string;
  type: SqlDbType;
  pg?: PgPool;
  mysql?: mysql.Pool;
  lastUsed: number;
  refCount: number;
}

const IDLE_TIMEOUT_MS = 300000; // 5 minutes
const STATEMENT_TIMEOUT_MS = 30000;
const MAX_DRIVER_POOL = 5;

export function poolKey(p: SqlConnParams): string {
  return JSON.stringify([p.type, p.host, p.port, p.database, p.username, p.password, p.ssl]);
}

class SqlPoolManager {
  private static instance: SqlPoolManager;
  private pool = new Map<string, PooledSql>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  static getInstance(): SqlPoolManager {
    if (!SqlPoolManager.instance) SqlPoolManager.instance = new SqlPoolManager();
    return SqlPoolManager.instance;
  }

  async get(p: SqlConnParams): Promise<SqlPoolHandle> {
    const key = poolKey(p);
    const existing = this.pool.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      existing.refCount++;
      return { key, type: existing.type, pg: existing.pg, mysql: existing.mysql };
    }

    const entry: PooledSql = { key, type: p.type, lastUsed: Date.now(), refCount: 1 };

    if (p.type === "postgresql") {
      entry.pg = new PgPool({
        host: p.host,
        port: p.port || 5432,
        database: p.database,
        user: p.username,
        password: p.password,
        ssl: p.ssl ? { rejectUnauthorized: false } : false,
        max: MAX_DRIVER_POOL,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: STATEMENT_TIMEOUT_MS,
      });
    } else {
      entry.mysql = mysql.createPool({
        host: p.host,
        port: p.port || 3306,
        database: p.database,
        user: p.username,
        password: p.password,
        ssl: p.ssl ? { rejectUnauthorized: false } : undefined,
        connectionLimit: MAX_DRIVER_POOL,
        connectTimeout: 10000,
        // We split statements ourselves (lib/sql-split), so no multipleStatements.
      });
    }

    this.pool.set(key, entry);
    return { key, type: entry.type, pg: entry.pg, mysql: entry.mysql };
  }

  release(key: string): void {
    const entry = this.pool.get(key);
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1);
      entry.lastUsed = Date.now();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.pool.entries()) {
      if (entry.refCount === 0 && now - entry.lastUsed > IDLE_TIMEOUT_MS) {
        this.closeEntry(entry);
        this.pool.delete(key);
      }
    }
  }

  private closeEntry(entry: PooledSql): void {
    entry.pg?.end().catch(console.error);
    entry.mysql?.end().catch(console.error);
  }

  async closeAll(): Promise<void> {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    for (const entry of this.pool.values()) this.closeEntry(entry);
    this.pool.clear();
  }
}

export async function getSqlPool(p: SqlConnParams): Promise<SqlPoolHandle> {
  return SqlPoolManager.getInstance().get(p);
}

export function releaseSqlPool(key: string): void {
  SqlPoolManager.getInstance().release(key);
}

export async function closeAllSqlPools(): Promise<void> {
  await SqlPoolManager.getInstance().closeAll();
}
