import { detectDbType, type DbType } from "@/lib/nosql-dialects";
import type { ConnectionFormValues, UnifiedConnection } from "@/components/data-explorer/types";
import type { MongoConfig } from "@/components/data-explorer/adapters/mongodb";
import type { RedisConfig } from "@/components/data-explorer/adapters/redis";

export interface LegacyCandidate {
    sourceId: "mongodb" | "redis";
    values: ConnectionFormValues<MongoConfig | RedisConfig>;
}

/**
 * The legacy Mongo store encrypts a bare connection string; the unified store
 * always encrypts JSON. `dbType` is absent on rows saved before that field
 * existed — infer it from the host.
 */
export function legacyMongoToUnified(
    row: { name: string; color?: string | null; readOnly?: boolean; dbType?: DbType },
    connectionString: string
): LegacyCandidate {
    return {
        sourceId: "mongodb",
        values: {
            name: row.name,
            folder: "",
            color: row.color ?? null,
            readOnly: row.readOnly ?? false,
            config: { connectionString, dbType: row.dbType ?? detectDbType(connectionString) },
        },
    };
}

/** Legacy Redis kept `folder` inside the encrypted blob; it is top-level now. */
export function legacyRedisToUnified(
    row: { name: string; folder?: string },
    config: { redisUrl: string; folder?: string }
): LegacyCandidate {
    return {
        sourceId: "redis",
        values: {
            name: row.name,
            folder: config.folder ?? row.folder ?? "",
            color: null,
            readOnly: false,
            config: { redisUrl: config.redisUrl },
        },
    };
}

/** Re-import is safe: an already-imported (sourceId, name) pair is skipped. */
export function dedupeAgainstExisting(
    candidates: LegacyCandidate[],
    existing: UnifiedConnection[]
): { toImport: LegacyCandidate[]; skipped: number } {
    const seen = new Set(existing.map((c) => `${c.sourceId}:${c.name}`));
    const toImport: LegacyCandidate[] = [];
    let skipped = 0;
    for (const candidate of candidates) {
        const key = `${candidate.sourceId}:${candidate.values.name}`;
        if (seen.has(key)) {
            skipped++;
            continue;
        }
        seen.add(key);
        toImport.push(candidate);
    }
    return { toImport, skipped };
}
