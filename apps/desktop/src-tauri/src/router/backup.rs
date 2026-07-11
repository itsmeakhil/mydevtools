//! Logical backup export/import (`/desktop/backup/*`).
//!
//! A raw SQLCipher backup is useless off this machine — the DB key lives only in
//! this Mac's keychain and can't be exported — so we export the DECODED contents
//! (all `entries` rows + a whitelist of portable `kv` singletons) as JSON. The
//! webview encrypts that under a user backup passphrase before it ever touches
//! disk, and hands the same JSON back on restore. Secret payloads stay the exact
//! opaque `{encryptedData, iv}` blobs Rust already stores — nothing is decrypted
//! here. This is the only recovery path that survives losing the device key.

use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::parse_body;
use crate::router::ApiResponse;
use crate::state::AppState;

/// kv singletons that are portable across machines. Excludes session cookies
/// (`cookie_jar`), per-workspace sync flags (`sync_enabled:*`), and the
/// device-local active-workspace pointer.
const PORTABLE_KV: &[&str] = &["master_vault", "backup_codes", "user_preferences"];

const BACKUP_VERSION: i64 = 1;

pub fn handle(
    state: &AppState,
    method: &str,
    rest: &str, // path after "/desktop/backup"
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    match (method, rest) {
        // Full logical dump for the webview to encrypt + download.
        ("GET", "/export") => {
            let mut stmt = db.prepare(
                "SELECT tool_kind, workspace_id, id, encrypted_data, iv, meta_json,
                        created_at, updated_at, deleted_at
                 FROM entries",
            )?;
            let entries: Vec<Value> = stmt
                .query_map([], |r| {
                    Ok(json!({
                        "tool_kind": r.get::<_, String>(0)?,
                        "workspace_id": r.get::<_, String>(1)?,
                        "id": r.get::<_, String>(2)?,
                        "encrypted_data": r.get::<_, Option<String>>(3)?,
                        "iv": r.get::<_, Option<String>>(4)?,
                        "meta_json": r.get::<_, Option<String>>(5)?,
                        "created_at": r.get::<_, i64>(6)?,
                        "updated_at": r.get::<_, i64>(7)?,
                        "deleted_at": r.get::<_, Option<i64>>(8)?,
                    }))
                })?
                .collect::<std::result::Result<_, _>>()?;

            let mut kv = serde_json::Map::new();
            for &k in PORTABLE_KV {
                let v: Option<String> = db
                    .query_row("SELECT v FROM kv WHERE k = ?1", [k], |r| r.get(0))
                    .optional()?;
                if let Some(v) = v {
                    kv.insert(k.to_string(), Value::String(v));
                }
            }

            ApiResponse::ok(&json!({
                "version": BACKUP_VERSION,
                "created_at": now_ms(),
                "entries": entries,
                "kv": Value::Object(kv),
            }))
        }
        // Merge a decrypted dump back into the local store.
        ("POST", "/import") => {
            let dump = parse_body(body)?;
            if dump["version"].as_i64() != Some(BACKUP_VERSION) {
                return Ok(ApiResponse::detail(422, "Unsupported backup version"));
            }

            let entries = dump["entries"].as_array().cloned().unwrap_or_default();
            let mut imported = 0usize;
            for e in &entries {
                let (kind, ws, id) = (
                    e["tool_kind"].as_str().unwrap_or(""),
                    e["workspace_id"].as_str().unwrap_or(""),
                    e["id"].as_str().unwrap_or(""),
                );
                if kind.is_empty() || ws.is_empty() || id.is_empty() {
                    continue;
                }
                let created = e["created_at"].as_i64().unwrap_or_else(now_ms);
                let updated = e["updated_at"].as_i64().unwrap_or(created);
                // Restored rows are marked dirty + unsynced so they re-push if the
                // user later enables Cloud Sync. Existing rows only yield to the
                // backup when the backup's copy is at least as new (LWW guard).
                // execute() returns 0 when the LWW guard skips an older backup row.
                imported += db.execute(
                    "INSERT INTO entries
                       (tool_kind, workspace_id, id, encrypted_data, iv, meta_json,
                        created_at, updated_at, deleted_at, dirty, last_synced_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, NULL)
                     ON CONFLICT(tool_kind, workspace_id, id) DO UPDATE SET
                       encrypted_data = excluded.encrypted_data,
                       iv             = excluded.iv,
                       meta_json      = excluded.meta_json,
                       created_at     = MIN(entries.created_at, excluded.created_at),
                       updated_at     = excluded.updated_at,
                       deleted_at     = excluded.deleted_at,
                       dirty          = 1,
                       last_synced_at = NULL
                     WHERE excluded.updated_at >= entries.updated_at",
                    params![
                        kind, ws, id,
                        e["encrypted_data"].as_str(),
                        e["iv"].as_str(),
                        e["meta_json"].as_str(),
                        created, updated,
                        e["deleted_at"].as_i64(),
                    ],
                )?;
            }

            // kv singletons are inserted only when ABSENT — never clobber an
            // already-configured master_vault (its salt keys the existing local
            // entries; overwriting it would strand them). Restore is meant for a
            // fresh/empty vault; the webview warns before importing into a
            // configured one.
            let mut kv_imported = 0usize;
            if let Some(kv) = dump["kv"].as_object() {
                for &k in PORTABLE_KV {
                    if let Some(Value::String(v)) = kv.get(k) {
                        let n = db.execute(
                            "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO NOTHING",
                            params![k, v],
                        )?;
                        kv_imported += n;
                    }
                }
            }

            ApiResponse::ok(&json!({
                "imported": imported,
                "kv_imported": kv_imported,
            }))
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
