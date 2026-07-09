pub mod backup_codes;
pub mod master_vault;
pub mod stubs;
pub mod workspaces;

use serde::Serialize;

use crate::error::Result;
use crate::state::AppState;

#[derive(Serialize)]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
}

impl ApiResponse {
    pub fn json(status: u16, value: &impl Serialize) -> Result<Self> {
        Ok(Self { status, body: serde_json::to_string(value)? })
    }

    pub fn ok(value: &impl Serialize) -> Result<Self> {
        Self::json(200, value)
    }

    pub fn empty(status: u16) -> Self {
        Self { status, body: String::new() }
    }

    pub fn detail(status: u16, msg: &str) -> Self {
        Self {
            status,
            body: serde_json::json!({ "detail": msg }).to_string(),
        }
    }
}

/// Dispatch a request against the local store. Paths are normalized FastAPI
/// paths (`/api/v1/...`) with any query string already stripped by the bridge.
pub fn route(state: &AppState, method: &str, path: &str, body: Option<&str>) -> Result<ApiResponse> {
    let path = path.split('?').next().unwrap_or(path).trim_end_matches('/');

    // Session endpoints: the local store is authorized by OS login + master
    // vault, so session checks always succeed offline.
    match (method, path) {
        ("GET", "/api/v1/auth/session/check") => return Ok(ApiResponse::detail(200, "ok")),
        ("POST", "/api/v1/auth/refresh") => return Ok(ApiResponse::detail(200, "ok")),
        ("POST", "/api/v1/auth/logout") => return Ok(ApiResponse::detail(200, "ok")),
        _ => {}
    }

    if path.starts_with("/api/v1/auth/master-vault") {
        return master_vault::handle(state, method, path, body);
    }
    if path.starts_with("/api/v1/auth/backup-codes") {
        return backup_codes::handle(state, method, path, body);
    }
    if path.starts_with("/api/v1/workspaces-api/") {
        return workspaces::handle(state, method, path, body);
    }

    stubs::handle(method, path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body_json(r: &ApiResponse) -> serde_json::Value {
        serde_json::from_str(&r.body).unwrap()
    }

    #[test]
    fn master_vault_setup_and_get() {
        let state = AppState::in_memory();
        // Not configured yet
        let r = route(&state, "GET", "/api/v1/auth/master-vault", None).unwrap();
        assert_eq!(r.status, 404);
        // Setup
        let setup = r#"{"salt":"c2FsdA==","verifier":{"encrypted":"ZW5j","iv":"aXY="}}"#;
        let r = route(&state, "POST", "/api/v1/auth/master-vault", Some(setup)).unwrap();
        assert_eq!(r.status, 200);
        // Second setup rejected
        let r = route(&state, "POST", "/api/v1/auth/master-vault", Some(setup)).unwrap();
        assert_eq!(r.status, 409);
        // Get returns stored vault
        let r = route(&state, "GET", "/api/v1/auth/master-vault", None).unwrap();
        assert_eq!(r.status, 200);
        let v = body_json(&r);
        assert_eq!(v["salt"], "c2FsdA==");
        assert_eq!(v["verifier"]["iv"], "aXY=");
        assert!(v["createdAt"].as_i64().unwrap() > 0);
    }

    #[test]
    fn backup_codes_roundtrip() {
        let state = AppState::in_memory();
        let store = r#"{"codes":[{"codeId":"c1","codeSalt":"s","encrypted":"e","iv":"i"}]}"#;
        let r = route(&state, "POST", "/api/v1/auth/backup-codes", Some(store)).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "POST", "/api/v1/auth/backup-codes/lookup", Some(r#"{"codeId":"c1"}"#)).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "POST", "/api/v1/auth/backup-codes/use", Some(r#"{"codeId":"c1"}"#)).unwrap();
        assert_eq!(r.status, 200);
        // Used codes no longer resolve
        let r = route(&state, "POST", "/api/v1/auth/backup-codes/lookup", Some(r#"{"codeId":"c1"}"#)).unwrap();
        assert_eq!(r.status, 404);
    }

    #[test]
    fn workspaces_synthetic_personal() {
        let state = AppState::in_memory();
        let r = route(&state, "GET", "/api/v1/workspaces-api/workspaces", None).unwrap();
        assert_eq!(r.status, 200);
        let v = body_json(&r);
        assert_eq!(v[0]["is_personal"], true);
        assert_eq!(v[0]["kind"], "personal");
        let r = route(
            &state,
            "POST",
            "/api/v1/workspaces-api/workspaces/active",
            Some(r#"{"workspace_id":"local-personal"}"#),
        )
        .unwrap();
        assert_eq!(r.status, 200);
    }

    #[test]
    fn unmapped_route_is_loud_501() {
        let state = AppState::in_memory();
        let r = route(&state, "GET", "/api/v1/nonexistent", None).unwrap();
        assert_eq!(r.status, 501);
        assert!(r.body.contains("nonexistent"));
    }

    #[test]
    fn session_check_ok_offline() {
        let state = AppState::in_memory();
        let r = route(&state, "GET", "/api/v1/auth/session/check", None).unwrap();
        assert_eq!(r.status, 200);
    }
}
