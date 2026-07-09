//! Local mirror of `/api/v1/tasks` + `/api/v1/projects` (plaintext, ISO timestamps).

use serde_json::{json, Value};

use crate::error::Result;
use crate::router::entries::*;
use crate::router::notes::now_iso;
use crate::router::ApiResponse;
use crate::state::AppState;

const TASKS: &str = "tasks";
const PROJECTS: &str = "projects";

fn matches_filter(doc: &Value, query: &str) -> bool {
    let status = query_param(query, "status").unwrap_or("all");
    if status != "all" && !status.is_empty() && doc["status"].as_str() != Some(status) {
        return false;
    }
    let project = query_param(query, "projectId").unwrap_or("all");
    if project != "all" && !project.is_empty() && doc["projectId"].as_str() != Some(project) {
        return false;
    }
    let assignee = query_param(query, "assignee").unwrap_or("all");
    match assignee {
        "all" | "" => {}
        "unassigned" => {
            if doc["assigneeUid"].as_str().map(|s| !s.is_empty()).unwrap_or(false) {
                return false;
            }
        }
        // "me" and explicit uids both resolve to the local user on desktop.
        _ => {
            let uid = doc["assigneeUid"].as_str().unwrap_or("");
            if assignee != "me" && uid != assignee {
                return false;
            }
        }
    }
    let archived = query_param(query, "archived").unwrap_or("false") == "true";
    let doc_archived = doc["archived"].as_bool().unwrap_or(false);
    if archived != doc_archived {
        return false;
    }
    true
}

pub fn handle_tasks(
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
            let docs = list_docs(&db, TASKS, &ws)?;
            let filtered: Vec<&Value> = docs.iter().filter(|d| matches_filter(d, query)).collect();
            let page: usize = query_param(query, "page").and_then(|v| v.parse().ok()).unwrap_or(1);
            let page_size: usize = query_param(query, "pageSize")
                .and_then(|v| v.parse().ok())
                .unwrap_or(50);
            let total = filtered.len();
            let total_pages = total.div_ceil(page_size).max(1);
            let items: Vec<&&Value> =
                filtered.iter().skip((page.max(1) - 1) * page_size).take(page_size).collect();
            ApiResponse::ok(&json!({
                "items": items,
                "total": total,
                "total_pages": total_pages,
                "page": page,
                "page_size": page_size,
            }))
        }
        ("GET", "/stats") => {
            let docs = list_docs(&db, TASKS, &ws)?;
            let active: Vec<&Value> = docs
                .iter()
                .filter(|d| !d["archived"].as_bool().unwrap_or(false))
                .collect();
            let count = |s: &str| active.iter().filter(|d| d["status"].as_str() == Some(s)).count();
            ApiResponse::ok(&json!({
                "total": active.len(),
                "completed": count("completed"),
                "ongoing": count("ongoing"),
                "notStarted": count("not-started"),
            }))
        }
        ("GET", "/export") => {
            let docs = list_docs(&db, TASKS, &ws)?;
            let filtered: Vec<&Value> = docs.iter().filter(|d| matches_filter(d, query)).collect();
            let skip: usize = query_param(query, "skip").and_then(|v| v.parse().ok()).unwrap_or(0);
            let limit: usize = query_param(query, "limit")
                .and_then(|v| v.parse().ok())
                .unwrap_or(usize::MAX);
            let page: Vec<&&Value> = filtered.iter().skip(skip).take(limit).collect();
            ApiResponse::ok(&page)
        }
        ("POST", "") => {
            let req = parse_body(body)?;
            let docs = list_docs(&db, TASKS, &ws)?;
            let max_order = docs
                .iter()
                .filter(|d| d["status"].as_str() == Some("not-started"))
                .filter_map(|d| d["statusOrder"].as_i64())
                .max()
                .unwrap_or(-1);
            let mut doc = json!({
                "id": new_id(),
                "text": "",
                "status": "not-started",
                "statusOrder": max_order + 1,
                "tags": [],
                "subTasks": [],
                "archived": false,
                "createdAt": now_iso(),
                "created_by": "desktop-local",
            });
            merge_patch(&mut doc, &req);
            insert_doc(&db, TASKS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("POST", "/import") => {
            let req = parse_body(body)?;
            for t in req["tasks"].as_array().unwrap_or(&Vec::new()) {
                let mut doc = json!({
                    "id": new_id(),
                    "status": "not-started",
                    "statusOrder": 0,
                    "archived": false,
                    "createdAt": now_iso(),
                    "created_by": "desktop-local",
                });
                merge_patch(&mut doc, t);
                insert_doc(&db, TASKS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            }
            Ok(ApiResponse::detail(200, "ok"))
        }
        ("PATCH", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let Some(mut doc) = get_doc(&db, TASKS, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Task not found"));
            };
            merge_patch(&mut doc, &parse_body(body)?);
            save_doc(&db, TASKS, &ws, id, &doc)?;
            ApiResponse::ok(&doc)
        }
        ("DELETE", _) if rest.starts_with('/') => {
            if tombstone(&db, TASKS, &ws, &rest[1..])? {
                Ok(ApiResponse::empty(204))
            } else {
                Ok(ApiResponse::detail(404, "Task not found"))
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}

pub fn handle_projects(
    state: &AppState,
    method: &str,
    rest: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);
    match (method, rest) {
        ("GET", "") => ApiResponse::ok(&list_docs(&db, PROJECTS, &ws)?),
        ("POST", "") => {
            let req = parse_body(body)?;
            let mut doc = json!({
                "id": new_id(),
                "name": "",
                "color": "",
                "created_by": "desktop-local",
                "createdAt": now_iso(),
            });
            merge_patch(&mut doc, &req);
            insert_doc(&db, PROJECTS, &ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("PATCH", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let Some(mut doc) = get_doc(&db, PROJECTS, &ws, id)? else {
                return Ok(ApiResponse::detail(404, "Project not found"));
            };
            merge_patch(&mut doc, &parse_body(body)?);
            save_doc(&db, PROJECTS, &ws, id, &doc)?;
            ApiResponse::ok(&doc)
        }
        ("DELETE", _) if rest.starts_with('/') => {
            if tombstone(&db, PROJECTS, &ws, &rest[1..])? {
                Ok(ApiResponse::empty(204))
            } else {
                Ok(ApiResponse::detail(404, "Project not found"))
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}
