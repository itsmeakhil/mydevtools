//! Local mirror of `/api/v1/bookmarks` + `/api/v1/bookmark-folders` (plaintext).

use serde_json::json;

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::*;
use crate::router::ApiResponse;
use crate::state::AppState;

const BOOKMARKS: &str = "bookmarks";
const FOLDERS: &str = "bookmark_folders";

pub fn handle_bookmarks(
    state: &AppState,
    method: &str,
    rest: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "/snapshot") => ApiResponse::ok(&json!({
            "bookmarks": list_docs(&db, BOOKMARKS, &ws)?,
            "folders": list_docs(&db, FOLDERS, &ws)?,
        })),
        ("POST", "") => {
            let req = parse_body(body)?;
            let now = now_ms();
            let mut doc = json!({
                "id": new_id(),
                "tags": [],
                "folderId": null,
                "createdAt": now,
                "updatedAt": now,
            });
            merge_patch(&mut doc, &req);
            insert_doc(&db, BOOKMARKS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("POST", "/import") => {
            let req = parse_body(body)?;
            let now = now_ms();
            for b in req["bookmarks"].as_array().unwrap_or(&Vec::new()) {
                let mut doc = json!({ "id": new_id(), "tags": [], "folderId": null, "createdAt": now, "updatedAt": now });
                merge_patch(&mut doc, b);
                insert_doc(&db, BOOKMARKS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            }
            for f in req["folders"].as_array().unwrap_or(&Vec::new()) {
                let mut doc = json!({ "id": new_id(), "parentId": null, "isExpanded": true, "createdAt": now });
                merge_patch(&mut doc, f);
                insert_doc(&db, FOLDERS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            }
            Ok(ApiResponse::detail(200, "ok"))
        }
        ("POST", "/clear-all") => {
            for kind in [BOOKMARKS, FOLDERS] {
                for doc in list_docs(&db, kind, &ws)? {
                    if let Some(id) = doc["id"].as_str() {
                        tombstone(&db, kind, &ws, id)?;
                    }
                }
            }
            Ok(ApiResponse::detail(200, "ok"))
        }
        (m, r) if r.starts_with('/') => {
            let tail = &r[1..];
            let (id, is_move) = match tail.strip_suffix("/move") {
                Some(id) => (id, true),
                None => (tail, false),
            };
            let Some(mut doc) = get_doc(&db, BOOKMARKS, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Bookmark not found"));
            };
            match m {
                "PATCH" => {
                    let patch = parse_body(body)?;
                    if is_move {
                        merge_patch(&mut doc, &json!({ "folderId": patch["folderId"] }));
                    } else {
                        merge_patch(&mut doc, &patch);
                    }
                    doc["updatedAt"] = json!(now_ms());
                    save_doc(&db, BOOKMARKS, &ws, id, &doc)?;
                    ApiResponse::ok(&doc)
                }
                "DELETE" => {
                    tombstone(&db, BOOKMARKS, &ws, id)?;
                    Ok(ApiResponse::empty(204))
                }
                _ => Ok(ApiResponse::detail(405, "Method not allowed")),
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}

pub fn handle_folders(
    state: &AppState,
    method: &str,
    rest: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("POST", "") => {
            let req = parse_body(body)?;
            let mut doc = json!({
                "id": new_id(),
                "parentId": null,
                "isExpanded": true,
                "createdAt": now_ms(),
            });
            merge_patch(&mut doc, &req);
            insert_doc(&db, FOLDERS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        (m, r) if r.starts_with('/') => {
            let tail = &r[1..];
            let (id, is_expanded) = match tail.strip_suffix("/expanded") {
                Some(id) => (id, true),
                None => (tail, false),
            };
            let Some(mut doc) = get_doc(&db, FOLDERS, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Folder not found"));
            };
            match m {
                "PATCH" => {
                    let patch = parse_body(body)?;
                    if is_expanded {
                        merge_patch(&mut doc, &json!({ "isExpanded": patch["isExpanded"] }));
                    } else {
                        merge_patch(&mut doc, &patch);
                    }
                    save_doc(&db, FOLDERS, &ws, id, &doc)?;
                    ApiResponse::ok(&doc)
                }
                "DELETE" => {
                    tombstone(&db, FOLDERS, &ws, id)?;
                    Ok(ApiResponse::empty(204))
                }
                _ => Ok(ApiResponse::detail(405, "Method not allowed")),
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
