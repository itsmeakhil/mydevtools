//! /api/sql-client/* — PostgreSQL (tokio-postgres, text protocol) and
//! MySQL/MariaDB (mysql_async). Connections are per-request (single local
//! user; avoids pool lifetime management). Credentials arrive per request,
//! decrypted client-side, exactly like the web routes.
//!
//! Per-request connections mean no session survives between calls: `BEGIN` in
//! one request and `COMMIT` in the next land on different sessions. Statements
//! sent together in one `/query` share a connection, so a whole transaction in
//! a single run works; the UI warns about the split case.

use serde_json::{json, Map, Value};

use super::sqlsplit::split_sql_statements;
use super::{err, ok, parse_body};
use crate::router::ApiResponse;

const MAX_ROWS: usize = 5000;
const DEFAULT_ROWS: usize = 500;
/// Server-side ceiling for one statement. There is no cancel channel back to
/// the client, so without this a runaway query pins its connection forever.
const STATEMENT_TIMEOUT_MS: u64 = 30_000;

type HandlerResult = Result<ApiResponse, String>;

struct SqlConfig {
    ty: String,
    host: String,
    port: u16,
    database: String,
    username: String,
    password: String,
    ssl: bool,
    /// Verify the server certificate. Connections saved before this existed
    /// were created against a "trust anything" TLS stack, so the client sends
    /// `false` for those explicitly; anything new defaults to verifying.
    ssl_verify: bool,
    /// Enforced by the server session, not by inspecting the SQL. A client-side
    /// statement blocklist cannot be trusted — CTEs with `INSERT ... RETURNING`,
    /// `DO $$`, and functions with side effects all get past one.
    read_only: bool,
}

fn config_from(body: &Value, require_db: bool) -> Result<SqlConfig, ApiResponse> {
    let ty = body["type"].as_str().unwrap_or("").to_string();
    let host = body["host"].as_str().unwrap_or("").to_string();
    let database = body["database"].as_str().unwrap_or("").to_string();
    if ty.is_empty() || host.is_empty() || (require_db && database.is_empty()) {
        return Err(err(400, "type, host, and database are required"));
    }
    if !matches!(ty.as_str(), "postgresql" | "mysql" | "mariadb") {
        return Err(err(400, &format!("Unsupported database type: {ty}")));
    }
    let default_port = if ty == "postgresql" { 5432 } else { 3306 };
    // A form sends the port as a string as readily as a number, and an
    // out-of-range value must be rejected rather than wrapped: `65536 as u16`
    // is 0, which would silently connect to the default port instead.
    let raw_port = body["port"]
        .as_u64()
        .or_else(|| body["port"].as_str().and_then(|s| s.trim().parse::<u64>().ok()));
    let port = match raw_port {
        None | Some(0) => default_port,
        Some(p) if p <= u16::MAX as u64 => p,
        Some(_) => return Err(err(400, "port must be between 1 and 65535")),
    } as u16;
    Ok(SqlConfig {
        ty,
        host,
        port,
        database,
        username: body["username"].as_str().unwrap_or("").to_string(),
        password: body["password"].as_str().unwrap_or("").to_string(),
        ssl: body["ssl"].as_bool().unwrap_or(false),
        ssl_verify: body["sslVerify"].as_bool().unwrap_or(true),
        read_only: body["readOnly"].as_bool().unwrap_or(false),
    })
}

/// One statement's outcome. `rows` is an array of arrays, positional against
/// `columns`: a result with two columns called `id` (`SELECT a.id, b.id ...`)
/// would lose one of them under an object keyed by column name, and a column
/// literally named `__proto__` would poison the object on the JS side.
struct StmtResult {
    rows: Vec<Value>,
    columns: Vec<String>,
    /// Rows the statement produced (or affected), before the display cap.
    row_count: u64,
    /// `rows` holds fewer than `row_count` — the grid must say so rather than
    /// let 500 visible rows read as the whole table.
    truncated: bool,
}

impl StmtResult {
    fn to_json(&self) -> Value {
        json!({
            "rows": self.rows,
            "columns": self.columns,
            "rowCount": self.row_count,
            "truncated": self.truncated,
        })
    }

    /// Re-key positional rows by column name. Only for the metadata queries
    /// below — their SQL is ours, so the column names are known-unique, and
    /// their consumers read fields by name.
    fn objects(&self) -> Vec<Value> {
        self.rows
            .iter()
            .map(|row| {
                let empty: Vec<Value> = Vec::new();
                let cells = row.as_array().unwrap_or(&empty);
                let mut obj = Map::new();
                for (i, col) in self.columns.iter().enumerate() {
                    obj.insert(col.clone(), cells.get(i).cloned().unwrap_or(Value::Null));
                }
                Value::Object(obj)
            })
            .collect()
    }
}

fn empty_result() -> Value {
    json!({ "rows": [], "columns": [], "rowCount": 0, "truncated": false })
}

/// A value the server sent as bytes that are not valid UTF-8. Handing back
/// `from_utf8_lossy` would replace every such byte with U+FFFD and present the
/// corruption as the value; the grid renders this envelope as `0x… (N B)`.
/// Only the head is sent — a 2 MB blob does not belong in a JSON response —
/// but `length` is always the true size on the server.
pub(super) fn binary_envelope(bytes: &[u8]) -> Value {
    const PREVIEW: usize = 1024;
    let hex: String = bytes.iter().take(PREVIEW).map(|b| format!("{b:02x}")).collect();
    json!({ "$binary": hex, "length": bytes.len() })
}

// ── Postgres ────────────────────────────────────────────────────────────────

/// `tokio_postgres::Error` displays as the bare string "db error" for anything
/// the server rejected — no syntax error, no constraint name, no read-only
/// complaint. The text a user needs is one level down, either in the structured
/// `DbError` or in the source chain for connection-level failures.
fn pg_err(e: tokio_postgres::Error) -> String {
    if let Some(db) = e.as_db_error() {
        let mut out = db.message().to_string();
        if let Some(detail) = db.detail() {
            out.push('\n');
            out.push_str(detail);
        }
        if let Some(hint) = db.hint() {
            out.push_str("\nHINT: ");
            out.push_str(hint);
        }
        return out;
    }
    let mut out = e.to_string();
    let mut source = std::error::Error::source(&e);
    while let Some(inner) = source {
        out.push_str(": ");
        out.push_str(&inner.to_string());
        source = inner.source();
    }
    out
}

async fn pg_connect(cfg: &SqlConfig) -> Result<tokio_postgres::Client, String> {
    let mut pg = tokio_postgres::Config::new();
    pg.host(&cfg.host)
        .port(cfg.port)
        .dbname(&cfg.database)
        .user(&cfg.username)
        .password(&cfg.password)
        .connect_timeout(std::time::Duration::from_secs(10))
        .options(format!("-c statement_timeout={STATEMENT_TIMEOUT_MS}"));
    let client = if cfg.ssl {
        let mut builder = native_tls::TlsConnector::builder();
        if !cfg.ssl_verify {
            // Explicit user opt-in ("trust self-signed certificate"). Without
            // it this is an unauthenticated channel — encrypted, but MITM-able.
            builder
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true);
        }
        let tls = builder.build().map_err(|e| e.to_string())?;
        let (client, conn) = pg
            .connect(postgres_native_tls::MakeTlsConnector::new(tls))
            .await
            .map_err(pg_err)?;
        tauri::async_runtime::spawn(async move {
            let _ = conn.await;
        });
        client
    } else {
        let (client, conn) = pg.connect(tokio_postgres::NoTls).await.map_err(pg_err)?;
        tauri::async_runtime::spawn(async move {
            let _ = conn.await;
        });
        client
    };

    // `pg_literal` escapes by doubling quotes, which is sufficient only while
    // backslashes are literal. On by default since 9.1, but a server-side
    // default can turn it off — pin it rather than depend on the deployment.
    client
        .simple_query("SET standard_conforming_strings = on")
        .await
        .map_err(pg_err)?;

    if cfg.read_only {
        // Blocks every write for the session, DDL included ("cannot execute
        // CREATE TABLE in a read-only transaction"). A failure here must be
        // fatal: silently not enforcing read-only is worse than not connecting.
        client
            .simple_query("SET default_transaction_read_only = on")
            .await
            .map_err(pg_err)?;
    }
    Ok(client)
}

/// Run one statement over the text protocol; values come back as strings
/// (numbers/booleans lose their JSON type — display-equivalent for the UI).
async fn pg_statement(
    client: &tokio_postgres::Client,
    stmt: &str,
    row_limit: usize,
) -> Result<StmtResult, String> {
    use tokio_postgres::SimpleQueryMessage;
    let messages = client.simple_query(stmt).await.map_err(pg_err)?;
    let mut rows: Vec<Value> = Vec::new();
    let mut columns: Vec<String> = Vec::new();
    let mut row_count: u64 = 0;
    for msg in messages {
        match msg {
            SimpleQueryMessage::Row(row) => {
                if columns.is_empty() {
                    columns = row.columns().iter().map(|c| c.name().to_string()).collect();
                }
                row_count += 1;
                if rows.len() < row_limit {
                    let cells: Vec<Value> = (0..columns.len())
                        .map(|i| row.get(i).map(|v| json!(v)).unwrap_or(Value::Null))
                        .collect();
                    rows.push(Value::Array(cells));
                }
            }
            SimpleQueryMessage::CommandComplete(n) => {
                if row_count == 0 {
                    row_count = n;
                }
            }
            _ => {}
        }
    }
    let truncated = row_count as usize > rows.len() && !rows.is_empty();
    Ok(StmtResult { rows, columns, row_count, truncated })
}

// ── MySQL ───────────────────────────────────────────────────────────────────

async fn mysql_connect(cfg: &SqlConfig) -> Result<mysql_async::Conn, String> {
    use mysql_async::prelude::Queryable;

    let mut opts = mysql_async::OptsBuilder::default()
        .ip_or_hostname(cfg.host.clone())
        .tcp_port(cfg.port)
        .user(Some(cfg.username.clone()))
        .pass(Some(cfg.password.clone()));
    if !cfg.database.is_empty() {
        opts = opts.db_name(Some(cfg.database.clone()));
    }
    if cfg.ssl {
        let mut ssl = mysql_async::SslOpts::default();
        if !cfg.ssl_verify {
            ssl = ssl
                .with_danger_accept_invalid_certs(true)
                .with_danger_skip_domain_validation(true);
        }
        opts = opts.ssl_opts(Some(ssl));
    }
    let mut conn = mysql_async::Conn::new(opts).await.map_err(|e| e.to_string())?;

    // Postgres gets its ceiling from `statement_timeout`; MySQL and MariaDB
    // spell theirs differently and each rejects the other's name, so try both
    // and ignore the miss. Best-effort: an old server has neither.
    let _ = conn
        .query_drop(format!("SET SESSION max_execution_time = {STATEMENT_TIMEOUT_MS}"))
        .await;
    let _ = conn
        .query_drop(format!("SET SESSION max_statement_time = {}", STATEMENT_TIMEOUT_MS / 1000))
        .await;

    if cfg.read_only {
        // ponytail: transaction-level read-only. Blocks INSERT/UPDATE/DELETE on
        // every supported version; DDL coverage varies by server version, so a
        // genuinely read-only database *user* is still the stronger guarantee.
        // Never ignore the failure — an unenforced read-only flag is a lie.
        conn.query_drop("SET SESSION TRANSACTION READ ONLY")
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(conn)
}

fn mysql_value_to_json(v: &mysql_async::Value) -> Value {
    use mysql_async::Value as V;
    match v {
        V::NULL => Value::Null,
        V::Bytes(b) => match std::str::from_utf8(b) {
            Ok(s) => json!(s),
            Err(_) => binary_envelope(b),
        },
        V::Int(i) => json!(i),
        V::UInt(u) => json!(u),
        V::Float(f) => json!(f),
        V::Double(d) => json!(d),
        V::Date(y, m, d, h, min, s, us) => {
            let base = format!("{y:04}-{m:02}-{d:02} {h:02}:{min:02}:{s:02}");
            // Dropping microseconds silently changes the value the user sees.
            json!(if *us > 0 { format!("{base}.{us:06}") } else { base })
        }
        V::Time(neg, days, h, m, s, us) => {
            let sign = if *neg { "-" } else { "" };
            let base = format!("{sign}{}:{m:02}:{s:02}", (*days as u64) * 24 + *h as u64);
            json!(if *us > 0 { format!("{base}.{us:06}") } else { base })
        }
    }
}

/// Runs one statement and returns **every** result set it produced. `CALL`
/// yields several; reading only the first leaves the rest queued on the
/// connection and every later statement then reads the wrong response.
async fn mysql_statement(
    conn: &mut mysql_async::Conn,
    stmt: &str,
    row_limit: usize,
) -> Result<Vec<StmtResult>, String> {
    use mysql_async::prelude::Queryable;

    let mut query_result = conn.query_iter(stmt).await.map_err(|e| e.to_string())?;
    let mut sets: Vec<StmtResult> = Vec::new();
    loop {
        // Read before `collect` — collecting consumes the pending set's metadata.
        // An empty column list means the statement was never meant to return rows.
        let columns: Vec<String> = query_result
            .columns_ref()
            .iter()
            .map(|c| c.name_str().to_string())
            .collect();

        // ponytail: buffers the whole set before capping. Memory is bounded by
        // the server's own result size, not by `row_limit` — streaming with
        // `next()` is the upgrade path if `SELECT *` on a huge table bites.
        let fetched: Vec<mysql_async::Row> =
            query_result.collect().await.map_err(|e| e.to_string())?;
        let affected = query_result.affected_rows();

        let row_count = if fetched.is_empty() { affected } else { fetched.len() as u64 };
        let rows: Vec<Value> = fetched
            .iter()
            .take(row_limit)
            .map(|row| {
                let cells: Vec<Value> = (0..columns.len())
                    .map(|i| row.as_ref(i).map(mysql_value_to_json).unwrap_or(Value::Null))
                    .collect();
                Value::Array(cells)
            })
            .collect();
        let truncated = fetched.len() > rows.len();
        sets.push(StmtResult { rows, columns, row_count, truncated });

        if query_result.is_empty() {
            break;
        }
    }
    Ok(sets)
}

/// The metadata queries below each return exactly one set.
async fn mysql_one(
    conn: &mut mysql_async::Conn,
    stmt: &str,
    row_limit: usize,
) -> Result<StmtResult, String> {
    let mut sets = mysql_statement(conn, stmt, row_limit).await?;
    if sets.is_empty() {
        return Ok(StmtResult { rows: vec![], columns: vec![], row_count: 0, truncated: false });
    }
    Ok(sets.remove(0))
}

// ── Route handlers ──────────────────────────────────────────────────────────

pub async fn handle(method: &str, rest: &str, body: Option<&str>) -> HandlerResult {
    if method != "POST" {
        return Ok(err(405, "Method not allowed"));
    }
    let req = match parse_body(body) {
        Ok(v) => v,
        Err(r) => return Ok(r),
    };
    // SQLite shares these routes but nothing else: a file path instead of
    // host/port/credentials, and a synchronous driver.
    if req["type"] == "sqlite" {
        return super::sqlite::handle(rest, &req);
    }
    match rest {
        "/connect" => connect(&req).await,
        "/query" => query(&req).await,
        "/tables" => tables(&req).await,
        "/update-row" => update_row(&req).await,
        _ => Ok(err(404, "Not found")),
    }
}

async fn connect(req: &Value) -> HandlerResult {
    let cfg = match config_from(req, true) {
        Ok(c) => c,
        Err(r) => return Ok(r),
    };
    let version = if cfg.ty == "postgresql" {
        let client = pg_connect(&cfg).await?;
        let result = pg_statement(&client, "SELECT version()", 1).await?;
        first_cell(&result)
    } else {
        let mut conn = mysql_connect(&cfg).await?;
        let result = mysql_one(&mut conn, "SELECT VERSION() as version", 1).await?;
        let _ = conn.disconnect().await;
        first_cell(&result)
    };
    Ok(ok(&json!({ "success": true, "version": version })))
}

/// Row 0, column 0 of a positional result.
fn first_cell(result: &StmtResult) -> Value {
    result
        .rows
        .first()
        .and_then(|row| row.as_array())
        .and_then(|cells| cells.first())
        .cloned()
        .unwrap_or(Value::Null)
}

async fn query(req: &Value) -> HandlerResult {
    let cfg = match config_from(req, true) {
        Ok(c) => c,
        Err(r) => return Ok(r),
    };
    let sql = req["query"].as_str().unwrap_or("");
    if sql.is_empty() {
        return Ok(err(400, "type, host, and database are required"));
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

    let started = std::time::Instant::now();
    let mut results: Vec<Value> = Vec::new();

    if cfg.ty == "postgresql" {
        let client = pg_connect(&cfg).await?;
        for stmt in &statements {
            results.push(pg_statement(&client, stmt, row_limit).await?.to_json());
        }
    } else {
        let mut conn = mysql_connect(&cfg).await?;
        for stmt in &statements {
            match mysql_statement(&mut conn, stmt, row_limit).await {
                Ok(sets) => results.extend(sets.iter().map(StmtResult::to_json)),
                Err(e) => {
                    let _ = conn.disconnect().await;
                    return Err(e);
                }
            }
        }
        let _ = conn.disconnect().await;
    }

    let execution_time = started.elapsed().as_millis() as u64;
    let last = results.last().cloned().unwrap_or_else(empty_result);
    Ok(ok(&json!({
        "rows": last["rows"],
        "columns": last["columns"],
        "rowCount": last["rowCount"],
        "truncated": last["truncated"],
        "executionTime": execution_time,
        "results": results,
    })))
}

fn parse_numeric_fields(rows: &mut [Value], fields: &[&str]) {
    for row in rows {
        if let Some(obj) = row.as_object_mut() {
            for f in fields {
                if let Some(Value::String(s)) = obj.get(*f) {
                    if let Ok(n) = s.parse::<i64>() {
                        obj.insert((*f).to_string(), json!(n));
                    }
                }
            }
        }
    }
}

async fn tables(req: &Value) -> HandlerResult {
    let cfg = match config_from(req, true) {
        Ok(c) => c,
        Err(r) => return Ok(r),
    };
    // The column list is one row per column *of the whole database* — tens of
    // MB on a large schema, and the sidebar needs none of it to draw the tree.
    // Callers that only want tables and primary keys opt out; the default stays
    // true so the standalone SQL Client's single call is unchanged.
    let include_columns = req["includeColumns"].as_bool().unwrap_or(true);
    if cfg.ty == "postgresql" {
        let client = pg_connect(&cfg).await?;
        let tables = pg_statement(
            &client,
            "SELECT t.table_schema AS schema, t.table_name AS name, t.table_type AS type,
                    (SELECT count(*) FROM information_schema.columns c
                      WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
             FROM information_schema.tables t
             WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
             ORDER BY t.table_schema, t.table_name",
            usize::MAX,
        )
        .await?;
        let columns = if include_columns {
            pg_statement(
                &client,
                "SELECT table_schema AS schema, table_name, column_name, data_type,
                        is_nullable, column_default, ordinal_position
                 FROM information_schema.columns
                 WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                 ORDER BY table_schema, table_name, ordinal_position",
                usize::MAX,
            )
            .await?
        } else {
            StmtResult { rows: vec![], columns: vec![], row_count: 0, truncated: false }
        };
        let primary_keys = pg_statement(
            &client,
            "SELECT kcu.table_schema AS schema, kcu.table_name, kcu.column_name
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
               ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
              AND tc.table_name = kcu.table_name
             WHERE tc.constraint_type = 'PRIMARY KEY'
               AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
             ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position",
            usize::MAX,
        )
        .await?;
        let mut tables = tables.objects();
        let mut columns = columns.objects();
        parse_numeric_fields(&mut tables, &["column_count"]);
        parse_numeric_fields(&mut columns, &["ordinal_position"]);
        Ok(ok(&json!({
            "tables": tables,
            "columns": columns,
            "primaryKeys": primary_keys.objects(),
        })))
    } else {
        let mut conn = mysql_connect(&cfg).await?;
        let tables = mysql_one(
            &mut conn,
            "SELECT table_schema AS `schema`, table_name AS `name`, table_type AS `type`, table_rows AS row_estimate
             FROM information_schema.tables WHERE table_schema = DATABASE()
             ORDER BY table_name",
            usize::MAX,
        )
        .await?;
        let columns = if include_columns {
            mysql_one(
                &mut conn,
                "SELECT table_schema AS `schema`, table_name, column_name, data_type,
                        is_nullable, column_default, ordinal_position
                 FROM information_schema.columns WHERE table_schema = DATABASE()
                 ORDER BY table_name, ordinal_position",
                usize::MAX,
            )
            .await?
        } else {
            StmtResult { rows: vec![], columns: vec![], row_count: 0, truncated: false }
        };
        let primary_keys = mysql_one(
            &mut conn,
            "SELECT table_schema AS `schema`, table_name, column_name
             FROM information_schema.key_column_usage
             WHERE constraint_name = 'PRIMARY' AND table_schema = DATABASE()
             ORDER BY table_name, ordinal_position",
            usize::MAX,
        )
        .await?;
        let _ = conn.disconnect().await;
        Ok(ok(&json!({
            "tables": tables.objects(),
            "columns": columns.objects(),
            "primaryKeys": primary_keys.objects(),
        })))
    }
}

// ── Row editing ─────────────────────────────────────────────────────────────
//
// The UI builds `where` from the table's primary key, so updates are
// single-row in practice; rowCount is reported back so the client can warn
// if a non-PK filter matched more.

fn pg_ident(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

fn mysql_ident(name: &str) -> String {
    format!("`{}`", name.replace('`', "``"))
}

fn pg_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "''"))
}

/// Postgres literal — everything except NULL is quoted.
///
/// A quoted literal carries the "unknown" type, which the server coerces to
/// whatever the column is: int, text, date, numeric and bool alike. Emitting a
/// bare `123` types it as `integer`, and `SET text_col = 123` is then a hard
/// error ("column is of type text but expression is of type integer"). Quoting
/// is also what preserves a NUMERIC's digits — a float round-trip would not.
///
/// `pg_connect` pins standard_conforming_strings on, which is what makes
/// doubling the quote sufficient escaping.
fn pg_literal(v: &Value) -> String {
    match v {
        Value::Null => "NULL".into(),
        Value::String(s) => pg_quote(s),
        Value::Bool(b) => pg_quote(if *b { "true" } else { "false" }),
        Value::Number(n) => pg_quote(&n.to_string()),
        other => pg_quote(&other.to_string()),
    }
}

/// Same reasoning as `pg_literal`: bind every value as text and let the server
/// coerce. Mapping a JSON number onto `Double` would round a DECIMAL column's
/// value on the way in, which is data loss the user never asked for.
fn mysql_param(v: &Value) -> mysql_async::Value {
    use mysql_async::Value as M;
    match v {
        Value::Null => M::NULL,
        Value::Bool(b) => M::Bytes(if *b { b"1".to_vec() } else { b"0".to_vec() }),
        Value::String(s) => M::Bytes(s.clone().into_bytes()),
        other => M::Bytes(other.to_string().into_bytes()),
    }
}

fn entries(v: &Value) -> Vec<(String, Value)> {
    v.as_object()
        .map(|m| m.iter().map(|(k, val)| (k.clone(), val.clone())).collect())
        .unwrap_or_default()
}

async fn update_row(req: &Value) -> HandlerResult {
    let cfg = match config_from(req, true) {
        Ok(c) => c,
        Err(r) => return Ok(r),
    };
    // The session guard would reject this anyway; refusing up front gives the
    // user the real reason instead of a driver error.
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
    let schema = req["schema"].as_str().unwrap_or("");

    let row_count: u64 = if cfg.ty == "postgresql" {
        let target = if schema.is_empty() {
            pg_ident(table)
        } else {
            format!("{}.{}", pg_ident(schema), pg_ident(table))
        };
        let sets: Vec<String> = set
            .iter()
            .map(|(k, v)| format!("{} = {}", pg_ident(k), pg_literal(v)))
            .collect();
        let wheres: Vec<String> = filter
            .iter()
            .map(|(k, v)| match v {
                Value::Null => format!("{} IS NULL", pg_ident(k)),
                _ => format!("{} = {}", pg_ident(k), pg_literal(v)),
            })
            .collect();
        let sql = format!(
            "UPDATE {target} SET {} WHERE {}",
            sets.join(", "),
            wheres.join(" AND ")
        );
        let client = pg_connect(&cfg).await?;
        // Reporting the row count *after* an unbounded write is too late: by
        // then a non-unique filter has already changed every matching row.
        // Inside a transaction the count is a decision, not a postmortem.
        client.simple_query("BEGIN").await.map_err(pg_err)?;
        let n = match pg_statement(&client, &sql, 0).await {
            Ok(result) => result.row_count,
            Err(e) => {
                let _ = client.simple_query("ROLLBACK").await;
                return Err(e);
            }
        };
        let finish = if n == 1 { "COMMIT" } else { "ROLLBACK" };
        client.simple_query(finish).await.map_err(pg_err)?;
        n
    } else {
        use mysql_async::prelude::Queryable;
        let target = if schema.is_empty() {
            mysql_ident(table)
        } else {
            format!("{}.{}", mysql_ident(schema), mysql_ident(table))
        };
        let sets: Vec<String> = set.iter().map(|(k, _)| format!("{} = ?", mysql_ident(k))).collect();
        let mut params: Vec<mysql_async::Value> = set.iter().map(|(_, v)| mysql_param(v)).collect();
        let mut wheres: Vec<String> = Vec::new();
        for (k, v) in &filter {
            if v.is_null() {
                wheres.push(format!("{} IS NULL", mysql_ident(k)));
            } else {
                wheres.push(format!("{} = ?", mysql_ident(k)));
                params.push(mysql_param(v));
            }
        }
        let sql = format!(
            "UPDATE {target} SET {} WHERE {}",
            sets.join(", "),
            wheres.join(" AND ")
        );
        let mut conn = mysql_connect(&cfg).await?;
        conn.query_drop("START TRANSACTION").await.map_err(|e| e.to_string())?;
        let n = match conn.exec_iter(sql, mysql_async::Params::Positional(params)).await {
            Ok(result) => {
                let n = result.affected_rows();
                drop(result);
                n
            }
            Err(e) => {
                let _ = conn.query_drop("ROLLBACK").await;
                let _ = conn.disconnect().await;
                return Err(e.to_string());
            }
        };
        let finish = if n == 1 { "COMMIT" } else { "ROLLBACK" };
        conn.query_drop(finish).await.map_err(|e| e.to_string())?;
        let _ = conn.disconnect().await;
        n
    };

    // `rowCount` of 0 on MySQL also means "the value was already what you set"
    // — affected_rows counts changed rows, not matched ones. Either way nothing
    // was written, so the client reports it the same.
    Ok(ok(&json!({
        "success": row_count == 1,
        "rowCount": row_count,
        "rolledBack": row_count != 1,
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg_body(port: Value) -> Value {
        json!({ "type": "postgresql", "host": "localhost", "database": "db", "port": port })
    }

    #[test]
    fn identifiers_escape_quotes() {
        assert_eq!(pg_ident(r#"we"ird"#), r#""we""ird""#);
        assert_eq!(mysql_ident("we`ird"), "`we``ird`");
    }

    #[test]
    fn pg_literals_escape_and_type() {
        assert_eq!(pg_literal(&json!("O'Brien")), "'O''Brien'");
        assert_eq!(pg_literal(&Value::Null), "NULL");
        // Injection attempt stays inside the literal.
        assert_eq!(pg_literal(&json!("'; DROP TABLE users; --")), "'''; DROP TABLE users; --'");
    }

    #[test]
    fn pg_literals_stay_unknown_typed() {
        // A bare `123` is typed `integer`, and `SET text_col = 123` is then a
        // hard error. Quoted, it is "unknown" and the column type wins.
        assert_eq!(pg_literal(&json!(42)), "'42'");
        assert_eq!(pg_literal(&json!(true)), "'true'");
        // Quoting is also what keeps a NUMERIC's digits off the float path.
        assert_eq!(pg_literal(&json!(1234567890123456789i64)), "'1234567890123456789'");
    }

    #[test]
    fn mysql_params_are_text_so_decimals_keep_their_digits() {
        let big = mysql_param(&json!(1234567890123456789i64));
        assert_eq!(big, mysql_async::Value::Bytes(b"1234567890123456789".to_vec()));
        assert_eq!(mysql_param(&Value::Null), mysql_async::Value::NULL);
        assert_eq!(mysql_param(&json!(true)), mysql_async::Value::Bytes(b"1".to_vec()));
    }

    #[test]
    fn port_out_of_range_is_rejected_not_wrapped() {
        // `65536 as u16` is 0, which would silently mean "use the default port".
        assert!(config_from(&cfg_body(json!(65536)), true).is_err());
        assert!(config_from(&cfg_body(json!(70000)), true).is_err());
    }

    #[test]
    fn port_accepts_strings_and_defaults_on_absence() {
        assert_eq!(config_from(&cfg_body(json!("5433")), true).ok().unwrap().port, 5433);
        assert_eq!(config_from(&cfg_body(Value::Null), true).ok().unwrap().port, 5432);
        assert_eq!(config_from(&cfg_body(json!(0)), true).ok().unwrap().port, 5432);
        assert_eq!(config_from(&cfg_body(json!(65535)), true).ok().unwrap().port, 65535);
    }

    #[test]
    fn ssl_verification_is_on_unless_the_client_opts_out() {
        assert!(config_from(&cfg_body(json!(5432)), true).ok().unwrap().ssl_verify);
        let mut body = cfg_body(json!(5432));
        body["sslVerify"] = json!(false);
        assert!(!config_from(&body, true).ok().unwrap().ssl_verify);
    }

    #[test]
    fn duplicate_column_names_both_survive() {
        // The whole point of positional rows: an object keyed by name would
        // keep only the second `id`.
        let result = StmtResult {
            columns: vec!["id".into(), "id".into()],
            rows: vec![json!([3, 7])],
            row_count: 1,
            truncated: false,
        };
        let json = result.to_json();
        assert_eq!(json["rows"][0][0], json!(3));
        assert_eq!(json["rows"][0][1], json!(7));
    }

    #[test]
    fn objects_rekey_metadata_rows_by_column_name() {
        let result = StmtResult {
            columns: vec!["schema".into(), "name".into()],
            rows: vec![json!(["public", "users"])],
            row_count: 1,
            truncated: false,
        };
        let objects = result.objects();
        assert_eq!(objects[0]["schema"], json!("public"));
        assert_eq!(objects[0]["name"], json!("users"));
    }

    #[test]
    fn binary_values_are_hex_not_replacement_characters() {
        let v = mysql_value_to_json(&mysql_async::Value::Bytes(vec![0xff, 0x00, 0x41]));
        assert_eq!(v["$binary"], json!("ff0041"));
        assert_eq!(v["length"], json!(3));
        // Valid UTF-8 still comes back as a plain string.
        assert_eq!(mysql_value_to_json(&mysql_async::Value::Bytes(b"hi".to_vec())), json!("hi"));
    }

    #[test]
    fn microseconds_are_not_dropped() {
        let v = mysql_value_to_json(&mysql_async::Value::Date(2026, 8, 11, 9, 30, 15, 123456));
        assert_eq!(v, json!("2026-08-11 09:30:15.123456"));
        let v = mysql_value_to_json(&mysql_async::Value::Date(2026, 8, 11, 9, 30, 15, 0));
        assert_eq!(v, json!("2026-08-11 09:30:15"));
    }
}
