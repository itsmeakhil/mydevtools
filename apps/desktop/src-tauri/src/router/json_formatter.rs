//! Local mirror of `/api/v1/json-formatter/documents` (plaintext docs).

use serde_json::json;

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::*;
use crate::router::ApiResponse;
use crate::state::AppState;

const KIND: &str = "json_formatter_documents";

pub fn handle(
    state: &AppState,
    method: &str,
    rest: &str, // path after `/json-formatter/documents` ("" or "/{id}")
    query: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "") => {
            let mut docs = list_docs(&db, KIND, &ws)?;
            let skip = query_param(query, "skip")
                .and_then(|s| s.parse::<usize>().ok())
                .unwrap_or(0);
            let limit = query_param(query, "limit")
                .and_then(|s| s.parse::<usize>().ok())
                .unwrap_or(usize::MAX);
            if skip >= docs.len() {
                docs.clear();
            } else {
                docs = docs.split_off(skip);
            }
            docs.truncate(limit);
            ApiResponse::ok(&docs)
        }
        ("POST", "") => {
            let now = now_ms();
            let mut doc = json!({
                "id": new_id(),
                "title": "",
                "pane": "left",
                "content": "",
                "createdAt": now,
                "updatedAt": now,
            });
            merge_patch(&mut doc, &parse_body(body)?); // title, pane, content
            insert_doc(&db, KIND, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("GET", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            match get_doc(&db, KIND, &ws, id)? {
                Some(doc) => ApiResponse::ok(&doc),
                None => Ok(ApiResponse::detail(404, "Document not found")),
            }
        }
        ("PATCH", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let Some(mut doc) = get_doc(&db, KIND, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Document not found"));
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
                Ok(ApiResponse::detail(404, "Document not found"))
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
