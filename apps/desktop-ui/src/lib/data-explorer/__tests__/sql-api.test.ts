import {
    applyPastedHost,
    blankSqlConfig,
    buildSelect,
    DEFAULT_PORT,
    normalizeSqlitePath,
    parseSqlUrl,
    qualify,
    quoteIdent,
    sanitizeSqlError,
    splitHostPort,
    sqlConfigKey,
    sqlDisplayName,
    validateSqlConfig,
    validateSqliteConfig,
} from "../sql-api";

describe("blankSqlConfig", () => {
    it("defaults the port per engine and verifies TLS", () => {
        expect(blankSqlConfig("postgresql").port).toBe(5432);
        expect(blankSqlConfig("mysql").port).toBe(3306);
        expect(blankSqlConfig("mariadb").port).toBe(3306);
        // Only configs restored from before the field existed get `false`,
        // and that substitution lives in sqlBody, not here.
        expect(blankSqlConfig("postgresql").sslVerify).toBe(true);
    });
});

describe("splitHostPort", () => {
    it("splits host:port", () => {
        expect(splitHostPort("db.example.com:5433")).toEqual({ host: "db.example.com", port: 5433 });
    });

    it("leaves a bare host alone", () => {
        expect(splitHostPort("db.example.com")).toEqual({ host: "db.example.com" });
    });

    it("treats a bare IPv6 address as a host, not a host with a port", () => {
        expect(splitHostPort("::1")).toEqual({ host: "::1" });
        expect(splitHostPort("2001:db8::1")).toEqual({ host: "2001:db8::1" });
    });

    it("unwraps a bracketed IPv6 address and its port", () => {
        expect(splitHostPort("[::1]:5433")).toEqual({ host: "::1", port: 5433 });
        expect(splitHostPort("[2001:db8::1]")).toEqual({ host: "2001:db8::1" });
    });

    it("does not read a non-numeric tail as a port", () => {
        expect(splitHostPort("host:notaport")).toEqual({ host: "host:notaport" });
    });
});

describe("parseSqlUrl", () => {
    it("parses a full Postgres URL", () => {
        expect(parseSqlUrl("postgresql://alice:s3cret@db.example.com:5433/shop")).toEqual({
            type: "postgresql",
            host: "db.example.com",
            port: 5433,
            database: "shop",
            username: "alice",
            password: "s3cret",
        });
    });

    it("percent-decodes a password containing @ and /", () => {
        const parsed = parseSqlUrl("postgres://u:p%40ss%2Fword@host/db");
        expect(parsed?.password).toBe("p@ss/word");
    });

    it("survives a stray percent instead of throwing", () => {
        expect(parseSqlUrl("postgres://u:100%discount@host/db")?.password).toBe("100%discount");
    });

    it("unwraps an IPv6 host", () => {
        expect(parseSqlUrl("postgresql://[::1]:5432/db")?.host).toBe("::1");
    });

    it("falls back to the engine default port when the URL omits one", () => {
        expect(parseSqlUrl("mysql://host/db")?.port).toBe(DEFAULT_PORT.mysql);
    });

    it("strips a jdbc: wrapper", () => {
        expect(parseSqlUrl("jdbc:postgresql://host:5432/db")).toMatchObject({
            host: "host",
            port: 5432,
            database: "db",
        });
    });

    it("maps sslmode onto encryption and verification separately", () => {
        // `require` encrypts without verifying — flattening it to "verify"
        // would break the very connection the URL came from.
        expect(parseSqlUrl("postgres://h/db?sslmode=require")).toMatchObject({
            ssl: true,
            sslVerify: false,
        });
        expect(parseSqlUrl("postgres://h/db?sslmode=verify-full")).toMatchObject({
            ssl: true,
            sslVerify: true,
        });
        expect(parseSqlUrl("mysql://h/db?ssl-mode=VERIFY_IDENTITY")).toMatchObject({
            ssl: true,
            sslVerify: true,
        });
        expect(parseSqlUrl("postgres://h/db?sslmode=disable")).toMatchObject({ ssl: false });
    });

    it("returns null for a plain host or a foreign scheme", () => {
        expect(parseSqlUrl("db.example.com")).toBeNull();
        expect(parseSqlUrl("db.example.com:5432")).toBeNull();
        expect(parseSqlUrl("mongodb://host/db")).toBeNull();
        expect(parseSqlUrl("redis://host")).toBeNull();
        expect(parseSqlUrl("")).toBeNull();
    });
});

describe("applyPastedHost", () => {
    const base = blankSqlConfig("postgresql");

    it("fills every field a pasted URL carries", () => {
        expect(applyPastedHost(base, "postgresql://alice:pw@h:5433/shop")).toMatchObject({
            host: "h",
            port: 5433,
            database: "shop",
            username: "alice",
            password: "pw",
        });
    });

    it("never lets a pasted URL change the adapter's engine", () => {
        const mysql = blankSqlConfig("mysql");
        expect(applyPastedHost(mysql, "postgresql://h/db").type).toBe("mysql");
    });

    it("leaves untouched fields alone", () => {
        const withUser = { ...base, username: "kept", database: "kept-db" };
        const next = applyPastedHost(withUser, "newhost");
        expect(next).toMatchObject({ host: "newhost", username: "kept", database: "kept-db" });
        expect(next.port).toBe(base.port);
    });

    it("splits a host:port paste", () => {
        expect(applyPastedHost(base, "h:5433")).toMatchObject({ host: "h", port: 5433 });
    });
});

describe("validateSqlConfig", () => {
    const ok = { ...blankSqlConfig("postgresql"), host: "h", database: "db" };

    it("accepts a complete config", () => {
        expect(validateSqlConfig(ok)).toBeNull();
    });

    it("returns key paths, never prose", () => {
        // The dialog resolves these through t(); a raw sentence would render
        // as an untranslated string in 27 locales.
        expect(validateSqlConfig({ ...ok, host: "  " })).toBe("validation.sqlHostRequired");
        expect(validateSqlConfig({ ...ok, database: "" })).toBe("validation.sqlDatabaseRequired");
        expect(validateSqlConfig({ ...ok, port: 0 })).toBe("validation.sqlPortRange");
        expect(validateSqlConfig({ ...ok, port: 65536 })).toBe("validation.sqlPortRange");
        expect(validateSqlConfig({ ...ok, port: 1.5 })).toBe("validation.sqlPortRange");
    });

    it("rejects a unix socket path up front rather than at connect time", () => {
        expect(validateSqlConfig({ ...ok, host: "/var/run/postgresql" })).toBe(
            "validation.sqlSocketUnsupported"
        );
        expect(validateSqlConfig({ ...ok, host: "/tmp/mysql.sock" })).toBe(
            "validation.sqlSocketUnsupported"
        );
    });

    it("accepts the range boundaries", () => {
        expect(validateSqlConfig({ ...ok, port: 1 })).toBeNull();
        expect(validateSqlConfig({ ...ok, port: 65535 })).toBeNull();
    });
});

describe("quoteIdent / qualify / buildSelect", () => {
    it("quotes per engine and escapes the quote character", () => {
        expect(quoteIdent("postgresql", 'we"ird')).toBe('"we""ird"');
        expect(quoteIdent("mysql", "we`ird")).toBe("`we``ird`");
        expect(quoteIdent("mariadb", "we`ird")).toBe("`we``ird`");
    });

    it("keeps a dotted identifier one identifier", () => {
        // `orders.2024` is a table name, not schema `orders` table `2024`.
        expect(quoteIdent("postgresql", "orders.2024")).toBe('"orders.2024"');
    });

    it("omits the schema when there is none", () => {
        expect(qualify("mysql", "", "users")).toBe("`users`");
        expect(qualify("postgresql", "audit", "users")).toBe('"audit"."users"');
    });

    it("always qualifies and always limits", () => {
        // Unqualified depends on search_path; unlimited is a slow way to learn
        // the table is large.
        expect(buildSelect("postgresql", "public", "users", 100)).toBe(
            'SELECT *\nFROM "public"."users"\nLIMIT 100;'
        );
        expect(buildSelect("mysql", "", "users", 50)).toBe("SELECT *\nFROM `users`\nLIMIT 50;");
    });
});

describe("SQLite config", () => {
    it("strips what Finder and a terminal drag actually produce", () => {
        expect(normalizeSqlitePath('"/Users/me/app.db"')).toBe("/Users/me/app.db");
        expect(normalizeSqlitePath("'/Users/me/app.db'")).toBe("/Users/me/app.db");
        expect(normalizeSqlitePath("  /Users/me/app.db  ")).toBe("/Users/me/app.db");
        // A shell-escaped drag.
        expect(normalizeSqlitePath("/Users/me/My\\ Files/app.db")).toBe("/Users/me/My Files/app.db");
    });

    it("decodes a file:// URL", () => {
        expect(normalizeSqlitePath("file:///Users/me/My%20Data/app.db")).toBe(
            "/Users/me/My Data/app.db"
        );
    });

    it("leaves an ordinary path untouched", () => {
        expect(normalizeSqlitePath("/Users/me/app.db")).toBe("/Users/me/app.db");
        expect(normalizeSqlitePath("C:\\Users\\me\\app.db")).toBe("C:\\Users\\me\\app.db");
    });

    it("requires an absolute path", () => {
        // A relative path resolves against a working directory the user cannot see.
        expect(validateSqliteConfig({ type: "sqlite", path: "" })).toBe(
            "validation.sqlitePathRequired"
        );
        expect(validateSqliteConfig({ type: "sqlite", path: "   " })).toBe(
            "validation.sqlitePathRequired"
        );
        expect(validateSqliteConfig({ type: "sqlite", path: "app.db" })).toBe(
            "validation.sqlitePathAbsolute"
        );
        expect(validateSqliteConfig({ type: "sqlite", path: "./data/app.db" })).toBe(
            "validation.sqlitePathAbsolute"
        );
        expect(validateSqliteConfig({ type: "sqlite", path: "/Users/me/app.db" })).toBeNull();
        expect(validateSqliteConfig({ type: "sqlite", path: "C:\\db\\app.db" })).toBeNull();
    });

    it("validates the path as it will be stored, not as typed", () => {
        expect(validateSqliteConfig({ type: "sqlite", path: '"/Users/me/app.db"' })).toBeNull();
    });

    it("identifies the target and names it", () => {
        const sqlite = { type: "sqlite" as const, path: "/Users/me/app.db" };
        expect(sqlConfigKey(sqlite)).toBe("sqlite:/Users/me/app.db");
        expect(sqlDisplayName(sqlite)).toBe("app.db");

        const server = { ...blankSqlConfig("postgresql"), host: "h", database: "shop", username: "u" };
        expect(sqlConfigKey(server)).toBe("postgresql://u@h:5432/shop");
        expect(sqlDisplayName(server)).toBe("shop");
        // The key must change when the target does, or the tree never refetches.
        expect(sqlConfigKey({ ...server, database: "other" })).not.toBe(sqlConfigKey(server));
    });

    it("quotes SQLite identifiers with the SQL standard, not MySQL backticks", () => {
        expect(quoteIdent("sqlite", 'we"ird')).toBe('"we""ird"');
        expect(buildSelect("sqlite", "", "users", 100)).toBe(
            'SELECT *\nFROM "users"\nLIMIT 100;'
        );
    });

    it("sanitises without a host, user or password to redact", () => {
        const config = { type: "sqlite" as const, path: "/Users/me/app.db" };
        // The path is deliberately kept — the user needs to know which file failed.
        expect(sanitizeSqlError("unable to open /Users/me/app.db", config)).toBe(
            "unable to open /Users/me/app.db"
        );
    });
});

describe("sanitizeSqlError", () => {
    const config = {
        host: "db.internal.example.com",
        username: "admin",
        password: "hunter2000",
    };

    it("redacts credentials the driver echoed back", () => {
        const out = sanitizeSqlError(
            'password authentication failed for user "admin" at db.internal.example.com',
            config
        );
        expect(out).not.toContain("admin");
        expect(out).not.toContain("db.internal.example.com");
        expect(out).toContain("password authentication failed");
    });

    it("redacts every occurrence, not just the first", () => {
        const out = sanitizeSqlError("hunter2000 / hunter2000", config);
        expect(out).toBe("*** / ***");
    });

    it("treats the secret as a literal, not a pattern", () => {
        const out = sanitizeSqlError("connect failed: a.b.c", { host: "a.b.c" });
        // A regex-escaped host must not also match "axbxc".
        expect(sanitizeSqlError("axbxc", { host: "a.b.c" })).toBe("axbxc");
        expect(out).toBe("connect failed: ***");
    });

    it("leaves very short values alone rather than mangling the message", () => {
        expect(sanitizeSqlError("no such database: a", { username: "a" })).toBe(
            "no such database: a"
        );
    });

    it("passes the message through with no config", () => {
        expect(sanitizeSqlError("connection refused")).toBe("connection refused");
    });
});
