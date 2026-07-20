//! /api/sql-client/* — PostgreSQL (tokio-postgres, text protocol) and
//! MySQL/MariaDB (mysql_async). Connections are per-request (single local
//! user; avoids pool lifetime management). Credentials arrive per request,
//! decrypted client-side, exactly like the web routes.

use serde_json::{json, Map, Value};

use super::sqlsplit::split_sql_statements;
use super::{err, ok, parse_body};
use crate::router::ApiResponse;

const MAX_ROWS: usize = 5000;
const DEFAULT_ROWS: usize = 500;

type HandlerResult = Result<ApiResponse, String>;

struct SqlConfig {
    ty: String,
    host: String,
    port: u16,
    database: String,
    username: String,
    password: String,
    ssl: bool,
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
    let port = body["port"].as_u64().filter(|p| *p > 0).unwrap_or(default_port) as u16;
    Ok(SqlConfig {
        ty,
        host,
        port,
        database,
        username: body["username"].as_str().unwrap_or("").to_string(),
        password: body["password"].as_str().unwrap_or("").to_string(),
        ssl: body["ssl"].as_bool().unwrap_or(false),
    })
}

// ── Postgres ────────────────────────────────────────────────────────────────

async fn pg_connect(cfg: &SqlConfig) -> Result<tokio_postgres::Client, String> {
    let mut pg = tokio_postgres::Config::new();
    pg.host(&cfg.host)
        .port(cfg.port)
        .dbname(&cfg.database)
        .user(&cfg.username)
        .password(&cfg.password)
        .connect_timeout(std::time::Duration::from_secs(10))
        .options("-c statement_timeout=30000");
    if cfg.ssl {
        let tls = native_tls::TlsConnector::builder()
            .danger_accept_invalid_certs(true)
            .danger_accept_invalid_hostnames(true)
            .build()
            .map_err(|e| e.to_string())?;
        let (client, conn) = pg
            .connect(postgres_native_tls::MakeTlsConnector::new(tls))
            .await
            .map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn(async move {
            let _ = conn.await;
        });
        Ok(client)
    } else {
        let (client, conn) = pg.connect(tokio_postgres::NoTls).await.map_err(|e| e.to_string())?;
        tauri::async_runtime::spawn(async move {
            let _ = conn.await;
        });
        Ok(client)
    }
}

/// Run one statement over the text protocol; values come back as strings
/// (numbers/booleans lose their JSON type — display-equivalent for the UI).
async fn pg_statement(
    client: &tokio_postgres::Client,
    stmt: &str,
    row_limit: usize,
) -> Result<(Vec<Value>, Vec<String>, u64), String> {
    use tokio_postgres::SimpleQueryMessage;
    let messages = client.simple_query(stmt).await.map_err(|e| e.to_string())?;
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
                    let mut obj = Map::new();
                    for (i, col) in columns.iter().enumerate() {
                        obj.insert(
                            col.clone(),
                            row.get(i).map(|v| json!(v)).unwrap_or(Value::Null),
                        );
                    }
                    rows.push(Value::Object(obj));
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
    Ok((rows, columns, row_count))
}

// ── MySQL ───────────────────────────────────────────────────────────────────

async fn mysql_connect(cfg: &SqlConfig) -> Result<mysql_async::Conn, String> {
    let mut opts = mysql_async::OptsBuilder::default()
        .ip_or_hostname(cfg.host.clone())
        .tcp_port(cfg.port)
        .user(Some(cfg.username.clone()))
        .pass(Some(cfg.password.clone()));
    if !cfg.database.is_empty() {
        opts = opts.db_name(Some(cfg.database.clone()));
    }
    if cfg.ssl {
        opts = opts.ssl_opts(Some(
            mysql_async::SslOpts::default()
                .with_danger_accept_invalid_certs(true)
                .with_danger_skip_domain_validation(true),
        ));
    }
    mysql_async::Conn::new(opts).await.map_err(|e| e.to_string())
}

fn mysql_value_to_json(v: &mysql_async::Value) -> Value {
    use mysql_async::Value as V;
    match v {
        V::NULL => Value::Null,
        V::Bytes(b) => json!(String::from_utf8_lossy(b)),
        V::Int(i) => json!(i),
        V::UInt(u) => json!(u),
        V::Float(f) => json!(f),
        V::Double(d) => json!(d),
        V::Date(y, m, d, h, min, s, _us) => {
            json!(format!("{y:04}-{m:02}-{d:02} {h:02}:{min:02}:{s:02}"))
        }
        V::Time(neg, days, h, m, s, _us) => {
            let sign = if *neg { "-" } else { "" };
            json!(format!("{sign}{}:{m:02}:{s:02}", (*days as u64) * 24 + *h as u64))
        }
    }
}

async fn mysql_statement(
    conn: &mut mysql_async::Conn,
    stmt: &str,
    row_limit: usize,
) -> Result<(Vec<Value>, Vec<String>, u64), String> {
    use mysql_async::prelude::Queryable;
    let result: Vec<mysql_async::Row> = conn.query(stmt).await.map_err(|e| e.to_string())?;
    let columns: Vec<String> = result
        .first()
        .map(|r| r.columns_ref().iter().map(|c| c.name_str().to_string()).collect())
        .unwrap_or_default();
    let row_count = result.len() as u64;
    let rows: Vec<Value> = result
        .iter()
        .take(row_limit)
        .map(|row| {
            let mut obj = Map::new();
            for (i, col) in columns.iter().enumerate() {
                let v = row.as_ref(i).map(mysql_value_to_json).unwrap_or(Value::Null);
                obj.insert(col.clone(), v);
            }
            Value::Object(obj)
        })
        .collect();
    Ok((rows, columns, row_count))
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
        let (rows, ..) = pg_statement(&client, "SELECT version()", 1).await?;
        rows.first()
            .and_then(|r| r.get("version"))
            .cloned()
            .unwrap_or(Value::Null)
    } else {
        let mut conn = mysql_connect(&cfg).await?;
        let (rows, ..) = mysql_statement(&mut conn, "SELECT VERSION() as version", 1).await?;
        let _ = conn.disconnect().await;
        rows.first().and_then(|r| r.get("version")).cloned().unwrap_or(Value::Null)
    };
    Ok(ok(&json!({ "success": true, "version": version })))
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
            let (rows, columns, row_count) = pg_statement(&client, stmt, row_limit).await?;
            results.push(json!({ "rows": rows, "columns": columns, "rowCount": row_count }));
        }
    } else {
        let mut conn = mysql_connect(&cfg).await?;
        for stmt in &statements {
            match mysql_statement(&mut conn, stmt, row_limit).await {
                Ok((rows, columns, row_count)) => {
                    results.push(json!({ "rows": rows, "columns": columns, "rowCount": row_count }));
                }
                Err(e) => {
                    let _ = conn.disconnect().await;
                    return Err(e);
                }
            }
        }
        let _ = conn.disconnect().await;
    }

    let execution_time = started.elapsed().as_millis() as u64;
    let last = results.last().cloned().unwrap_or(json!({"rows": [], "columns": [], "rowCount": 0}));
    Ok(ok(&json!({
        "rows": last["rows"],
        "columns": last["columns"],
        "rowCount": last["rowCount"],
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
    if cfg.ty == "postgresql" {
        let client = pg_connect(&cfg).await?;
        let (mut tables, ..) = pg_statement(
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
        let (mut columns, ..) = pg_statement(
            &client,
            "SELECT table_schema AS schema, table_name, column_name, data_type,
                    is_nullable, column_default, ordinal_position
             FROM information_schema.columns
             WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
             ORDER BY table_schema, table_name, ordinal_position",
            usize::MAX,
        )
        .await?;
        let (primary_keys, ..) = pg_statement(
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
        parse_numeric_fields(&mut tables, &["column_count"]);
        parse_numeric_fields(&mut columns, &["ordinal_position"]);
        Ok(ok(&json!({ "tables": tables, "columns": columns, "primaryKeys": primary_keys })))
    } else {
        let mut conn = mysql_connect(&cfg).await?;
        let (tables, ..) = mysql_statement(
            &mut conn,
            "SELECT table_schema AS `schema`, table_name AS `name`, table_type AS `type`, table_rows AS row_estimate
             FROM information_schema.tables WHERE table_schema = DATABASE()
             ORDER BY table_name",
            usize::MAX,
        )
        .await?;
        let (columns, ..) = mysql_statement(
            &mut conn,
            "SELECT table_schema AS `schema`, table_name, column_name, data_type,
                    is_nullable, column_default, ordinal_position
             FROM information_schema.columns WHERE table_schema = DATABASE()
             ORDER BY table_name, ordinal_position",
            usize::MAX,
        )
        .await?;
        let (primary_keys, ..) = mysql_statement(
            &mut conn,
            "SELECT table_schema AS `schema`, table_name, column_name
             FROM information_schema.key_column_usage
             WHERE constraint_name = 'PRIMARY' AND table_schema = DATABASE()
             ORDER BY table_name, ordinal_position",
            usize::MAX,
        )
        .await?;
        let _ = conn.disconnect().await;
        Ok(ok(&json!({ "tables": tables, "columns": columns, "primaryKeys": primary_keys })))
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

/// Postgres literal. Quoted literals are the "unknown" type — the server
/// coerces them to the column type, so strings work for int/date/bool
/// columns too. standard_conforming_strings (default on) makes quote
/// doubling sufficient.
fn pg_literal(v: &Value) -> String {
    match v {
        Value::Null => "NULL".into(),
        Value::Bool(b) => (if *b { "TRUE" } else { "FALSE" }).into(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => format!("'{}'", s.replace('\'', "''")),
        other => format!("'{}'", other.to_string().replace('\'', "''")),
    }
}

fn mysql_param(v: &Value) -> mysql_async::Value {
    use mysql_async::Value as M;
    match v {
        Value::Null => M::NULL,
        Value::Bool(b) => M::Int(*b as i64),
        Value::Number(n) => n
            .as_i64()
            .map(M::Int)
            .or_else(|| n.as_u64().map(M::UInt))
            .unwrap_or(M::Double(n.as_f64().unwrap_or(0.0))),
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
        let (_, _, n) = pg_statement(&client, &sql, 0).await?;
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
        let result = conn
            .exec_iter(sql, mysql_async::Params::Positional(params))
            .await
            .map_err(|e| e.to_string())?;
        let n = result.affected_rows();
        drop(result);
        let _ = conn.disconnect().await;
        n
    };

    Ok(ok(&json!({ "success": true, "rowCount": row_count })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifiers_escape_quotes() {
        assert_eq!(pg_ident(r#"we"ird"#), r#""we""ird""#);
        assert_eq!(mysql_ident("we`ird"), "`we``ird`");
    }

    #[test]
    fn pg_literals_escape_and_type() {
        assert_eq!(pg_literal(&json!("O'Brien")), "'O''Brien'");
        assert_eq!(pg_literal(&json!(42)), "42");
        assert_eq!(pg_literal(&json!(true)), "TRUE");
        assert_eq!(pg_literal(&Value::Null), "NULL");
        // Injection attempt stays inside the literal.
        assert_eq!(pg_literal(&json!("'; DROP TABLE users; --")), "'''; DROP TABLE users; --'");
    }
}
