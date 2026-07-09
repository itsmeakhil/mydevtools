//! Local mirror of `/api/v1/code-snippets` (plaintext docs).

use serde_json::{json, Value};

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::*;
use crate::router::ApiResponse;
use crate::state::AppState;

const KIND: &str = "code_snippets";

pub fn handle(state: &AppState, method: &str, rest: &str, body: Option<&str>) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "") => ApiResponse::ok(&list_docs(&db, KIND, &ws)?),
        ("POST", "") => {
            let req = parse_body(body)?;
            let now = now_ms();
            let id = req
                .get("id")
                .and_then(Value::as_str)
                .map(str::to_string)
                .unwrap_or_else(new_id);
            if get_doc(&db, KIND, &ws, &id)?.is_some() {
                return Ok(ApiResponse::detail(409, "Snippet with this id already exists"));
            }
            let mut doc = json!({
                "id": id,
                "title": "",
                "language": "",
                "code": "",
                "tags": [],
                "pinned": false,
                "createdAt": now,
                "updatedAt": now,
            });
            merge_patch(&mut doc, &req);
            doc["id"] = json!(doc["id"].as_str().unwrap_or_default());
            insert_doc(&db, KIND, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("PATCH", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let Some(mut doc) = get_doc(&db, KIND, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Snippet not found"));
            };
            merge_patch(&mut doc, &parse_body(body)?);
            doc["updatedAt"] = json!(now_ms());
            save_doc(&db, KIND, &ws, id, &doc)?;
            ApiResponse::ok(&doc)
        }
        ("DELETE", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            if tombstone(&db, KIND, &ws, id)? {
                Ok(ApiResponse::empty(204))
            } else {
                Ok(ApiResponse::detail(404, "Snippet not found"))
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
