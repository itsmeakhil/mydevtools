//! Local mirror of FastAPI `/api/v1/auth/master-vault`.
//!
//! Stores only `{salt, verifier, createdAt}` — the PBKDF2 salt and an
//! AES-GCM verifier blob. Verification happens client-side in the webview
//! (lib/encryption.ts). After a successful webview unlock the gate also POSTs
//! the password to `/unlock` so Secure Files can derive its own Argon2id KEK
//! (router/secure_files); `/lock` drops it. The password is never stored.

use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::db::now_ms;
use crate::error::Result;
use crate::router::{secure_files, ApiResponse};
use crate::state::AppState;

const KV_KEY: &str = "master_vault";

#[derive(Serialize, Deserialize)]
struct KeyVerifier {
    encrypted: String,
    iv: String,
}

#[derive(Serialize, Deserialize)]
struct MasterVault {
    salt: String,
    verifier: KeyVerifier,
    #[serde(rename = "createdAt")]
    created_at: i64,
}

#[derive(Deserialize)]
struct SetupRequest {
    salt: String,
    verifier: KeyVerifier,
}

#[derive(Deserialize)]
struct UnlockRequest {
    password: String,
}

pub fn handle(state: &AppState, method: &str, path: &str, body: Option<&str>) -> Result<ApiResponse> {
    match (method, path) {
        ("POST", "/api/v1/auth/master-vault/unlock") => {
            let req: UnlockRequest =
                serde_json::from_str(body.unwrap_or("")).map_err(crate::error::AppError::from)?;
            let password = Zeroizing::new(req.password);
            // ponytail: a future change-password flow must re-call this with the
            // new password and PATCH every .mydt (rewrap DEKs).
            secure_files::unlock(state, password.as_bytes())?;
            return Ok(ApiResponse::ok(&serde_json::json!({})).unwrap());
        }
        ("POST", "/api/v1/auth/master-vault/lock") => {
            secure_files::lock(state);
            return Ok(ApiResponse::empty(204));
        }
        _ => {}
    }
    if path != "/api/v1/auth/master-vault" {
        return Ok(ApiResponse::detail(404, "Not found"));
    }
    let db = state.db.lock().unwrap();
    match method {
        "GET" => {
            let existing: Option<String> = db
                .query_row("SELECT v FROM kv WHERE k = ?1", [KV_KEY], |r| r.get(0))
                .map(Some)
                .or_else(|e| match e {
                    rusqlite::Error::QueryReturnedNoRows => Ok(None),
                    other => Err(other),
                })?;
            match existing {
                Some(v) => Ok(ApiResponse { status: 200, body: v }),
                None => Ok(ApiResponse::detail(404, "Master vault not configured")),
            }
        }
        "POST" => {
            let req: SetupRequest =
                serde_json::from_str(body.unwrap_or("")).map_err(crate::error::AppError::from)?;
            let already: i64 =
                db.query_row("SELECT count(*) FROM kv WHERE k = ?1", [KV_KEY], |r| r.get(0))?;
            if already > 0 {
                return Ok(ApiResponse::detail(409, "Master vault already configured"));
            }
            let vault = MasterVault {
                salt: req.salt,
                verifier: req.verifier,
                created_at: now_ms(),
            };
            let json = serde_json::to_string(&vault)?;
            db.execute("INSERT INTO kv (k, v) VALUES (?1, ?2)", [KV_KEY, &json])?;
            Ok(ApiResponse { status: 200, body: json })
        }
        _ => Ok(ApiResponse::detail(405, "Method not allowed")),
    }
}
