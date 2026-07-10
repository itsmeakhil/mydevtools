export type DbType = "postgresql" | "mysql" | "mariadb";

export interface SqlConnectionConfig {
    type: DbType;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
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

export interface SchemaInfo {
    tables: TableInfo[];
    columns: ColumnInfo[];
}

export interface QueryResult {
    rows: Record<string, unknown>[];
    columns: string[];
    rowCount: number;
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
}
