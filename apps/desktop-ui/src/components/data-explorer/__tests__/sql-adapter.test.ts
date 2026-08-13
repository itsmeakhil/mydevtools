// sources.ts pulls in every adapter, and their forms use next-intl; mock it per
// this repo's established pattern for tests that transitively import a
// next-intl-consuming component (see sources.test.ts).
jest.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
// The Redis adapter's pane imports @/components/ui/resizable, whose
// react-resizable-panels build ships as ESM and cannot be parsed under this
// node-environment jest config. These tests never render, so stub it.
jest.mock("react-resizable-panels", () => ({
    Panel: () => null,
    PanelGroup: () => null,
    PanelResizeHandle: () => null,
}));

import { getAdapter, SOURCE_ORDER, SOURCES } from "../sources";
import { normalizeSqlTabState } from "../adapters/sql";
import { sqlBody } from "@/lib/sql-request";
import { blankSqlConfig } from "@/lib/data-explorer/sql-api";
import type { SqlConnectionConfig } from "@/components/data-explorer/sql/types";

const ENGINES = ["postgresql", "mysql", "mariadb"] as const;

describe("SQL adapters in the registry", () => {
    it.each(ENGINES)("registers %s under its own id", (engine) => {
        expect(SOURCES[engine]?.id).toBe(engine);
        expect(SOURCE_ORDER).toContain(engine);
        expect(getAdapter(engine)).not.toBeNull();
    });

    it("labels each engine with its proper noun, untranslated", () => {
        expect(SOURCES.postgresql.label).toBe("PostgreSQL");
        expect(SOURCES.mysql.label).toBe("MySQL");
        expect(SOURCES.mariadb.label).toBe("MariaDB");
    });

    it("gives each engine its own blank config", () => {
        expect(SOURCES.postgresql.blankConfig()).toMatchObject({ type: "postgresql", port: 5432 });
        expect(SOURCES.mysql.blankConfig()).toMatchObject({ type: "mysql", port: 3306 });
        expect(SOURCES.mariadb.blankConfig()).toMatchObject({ type: "mariadb", port: 3306 });
    });

    it("validates through key paths, never prose", () => {
        // The dialog renders `t(key)`; a sentence here would show up raw.
        const key = SOURCES.postgresql.validate(blankSqlConfig("postgresql"));
        expect(key).toBe("validation.sqlHostRequired");
    });
});

describe("sqlBody", () => {
    const config = blankSqlConfig("postgresql");

    it("sends the config through and merges extras", () => {
        expect(sqlBody(config, { query: "SELECT 1" })).toMatchObject({
            type: "postgresql",
            query: "SELECT 1",
        });
    });

    it("keeps TLS verification on for a config that carries the field", () => {
        expect(sqlBody(config).sslVerify).toBe(true);
        expect(sqlBody({ ...config, sslVerify: false }).sslVerify).toBe(false);
    });

    it("sends false for a config saved before verification existed", () => {
        // Those connections were made against a stack that accepted any
        // certificate; the Rust default of `true` would break them on upgrade.
        const legacy = { ...config } as Partial<SqlConnectionConfig>;
        delete legacy.sslVerify;
        expect(sqlBody(legacy as SqlConnectionConfig).sslVerify).toBe(false);
    });
});

describe("normalizeSqlTabState", () => {
    it("fills a tab restored from an older build", () => {
        // parseStoredTabs validates the envelope but never adapter state, and
        // the pane reads these fields unguarded.
        expect(normalizeSqlTabState({})).toEqual({
            kind: "console",
            schema: "",
            table: "",
            query: "",
            limit: 100,
        });
        expect(normalizeSqlTabState(undefined)).toMatchObject({ kind: "console", limit: 100 });
        expect(normalizeSqlTabState(null)).toMatchObject({ kind: "console" });
    });

    it("keeps a valid table tab intact", () => {
        const state = {
            kind: "table" as const,
            schema: "public",
            table: "users",
            query: "SELECT 1",
            limit: 500,
        };
        expect(normalizeSqlTabState(state)).toEqual(state);
    });

    it("demotes a table tab with no table to a console", () => {
        // `kind: "table"` is what enables grid editing; without a table name
        // there is nothing to write edits back to.
        expect(normalizeSqlTabState({ kind: "table", table: "" }).kind).toBe("console");
    });

    it("rejects a nonsense limit rather than passing it to the server", () => {
        expect(normalizeSqlTabState({ limit: 0 }).limit).toBe(100);
        expect(normalizeSqlTabState({ limit: -5 }).limit).toBe(100);
        expect(normalizeSqlTabState({ limit: 1.5 }).limit).toBe(100);
        expect(normalizeSqlTabState({ limit: "500" }).limit).toBe(100);
    });
});
