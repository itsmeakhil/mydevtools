//! Local mirror of `/api/v1/user-preferences` (per-user singleton in `kv`,
//! defaults synced with apps/backend/app/api/routes/user_preferences/schema.py).

use rusqlite::OptionalExtension;
use serde_json::{json, Value};

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::{merge_patch, parse_body, query_param};
use crate::router::notes::now_iso;
use crate::router::ApiResponse;
use crate::state::AppState;

const KV_KEY: &str = "user_preferences";
const MAX_NOSQL_HISTORY_QUERIES: usize = 10;
const MAX_NOSQL_SAVED_QUERIES: usize = 50;

// Keep in sync with backend DEFAULT_ENABLED_TOOLS (user_preferences/schema.py)
const DEFAULT_ENABLED_TOOLS: &[&str] = &[
    "/app/to-do",
    "/app/notes",
    "/app/bookmarks",
    "/app/snippet-manager",
    "/app/password-manager",
    "/app/environment-manager",
    "/app/secure-files",
    "/app/email-validator",
    "/app/jwt-decoder",
    "/app/encryption-playground",
    "/app/certificate-pem-decoder",
    "/app/json-formatter",
    "/app/json-schema-generator",
    "/app/sql-formatter",
    "/app/graphql-formatter",
    "/app/diff-checker",
    "/app/regex-tester",
    "/app/timestamp-converter",
    "/app/cron-builder",
    "/app/number-base-converter",
    "/app/csv-excel-json",
    "/app/api-client",
    "/app/http-status-codes",
    "/app/nosql-explorer",
    "/app/url-encode",
    "/app/uuid-generator",
    "/app/secret-api-key-generator",
    "/app/qr-code-generator",
    "/app/ip-subnet-calculator",
    "/app/hash-generator",
    "/app/hmac-generator",
    "/app/totp-generator",
    "/app/lorem-ipsum",
    "/app/color-picker",
    "/app/contrast-checker",
    "/app/markdown-preview-html",
];

fn defaults() -> Value {
    json!({
        "theme": "system",
        "accentColor": "blue",
        "locale": "en",
        // Local profile: what the app calls you. There is no account behind it.
        "displayName": null,
        "avatar": null,
        // First-run walkthrough state (used to live on the user account).
        "onboardingCompleted": false,
        "persona": null,
        "enabledTools": DEFAULT_ENABLED_TOOLS,
        "toolFavorites": [],
        "pinnedToolsByWorkspace": {},
        "toolStats": {},
        "createdAt": 0,
        "updatedAt": 0,
    })
}

fn load(db: &rusqlite::Connection) -> Result<Value> {
    let raw: Option<String> = db
        .query_row("SELECT v FROM kv WHERE k = ?1", [KV_KEY], |r| r.get(0))
        .optional()?;
    Ok(match raw {
        Some(v) => serde_json::from_str(&v)?,
        None => defaults(),
    })
}

fn save(db: &rusqlite::Connection, prefs: &Value) -> Result<()> {
    let jsonv = serde_json::to_string(prefs)?;
    db.execute(
        "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
        [KV_KEY, &jsonv],
    )?;
    Ok(())
}

fn nosql_kv_key(namespace: &str, query_or_body: &Value) -> String {
    format!(
        "{namespace}:{}|{}|{}",
        query_or_body["connectionName"].as_str().unwrap_or(""),
        query_or_body["dbName"].as_str().unwrap_or(""),
        query_or_body["collectionName"].as_str().unwrap_or(""),
    )
}

/// GET/PUT a per-collection query list stored in `kv` (history + saved queries).
fn nosql_query_list(
    db: &rusqlite::Connection,
    method: &str,
    namespace: &str,
    max_len: usize,
    query: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    match method {
        "GET" => {
            let params = json!({
                "connectionName": query_param(query, "connectionName").unwrap_or(""),
                "dbName": query_param(query, "dbName").unwrap_or(""),
                "collectionName": query_param(query, "collectionName").unwrap_or(""),
            });
            let key = nosql_kv_key(namespace, &params);
            let raw: Option<String> = db
                .query_row("SELECT v FROM kv WHERE k = ?1", [&key], |r| r.get(0))
                .optional()?;
            match raw {
                Some(v) => Ok(ApiResponse { status: 200, body: v }),
                None => {
                    let mut empty = params;
                    empty["queries"] = json!([]);
                    empty["updatedAt"] = json!(now_ms());
                    ApiResponse::ok(&empty)
                }
            }
        }
        "PUT" => {
            let mut req = parse_body(body)?;
            if let Some(queries) = req["queries"].as_array_mut() {
                queries.truncate(max_len);
            }
            req["updatedAt"] = json!(now_ms());
            let key = nosql_kv_key(namespace, &req);
            let jsonv = serde_json::to_string(&req)?;
            db.execute(
                "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
                [&key, &jsonv],
            )?;
            ApiResponse::ok(&req)
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}

pub fn handle(
    state: &AppState,
    method: &str,
    rest: &str, // path after "/user-preferences"
    query: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    match (method, rest) {
        ("GET", "") => ApiResponse::ok(&load(&db)?),
        ("PATCH", "") => {
            let mut prefs = load(&db)?;
            merge_patch(&mut prefs, &parse_body(body)?);
            prefs["updatedAt"] = json!(now_ms());
            save(&db, &prefs)?;
            ApiResponse::ok(&prefs)
        }
        ("POST", "/tool-usage") => {
            let req = parse_body(body)?;
            let Some(tool_id) = req["toolId"].as_str() else {
                return Ok(ApiResponse::detail(422, "toolId required"));
            };
            let mut prefs = load(&db)?;
            let count = prefs["toolStats"][tool_id]["usageCount"].as_i64().unwrap_or(0);
            prefs["toolStats"][tool_id] = json!({ "usageCount": count + 1, "lastUsed": now_iso() });
            prefs["updatedAt"] = json!(now_ms());
            save(&db, &prefs)?;
            ApiResponse::ok(&json!({ "ok": true }))
        }
        (m, "/nosql-query-history") => {
            nosql_query_list(&db, m, "nosql_query_history", MAX_NOSQL_HISTORY_QUERIES, query, body)
        }
        (m, "/nosql-saved-queries") => {
            nosql_query_list(&db, m, "nosql_saved_queries", MAX_NOSQL_SAVED_QUERIES, query, body)
        }
        // SQL client reuses the same generic list store (collectionName = "").
        (m, "/sql-query-history") => {
            nosql_query_list(&db, m, "sql_query_history", MAX_NOSQL_HISTORY_QUERIES, query, body)
        }
        (m, "/sql-saved-queries") => {
            nosql_query_list(&db, m, "sql_saved_queries", MAX_NOSQL_SAVED_QUERIES, query, body)
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
