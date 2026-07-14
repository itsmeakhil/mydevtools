//! One-time desktop activation record (`/desktop/activation`).
//!
//! Stores the plan snapshot captured at browser sign-in:
//! `{uid, email, display_name, plan, plan_source, plan_granted_at, activated_at}`.
//! The webview owns the shape; Rust stores it as an opaque JSON object in `kv`.
//! Presence of the row == app is activated; it survives until the user resets
//! app data (DELETE) or wipes the SQLCipher DB.

use crate::db::now_ms;
use crate::error::Result;
use crate::router::ApiResponse;
use crate::state::AppState;

const KV_KEY: &str = "activation";

pub fn handle(state: &AppState, method: &str, path: &str, body: Option<&str>) -> Result<ApiResponse> {
    if !path.is_empty() {
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
                None => Ok(ApiResponse::detail(404, "Not activated")),
            }
        }
        "POST" => {
            let mut value: serde_json::Value =
                serde_json::from_str(body.unwrap_or("")).map_err(crate::error::AppError::from)?;
            if !value.is_object() {
                return Ok(ApiResponse::detail(422, "Expected a JSON object"));
            }
            value["activated_at"] = serde_json::json!(now_ms());
            let json = serde_json::to_string(&value)?;
            db.execute(
                "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
                [KV_KEY, &json],
            )?;
            Ok(ApiResponse { status: 200, body: json })
        }
        "DELETE" => {
            db.execute("DELETE FROM kv WHERE k = ?1", [KV_KEY])?;
            Ok(ApiResponse::empty(204))
        }
        _ => Ok(ApiResponse::detail(405, "Method not allowed")),
    }
}

#[cfg(test)]
mod tests {
    use crate::router::route;
    use crate::state::AppState;

    #[test]
    fn activation_lifecycle() {
        let state = AppState::in_memory();
        // Not activated initially.
        let r = route(&state, "GET", "/desktop/activation", None).unwrap();
        assert_eq!(r.status, 404);
        // Activate stamps activated_at and round-trips.
        let body = r#"{"uid":"u1","plan":"pro","plan_source":"early_adopter"}"#;
        let r = route(&state, "POST", "/desktop/activation", Some(body)).unwrap();
        assert_eq!(r.status, 200);
        let v: serde_json::Value = serde_json::from_str(&r.body).unwrap();
        assert_eq!(v["plan"], "pro");
        assert!(v["activated_at"].as_i64().unwrap() > 0);
        let r = route(&state, "GET", "/desktop/activation", None).unwrap();
        assert_eq!(r.status, 200);
        // Re-activation overwrites (fresh sign-in refreshes the snapshot).
        let r = route(&state, "POST", "/desktop/activation", Some(r#"{"uid":"u1","plan":"free"}"#)).unwrap();
        assert_eq!(r.status, 200);
        let v: serde_json::Value = serde_json::from_str(&route(&state, "GET", "/desktop/activation", None).unwrap().body).unwrap();
        assert_eq!(v["plan"], "free");
        // Reset clears it.
        let r = route(&state, "DELETE", "/desktop/activation", None).unwrap();
        assert_eq!(r.status, 204);
        assert_eq!(route(&state, "GET", "/desktop/activation", None).unwrap().status, 404);
        // Non-object body rejected.
        assert_eq!(route(&state, "POST", "/desktop/activation", Some("[1]")).unwrap().status, 422);
    }
}
