import {
    legacyMongoToUnified,
    legacyRedisToUnified,
    dedupeAgainstExisting,
} from "../data-explorer/legacy-import";
import type { UnifiedConnection } from "@/components/data-explorer/types";

describe("legacyMongoToUnified", () => {
    it("wraps the bare connection string into a JSON config", () => {
        const result = legacyMongoToUnified(
            { name: "local", color: "#ef4444", readOnly: true, dbType: "mongodb" },
            "mongodb://localhost:27017"
        );
        expect(result.sourceId).toBe("mongodb");
        expect(result.values.config).toEqual({
            connectionString: "mongodb://localhost:27017",
            dbType: "mongodb",
        });
        expect(result.values.name).toBe("local");
        expect(result.values.color).toBe("#ef4444");
        expect(result.values.readOnly).toBe(true);
    });

    it("infers dbType for rows saved before the field existed", () => {
        const result = legacyMongoToUnified(
            { name: "cosmos" },
            "mongodb://acct:key@acct.mongo.cosmos.azure.com:10255/?ssl=true"
        );
        expect((result.values.config as { dbType: string }).dbType).toBe("cosmosdb");
    });

    it("always sets folder to empty — legacy Mongo has no folder concept", () => {
        const result = legacyMongoToUnified({ name: "local" }, "mongodb://localhost:27017");
        expect(result.values.folder).toBe("");
    });
});

describe("legacyRedisToUnified", () => {
    it("lifts folder out of the encrypted blob to the top level", () => {
        const result = legacyRedisToUnified(
            { name: "cache" },
            { redisUrl: "redis://localhost:6379", folder: "prod" }
        );
        expect(result.sourceId).toBe("redis");
        expect(result.values.config).toEqual({ redisUrl: "redis://localhost:6379" });
        expect(result.values.folder).toBe("prod");
    });

    it("falls back to the row's folder column when the blob carries none", () => {
        const result = legacyRedisToUnified(
            { name: "cache", folder: "staging" },
            { redisUrl: "redis://localhost:6379" }
        );
        expect(result.values.folder).toBe("staging");
    });

    it("defaults folder to empty when neither the blob nor the row has one", () => {
        const result = legacyRedisToUnified({ name: "cache" }, { redisUrl: "redis://localhost:6379" });
        expect(result.values.folder).toBe("");
    });
});

describe("dedupeAgainstExisting", () => {
    const existing = [
        {
            id: "1",
            sourceId: "redis",
            name: "cache",
            config: { redisUrl: "redis://localhost:6379" },
        } as unknown as UnifiedConnection,
    ];

    it("skips a candidate matching an existing (sourceId, name, config) triple", () => {
        const dupe = legacyRedisToUnified({ name: "cache" }, { redisUrl: "redis://localhost:6379" });
        const fresh = legacyRedisToUnified({ name: "other" }, { redisUrl: "redis://localhost:6379" });
        const { toImport, skipped } = dedupeAgainstExisting([dupe, fresh], existing);
        expect(skipped).toBe(1);
        expect(toImport).toHaveLength(1);
        expect(toImport[0].values.name).toBe("other");
    });

    it("does not treat the same name under a different source as a duplicate", () => {
        const mongo = legacyMongoToUnified({ name: "cache" }, "mongodb://localhost:27017");
        const { toImport, skipped } = dedupeAgainstExisting([mongo], existing);
        expect(skipped).toBe(0);
        expect(toImport).toHaveLength(1);
    });

    it("imports two same-named rows that differ only by config", () => {
        const a = legacyMongoToUnified({ name: "cache" }, "mongodb://host-a:27017");
        const b = legacyMongoToUnified({ name: "cache" }, "mongodb://host-b:27017");
        const { toImport, skipped } = dedupeAgainstExisting([a, b], []);
        expect(skipped).toBe(0);
        expect(toImport).toHaveLength(2);
    });

    it("dedupes two identical candidates within a single batch", () => {
        const a = legacyMongoToUnified({ name: "cache" }, "mongodb://localhost:27017");
        const b = legacyMongoToUnified({ name: "cache" }, "mongodb://localhost:27017");
        const { toImport, skipped } = dedupeAgainstExisting([a, b], []);
        expect(skipped).toBe(1);
        expect(toImport).toHaveLength(1);
    });

    it("a genuine re-import of the same connection dedupes to zero on the second run", () => {
        const first = legacyMongoToUnified({ name: "cache" }, "mongodb://localhost:27017");
        // Simulate what listConnections would return after the first import
        // saved `first.values` verbatim: same sourceId, name and decrypted config.
        const alreadyImported = [
            {
                id: "1",
                sourceId: first.sourceId,
                name: first.values.name,
                config: first.values.config,
            } as unknown as UnifiedConnection,
        ];
        const second = legacyMongoToUnified({ name: "cache" }, "mongodb://localhost:27017");
        const { toImport, skipped } = dedupeAgainstExisting([second], alreadyImported);
        expect(skipped).toBe(1);
        expect(toImport).toHaveLength(0);
    });

    it("normalises name case and whitespace for comparison without mutating the stored name", () => {
        const existingWithSpacing = [
            {
                id: "1",
                sourceId: "redis",
                name: "Cache",
                config: { redisUrl: "redis://localhost:6379" },
            } as unknown as UnifiedConnection,
        ];
        const candidate = legacyRedisToUnified(
            { name: "  cache  " },
            { redisUrl: "redis://localhost:6379" }
        );
        const { toImport, skipped } = dedupeAgainstExisting([candidate], existingWithSpacing);
        expect(skipped).toBe(1);
        expect(toImport).toHaveLength(0);
        // The candidate's own stored name is untouched — only the comparison key normalises.
        expect(candidate.values.name).toBe("  cache  ");
    });
});
