//! Internal sync endpoints (`/desktop/sync/*`) — NOT FastAPI mirrors.
//!
//! The sync engine runs in the webview (TS owns the REST adapters and any
//! crypto context); Rust exposes raw row state: dirty rows, tombstones, and
//! resolution actions (mark-synced / apply-remote / remove-local).

use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::{new_id, parse_body, query_param};
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
        // Archive the losing side of a concurrent edit. Called by the engine
        // right before it overwrites the loser, so the discarded version stays
        // recoverable. `loser_doc` is stored verbatim (ciphertext for vaults).
        ("POST", "/conflict") => {
            let req = parse_body(body)?;
            let ws = req["workspace_id"].as_str().unwrap_or("local-personal");
            let kind = req["tool_kind"].as_str().unwrap_or("");
            let entry_id = req["entry_id"].as_str().unwrap_or("");
            let side = match req["loser_side"].as_str() {
                Some(s @ ("local" | "remote")) => s,
                _ => return Ok(ApiResponse::detail(422, "loser_side must be 'local' or 'remote'")),
            };
            let loser_doc = serde_json::to_string(&req["loser_doc"])?;
            let loser_ts = req["loser_updated_at"].as_i64().unwrap_or(0);
            let winner_ts = req["winner_updated_at"].as_i64().unwrap_or(0);
            let cid = new_id();
            db.execute(
                "INSERT INTO conflicts
                   (id, tool_kind, workspace_id, entry_id, loser_side, loser_doc,
                    loser_updated_at, winner_updated_at, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![cid, kind, ws, entry_id, side, loser_doc, loser_ts, winner_ts, now_ms()],
            )?;
            ApiResponse::ok(&json!({ "id": cid }))
        }
        // List unresolved conflicts (newest first) for a review UI.
        ("GET", "/conflicts") => {
            let ws = query_param(query, "workspace_id").unwrap_or("local-personal");
            let mut stmt = db.prepare(
                "SELECT id, tool_kind, entry_id, loser_side, loser_doc,
                        loser_updated_at, winner_updated_at, created_at
                 FROM conflicts WHERE workspace_id = ?1 AND resolved_at IS NULL
                 ORDER BY created_at DESC",
            )?;
            let rows: Vec<Value> = stmt
                .query_map([ws], |r| {
                    let doc_raw: String = r.get(4)?;
                    Ok(json!({
                        "id": r.get::<_, String>(0)?,
                        "tool_kind": r.get::<_, String>(1)?,
                        "entry_id": r.get::<_, String>(2)?,
                        "loser_side": r.get::<_, String>(3)?,
                        "loser_doc": serde_json::from_str::<Value>(&doc_raw).unwrap_or(Value::Null),
                        "loser_updated_at": r.get::<_, i64>(5)?,
                        "winner_updated_at": r.get::<_, i64>(6)?,
                        "created_at": r.get::<_, i64>(7)?,
                    }))
                })?
                .collect::<std::result::Result<_, _>>()?;
            ApiResponse::ok(&rows)
        }
        // Dismiss one conflict (the user reviewed it) — keeps it for audit but
        // hides it from the open list.
        ("POST", "/conflicts/dismiss") => {
            let req = parse_body(body)?;
            let id = req["id"].as_str().unwrap_or("");
            let n = db.execute(
                "UPDATE conflicts SET resolved_at = ?2 WHERE id = ?1 AND resolved_at IS NULL",
                params![id, now_ms()],
            )?;
            if n == 0 {
                return Ok(ApiResponse::detail(404, "Conflict not found"));
            }
            ApiResponse::ok(&json!({ "ok": true }))
        }
        // Restore a discarded version: re-apply the loser as the live doc with a
        // fresh clock so it wins the next sync round, then mark the conflict
        // resolved. Keeps last_synced_at intact so the push updates (not
        // recreates) the existing remote row.
        ("POST", "/conflicts/restore") => {
            let req = parse_body(body)?;
            let id = req["id"].as_str().unwrap_or("");
            let found: Option<(String, String, String, String)> = db
                .query_row(
                    "SELECT tool_kind, workspace_id, entry_id, loser_doc
                     FROM conflicts WHERE id = ?1 AND resolved_at IS NULL",
                    [id],
                    |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
                )
                .optional()?;
            let Some((kind, ws, entry_id, loser_raw)) = found else {
                return Ok(ApiResponse::detail(404, "Conflict not found"));
            };
            let now = now_ms();
            // Bump the doc's own numeric clock fields so the pushed update carries
            // a fresh timestamp (envelope tools send updatedAt on PATCH).
            let mut doc: Value = serde_json::from_str(&loser_raw).unwrap_or(Value::Null);
            if let Some(obj) = doc.as_object_mut() {
                for k in ["updatedAt", "lastUsedAt"] {
                    if obj.get(k).is_some_and(Value::is_number) {
                        obj.insert(k.to_string(), json!(now));
                    }
                }
            }
            let doc_str = serde_json::to_string(&doc)?;
            db.execute(
                "INSERT INTO entries
                   (tool_kind, workspace_id, id, meta_json, created_at, updated_at, deleted_at, dirty)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?5, NULL, 1)
                 ON CONFLICT(tool_kind, workspace_id, id) DO UPDATE SET
                   meta_json = excluded.meta_json, updated_at = excluded.updated_at,
                   deleted_at = NULL, dirty = 1",
                params![kind, ws, entry_id, doc_str, now],
            )?;
            db.execute(
                "UPDATE conflicts SET resolved_at = ?2 WHERE id = ?1",
                params![id, now],
            )?;
            ApiResponse::ok(&json!({ "ok": true, "tool_kind": kind, "entry_id": entry_id }))
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
