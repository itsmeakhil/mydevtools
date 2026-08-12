//! SQLite behind the same `/api/sql-client/*` routes, selected by
//! `"type": "sqlite"`. Config is a file path, not host/port/credentials.
//!
//! Unlike the server engines this streams: rows are pulled one at a time and
//! dropped once the display cap is reached, so memory is bounded by `limit`
//! rather than by the size of the result set.
//!
//! `rusqlite` here is the SQLCipher build (the vault uses it). With no
//! `PRAGMA key` it reads plain databases exactly like stock SQLite; an
//! encrypted file simply reports "file is not a database".

use std::path::Path;
use std::time::{Duration, Instant};

use rusqlite::{Connection, OpenFlags};
use serde_json::{json, Map, Value};

use super::sql::binary_envelope;
use super::sqlsplit::split_sql_statements;
use super::{err, ok};
use crate::router::ApiResponse;

const MAX_ROWS: usize = 5000;
const DEFAULT_ROWS: usize = 500;
/// Matches the server engines' ceiling. SQLite has no statement timeout, so
/// this is enforced by a progress handler that aborts the running statement.
const STATEMENT_TIMEOUT: Duration = Duration::from_secs(30);
/// How long to wait on a database another process holds a write lock on.
const BUSY_TIMEOUT: Duration = Duration::from_secs(5);
/// Above 2^53 a JSON number stops round-tripping through the webview's
/// `JSON.parse`, so large INTEGERs (a snowflake id, a nanosecond timestamp)
/// go over as strings rather than silently losing their low digits.
const JS_SAFE_INT: i64 = 9_007_199_254_740_991;

struct SqliteConfig {
    path: String,
    read_only: bool,
}

fn config_from(body: &Value) -> Result<SqliteConfig, ApiResponse> {
    let path = body["path"].as_str().unwrap_or("").trim().to_string();
    if path.is_empty() {
        return Err(err(400, "path is required"));
    }
    // A relative path would resolve against the app's working directory, which
    // is not something the user can see or predict.
    if !Path::new(&path).is_absolute() {
        return Err(err(400, "path must be absolute"));
    }
    Ok(SqliteConfig { path, read_only: body["readOnly"].as_bool().unwrap_or(false) })
}

fn open(cfg: &SqliteConfig) -> Result<Connection, String> {
    // Deliberately no SQLITE_OPEN_CREATE: a typo in the path must be an error,
    // not a brand-new empty database that looks like data loss.
    let flags = if cfg.read_only {
        OpenFlags::SQLITE_OPEN_READ_ONLY
    } else {
        OpenFlags::SQLITE_OPEN_READ_WRITE
    } | OpenFlags::SQLITE_OPEN_URI
        | OpenFlags::SQLITE_OPEN_NO_MUTEX;

    let path = Path::new(&cfg.path);
    if path.is_dir() {
        return Err("path is a directory, not a database file".into());
    }
    if !path.exists() {
        return Err("no such file".into());
    }
    let conn = Connection::open_with_flags(path, flags).map_err(|e| e.to_string())?;
    conn.busy_timeout(BUSY_TIMEOUT).map_err(|e| e.to_string())?;
    if cfg.read_only {
        // The READ_ONLY flag already refuses writes; this also blocks the
        // statements that would otherwise only fail once they touched a page.
        let _ = conn.pragma_update(None, "query_only", true);
    }
    Ok(conn)
}

/// SQLite is dynamically typed and this is not a text protocol, so unlike
/// Postgres and MySQL the values keep their real JSON types.
fn value_to_json(v: rusqlite::types::ValueRef<'_>) -> Value {
    use rusqlite::types::ValueRef as V;
    match v {
        V::Null => Value::Null,
        V::Integer(i) => {
            if i.abs() <= JS_SAFE_INT {
                json!(i)
            } else {
                json!(i.to_string())
            }
        }
        // NaN and infinity are not representable in JSON.
        V::Real(f) => {
            if f.is_finite() {
                json!(f)
            } else {
                json!(f.to_string())
            }
        }
        V::Text(t) => json!(String::from_utf8_lossy(t)),
        V::Blob(b) => binary_envelope(b),
    }
}

fn json_to_sql(v: &Value) -> rusqlite::types::Value {
    use rusqlite::types::Value as S;
    match v {
        Value::Null => S::Null,
        Value::Bool(b) => S::Integer(*b as i64),
        Value::Number(n) => n
            .as_i64()
            .map(S::Integer)
            .unwrap_or_else(|| S::Real(n.as_f64().unwrap_or(0.0))),
        Value::String(s) => S::Text(s.clone()),
        other => S::Text(other.to_string()),
    }
}

struct StmtOutcome {
    rows: Vec<Value>,
    columns: Vec<String>,
    row_count: u64,
    truncated: bool,
}

impl StmtOutcome {
    fn to_json(&self) -> Value {
        json!({
            "rows": self.rows,
            "columns": self.columns,
            "rowCount": self.row_count,
            "truncated": self.truncated,
        })
    }
}

/// Interrupts whatever is running once the deadline passes. SQLite has no
/// server-side statement timeout, so without this a cartesian join hangs the
/// worker with no way out.
///
/// The returned sender is the disarm handle — bind it (`let _guard = …`) for
/// the life of the statement. Dropping it disconnects the channel, which wakes
/// the watchdog immediately and lets it exit without interrupting anything.
#[must_use = "binding the guard is what keeps the watchdog armed"]
fn arm_timeout(conn: &Connection) -> std::sync::mpsc::Sender<()> {
    use std::sync::mpsc::{channel, RecvTimeoutError};
    let handle = conn.get_interrupt_handle();
    let (disarm, wait) = channel::<()>();
    std::thread::spawn(move || {
        if let Err(RecvTimeoutError::Timeout) = wait.recv_timeout(STATEMENT_TIMEOUT) {
            handle.interrupt();
        }
    });
    disarm
}

fn run_statement(conn: &Connection, sql: &str, row_limit: usize) -> Result<StmtOutcome, String> {
    let _guard = arm_timeout(conn);
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let column_count = stmt.column_count();

    if column_count == 0 {
        let changed = stmt.raw_execute().map_err(|e| e.to_string())?;
        return Ok(StmtOutcome {
            rows: Vec::new(),
            columns: Vec::new(),
            row_count: changed as u64,
            truncated: false,
        });
    }

    let columns: Vec<String> = stmt.column_names().iter().map(|c| c.to_string()).collect();
    let mut rows: Vec<Value> = Vec::new();
    let mut row_count: u64 = 0;
    let mut cursor = stmt.query([]).map_err(|e| e.to_string())?;
    // Streamed, not collected: past `row_limit` the rows are counted and
    // dropped, so a `SELECT *` on a huge table cannot exhaust memory.
    while let Some(row) = cursor.next().map_err(|e| e.to_string())? {
        row_count += 1;
        if rows.len() < row_limit {
            let cells: Vec<Value> = (0..column_count)
                .map(|i| row.get_ref(i).map(value_to_json).unwrap_or(Value::Null))
                .collect();
            rows.push(Value::Array(cells));
        }
    }
    let truncated = row_count as usize > rows.len();
    Ok(StmtOutcome { rows, columns, row_count, truncated })
}

fn quote_ident(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

// ── Route handlers ──────────────────────────────────────────────────────────

pub fn handle(rest: &str, req: &Value) -> Result<ApiResponse, String> {
    let cfg = match config_from(req) {
        Ok(c) => c,
        Err(r) => return Ok(r),
    };
    match rest {
        "/connect" => connect(&cfg),
        "/query" => query(&cfg, req),
        "/tables" => tables(&cfg, req),
        "/update-row" => update_row(&cfg, req),
        _ => Ok(err(404, "Not found")),
    }
}

fn connect(cfg: &SqliteConfig) -> Result<ApiResponse, String> {
    let conn = open(cfg)?;
    // Reading the schema is what actually proves the file is a database —
    // opening a text file succeeds and only fails on first use.
    let version: String = conn
        .query_row("SELECT sqlite_version()", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let tables: i64 = conn
        .query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(ok(&json!({
        "success": true,
        "version": format!("SQLite {version}"),
        "tableCount": tables,
    })))
}

fn query(cfg: &SqliteConfig, req: &Value) -> Result<ApiResponse, String> {
    let sql = req["query"].as_str().unwrap_or("");
    if sql.trim().is_empty() {
        return Ok(err(400, "No SQL statement provided"));
    }
    let row_limit = req["limit"]
        .as_u64()
        .map(|l| l as usize)
        .filter(|l| *l > 0)
        .unwrap_or(DEFAULT_ROWS)
        .min(MAX_ROWS);
    let statements = split_sql_statements(sql);
    if statements.is_empty() {
        return Ok(err(400, "No SQL statement provided"));
    }

    let conn = open(cfg)?;
    let started = Instant::now();
    let mut results: Vec<Value> = Vec::new();
    for stmt in &statements {
        results.push(run_statement(&conn, stmt, row_limit)?.to_json());
    }
    let execution_time = started.elapsed().as_millis() as u64;
    let last = results.last().cloned().unwrap();
    Ok(ok(&json!({
        "rows": last["rows"],
        "columns": last["columns"],
        "rowCount": last["rowCount"],
        "truncated": last["truncated"],
        "executionTime": execution_time,
        "results": results,
    })))
}

/// Shaped like the server engines' `/tables` so the sidebar and the grid's
/// primary-key lookup work unchanged. SQLite has no schemas, so `schema` is
/// always empty rather than invented.
fn tables(cfg: &SqliteConfig, req: &Value) -> Result<ApiResponse, String> {
    let include_columns = req["includeColumns"].as_bool().unwrap_or(true);
    let conn = open(cfg)?;

    let mut stmt = conn
        .prepare(
            "SELECT name, type FROM sqlite_master
             WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
             ORDER BY type, name",
        )
        .map_err(|e| e.to_string())?;
    let listed: Vec<(String, String)> = stmt
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    let mut tables = Vec::new();
    let mut columns = Vec::new();
    let mut primary_keys = Vec::new();

    for (name, kind) in &listed {
        let mut table = Map::new();
        table.insert("schema".into(), json!(""));
        table.insert("name".into(), json!(name));
        // The sidebar checks for "VIEW"; sqlite_master says "view".
        table.insert("type".into(), json!(if kind == "view" { "VIEW" } else { "BASE TABLE" }));

        // `pragma_table_info` is one query per table, so the sweep is skipped
        // entirely for the sidebar's initial load. Primary keys come from the
        // same pragma and are only needed by the grid, which asks for columns.
        if include_columns {
            let mut info = conn
                .prepare("SELECT name, type, \"notnull\", dflt_value, pk FROM pragma_table_info(?1)")
                .map_err(|e| e.to_string())?;
            let rows: Vec<(String, String, i64, Option<String>, i64)> = info
                .query_map([name], |r| {
                    Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
                })
                .map_err(|e| e.to_string())?
                .filter_map(Result::ok)
                .collect();

            table.insert("column_count".into(), json!(rows.len()));

            for (ordinal, (col, ty, notnull, default, pk)) in rows.into_iter().enumerate() {
                if pk > 0 {
                    primary_keys.push(json!({
                        "schema": "", "table_name": name, "column_name": col
                    }));
                }
                if include_columns {
                    columns.push(json!({
                        "schema": "",
                        "table_name": name,
                        "column_name": col,
                        // An empty declared type is legal in SQLite; say so
                        // rather than render a blank badge.
                        "data_type": if ty.is_empty() { "any".to_string() } else { ty },
                        "is_nullable": if notnull == 0 { "YES" } else { "NO" },
                        "column_default": default,
                        "ordinal_position": ordinal + 1,
                    }));
                }
            }
        }
        tables.push(Value::Object(table));
    }

    Ok(ok(&json!({
        "tables": tables,
        "columns": columns,
        "primaryKeys": primary_keys,
    })))
}

fn entries(v: &Value) -> Vec<(String, Value)> {
    v.as_object()
        .map(|m| m.iter().map(|(k, val)| (k.clone(), val.clone())).collect())
        .unwrap_or_default()
}

fn update_row(cfg: &SqliteConfig, req: &Value) -> Result<ApiResponse, String> {
    if cfg.read_only {
        return Ok(err(403, "This connection is read-only"));
    }
    let table = req["table"].as_str().unwrap_or("");
    let set = entries(&req["set"]);
    let filter = entries(&req["where"]);
    if table.is_empty() || set.is_empty() {
        return Ok(err(400, "table and set are required"));
    }
    if filter.is_empty() {
        return Ok(err(400, "where is required — refusing to update every row"));
    }

    let mut params: Vec<rusqlite::types::Value> = set.iter().map(|(_, v)| json_to_sql(v)).collect();
    let sets: Vec<String> = set.iter().map(|(k, _)| format!("{} = ?", quote_ident(k))).collect();
    let mut wheres: Vec<String> = Vec::new();
    for (k, v) in &filter {
        if v.is_null() {
            wheres.push(format!("{} IS NULL", quote_ident(k)));
        } else {
            wheres.push(format!("{} = ?", quote_ident(k)));
            params.push(json_to_sql(v));
        }
    }
    let sql = format!(
        "UPDATE {} SET {} WHERE {}",
        quote_ident(table),
        sets.join(", "),
        wheres.join(" AND ")
    );

    let conn = open(cfg)?;
    let _guard = arm_timeout(&conn);
    // Same contract as the server engines: the row count is a decision taken
    // inside a transaction, not a report issued after the damage.
    conn.execute_batch("BEGIN").map_err(|e| e.to_string())?;
    let changed = match conn.execute(&sql, rusqlite::params_from_iter(params)) {
        Ok(n) => n as u64,
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK");
            return Err(e.to_string());
        }
    };
    let finish = if changed == 1 { "COMMIT" } else { "ROLLBACK" };
    conn.execute_batch(finish).map_err(|e| e.to_string())?;

    Ok(ok(&json!({
        "success": changed == 1,
        "rowCount": changed,
        "rolledBack": changed != 1,
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifiers_escape_quotes() {
        assert_eq!(quote_ident(r#"we"ird"#), r#""we""ird""#);
    }

    #[test]
    fn large_integers_go_over_as_strings() {
        use rusqlite::types::ValueRef;
        // 2^53 + 1 cannot round-trip through the webview's JSON.parse.
        assert_eq!(value_to_json(ValueRef::Integer(9_007_199_254_740_993)), json!("9007199254740993"));
        assert_eq!(value_to_json(ValueRef::Integer(42)), json!(42));
        assert_eq!(value_to_json(ValueRef::Integer(-JS_SAFE_INT)), json!(-JS_SAFE_INT));
    }

    #[test]
    fn non_finite_reals_are_not_emitted_as_json_numbers() {
        use rusqlite::types::ValueRef;
        assert_eq!(value_to_json(ValueRef::Real(1.5)), json!(1.5));
        assert!(value_to_json(ValueRef::Real(f64::NAN)).is_string());
        assert!(value_to_json(ValueRef::Real(f64::INFINITY)).is_string());
    }

    #[test]
    fn blobs_use_the_shared_binary_envelope() {
        use rusqlite::types::ValueRef;
        let v = value_to_json(ValueRef::Blob(&[0xff, 0x00, 0x41]));
        assert_eq!(v["$binary"], json!("ff0041"));
        assert_eq!(v["length"], json!(3));
    }

    #[test]
    fn relative_paths_are_rejected() {
        // They would resolve against a working directory the user cannot see.
        assert!(config_from(&json!({ "path": "app.db" })).is_err());
        assert!(config_from(&json!({ "path": "" })).is_err());
        assert!(config_from(&json!({ "path": "/tmp/app.db" })).is_ok());
    }
}
