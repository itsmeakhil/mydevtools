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

/**
 * The one field that makes two same-named connections distinct, pulled from
 * whichever adapter config shape is present. A structural check on the
 * config's own fields, not a branch on sourceId — legacy Mongo defaults every
 * unnamed row's name to "My Connection" (nosql-explorer/connection-service.ts),
 * so name alone is not enough to tell two rows apart.
 */
function configDiscriminator(config: unknown): string {
    if (config && typeof config === "object") {
        const c = config as Record<string, unknown>;
        if (typeof c.connectionString === "string") return c.connectionString;
        if (typeof c.redisUrl === "string") return c.redisUrl;
    }
    return "";
}

/**
 * Comparison-only normalisation — never mutates the name that gets stored.
 * `listConnections`' row filter checks id/sourceId/encryptedData/iv but not
 * name, so a stored row can reach here with a missing name; guard it rather
 * than let `.trim()` throw and take down the whole legacy import.
 */
function normalizeName(name: string): string {
    return String(name ?? "").trim().toLowerCase();
}

function dedupeKey(sourceId: string, name: string, config: unknown): string {
    return `${sourceId}:${normalizeName(name)}:${configDiscriminator(config)}`;
}

/**
 * Re-import is safe: an already-imported (sourceId, name, config) triple is
 * skipped. Also resolves duplicates within a single batch (two same-named,
 * same-config rows from the same legacy store) via the `seen.add` below.
 */
export function dedupeAgainstExisting(
    candidates: LegacyCandidate[],
    existing: UnifiedConnection[]
): { toImport: LegacyCandidate[]; skipped: number } {
    const seen = new Set(existing.map((c) => dedupeKey(c.sourceId, c.name, c.config)));
    const toImport: LegacyCandidate[] = [];
    let skipped = 0;
    for (const candidate of candidates) {
        const key = dedupeKey(candidate.sourceId, candidate.values.name, candidate.values.config);
        if (seen.has(key)) {
            skipped++;
            continue;
        }
        seen.add(key);
        toImport.push(candidate);
    }
    return { toImport, skipped };
}
