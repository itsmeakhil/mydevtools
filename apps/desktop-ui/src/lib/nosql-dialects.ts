/**
 * Supported NoSQL dialects for the Database Explorer.
 *
 * All four speak the MongoDB wire protocol and use `mongodb://` /
 * `mongodb+srv://` connection strings, so they share the existing Mongo driver
 * path in the Rust backend — no per-type query engine is needed. `dbType` is
 * plaintext metadata persisted alongside the connection purely for branding and
 * connection-string guidance.
 */
export type DbType = "mongodb" | "documentdb" | "cosmosdb" | "ferretdb";

export interface NoSqlDialect {
    type: DbType;
    /** Proper noun — never translated. */
    label: string;
    /** Example connection string shown as the input placeholder. */
    placeholder: string;
    /**
     * Host substring identifying this managed service from a connection string.
     * Used to infer the type of legacy connections saved before `dbType` existed.
     * Omitted for self-hosted engines (Mongo/FerretDB) that share generic hosts.
     */
    hostMatch?: RegExp;
}

export const DB_DIALECTS: Record<DbType, NoSqlDialect> = {
    mongodb: {
        type: "mongodb",
        label: "MongoDB",
        placeholder: "mongodb://localhost:27017",
    },
    documentdb: {
        type: "documentdb",
        label: "AWS DocumentDB",
        // DocumentDB rejects the driver's default retryWrites=true and requires TLS.
        placeholder:
            "mongodb://user:pass@cluster.docdb.amazonaws.com:27017/?tls=true&retryWrites=false",
        hostMatch: /\.docdb(-elastic)?\.[a-z0-9-]+\.amazonaws\.com/i,
    },
    cosmosdb: {
        type: "cosmosdb",
        label: "Azure Cosmos DB",
        placeholder:
            "mongodb://acct:key@acct.mongo.cosmos.azure.com:10255/?ssl=true&retryWrites=false",
        hostMatch: /\.mongo\.cosmos\.azure\.com/i,
    },
    ferretdb: {
        type: "ferretdb",
        label: "FerretDB",
        placeholder: "mongodb://user:pass@localhost:27017/",
    },
};

/** Picker order. */
export const DB_TYPE_ORDER: DbType[] = ["mongodb", "documentdb", "cosmosdb", "ferretdb"];

/**
 * Best-effort type inference from a connection string, for connections saved
 * before `dbType` was stored. Falls back to "mongodb" — the safe generic, since
 * every dialect here is Mongo-wire compatible.
 */
export function detectDbType(connectionString: string): DbType {
    for (const type of DB_TYPE_ORDER) {
        const { hostMatch } = DB_DIALECTS[type];
        if (hostMatch && hostMatch.test(connectionString)) return type;
    }
    return "mongodb";
}
