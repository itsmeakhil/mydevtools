//! Internal sync endpoints (`/desktop/sync/*`) — NOT FastAPI mirrors.
//!
//! The sync engine runs in the webview (TS owns the REST adapters and any
//! crypto context); Rust exposes raw row state: dirty rows, tombstones, and
//! resolution actions (mark-synced / apply-remote / remove-local).

use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::{parse_body, query_param};
use crate::router::ApiResponse;
use crate::state::AppState;

pub fn handle(
    state: &AppState,
    method: &str,
    rest: &str, // path after "/desktop/sync"
    query: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    match (method, rest) {
        ("GET", "/settings") => {
            let ws = query_param(query, "workspace_id").unwrap_or("local-personal");
            let key = format!("sync_enabled:{ws}");
            let enabled: Option<String> = db
                .query_row("SELECT v FROM kv WHERE k = ?1", [&key], |r| r.get(0))
                .optional()?;
            ApiResponse::ok(&json!({ "enabled": enabled.as_deref() == Some("1") }))
        }
        ("POST", "/settings") => {
            let req = parse_body(body)?;
            let ws = req["workspace_id"].as_str().unwrap_or("local-personal");
            let enabled = req["enabled"].as_bool().unwrap_or(false);
            let key = format!("sync_enabled:{ws}");
            db.execute(
                "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
                params![key, if enabled { "1" } else { "0" }],
            )?;
            if !enabled {
                // Detach: forget sync state so a later re-enable does a fresh
                // additive merge instead of inferring remote deletions.
                db.execute(
                    "UPDATE entries SET last_synced_at = NULL WHERE workspace_id = ?1",
                    [ws],
                )?;
                db.execute("DELETE FROM sync_state WHERE workspace_id = ?1", [ws])?;
            }
            ApiResponse::ok(&json!({ "enabled": enabled }))
        }
        ("GET", "/rows") => {
            let ws = query_param(query, "workspace_id").unwrap_or("local-personal");
            let kind = query_param(query, "tool_kind").unwrap_or("");
            let mut stmt = db.prepare(
                "SELECT id, meta_json, updated_at, deleted_at, dirty, last_synced_at
                 FROM entries WHERE workspace_id = ?1 AND tool_kind = ?2",
            )?;
            let rows: Vec<Value> = stmt
                .query_map(params![ws, kind], |r| {
                    let doc_raw: String = r.get(1)?;
                    Ok(json!({
                        "id": r.get::<_, String>(0)?,
                        "doc": serde_json::from_str::<Value>(&doc_raw).unwrap_or(Value::Null),
                        "updated_at": r.get::<_, i64>(2)?,
                        "deleted_at": r.get::<_, Option<i64>>(3)?,
                        "dirty": r.get::<_, i64>(4)? == 1,
                        "last_synced_at": r.get::<_, Option<i64>>(5)?,
                    }))
                })?
                .collect::<std::result::Result<_, _>>()?;
            ApiResponse::ok(&rows)
        }
        ("POST", "/resolve") => {
            let req = parse_body(body)?;
            let ws = req["workspace_id"].as_str().unwrap_or("local-personal");
            let kind = req["tool_kind"].as_str().unwrap_or("");
            let id = req["id"].as_str().unwrap_or("");
            match req["action"].as_str() {
                Some("mark-synced") => {
                    let tombstoned: Option<Option<i64>> = db
                        .query_row(
                            "SELECT deleted_at FROM entries
                             WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3",
                            params![kind, ws, id],
                            |r| r.get(0),
                        )
                        .optional()?;
                    match tombstoned {
                        Some(Some(_)) => {
                            // Tombstone acknowledged remotely — row can go.
                            db.execute(
                                "DELETE FROM entries WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3",
                                params![kind, ws, id],
                            )?;
                        }
                        Some(None) => {
                            let new_id = req["new_id"].as_str().unwrap_or(id);
                            let new_doc = if req["new_doc"].is_object() {
                                Some(serde_json::to_string(&req["new_doc"])?)
                            } else {
                                None
                            };
                            db.execute(
                                "UPDATE entries SET id = ?4, meta_json = COALESCE(?5, meta_json),
                                        dirty = 0, last_synced_at = ?6
                                 WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3",
                                params![kind, ws, id, new_id, new_doc, now_ms()],
                            )?;
                        }
                        None => return Ok(ApiResponse::detail(404, "Row not found")),
                    }
                    ApiResponse::ok(&json!({ "ok": true }))
                }
                Some("apply-remote") => {
                    let doc = serde_json::to_string(&req["doc"])?;
                    let updated_at = req["updated_at"].as_i64().unwrap_or_else(now_ms);
                    db.execute(
                        "INSERT INTO entries (tool_kind, workspace_id, id, meta_json, created_at, updated_at, deleted_at, dirty, last_synced_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?5, NULL, 0, ?6)
                         ON CONFLICT(tool_kind, workspace_id, id) DO UPDATE SET
                           meta_json = excluded.meta_json, updated_at = excluded.updated_at,
                           deleted_at = NULL, dirty = 0, last_synced_at = excluded.last_synced_at",
                        params![kind, ws, id, doc, updated_at, now_ms()],
                    )?;
                    ApiResponse::ok(&json!({ "ok": true }))
                }
                Some("remove-local") => {
                    db.execute(
                        "DELETE FROM entries WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3",
                        params![kind, ws, id],
                    )?;
                    ApiResponse::ok(&json!({ "ok": true }))
                }
                _ => Ok(ApiResponse::detail(422, "Unknown action")),
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
