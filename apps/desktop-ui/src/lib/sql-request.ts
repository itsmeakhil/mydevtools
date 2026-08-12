import type { AnySqlConfig } from "@/lib/data-explorer/sql-api";

/**
 * Body for every `/api/sql-client/*` call.
 *
 * The Rust handler defaults `sslVerify` to **true** — a secure default is the
 * right one for anything new. Connections saved before certificate
 * verification existed have no such field, and they were created against a
 * stack that accepted any certificate; sending `true` for them would break
 * working connections on upgrade. So a missing value means "this connection
 * predates verification" and is sent as `false` explicitly, which is also what
 * makes the form able to show a warning and let the user tighten it.
 *
 * One helper rather than a spread at each call site: five of them send this
 * body, and a site that forgets the field silently changes TLS behaviour.
 */
export function sqlBody(
    config: AnySqlConfig,
    extra?: Record<string, unknown>
): Record<string, unknown> {
    // SQLite is a local file — no TLS to configure, so no field to migrate.
    if (config.type === "sqlite") return { ...config, ...extra };
    return { ...config, sslVerify: config.sslVerify ?? false, ...extra };
}
