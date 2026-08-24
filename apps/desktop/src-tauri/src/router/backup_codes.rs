//! Local mirror of FastAPI `/api/v1/auth/backup-codes` (+ /lookup, /use).
//! Codes are stored as the client sends them: each entry re-encrypts the
//! master password under a code-derived key — opaque to Rust.

use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::router::ApiResponse;
use crate::state::AppState;

const KV_KEY: &str = "backup_codes";

#[derive(Serialize, Deserialize, Clone)]
struct BackupCodeEntry {
    #[serde(rename = "codeId")]
    code_id: String,
    #[serde(rename = "codeSalt")]
    code_salt: String,
    encrypted: String,
    iv: String,
    #[serde(default)]
    used: bool,
}

fn load(db: &rusqlite::Connection) -> Result<Vec<BackupCodeEntry>> {
    let raw: Option<String> = db
        .query_row("SELECT v FROM kv WHERE k = ?1", [KV_KEY], |r| r.get(0))
        .map(Some)
        .or_else(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(other),
        })?;
    Ok(match raw {
        Some(v) => serde_json::from_str(&v)?,
        None => Vec::new(),
    })
}

fn save(db: &rusqlite::Connection, codes: &[BackupCodeEntry]) -> Result<()> {
    let json = serde_json::to_string(codes)?;
    db.execute(
        "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
        [KV_KEY, &json],
    )?;
    Ok(())
}

#[derive(Deserialize)]
struct StoreRequest {
    codes: Vec<BackupCodeEntry>,
}

#[derive(Deserialize)]
struct CodeIdRequest {
    #[serde(rename = "codeId")]
    code_id: String,
}

pub fn handle(state: &AppState, method: &str, path: &str, body: Option<&str>) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    match (method, path) {
        ("POST", "/api/v1/auth/backup-codes") => {
            let req: StoreRequest = serde_json::from_str(body.unwrap_or(""))?;
            save(&db, &req.codes)?;
            Ok(ApiResponse::detail(200, "ok"))
        }
        ("GET", "/api/v1/auth/backup-codes") => {
            let codes = load(&db)?;
            ApiResponse::ok(&serde_json::json!({
                "total": codes.len(),
                "remaining": codes.iter().filter(|c| !c.used).count(),
            }))
        }
        ("POST", "/api/v1/auth/backup-codes/lookup") => {
            let req: CodeIdRequest = serde_json::from_str(body.unwrap_or(""))?;
            let codes = load(&db)?;
            match codes.iter().find(|c| c.code_id == req.code_id && !c.used) {
                Some(c) => ApiResponse::ok(&serde_json::json!({
                    "codeSalt": c.code_salt,
                    "encrypted": c.encrypted,
                    "iv": c.iv,
                })),
                None => Ok(ApiResponse::detail(404, "Invalid or already-used backup code")),
            }
        }
        ("POST", "/api/v1/auth/backup-codes/use") => {
            let req: CodeIdRequest = serde_json::from_str(body.unwrap_or(""))?;
            let mut codes = load(&db)?;
            for c in codes.iter_mut() {
                if c.code_id == req.code_id {
                    c.used = true;
                }
            }
            save(&db, &codes)?;
            Ok(ApiResponse::detail(200, "ok"))
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
