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
});

describe("dedupeAgainstExisting", () => {
    const existing = [
        { id: "1", sourceId: "redis", name: "cache" } as unknown as UnifiedConnection,
    ];

    it("skips a candidate matching an existing (sourceId, name) pair", () => {
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
});
