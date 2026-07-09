//! Local mirror of `/api/v1/notes` (plaintext docs, ISO-8601 timestamps).

use serde_json::{json, Value};

use crate::error::Result;
use crate::router::entries::*;
use crate::router::ApiResponse;
use crate::state::AppState;

const KIND: &str = "notes";

pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub fn handle(
    state: &AppState,
    method: &str,
    rest: &str,
    query: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "") => {
            let docs = list_docs(&db, KIND, &ws)?;
            let skip: usize = query_param(query, "skip").and_then(|v| v.parse().ok()).unwrap_or(0);
            let limit: usize = query_param(query, "limit")
                .and_then(|v| v.parse().ok())
                .unwrap_or(usize::MAX);
            let page: Vec<&Value> = docs.iter().skip(skip).take(limit).collect();
            ApiResponse::ok(&page)
        }
        ("POST", "") => {
            let req = parse_body(body)?;
            let now = now_iso();
            let mut doc = json!({
                "id": new_id(),
                "title": "",
                "content": null,
                "parentId": null,
                "pinned": false,
                "tags": [],
                "userId": "desktop-local",
                "createdAt": now,
                "updatedAt": now,
            });
            merge_patch(&mut doc, &req);
            insert_doc(&db, KIND, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("GET", _) if rest.starts_with('/') => match get_doc(&db, KIND, &ws, &rest[1..])? {
            Some(doc) => ApiResponse::ok(&doc),
            None => Ok(ApiResponse::detail(404, "Note not found")),
        },
        ("PATCH", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let Some(mut doc) = get_doc(&db, KIND, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Note not found"));
            };
            merge_patch(&mut doc, &parse_body(body)?);
            doc["updatedAt"] = json!(now_iso());
            save_doc(&db, KIND, &ws, id, &doc)?;
            ApiResponse::ok(&doc)
        }
        ("DELETE", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let recursive = query_param(query, "recursive") == Some("true");
            if !tombstone(&db, KIND, &ws, id)? {
                return Ok(ApiResponse::detail(404, "Note not found"));
            }
            if recursive {
                // Tombstone all descendants (parentId chains).
                let mut frontier = vec![id.to_string()];
                while let Some(parent) = frontier.pop() {
                    for doc in list_docs(&db, KIND, &ws)? {
                        if doc["parentId"].as_str() == Some(parent.as_str()) {
                            if let Some(child_id) = doc["id"].as_str() {
                                tombstone(&db, KIND, &ws, child_id)?;
                                frontier.push(child_id.to_string());
                            }
                        }
                    }
                }
            }
            Ok(ApiResponse::empty(204))
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
