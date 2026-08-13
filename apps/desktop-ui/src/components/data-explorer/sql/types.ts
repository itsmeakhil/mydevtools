export type DbType = "postgresql" | "mysql" | "mariadb";

export interface SqlConnectionConfig {
    type: DbType;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    /**
     * Verify the server's TLS certificate. Absent on connections saved before
     * this existed — those were created against a stack that accepted any
     * certificate, so `sqlBody` sends `false` for them and they keep working.
     * Anything new defaults to verifying. See `lib/sql-request.ts`.
     */
    sslVerify?: boolean;
}

export interface SavedSqlConnection {
    id: string;
    userId: string;
    /** AES-GCM ciphertext of the JSON-serialised SqlConnectionConfig. */
    encryptedData: string;
    iv: string;
    /** Display name — stored unencrypted. */
    name: string;
    /** DB type — stored unencrypted for sidebar icons. */
    type: DbType;
    createdAt: number;
    lastUsedAt: number;
    /** Content-edit clock (sync LWW); server-managed. */
    updatedAt?: number;
    /** Populated client-side after decryption — never sent to the server. */
    config?: SqlConnectionConfig;
}

export interface TableInfo {
    schema: string;
    name: string;
    type: string;
    column_count?: number;
    row_estimate?: number;
}

export interface ColumnInfo {
    schema: string;
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
    ordinal_position: number;
}

export interface PrimaryKeyInfo {
    schema: string;
    table_name: string;
    column_name: string;
}

export interface SchemaInfo {
    tables: TableInfo[];
    columns: ColumnInfo[];
    primaryKeys?: PrimaryKeyInfo[];
}

export interface QueryResult {
    /**
     * Positional against `columns`, not keyed by column name: `SELECT a.id,
     * b.id` produces two columns called `id`, and an object would keep only
     * the second. Also keeps a column literally named `__proto__` from
     * poisoning the row object.
     */
    rows: unknown[][];
    columns: string[];
    /** Rows the statement produced, before the server's display cap. */
    rowCount: number;
    /** `rows` holds fewer than `rowCount` — say so rather than imply totality. */
    truncated?: boolean;
    executionTime: number;
}

export interface QueryTab {
    id: string;
    connectionId: string;
    connectionName: string;
    connectionType: DbType;
    query: string;
    result: QueryResult | null;
    error: string | null;
    loading: boolean;
    /** Source table when opened via the schema sidebar — enables grid editing. */
    table?: { schema: string; name: string };
}
