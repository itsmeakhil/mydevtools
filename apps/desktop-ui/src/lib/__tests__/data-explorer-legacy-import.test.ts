import {
    legacyMongoToUnified,
    legacyRedisToUnified,
    legacySqlToUnified,
    dedupeAgainstExisting,
} from "../data-explorer/legacy-import";
import type { UnifiedConnection } from "@/components/data-explorer/types";
import type { SqlConnectionConfig } from "@/components/data-explorer/sql/types";

const sqlConfig = (overrides: Partial<SqlConnectionConfig> = {}): SqlConnectionConfig => ({
    type: "postgresql",
    host: "db.example.com",
    port: 5432,
    database: "shop",
    username: "alice",
    password: "pw",
    ssl: false,
    ...overrides,
});

describe("legacySqlToUnified", () => {
    it("maps the unencrypted engine column onto the source id", () => {
        expect(legacySqlToUnified({ name: "prod", type: "postgresql" }, sqlConfig())?.sourceId).toBe(
            "postgresql"
        );
        expect(
            legacySqlToUnified({ name: "prod", type: "mariadb" }, sqlConfig({ type: "mariadb" }))
                ?.sourceId
        ).toBe("mariadb");
    });

    it("pins sslVerify to false so the imported connection still works", () => {
        // Legacy rows were created against a stack that accepted any
        // certificate. Written explicitly, not left absent, so the form can
        // show the warning and let the user tighten it.
        const candidate = legacySqlToUnified({ name: "prod", type: "postgresql" }, sqlConfig());
        expect((candidate?.values.config as SqlConnectionConfig).sslVerify).toBe(false);
    });

    it("keeps an explicit sslVerify that is already set", () => {
        const candidate = legacySqlToUnified(
            { name: "prod", type: "postgresql" },
            sqlConfig({ sslVerify: true })
        );
        expect((candidate?.values.config as SqlConnectionConfig).sslVerify).toBe(true);
    });

    it("skips a row whose engine has no adapter", () => {
        // Better no connection than one nothing can open.
        expect(legacySqlToUnified({ name: "x", type: "oracle" }, sqlConfig())).toBeNull();
        expect(legacySqlToUnified({ name: "x", type: "" }, sqlConfig())).toBeNull();
    });

    it("trusts the row's engine over whatever the blob says", () => {
        const candidate = legacySqlToUnified(
            { name: "x", type: "mysql" },
            sqlConfig({ type: "postgresql" })
        );
        expect((candidate?.values.config as SqlConnectionConfig).type).toBe("mysql");
    });
});

describe("dedupeAgainstExisting for SQL rows", () => {
    const candidate = (name: string, config: Partial<SqlConnectionConfig>) =>
        legacySqlToUnified({ name, type: "postgresql" }, sqlConfig(config))!;

    const asExisting = (name: string, config: Partial<SqlConnectionConfig>): UnifiedConnection =>
        ({
            id: name,
            sourceId: "postgresql",
            name,
            config: sqlConfig(config),
        }) as unknown as UnifiedConnection;

    it("imports two same-named connections pointing at different hosts", () => {
        // Before the SQL branch existed both produced an empty discriminator,
        // so one was silently dropped.
        const { toImport, skipped } = dedupeAgainstExisting(
            [candidate("prod", { host: "a.example.com" }), candidate("prod", { host: "b.example.com" })],
            []
        );
        expect(toImport).toHaveLength(2);
        expect(skipped).toBe(0);
    });

    it("separates same-named connections by database and by port", () => {
        expect(
            dedupeAgainstExisting(
                [candidate("prod", { database: "shop" }), candidate("prod", { database: "billing" })],
                []
            ).toImport
        ).toHaveLength(2);
        expect(
            dedupeAgainstExisting(
                [candidate("prod", { port: 5432 }), candidate("prod", { port: 5433 })],
                []
            ).toImport
        ).toHaveLength(2);
    });

    it("skips a connection already imported", () => {
        const { toImport, skipped } = dedupeAgainstExisting(
            [candidate("prod", {})],
            [asExisting("prod", {})]
        );
        expect(toImport).toHaveLength(0);
        expect(skipped).toBe(1);
    });

    it("treats a changed password as the same connection, not a new one", () => {
        // The discriminator leaves the password out on purpose: re-importing
        // after a password change should update, not duplicate.
        const { toImport, skipped } = dedupeAgainstExisting(
            [candidate("prod", { password: "new-password" })],
            [asExisting("prod", { password: "old-password" })]
        );
        expect(toImport).toHaveLength(0);
        expect(skipped).toBe(1);
    });
});

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

    it("does not throw on an existing row with a missing name, and still matches an unrelated candidate", () => {
        const nameless = [
            {
                id: "1",
                sourceId: "redis",
                // `name` missing entirely, as a pre-name-column legacy row would arrive.
                config: { redisUrl: "redis://localhost:6379" },
            } as unknown as UnifiedConnection,
        ];
        const candidate = legacyRedisToUnified({ name: "other" }, { redisUrl: "redis://other:6379" });
        expect(() => dedupeAgainstExisting([candidate], nameless)).not.toThrow();
        const { toImport, skipped } = dedupeAgainstExisting([candidate], nameless);
        expect(skipped).toBe(0);
        expect(toImport).toHaveLength(1);
    });
});
