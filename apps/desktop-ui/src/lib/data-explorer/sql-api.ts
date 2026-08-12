import type { DbType, SqlConnectionConfig } from "@/components/sql-client/types";

/**
 * Pure logic for the Data Explorer SQL adapters. No React, no fetch — the
 * adapter builds request bodies with `sqlBody` (lib/sql-request.ts) and sends
 * them to the Rust handler at `/api/sql-client/*`.
 */

export type SqlEngine = DbType;

/** Every SQL source id, including the file-based one. */
export type SqlSourceId = SqlEngine | "sqlite";

export const SQL_ENGINES: SqlEngine[] = ["postgresql", "mysql", "mariadb"];

/** SQLite is a file, so there is no host, port, credentials or TLS. */
export interface SqliteConfig {
    type: "sqlite";
    path: string;
}

export type AnySqlConfig = SqlConnectionConfig | SqliteConfig;

export function isSqliteConfig(config: AnySqlConfig): config is SqliteConfig {
    return config.type === "sqlite";
}

export function blankSqliteConfig(): SqliteConfig {
    return { type: "sqlite", path: "" };
}

export const DEFAULT_PORT: Record<SqlEngine, number> = {
    postgresql: 5432,
    mysql: 3306,
    mariadb: 3306,
};

/** Proper nouns — never translated. */
export const ENGINE_LABEL: Record<SqlEngine, string> = {
    postgresql: "PostgreSQL",
    mysql: "MySQL",
    mariadb: "MariaDB",
};

export function blankSqlConfig(engine: SqlEngine): SqlConnectionConfig {
    return {
        type: engine,
        host: "",
        port: DEFAULT_PORT[engine],
        database: "",
        username: "",
        password: "",
        ssl: false,
        // Secure default. Only connections restored from before this field
        // existed get `false`, and that happens in `sqlBody`, not here.
        sslVerify: true,
    };
}

/* ------------------------------------------------------------- host / URL */

/** `[::1]` → `::1`. Drivers want the bare address; only URLs need brackets. */
function unwrapIpv6(host: string): string {
    return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

/**
 * A host field carrying its port (`db.example.com:5433`, `[::1]:5433`).
 * Returns the port only when the whole tail is digits — `::1` pasted bare is a
 * bare IPv6 address, not a host with a port called `:1`.
 */
export function splitHostPort(raw: string): { host: string; port?: number } {
    const value = raw.trim();
    if (!value) return { host: "" };
    if (value.startsWith("[")) {
        const close = value.indexOf("]");
        if (close === -1) return { host: value };
        const host = value.slice(1, close);
        const tail = value.slice(close + 1);
        const match = /^:(\d+)$/.exec(tail);
        return match ? { host, port: Number(match[1]) } : { host };
    }
    // More than one colon and no brackets: a bare IPv6 address.
    if ((value.match(/:/g) ?? []).length !== 1) return { host: value };
    const [host, port] = value.split(":");
    return /^\d+$/.test(port) ? { host, port: Number(port) } : { host: value };
}

function engineFromScheme(scheme: string): SqlEngine | null {
    switch (scheme.replace(/:$/, "").toLowerCase()) {
        case "postgres":
        case "postgresql":
            return "postgresql";
        case "mysql":
            return "mysql";
        case "mariadb":
            return "mariadb";
        default:
            return null;
    }
}

/**
 * TLS intent from the query string. `sslmode=require` (libpq) and
 * `ssl-mode=REQUIRED` (MySQL) mean "encrypt but verify nothing" — mapping them
 * onto verification would break the exact connections they came from, so the
 * distinction is preserved rather than flattened to a single boolean.
 */
function tlsFromParams(params: URLSearchParams): { ssl?: boolean; sslVerify?: boolean } {
    const mode = (params.get("sslmode") ?? params.get("ssl-mode") ?? "")
        .toLowerCase()
        .replace(/_/g, "-");
    if (mode) {
        if (mode === "disable" || mode === "disabled") return { ssl: false };
        if (mode === "verify-ca" || mode === "verify-full" || mode === "verify-identity") {
            return { ssl: true, sslVerify: true };
        }
        // require / prefer / allow / preferred
        return { ssl: true, sslVerify: false };
    }
    const ssl = params.get("ssl") ?? params.get("useSSL");
    if (ssl !== null) return { ssl: ssl !== "false" && ssl !== "0" };
    return {};
}

/**
 * Parses a database URL into config fields. This is how most people actually
 * have their credentials — pasting one into the host box and getting a
 * connection error instead of a filled-in form is a bad first minute.
 *
 * Returns null when the input is not a URL, so the caller can fall back to
 * treating it as a plain host.
 */
export function parseSqlUrl(raw: string): Partial<SqlConnectionConfig> | null {
    // `jdbc:postgresql://…` has no authority right after `jdbc:`, so WHATWG
    // parsing puts the whole rest in the path. Strip the wrapper first.
    const value = raw.trim().replace(/^jdbc:/i, "");
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    const engine = engineFromScheme(url.protocol);
    if (!engine) return null;

    const config: Partial<SqlConnectionConfig> = { type: engine };

    const host = unwrapIpv6(url.hostname);
    if (host) config.host = host;
    config.port = url.port ? Number(url.port) : DEFAULT_PORT[engine];

    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (database) config.database = database;
    // `url.username` / `url.password` stay percent-encoded; a password with a
    // `@` or `/` in it only survives the round trip if it was encoded.
    if (url.username) config.username = safeDecode(url.username);
    if (url.password) config.password = safeDecode(url.password);

    const tls = tlsFromParams(url.searchParams);
    if (tls.ssl !== undefined) config.ssl = tls.ssl;
    if (tls.sslVerify !== undefined) config.sslVerify = tls.sslVerify;

    return config;
}

/** A stray `%` is not an encoding error the user should have to care about. */
function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * What the connection form calls when the host field changes: a pasted URL
 * fills every field it carries, a `host:port` splits, anything else is a host.
 * Never touches fields the input did not mention.
 */
export function applyPastedHost(
    config: SqlConnectionConfig,
    raw: string
): SqlConnectionConfig {
    const parsed = parseSqlUrl(raw);
    if (parsed) {
        // `type` is owned by the adapter, not by the pasted string — a URL
        // pasted into a MySQL connection must not silently make it Postgres.
        return { ...config, ...parsed, type: config.type };
    }
    const { host, port } = splitHostPort(raw);
    return port === undefined ? { ...config, host } : { ...config, host, port };
}

/* ---------------------------------------------------------------- validate */

/**
 * Returns an i18n key path relative to the `DataExplorer` namespace, or null
 * when the config is valid — the adapter contract resolves it via `t(key)`.
 */
export function validateSqlConfig(config: SqlConnectionConfig): string | null {
    const host = config.host.trim();
    if (!host) return "validation.sqlHostRequired";
    // tokio-postgres and mysql_async are both given a TCP host; a socket path
    // would be accepted here and then fail at connect time with a driver error.
    if (host.startsWith("/") || host.endsWith(".sock")) return "validation.sqlSocketUnsupported";
    if (!config.database.trim()) return "validation.sqlDatabaseRequired";
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        return "validation.sqlPortRange";
    }
    return null;
}

/* ------------------------------------------------------------------- SQL */

/**
 * Backticks are the MySQL-family exception; the double quote is the SQL
 * standard and what Postgres and SQLite both use. Written as "backtick only
 * for MySQL" rather than "double quote only for Postgres" so a new source id
 * defaults to the standard instead of silently getting MySQL's syntax.
 */
export function quoteIdent(engine: SqlSourceId, name: string): string {
    return engine === "mysql" || engine === "mariadb"
        ? `\`${name.replace(/`/g, "``")}\``
        : `"${name.replace(/"/g, '""')}"`;
}

/** `schema` may be empty — MySQL connections are already pinned to a database,
 *  and SQLite has no schemas at all. */
export function qualify(engine: SqlSourceId, schema: string, table: string): string {
    const quoted = quoteIdent(engine, table);
    return schema ? `${quoteIdent(engine, schema)}.${quoted}` : quoted;
}

/**
 * Opening query for a table opened from the tree. Always qualified and always
 * limited: an unqualified name depends on `search_path`, and an unlimited
 * `SELECT *` on a large table is a slow way to learn the table is large.
 */
export function buildSelect(
    engine: SqlSourceId,
    schema: string,
    table: string,
    limit: number
): string {
    return `SELECT *\nFROM ${qualify(engine, schema, table)}\nLIMIT ${limit};`;
}

/* ---------------------------------------------------------------- sqlite */

/**
 * Paths arrive by paste, and the common sources all decorate them: Finder's
 * "Copy as Pathname" and a terminal drag wrap in quotes, and a browser or
 * file manager gives a `file://` URL with percent-encoded spaces.
 */
export function normalizeSqlitePath(raw: string): string {
    let value = raw.trim();
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }
    if (/^file:\/\//i.test(value)) {
        try {
            value = decodeURIComponent(new URL(value).pathname);
        } catch {
            value = value.replace(/^file:\/\//i, "");
        }
    }
    // A shell-escaped drag ("/My\ Files/app.db") only ever needs the space back.
    return value.replace(/\\ /g, " ").trim();
}

/** Absolute on POSIX or Windows. A relative path would resolve against the
 *  app's working directory, which the user cannot see. */
function isAbsolutePath(path: string): boolean {
    return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

export function validateSqliteConfig(config: SqliteConfig): string | null {
    const path = normalizeSqlitePath(config.path);
    if (!path) return "validation.sqlitePathRequired";
    if (!isAbsolutePath(path)) return "validation.sqlitePathAbsolute";
    return null;
}

/**
 * Identity of the thing a connection points at. Used to re-fetch the tree when
 * the target changes, and to key query history — for SQLite that is the file,
 * for a server it is the database on that host.
 */
export function sqlConfigKey(config: AnySqlConfig): string {
    return isSqliteConfig(config)
        ? `sqlite:${config.path}`
        : `${config.type}://${config.username}@${config.host}:${config.port}/${config.database}`;
}

/** Short label for the pane header and history key: the file's name, or the
 *  database name on a server. */
export function sqlDisplayName(config: AnySqlConfig): string {
    if (!isSqliteConfig(config)) return config.database;
    return config.path.split(/[\\/]/).filter(Boolean).pop() ?? config.path;
}

/* ------------------------------------------------------------- sanitising */

/** Anything shorter would match too much ordinary prose and mangle the message. */
const MIN_REDACTABLE = 3;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Driver errors quote back what they were given — `password authentication
 * failed for user "admin"`, `error connecting to server ... host=db.internal`.
 * Redaction is by known value rather than by pattern: the config is right
 * here, so guessing which substring is the secret is unnecessary.
 */
export function sanitizeSqlError(
    message: string,
    config?: Partial<SqlConnectionConfig> | SqliteConfig
): string {
    let out = String(message ?? "");
    if (!config) return out;
    // SQLite has none of these; the path is deliberately not redacted because
    // the user needs to know which file failed.
    const c = config as Partial<SqlConnectionConfig>;
    const secrets: [string | undefined, string][] = [
        [c.password, "***"],
        [c.username, "***"],
        [c.host, "***"],
    ];
    for (const [value, mask] of secrets) {
        if (!value || value.length < MIN_REDACTABLE) continue;
        out = out.replace(new RegExp(escapeRegExp(value), "g"), mask);
    }
    return out;
}
