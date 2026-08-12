import { elasticsearchAdapter } from "./adapters/elasticsearch";
import { firestoreAdapter } from "./adapters/firestore";
import { mongodbAdapter } from "./adapters/mongodb";
import { redisAdapter } from "./adapters/redis";
import { mariadbAdapter, mysqlAdapter, postgresqlAdapter, sqliteAdapter } from "./adapters/sql";
import type { SourceAdapter, SourceId } from "./types";

/**
 * The one registry. Adding a data source type means writing an adapter file
 * and adding it here — nothing else in the shell, sidebar, tab bar, store,
 * Rust router, or the six global tool registries changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SOURCES: Record<SourceId, SourceAdapter<any, any>> = {
    postgresql: postgresqlAdapter,
    mysql: mysqlAdapter,
    mariadb: mariadbAdapter,
    sqlite: sqliteAdapter,
    mongodb: mongodbAdapter,
    redis: redisAdapter,
    firestore: firestoreAdapter,
    elasticsearch: elasticsearchAdapter,
};

/**
 * Display order in the sidebar and the source picker. The three SQL engines
 * are separate ids rather than one `sql` adapter with an engine dropdown: the
 * shell reads `icon`/`label`/`accent` per adapter for both the group header and
 * every connection row, so one adapter would put PostgreSQL, MySQL and MariaDB
 * under a single generic badge. They share one implementation via a factory.
 */
export const SOURCE_ORDER: SourceId[] = [
    "postgresql",
    "mysql",
    "mariadb",
    "sqlite",
    "mongodb",
    "redis",
    "firestore",
    "elasticsearch",
];

/**
 * Resolve an adapter. Returns null for an unknown id — a connection saved by a
 * newer build must degrade to an "unsupported source" row, not crash the list.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdapter(sourceId: SourceId): SourceAdapter<any, any> | null {
    return SOURCES[sourceId] ?? null;
}
