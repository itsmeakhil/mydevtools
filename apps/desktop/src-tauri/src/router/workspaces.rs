//! Local mirror of FastAPI `/api/v1/workspaces-api/*`.
//!
//! Offline there is exactly one org and one personal workspace, synthesized to
//! match the shapes in apps/web/src/lib/workspace-api.ts.

use serde_json::json;

use crate::error::Result;
use crate::router::ApiResponse;
use crate::state::AppState;

pub const LOCAL_ORG_ID: &str = "local-org";
pub const LOCAL_WORKSPACE_ID: &str = "local-personal";

fn local_org() -> serde_json::Value {
    json!({
        "id": LOCAL_ORG_ID,
        "name": "This Mac",
        "slug": "local",
        "kind": "user",
        "org_role": "owner",
    })
}

fn local_workspace() -> serde_json::Value {
    json!({
        "id": LOCAL_WORKSPACE_ID,
        "org_id": LOCAL_ORG_ID,
        "name": "Personal",
        "slug": "personal-local",
        "is_personal": true,
        "kind": "personal",
        "ws_role": "admin",
        "settings": { "encryption": null },
    })
}

pub fn handle(state: &AppState, method: &str, path: &str, body: Option<&str>) -> Result<ApiResponse> {
    match (method, path) {
        ("GET", "/api/v1/workspaces-api/orgs") => ApiResponse::ok(&json!([local_org()])),
        ("GET", "/api/v1/workspaces-api/workspaces") => {
            ApiResponse::ok(&json!([local_workspace()]))
        }
        ("POST", "/api/v1/workspaces-api/workspaces/active") => {
            #[derive(serde::Deserialize)]
            struct Req {
                workspace_id: String,
            }
            let req: Req = serde_json::from_str(body.unwrap_or(""))?;
            let db = state.db.lock().unwrap();
            db.execute(
                "INSERT INTO kv (k, v) VALUES ('active_workspace', ?1)
                 ON CONFLICT(k) DO UPDATE SET v = excluded.v",
                [&req.workspace_id],
            )?;
            Ok(ApiResponse::detail(200, "ok"))
        }
        ("GET", p) if p.starts_with("/api/v1/workspaces-api/workspaces/") => {
            ApiResponse::ok(&local_workspace())
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
