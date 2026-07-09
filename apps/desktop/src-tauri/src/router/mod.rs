pub mod api_client;
pub mod backup_codes;
pub mod bookmarks;
pub mod entries;
pub mod master_vault;
pub mod notes;
pub mod preferences;
pub mod snippets;
pub mod stubs;
pub mod sync;
pub mod tasks;
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

/// Remote-only path prefixes (relative to /api/v1): tools that require the
/// cloud even on desktop. Rejected with 503 offline; Phase 4 routes them to
/// the remote bridge instead.
const REMOTE_ONLY: &[&str] = &["/url-shortener", "/s3-drive", "/game-scores", "/dns-lookup"];

/// Dispatch a request against the local store. Paths are normalized FastAPI
/// paths (`/api/v1/...`); query strings are split off here and passed along.
pub fn route(state: &AppState, method: &str, full_path: &str, body: Option<&str>) -> Result<ApiResponse> {
    let (path, query) = match full_path.split_once('?') {
        Some((p, q)) => (p, q),
        None => (full_path, ""),
    };
    let path = path.trim_end_matches('/');

    // Session endpoints: the local store is authorized by OS login + master
    // vault, so session checks always succeed offline.
    match (method, path) {
        ("GET", "/api/v1/auth/session/check") => return Ok(ApiResponse::detail(200, "ok")),
        ("POST", "/api/v1/auth/refresh") => return Ok(ApiResponse::detail(200, "ok")),
        ("POST", "/api/v1/auth/logout") => return Ok(ApiResponse::detail(200, "ok")),
        _ => {}
    }

    if let Some(rest) = path.strip_prefix("/desktop/sync") {
        return sync::handle(state, method, rest, query, body);
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

    let Some(rel) = path.strip_prefix("/api/v1") else {
        return stubs::handle(method, path);
    };

    // Encrypted-envelope vault tools
    for (prefix, kind) in [
        ("/password-manager", "password_entries"),
        ("/api-keys", "api_key_entries"),
        ("/environment-manager", "environment_entries"),
    ] {
        if let Some(rest) = rel.strip_prefix(prefix) {
            return entries::handle_envelope(state, kind, method, rest, body);
        }
    }

    // DB connection vaults
    for (prefix, kind) in [
        ("/sql-client/connections", "sql_connections"),
        ("/redis-commander/connections", "redis_connections"),
        ("/nosql/connections", "nosql_connections"),
    ] {
        if rel.starts_with(prefix) {
            // rest starts at "/connections..."
            let rest = &rel[prefix.len() - "/connections".len()..];
            return entries::handle_connections(state, kind, method, rest, body);
        }
    }

    if let Some(rest) = rel.strip_prefix("/code-snippets") {
        return snippets::handle(state, method, rest, body);
    }
    if let Some(rest) = rel.strip_prefix("/bookmark-folders") {
        return bookmarks::handle_folders(state, method, rest, body);
    }
    if let Some(rest) = rel.strip_prefix("/bookmarks") {
        return bookmarks::handle_bookmarks(state, method, rest, body);
    }
    if let Some(rest) = rel.strip_prefix("/notes") {
        return notes::handle(state, method, rest, query, body);
    }
    if let Some(rest) = rel.strip_prefix("/tasks") {
        return tasks::handle_tasks(state, method, rest, query, body);
    }
    if let Some(rest) = rel.strip_prefix("/projects") {
        return tasks::handle_projects(state, method, rest, body);
    }
    if let Some(rest) = rel.strip_prefix("/api-client") {
        return api_client::handle(state, method, rest, query, body);
    }
    if let Some(rest) = rel.strip_prefix("/user-preferences") {
        return preferences::handle(state, method, rest, query, body);
    }

    if REMOTE_ONLY.iter().any(|p| rel.starts_with(p)) {
        return Ok(ApiResponse::detail(
            503,
            "This tool requires a network connection and cloud sign-in",
        ));
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

    #[test]
    fn envelope_entries_crud() {
        let state = AppState::in_memory();
        for prefix in ["password-manager", "api-keys", "environment-manager"] {
            let base = format!("/api/v1/{prefix}/entries");
            let r = route(&state, "POST", &base, Some(r#"{"encryptedData":"AAA","iv":"BBB"}"#)).unwrap();
            assert_eq!(r.status, 200, "{prefix} create");
            let created = body_json(&r);
            let id = created["id"].as_str().unwrap().to_string();
            assert_eq!(created["encryptedData"], "AAA");
            assert!(created["createdAt"].as_i64().unwrap() > 0);

            let r = route(&state, "GET", &format!("{base}?offset=0&limit=50"), None).unwrap();
            assert_eq!(body_json(&r).as_array().unwrap().len(), 1);

            let r = route(&state, "PATCH", &format!("{base}/{id}"), Some(r#"{"encryptedData":"CCC","iv":"DDD"}"#)).unwrap();
            assert_eq!(body_json(&r)["encryptedData"], "CCC");

            let r = route(&state, "DELETE", &format!("{base}/{id}"), None).unwrap();
            assert_eq!(r.status, 204);
            let r = route(&state, "GET", &base, None).unwrap();
            assert_eq!(body_json(&r).as_array().unwrap().len(), 0);
        }
    }

    #[test]
    fn connection_vault_crud_and_touch() {
        let state = AppState::in_memory();
        let base = "/api/v1/sql-client/connections";
        let r = route(&state, "POST", base, Some(r#"{"encryptedData":"E","iv":"I","name":"pg","type":"postgresql"}"#)).unwrap();
        let created = body_json(&r);
        let id = created["id"].as_str().unwrap().to_string();
        assert_eq!(created["type"], "postgresql");
        assert!(created["lastUsedAt"].as_i64().unwrap() > 0);
        let r = route(&state, "POST", &format!("{base}/{id}/touch"), None).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "DELETE", &format!("{base}/{id}"), None).unwrap();
        assert_eq!(r.status, 204);
    }

    #[test]
    fn snippets_dup_id_409() {
        let state = AppState::in_memory();
        let body = r#"{"id":"s1","title":"t","language":"rust","code":"x"}"#;
        let r = route(&state, "POST", "/api/v1/code-snippets", Some(body)).unwrap();
        assert_eq!(r.status, 200);
        let created = body_json(&r);
        assert_eq!(created["tags"], serde_json::json!([]));
        assert_eq!(created["pinned"], false);
        let r = route(&state, "POST", "/api/v1/code-snippets", Some(body)).unwrap();
        assert_eq!(r.status, 409);
    }

    #[test]
    fn bookmarks_snapshot_move_clear() {
        let state = AppState::in_memory();
        let r = route(&state, "POST", "/api/v1/bookmark-folders", Some(r#"{"id":"f1","name":"Dev","parentId":null,"isExpanded":true}"#)).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "POST", "/api/v1/bookmarks", Some(r#"{"id":"b1","title":"x","url":"https://x.dev","tags":[],"folderId":null}"#)).unwrap();
        assert_eq!(body_json(&r)["id"], "b1");
        let r = route(&state, "PATCH", "/api/v1/bookmarks/b1/move", Some(r#"{"folderId":"f1"}"#)).unwrap();
        assert_eq!(body_json(&r)["folderId"], "f1");
        let r = route(&state, "GET", "/api/v1/bookmarks/snapshot", None).unwrap();
        let snap = body_json(&r);
        assert_eq!(snap["bookmarks"].as_array().unwrap().len(), 1);
        assert_eq!(snap["folders"].as_array().unwrap().len(), 1);
        let r = route(&state, "POST", "/api/v1/bookmarks/clear-all", None).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "GET", "/api/v1/bookmarks/snapshot", None).unwrap();
        assert_eq!(body_json(&r)["bookmarks"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn notes_recursive_delete_iso_timestamps() {
        let state = AppState::in_memory();
        let r = route(&state, "POST", "/api/v1/notes", Some(r#"{"title":"root","content":{"a":1},"parentId":null}"#)).unwrap();
        let root = body_json(&r);
        assert!(root["createdAt"].as_str().unwrap().contains('T'));
        let root_id = root["id"].as_str().unwrap().to_string();
        let r = route(&state, "POST", "/api/v1/notes", Some(&format!(r#"{{"title":"child","content":null,"parentId":"{root_id}"}}"#))).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "DELETE", &format!("/api/v1/notes/{root_id}?recursive=true"), None).unwrap();
        assert_eq!(r.status, 204);
        let r = route(&state, "GET", "/api/v1/notes", None).unwrap();
        assert_eq!(body_json(&r).as_array().unwrap().len(), 0);
    }

    #[test]
    fn tasks_wrapped_list_stats_and_filters() {
        let state = AppState::in_memory();
        let r = route(&state, "POST", "/api/v1/tasks", Some(r#"{"text":"do it","projectId":"p1"}"#)).unwrap();
        let task = body_json(&r);
        assert_eq!(task["status"], "not-started");
        assert_eq!(task["statusOrder"], 0);
        let id = task["id"].as_str().unwrap().to_string();
        let r = route(&state, "PATCH", &format!("/api/v1/tasks/{id}"), Some(r#"{"status":"completed"}"#)).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "GET", "/api/v1/tasks?status=completed&page=1&pageSize=10", None).unwrap();
        let list = body_json(&r);
        assert_eq!(list["items"].as_array().unwrap().len(), 1);
        assert_eq!(list["total"], 1);
        let r = route(&state, "GET", "/api/v1/tasks/stats", None).unwrap();
        let stats = body_json(&r);
        assert_eq!(stats["completed"], 1);
        assert_eq!(stats["total"], 1);
    }

    #[test]
    fn api_client_collections_apply_delta() {
        let state = AppState::in_memory();
        let r = route(&state, "POST", "/api/v1/api-client/collections", Some(r#"{"name":"My APIs"}"#)).unwrap();
        let col = body_json(&r);
        let id = col["id"].as_str().unwrap().to_string();
        assert_eq!(col["items"], serde_json::json!([]));
        // add folder at root, add request into folder, then move request to root
        let ops = r#"{"ops":[
            {"type":"add","parent_id":null,"item":{"id":"fold1","name":"F","items":[]}},
            {"type":"add","parent_id":"fold1","item":{"id":"req1","name":"R","method":"GET"}},
            {"type":"update","item_id":"req1","patch":{"name":"R2"}},
            {"type":"move","item_id":"req1","new_parent_id":null,"new_index":0}
        ]}"#;
        let r = route(&state, "POST", &format!("/api/v1/api-client/collections/{id}/items:apply-delta"), Some(ops)).unwrap();
        assert_eq!(r.status, 200);
        let items = &body_json(&r)["collection"]["items"];
        assert_eq!(items[0]["id"], "req1");
        assert_eq!(items[0]["name"], "R2");
        assert_eq!(items[1]["id"], "fold1");
        assert_eq!(items[1]["items"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn history_limit_and_clear() {
        let state = AppState::in_memory();
        for i in 0..3 {
            let body = format!(r#"{{"method":"GET","url":"https://x/{i}","name":"","timestamp":{}}}"#, 1000 + i);
            let r = route(&state, "POST", "/api/v1/api-client/history", Some(&body)).unwrap();
            assert_eq!(r.status, 200);
        }
        let r = route(&state, "GET", "/api/v1/api-client/history?limit=2", None).unwrap();
        let list = body_json(&r);
        assert_eq!(list.as_array().unwrap().len(), 2);
        assert_eq!(list[0]["url"], "https://x/2"); // newest first
        let r = route(&state, "DELETE", "/api/v1/api-client/history/clear", None).unwrap();
        assert_eq!(r.status, 204);
    }

    #[test]
    fn preferences_defaults_and_tool_usage() {
        let state = AppState::in_memory();
        let r = route(&state, "GET", "/api/v1/user-preferences", None).unwrap();
        let prefs = body_json(&r);
        assert_eq!(prefs["theme"], "system");
        assert_eq!(prefs["accentColor"], "blue");
        assert!(prefs["enabledTools"].as_array().unwrap().len() > 30);
        let r = route(&state, "POST", "/api/v1/user-preferences/tool-usage", Some(r#"{"toolId":"/app/json-formatter"}"#)).unwrap();
        assert_eq!(body_json(&r)["ok"], true);
        let r = route(&state, "GET", "/api/v1/user-preferences", None).unwrap();
        assert_eq!(body_json(&r)["toolStats"]["/app/json-formatter"]["usageCount"], 1);
        let r = route(&state, "PATCH", "/api/v1/user-preferences", Some(r#"{"theme":"dark"}"#)).unwrap();
        assert_eq!(body_json(&r)["theme"], "dark");
    }

    #[test]
    fn sync_rows_resolve_and_detach() {
        let state = AppState::in_memory();
        // Create an entry, verify it shows up dirty with no last_synced_at.
        let r = route(&state, "POST", "/api/v1/password-manager/entries", Some(r#"{"encryptedData":"X","iv":"Y"}"#)).unwrap();
        let id = body_json(&r)["id"].as_str().unwrap().to_string();
        let r = route(&state, "GET", "/desktop/sync/rows?workspace_id=local-personal&tool_kind=password_entries", None).unwrap();
        let rows = body_json(&r);
        assert_eq!(rows[0]["dirty"], true);
        assert!(rows[0]["last_synced_at"].is_null());

        // mark-synced with re-key to a server id.
        let body = format!(r#"{{"workspace_id":"local-personal","tool_kind":"password_entries","id":"{id}","action":"mark-synced","new_id":"srv-1"}}"#);
        let r = route(&state, "POST", "/desktop/sync/resolve", Some(&body)).unwrap();
        assert_eq!(r.status, 200);
        let r = route(&state, "GET", "/desktop/sync/rows?workspace_id=local-personal&tool_kind=password_entries", None).unwrap();
        let rows = body_json(&r);
        assert_eq!(rows[0]["id"], "srv-1");
        assert_eq!(rows[0]["dirty"], false);
        assert!(rows[0]["last_synced_at"].as_i64().is_some());

        // Tombstone + mark-synced removes the row entirely.
        let r = route(&state, "DELETE", "/api/v1/password-manager/entries/srv-1", None).unwrap();
        assert_eq!(r.status, 204);
        let body = r#"{"workspace_id":"local-personal","tool_kind":"password_entries","id":"srv-1","action":"mark-synced"}"#;
        route(&state, "POST", "/desktop/sync/resolve", Some(body)).unwrap();
        let r = route(&state, "GET", "/desktop/sync/rows?workspace_id=local-personal&tool_kind=password_entries", None).unwrap();
        assert_eq!(body_json(&r).as_array().unwrap().len(), 0);

        // apply-remote inserts a clean row.
        let body = r#"{"workspace_id":"local-personal","tool_kind":"password_entries","id":"srv-2","action":"apply-remote","doc":{"id":"srv-2","encryptedData":"R","iv":"I","updatedAt":123},"updated_at":123}"#;
        route(&state, "POST", "/desktop/sync/resolve", Some(body)).unwrap();
        let r = route(&state, "GET", "/api/v1/password-manager/entries", None).unwrap();
        assert_eq!(body_json(&r)[0]["id"], "srv-2");

        // Toggle sync off → last_synced_at cleared (fresh merge on re-enable).
        let r = route(&state, "POST", "/desktop/sync/settings", Some(r#"{"workspace_id":"local-personal","enabled":true}"#)).unwrap();
        assert_eq!(r.status, 200);
        route(&state, "POST", "/desktop/sync/settings", Some(r#"{"workspace_id":"local-personal","enabled":false}"#)).unwrap();
        let r = route(&state, "GET", "/desktop/sync/rows?workspace_id=local-personal&tool_kind=password_entries", None).unwrap();
        assert!(body_json(&r)[0]["last_synced_at"].is_null());
        let r = route(&state, "GET", "/desktop/sync/settings?workspace_id=local-personal", None).unwrap();
        assert_eq!(body_json(&r)["enabled"], false);
    }

    #[test]
    fn remote_only_prefix_rejected_503() {
        let state = AppState::in_memory();
        let r = route(&state, "GET", "/api/v1/url-shortener?skip=0", None).unwrap();
        assert_eq!(r.status, 503);
        let r = route(&state, "GET", "/api/v1/s3-drive/connections", None).unwrap();
        assert_eq!(r.status, 503);
    }
}
