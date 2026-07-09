//! Generic local document store over the `entries` table, plus the two
//! contract families that are pure envelope CRUD:
//!
//! * envelope entries  — password-manager / api-keys / environment-manager
//!   (`{id, encryptedData, iv, createdAt, updatedAt}`)
//! * connection vaults — sql-client / redis-commander / nosql connections
//!   (`{id, userId, encryptedData, iv, name, [type], createdAt, lastUsedAt}`)
//!
//! Every row stores the full response-shaped JSON doc in `meta_json`; the
//! `updated_at` column always carries epoch-ms for LWW sync regardless of the
//! doc's own timestamp format. Rust never sees plaintext secrets — encrypted
//! tools ship opaque `{encryptedData, iv}` blobs produced in the webview.

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::db::now_ms;
use crate::error::{AppError, Result};
use crate::router::ApiResponse;
use crate::state::AppState;

// ── Workspace + doc-store helpers (used by all tool handlers) ──────────────

pub fn active_workspace(db: &Connection) -> String {
    db.query_row("SELECT v FROM kv WHERE k = 'active_workspace'", [], |r| r.get(0))
        .optional()
        .ok()
        .flatten()
        .unwrap_or_else(|| crate::router::workspaces::LOCAL_WORKSPACE_ID.to_string())
}

pub fn parse_body(body: Option<&str>) -> Result<Value> {
    serde_json::from_str(body.unwrap_or("{}")).map_err(AppError::from)
}

pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn list_docs(db: &Connection, kind: &str, ws: &str) -> Result<Vec<Value>> {
    let mut stmt = db.prepare(
        "SELECT meta_json FROM entries
         WHERE tool_kind = ?1 AND workspace_id = ?2 AND deleted_at IS NULL
         ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![kind, ws], |r| r.get::<_, String>(0))?;
    let mut docs = Vec::new();
    for row in rows {
        docs.push(serde_json::from_str(&row?)?);
    }
    Ok(docs)
}

pub fn get_doc(db: &Connection, kind: &str, ws: &str, id: &str) -> Result<Option<Value>> {
    let raw: Option<String> = db
        .query_row(
            "SELECT meta_json FROM entries
             WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3 AND deleted_at IS NULL",
            params![kind, ws, id],
            |r| r.get(0),
        )
        .optional()?;
    Ok(match raw {
        Some(s) => Some(serde_json::from_str(&s)?),
        None => None,
    })
}

pub fn insert_doc(db: &Connection, kind: &str, ws: &str, id: &str, doc: &Value) -> Result<()> {
    let now = now_ms();
    db.execute(
        "INSERT INTO entries (tool_kind, workspace_id, id, meta_json, created_at, updated_at, dirty)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5, 1)
         ON CONFLICT(tool_kind, workspace_id, id) DO UPDATE SET
           meta_json = excluded.meta_json, updated_at = excluded.updated_at,
           deleted_at = NULL, dirty = 1",
        params![kind, ws, id, serde_json::to_string(doc)?, now],
    )?;
    Ok(())
}

pub fn save_doc(db: &Connection, kind: &str, ws: &str, id: &str, doc: &Value) -> Result<()> {
    db.execute(
        "UPDATE entries SET meta_json = ?4, updated_at = ?5, dirty = 1
         WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3",
        params![kind, ws, id, serde_json::to_string(doc)?, now_ms()],
    )?;
    Ok(())
}

/// Tombstone (soft-delete) a doc. Returns false when it didn't exist.
pub fn tombstone(db: &Connection, kind: &str, ws: &str, id: &str) -> Result<bool> {
    let n = db.execute(
        "UPDATE entries SET deleted_at = ?4, updated_at = ?4, dirty = 1
         WHERE tool_kind = ?1 AND workspace_id = ?2 AND id = ?3 AND deleted_at IS NULL",
        params![kind, ws, id, now_ms()],
    )?;
    Ok(n > 0)
}

/// Shallow-merge `patch` object fields into `doc`.
pub fn merge_patch(doc: &mut Value, patch: &Value) {
    if let (Some(doc_map), Some(patch_map)) = (doc.as_object_mut(), patch.as_object()) {
        for (k, v) in patch_map {
            doc_map.insert(k.clone(), v.clone());
        }
    }
}

pub fn query_param<'a>(query: &'a str, key: &str) -> Option<&'a str> {
    query.split('&').find_map(|pair| {
        let (k, v) = pair.split_once('=')?;
        (k == key).then_some(v)
    })
}

// ── Envelope entries: password-manager / api-keys / environment-manager ────

/// Handles `/{prefix}/entries[/{id}]` for the encrypted-envelope tools.
pub fn handle_envelope(
    state: &AppState,
    kind: &str,
    method: &str,
    rest: &str, // path after `/{prefix}` (starts with "/entries")
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "/entries") => ApiResponse::ok(&list_docs(&db, kind, &ws)?),
        ("POST", "/entries") => {
            let req = parse_body(body)?;
            let now = now_ms();
            let doc = json!({
                "id": new_id(),
                "encryptedData": req["encryptedData"],
                "iv": req["iv"],
                "createdAt": req.get("createdAt").and_then(Value::as_i64).unwrap_or(now),
                "updatedAt": req.get("updatedAt").and_then(Value::as_i64).unwrap_or(now),
            });
            insert_doc(&db, kind, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("PATCH", _) if rest.starts_with("/entries/") => {
            let id = &rest["/entries/".len()..];
            let Some(mut doc) = get_doc(&db, kind, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Entry not found"));
            };
            let mut patch = parse_body(body)?;
            if patch.get("updatedAt").and_then(Value::as_i64).is_none() {
                merge_patch(&mut patch, &json!({ "updatedAt": now_ms() }));
            }
            merge_patch(&mut doc, &patch);
            save_doc(&db, kind, &ws, id, &doc)?;
            ApiResponse::ok(&doc)
        }
        ("DELETE", _) if rest.starts_with("/entries/") => {
            let id = &rest["/entries/".len()..];
            if tombstone(&db, kind, &ws, id)? {
                Ok(ApiResponse::empty(204))
            } else {
                Ok(ApiResponse::detail(404, "Entry not found"))
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}

// ── Connection vaults: sql-client / redis-commander / nosql ────────────────

/// Handles `/{prefix}/connections[/{id}[/touch]]`.
pub fn handle_connections(
    state: &AppState,
    kind: &str,
    method: &str,
    rest: &str, // path after `/{prefix}` (starts with "/connections")
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "/connections") => ApiResponse::ok(&list_docs(&db, kind, &ws)?),
        ("POST", "/connections") => {
            let req = parse_body(body)?;
            let now = now_ms();
            let mut doc = json!({
                "id": new_id(),
                "userId": "desktop-local",
                "createdAt": now,
                "lastUsedAt": now,
            });
            merge_patch(&mut doc, &req); // name, encryptedData, iv, type…
            insert_doc(&db, kind, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        (m, r) if r.starts_with("/connections/") => {
            let tail = &r["/connections/".len()..];
            let (id, is_touch) = match tail.strip_suffix("/touch") {
                Some(id) => (id, true),
                None => (tail, false),
            };
            let Some(mut doc) = get_doc(&db, kind, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Connection not found"));
            };
            match (m, is_touch) {
                ("POST", true) => {
                    merge_patch(&mut doc, &json!({ "lastUsedAt": now_ms() }));
                    save_doc(&db, kind, &ws, id, &doc)?;
                    ApiResponse::ok(&doc)
                }
                ("PATCH", false) => {
                    merge_patch(&mut doc, &parse_body(body)?);
                    save_doc(&db, kind, &ws, id, &doc)?;
                    ApiResponse::ok(&doc)
                }
                ("DELETE", false) => {
                    tombstone(&db, kind, &ws, id)?;
                    Ok(ApiResponse::empty(204))
                }
                _ => Ok(ApiResponse::detail(405, "Method not allowed")),
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
