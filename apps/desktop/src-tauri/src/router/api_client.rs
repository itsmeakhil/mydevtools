//! Local mirror of `/api/v1/api-client/*`: collections (incl. apply-delta),
//! environments, history, workspaces, public-mocks. All plaintext docs.

use serde_json::{json, Value};

use crate::db::now_ms;
use crate::error::Result;
use crate::router::entries::*;
use crate::router::ApiResponse;
use crate::state::AppState;

const COLLECTIONS: &str = "api_client_collections";
const ENVIRONMENTS: &str = "api_client_environments";
const HISTORY: &str = "api_client_history";
const WORKSPACES: &str = "api_client_workspaces";
const PUBLIC_MOCKS: &str = "api_client_public_mocks";

// ── Collections item-tree helpers (for apply-delta) ────────────────────────

/// Remove item by id anywhere in the tree; returns the removed item.
fn remove_item(items: &mut Vec<Value>, item_id: &str) -> Option<Value> {
    if let Some(pos) = items.iter().position(|i| i["id"].as_str() == Some(item_id)) {
        return Some(items.remove(pos));
    }
    for item in items.iter_mut() {
        if let Some(children) = item.get_mut("items").and_then(Value::as_array_mut) {
            let mut vec = std::mem::take(children);
            let removed = remove_item(&mut vec, item_id);
            *children = vec;
            if removed.is_some() {
                return removed;
            }
        }
    }
    None
}

/// Find the index path to an item anywhere in the tree.
fn find_path(items: &[Value], item_id: &str, path: &mut Vec<usize>) -> bool {
    for (i, item) in items.iter().enumerate() {
        if item["id"].as_str() == Some(item_id) {
            path.push(i);
            return true;
        }
        if let Some(children) = item.get("items").and_then(Value::as_array) {
            path.push(i);
            if find_path(children, item_id, path) {
                return true;
            }
            path.pop();
        }
    }
    false
}

fn find_item_mut<'a>(items: &'a mut Vec<Value>, item_id: &str) -> Option<&'a mut Value> {
    let mut path = Vec::new();
    if !find_path(items, item_id, &mut path) {
        return None;
    }
    let (&last, parents) = path.split_last()?;
    let mut current: &mut Vec<Value> = items;
    for &idx in parents {
        current = current.get_mut(idx)?.get_mut("items")?.as_array_mut()?;
    }
    current.get_mut(last)
}

/// Insert `item` under `parent_id` (empty/null = root) at `position` (or end).
fn insert_item(items: &mut Vec<Value>, parent_id: Option<&str>, item: Value, position: Option<usize>) -> bool {
    match parent_id {
        None | Some("") => {
            let pos = position.unwrap_or(items.len()).min(items.len());
            items.insert(pos, item);
            true
        }
        Some(pid) => {
            if let Some(parent) = find_item_mut(items, pid) {
                let children = parent
                    .as_object_mut()
                    .unwrap()
                    .entry("items")
                    .or_insert_with(|| json!([]));
                if let Some(arr) = children.as_array_mut() {
                    let pos = position.unwrap_or(arr.len()).min(arr.len());
                    arr.insert(pos, item);
                    return true;
                }
            }
            false
        }
    }
}

fn apply_delta(collection: &mut Value, ops: &[Value]) {
    let Some(items) = collection.get_mut("items").and_then(Value::as_array_mut) else {
        return;
    };
    let mut items_vec = std::mem::take(items);
    for op in ops {
        match op["type"].as_str() {
            Some("add") => {
                let parent = op["parent_id"].as_str();
                let position = op["position"].as_u64().map(|p| p as usize);
                insert_item(&mut items_vec, parent, op["item"].clone(), position);
            }
            Some("update") => {
                if let Some(item_id) = op["item_id"].as_str() {
                    if let Some(item) = find_item_mut(&mut items_vec, item_id) {
                        merge_patch(item, &op["patch"]);
                    }
                }
            }
            Some("delete") => {
                if let Some(item_id) = op["item_id"].as_str() {
                    remove_item(&mut items_vec, item_id);
                }
            }
            Some("move") => {
                if let Some(item_id) = op["item_id"].as_str() {
                    if let Some(item) = remove_item(&mut items_vec, item_id) {
                        let parent = op["new_parent_id"].as_str();
                        let index = op["new_index"].as_u64().map(|i| i as usize);
                        insert_item(&mut items_vec, parent, item, index);
                    }
                }
            }
            _ => {}
        }
    }
    *collection.get_mut("items").unwrap() = Value::Array(items_vec);
}

// ── Generic named-doc CRUD (collections / environments / workspaces) ───────

fn crud(
    db: &rusqlite::Connection,
    ws: &str,
    kind: &str,
    defaults: Value,
    method: &str,
    rest: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    match (method, rest) {
        ("GET", "") => ApiResponse::ok(&list_docs(db, kind, ws)?),
        ("POST", "") => {
            let req = parse_body(body)?;
            let mut doc = defaults;
            doc["id"] = json!(new_id());
            merge_patch(&mut doc, &req);
            insert_doc(db, kind, ws, doc["id"].as_str().unwrap(), &doc)?;
            ApiResponse::ok(&doc)
        }
        ("PATCH", _) if rest.starts_with('/') => {
            let id = &rest[1..];
            let Some(mut doc) = get_doc(db, kind, ws, id)? else {
                return Ok(ApiResponse::detail(404, "Not found"));
            };
            merge_patch(&mut doc, &parse_body(body)?);
            save_doc(db, kind, ws, id, &doc)?;
            ApiResponse::ok(&doc)
        }
        ("DELETE", _) if rest.starts_with('/') => {
            if tombstone(db, kind, ws, &rest[1..])? {
                Ok(ApiResponse::empty(204))
            } else {
                Ok(ApiResponse::detail(404, "Not found"))
            }
        }
        _ => Ok(ApiResponse::detail(404, "Not found")),
    }
}

pub fn handle(
    state: &AppState,
    method: &str,
    rest: &str, // path after "/api-client" (e.g. "/collections/abc")
    query: &str,
    body: Option<&str>,
) -> Result<ApiResponse> {
    let db = state.db.lock().unwrap();
    let ws = active_workspace(&db);

    if let Some(tail) = rest.strip_prefix("/collections") {
        // apply-delta: POST /collections/{id}/items:apply-delta
        if method == "POST" {
            if let Some(id) = tail
                .strip_prefix('/')
                .and_then(|t| t.strip_suffix("/items:apply-delta"))
            {
                let Some(mut doc) = get_doc(&db, COLLECTIONS, &ws, id)? else {
                    return Ok(ApiResponse::detail(404, "Collection not found"));
                };
                let req = parse_body(body)?;
                let ops = req["ops"].as_array().cloned().unwrap_or_default();
                apply_delta(&mut doc, &ops);
                save_doc(&db, COLLECTIONS, &ws, id, &doc)?;
                return ApiResponse::ok(&json!({ "collection": doc }));
            }
        }
        return crud(&db, &ws, COLLECTIONS, json!({ "name": "", "items": [] }), method, tail, body);
    }
    if let Some(tail) = rest.strip_prefix("/environments") {
        return crud(
            &db,
            &ws,
            ENVIRONMENTS,
            json!({ "name": "", "variables": [] }),
            method,
            tail,
            body,
        );
    }
    if let Some(tail) = rest.strip_prefix("/history") {
        return match (method, tail) {
            ("GET", "") => {
                let mut docs = list_docs(&db, HISTORY, &ws)?;
                docs.sort_by_key(|d| -d["timestamp"].as_i64().unwrap_or(0));
                let limit: usize =
                    query_param(query, "limit").and_then(|v| v.parse().ok()).unwrap_or(100);
                docs.truncate(limit);
                ApiResponse::ok(&docs)
            }
            ("POST", "") => {
                let req = parse_body(body)?;
                let mut doc = json!({
                    "id": new_id(),
                    "params": [],
                    "headers": [],
                    "body": {},
                    "auth": {},
                    "name": "",
                    "timestamp": now_ms(),
                });
                merge_patch(&mut doc, &req);
                insert_doc(&db, HISTORY, &ws, doc["id"].as_str().unwrap(), &doc)?;
                ApiResponse::ok(&doc)
            }
            ("DELETE", "/clear") => {
                for doc in list_docs(&db, HISTORY, &ws)? {
                    if let Some(id) = doc["id"].as_str() {
                        tombstone(&db, HISTORY, &ws, id)?;
                    }
                }
                Ok(ApiResponse::empty(204))
            }
            ("DELETE", _) if tail.starts_with('/') => {
                tombstone(&db, HISTORY, &ws, &tail[1..])?;
                Ok(ApiResponse::empty(204))
            }
            _ => Ok(ApiResponse::detail(404, "Not found")),
        };
    }
    if let Some(tail) = rest.strip_prefix("/workspaces") {
        return crud(
            &db,
            &ws,
            WORKSPACES,
            json!({ "name": "", "created_at": now_ms() }),
            method,
            tail,
            body,
        );
    }
    if let Some(tail) = rest.strip_prefix("/public-mocks") {
        return crud(
            &db,
            &ws,
            PUBLIC_MOCKS,
            json!({ "name": "", "items": [], "created_at": now_ms() }),
            method,
            tail,
            body,
        );
    }
    Ok(ApiResponse::detail(404, "Not found"))
}
