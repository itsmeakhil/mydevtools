import { firestoreAdapter } from "./adapters/firestore";
import { mongodbAdapter } from "./adapters/mongodb";
import { redisAdapter } from "./adapters/redis";
import type { SourceAdapter, SourceId } from "./types";

/**
 * The one registry. Adding a data source type means writing an adapter file
 * and adding it here — nothing else in the shell, sidebar, tab bar, store,
 * Rust router, or the six global tool registries changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SOURCES: Record<SourceId, SourceAdapter<any, any>> = {
    mongodb: mongodbAdapter,
    redis: redisAdapter,
    firestore: firestoreAdapter,
};

/** Display order in the sidebar and the source picker. */
export const SOURCE_ORDER: SourceId[] = ["mongodb", "redis", "firestore"];

/**
 * Resolve an adapter. Returns null for an unknown id — a connection saved by a
 * newer build must degrade to an "unsupported source" row, not crash the list.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdapter(sourceId: SourceId): SourceAdapter<any, any> | null {
    return SOURCES[sourceId] ?? null;
}
