//! /api/nosql/* — MongoDB via the official Rust driver. Clients are cached
//! per connection string (handshakes to Atlas are slow); no host blocking —
//! localhost databases are the point of a desktop app.

use dashmap::DashMap;
use futures_util::TryStreamExt;
use mongodb::bson::{doc, oid::ObjectId, Bson, Document};
use mongodb::options::ClientOptions;
use mongodb::Client;
use serde_json::{json, Map, Value};
use std::sync::OnceLock;
use std::time::Duration;

use super::{err, ok, parse_body};
use crate::router::ApiResponse;

type HandlerResult = Result<ApiResponse, String>;

static CLIENTS: OnceLock<DashMap<String, Client>> = OnceLock::new();

fn clients() -> &'static DashMap<String, Client> {
    CLIENTS.get_or_init(DashMap::new)
}

/// Scrub connection strings / credentials from error messages
/// (mirrors lib/nosql-error-sanitizer.ts intent).
fn sanitize(msg: &str, conn: &str) -> String {
    let mut out = msg.replace(conn, "<connection>");
    if let Some(at) = out.find('@') {
        if let Some(scheme_end) = out.find("://") {
            if scheme_end < at {
                out.replace_range(scheme_end + 3..at, "<credentials>");
            }
        }
    }
    out
}

async fn get_client(conn_str: &str) -> Result<Client, String> {
    if let Some(c) = clients().get(conn_str) {
        return Ok(c.clone());
    }
    let mut opts = ClientOptions::parse(conn_str)
        .await
        .map_err(|e| sanitize(&e.to_string(), conn_str))?;
    opts.max_pool_size = Some(5);
    opts.min_pool_size = Some(1);
    opts.server_selection_timeout = Some(Duration::from_secs(5));
    opts.connect_timeout = Some(Duration::from_secs(5));
    let client = Client::with_options(opts).map_err(|e| sanitize(&e.to_string(), conn_str))?;
    clients().insert(conn_str.to_string(), client.clone());
    Ok(client)
}

// ── JSON ⇄ BSON with node-driver-compatible serialization ──────────────────

/// Bson → JSON matching Node's JSON.stringify behavior: ObjectId → hex
/// string, DateTime → ISO string.
fn bson_to_json(b: &Bson) -> Value {
    match b {
        Bson::ObjectId(o) => json!(o.to_hex()),
        Bson::DateTime(d) => json!(d.try_to_rfc3339_string().unwrap_or_default()),
        Bson::Document(d) => {
            let mut m = Map::new();
            for (k, v) in d {
                m.insert(k.clone(), bson_to_json(v));
            }
            Value::Object(m)
        }
        Bson::Array(a) => Value::Array(a.iter().map(bson_to_json).collect()),
        Bson::Double(f) => json!(f),
        Bson::Int32(i) => json!(i),
        Bson::Int64(i) => json!(i),
        Bson::String(s) => json!(s),
        Bson::Boolean(v) => json!(v),
        Bson::Null => Value::Null,
        Bson::Decimal128(d) => json!(d.to_string()),
        Bson::Timestamp(t) => json!({ "t": t.time, "i": t.increment }),
        Bson::Binary(bin) => json!({ "$binary": mongodb::bson::binary::Binary::from(bin.clone()).bytes.len() }),
        Bson::RegularExpression(r) => json!({ "$regex": r.pattern.clone(), "$options": r.options.clone() }),
        other => json!(other.to_string()),
    }
}

fn doc_to_json(d: &Document) -> Value {
    bson_to_json(&Bson::Document(d.clone()))
}

/// JSON → BSON, recursively converting `_id` strings that are valid ObjectIds
/// (mirrors the web routes' convertObjectIds).
fn json_to_bson(v: &Value, under_id: bool) -> Bson {
    match v {
        Value::Null => Bson::Null,
        Value::Bool(b) => Bson::Boolean(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                if i >= i32::MIN as i64 && i <= i32::MAX as i64 {
                    Bson::Int32(i as i32)
                } else {
                    Bson::Int64(i)
                }
            } else {
                Bson::Double(n.as_f64().unwrap_or(0.0))
            }
        }
        Value::String(s) => {
            if under_id {
                if let Ok(oid) = ObjectId::parse_str(s) {
                    return Bson::ObjectId(oid);
                }
            }
            Bson::String(s.clone())
        }
        Value::Array(a) => Bson::Array(a.iter().map(|x| json_to_bson(x, under_id)).collect()),
        Value::Object(o) => {
            let mut d = Document::new();
            for (k, val) in o {
                // `_id` (or operators nested under it, e.g. {$in: [...]}) get
                // ObjectId conversion for plausible hex strings.
                let next_under = k == "_id" || (under_id && k.starts_with('$'));
                d.insert(k.clone(), json_to_bson(val, next_under));
            }
            Bson::Document(d)
        }
    }
}

fn json_to_doc(v: &Value) -> Result<Document, String> {
    match json_to_bson(v, false) {
        Bson::Document(d) => Ok(d),
        _ => Err("Expected a JSON object".into()),
    }
}

fn id_filter(document_id: &str) -> Document {
    match ObjectId::parse_str(document_id) {
        Ok(oid) => doc! { "_id": oid },
        Err(_) => doc! { "_id": document_id },
    }
}

fn required<'a>(req: &'a Value, keys: &[&str]) -> Result<Vec<&'a str>, ApiResponse> {
    let mut out = Vec::new();
    for k in keys {
        match req[*k].as_str() {
            Some(s) if !s.is_empty() => out.push(s),
            _ => return Err(err(400, "Missing required fields")),
        }
    }
    Ok(out)
}

const BLOCKED_STAGES: &[&str] = &["$where", "$function", "$accumulator", "$out", "$merge"];

fn validate_pipeline(stages: &[Value]) -> Result<(), String> {
    if stages.len() > 100 {
        return Err("Aggregation pipeline too long (max 100 stages)".into());
    }
    let raw = serde_json::to_string(stages).unwrap_or_default();
    for blocked in BLOCKED_STAGES {
        if raw.contains(blocked) {
            return Err(format!("Aggregation stage {blocked} is not allowed"));
        }
    }
    Ok(())
}

// ── Dispatch ────────────────────────────────────────────────────────────────

pub async fn handle(method: &str, rest: &str, body: Option<&str>) -> HandlerResult {
    let req = match parse_body(body) {
        Ok(v) => v,
        Err(r) => return Ok(r),
    };
    let conn_str = req["connectionString"].as_str().unwrap_or("");
    if conn_str.is_empty() {
        return Ok(err(400, "Connection string is required"));
    }
    // All supported dialects (MongoDB, DocumentDB, Cosmos Mongo API, FerretDB)
    // speak the Mongo wire protocol and use mongodb:// / mongodb+srv:// URIs.
    if !conn_str.starts_with("mongodb://") && !conn_str.starts_with("mongodb+srv://") {
        return Ok(err(400, "Connection string must start with mongodb:// or mongodb+srv://"));
    }

    // Read-only connections: reject every mutating route (defense in depth —
    // the UI hides write affordances, this catches anything that slips through).
    if req["readOnly"].as_bool().unwrap_or(false) && is_write_route(method, rest) {
        return Ok(err(403, "Connection is read-only"));
    }

    let result = dispatch(method, rest, &req, conn_str).await;
    match result {
        Ok(r) => Ok(r),
        Err(e) => Ok(err(500, &sanitize(&e, conn_str))),
    }
}

fn is_write_route(method: &str, rest: &str) -> bool {
    matches!(
        (method, rest),
        ("POST", "/documents")
            | ("PUT", "/documents")
            | ("DELETE", "/documents")
            | ("POST", "/bulk-delete")
            | ("POST", "/import")
            | ("POST", "/indexes")
            | ("DELETE", "/indexes")
            | ("POST", "/collection/drop")
            | ("POST", "/collection/rename")
            | ("POST", "/database/drop")
            | ("POST", "/database/rename")
            | ("POST", "/kill-op")
            | ("POST", "/sync")
            | ("POST", "/gridfs/upload")
            | ("POST", "/gridfs/delete")
    )
}

async fn dispatch(method: &str, rest: &str, req: &Value, conn_str: &str) -> HandlerResult {
    let client = get_client(conn_str).await?;
    match (method, rest) {
        ("POST", "/connect") => {
            let dbs = client.list_databases().await.map_err(|e| e.to_string())?;
            let list: Vec<Value> = dbs
                .iter()
                .map(|d| {
                    json!({ "name": d.name, "sizeOnDisk": d.size_on_disk, "empty": d.empty })
                })
                .collect();
            Ok(ok(&json!({ "success": true, "message": "Connected successfully", "databases": list })))
        }
        ("POST", "/collections") => {
            let db_name = match required(req, &["dbName"]) {
                Ok(v) => v[0].to_string(),
                Err(r) => return Ok(r),
            };
            let db = client.database(&db_name);
            let specs = db.list_collections().await.map_err(|e| e.to_string())?;
            let specs: Vec<_> = specs.try_collect().await.map_err(|e| e.to_string())?;
            let mut out = Vec::new();
            for spec in specs {
                let count = db
                    .collection::<Document>(&spec.name)
                    .estimated_document_count()
                    .await
                    .ok();
                out.push(json!({
                    "name": spec.name,
                    "type": format!("{:?}", spec.collection_type).to_lowercase(),
                    "documentCount": count,
                }));
            }
            Ok(ok(&json!({ "collections": out })))
        }
        ("POST", "/documents") => {
            let (db_name, coll) = match required(req, &["dbName", "collectionName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            let document = json_to_doc(&req["document"])?;
            let res = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .insert_one(document)
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "result": { "acknowledged": true, "insertedId": bson_to_json(&res.inserted_id) } })))
        }
        ("PUT", "/documents") => {
            let (db_name, coll, doc_id) =
                match required(req, &["dbName", "collectionName", "documentId"]) {
                    Ok(v) => (v[0].to_string(), v[1].to_string(), v[2].to_string()),
                    Err(r) => return Ok(r),
                };
            let mut update = json_to_doc(&req["update"])?;
            update.remove("_id");
            let collection = client.database(&db_name).collection::<Document>(&coll);
            // mode "replace" = full-document editor save (fields removed in the
            // editor must be removed in the DB); default "$set" merge = cell edit.
            let (matched, modified, upserted) = if req["mode"].as_str() == Some("replace") {
                let res = collection
                    .replace_one(id_filter(&doc_id), update)
                    .await
                    .map_err(|e| e.to_string())?;
                (res.matched_count, res.modified_count, res.upserted_id)
            } else {
                let res = collection
                    .update_one(id_filter(&doc_id), doc! { "$set": update })
                    .await
                    .map_err(|e| e.to_string())?;
                (res.matched_count, res.modified_count, res.upserted_id)
            };
            Ok(ok(&json!({ "result": {
                "acknowledged": true,
                "matchedCount": matched,
                "modifiedCount": modified,
                "upsertedId": upserted.as_ref().map(bson_to_json),
            }})))
        }
        ("DELETE", "/documents") => {
            let (db_name, coll, doc_id) =
                match required(req, &["dbName", "collectionName", "documentId"]) {
                    Ok(v) => (v[0].to_string(), v[1].to_string(), v[2].to_string()),
                    Err(r) => return Ok(r),
                };
            let res = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .delete_one(id_filter(&doc_id))
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "result": { "acknowledged": true, "deletedCount": res.deleted_count } })))
        }
        ("POST", "/documents/query") => query_documents(&client, req).await,
        ("POST", "/explain") => explain_query(&client, req).await,
        ("POST", "/server-stats") => {
            let status = client
                .database("admin")
                .run_command(doc! { "serverStatus": 1 })
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&bson_to_json(&Bson::Document(status))))
        }
        ("POST", "/current-ops") => {
            let resp = client
                .database("admin")
                .run_command(doc! { "currentOp": 1 })
                .await
                .map_err(|e| e.to_string())?;
            let inprog: Vec<Value> = resp
                .get_array("inprog")
                .map(|a| a.iter().map(bson_to_json).collect())
                .unwrap_or_default();
            Ok(ok(&json!({ "inprog": inprog })))
        }
        ("POST", "/kill-op") => {
            if req["opid"].is_null() {
                return Ok(err(400, "Missing required parameters"));
            }
            let opid = json_to_bson(&req["opid"], false);
            client
                .database("admin")
                .run_command(doc! { "killOp": 1, "op": opid })
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/sync") => mongo_sync(&client, req).await,
        ("POST", "/gridfs/list") => gridfs_list(&client, req).await,
        ("POST", "/gridfs/download") => gridfs_download(&client, req).await,
        ("POST", "/gridfs/upload") => gridfs_upload(&client, req).await,
        ("POST", "/gridfs/delete") => {
            let db_name = match required(req, &["dbName"]) {
                Ok(v) => v[0].to_string(),
                Err(r) => return Ok(r),
            };
            if req["id"].is_null() {
                return Ok(err(400, "Missing required parameters"));
            }
            let bucket = gridfs_bucket(&client, &db_name, req);
            bucket
                .delete(json_to_bson(&req["id"], false))
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/bulk-delete") => {
            let (db_name, coll) = match required(req, &["dbName", "collectionName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            let Some(ids) = req["documentIds"].as_array() else {
                return Ok(err(400, "Missing required parameters"));
            };
            if ids.is_empty() {
                return Ok(err(400, "No document ids provided"));
            }
            if ids.len() > 1000 {
                return Ok(err(400, "Bulk delete limited to 1000 documents per request"));
            }
            let oids: Vec<Bson> = ids
                .iter()
                .filter_map(|v| v.as_str())
                .filter_map(|s| ObjectId::parse_str(s).ok().map(Bson::ObjectId))
                .collect();
            let res = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .delete_many(doc! { "_id": { "$in": oids } })
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "deletedCount": res.deleted_count })))
        }
        ("POST", "/import") => {
            let (db_name, coll) = match required(req, &["dbName", "collectionName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            let Some(docs) = req["documents"].as_array() else {
                return Ok(err(400, "documents array is required"));
            };
            if docs.is_empty() {
                return Ok(err(400, "documents array is required"));
            }
            if docs.len() > 10000 {
                return Ok(err(400, "Maximum 10,000 documents per import"));
            }
            let bson_docs: Vec<Document> =
                docs.iter().map(json_to_doc).collect::<Result<_, _>>()?;
            let res = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .insert_many(bson_docs)
                .with_options(mongodb::options::InsertManyOptions::builder().ordered(false).build())
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "insertedCount": res.inserted_ids.len() })))
        }
        ("POST", "/schema") => schema(&client, req).await,
        ("POST", "/indexes") => {
            let (db_name, coll) = match required(req, &["dbName", "collectionName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            let keys = json_to_doc(&req["keys"]).map_err(|_| "Missing required parameters".to_string())?;
            let options = if req["options"].is_object() {
                Some(
                    mongodb::bson::from_bson::<mongodb::options::IndexOptions>(json_to_bson(&req["options"], false))
                        .map_err(|e| e.to_string())?,
                )
            } else {
                None
            };
            let mut index = mongodb::IndexModel::builder().keys(keys).build();
            index.options = options;
            let res = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .create_index(index)
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "indexName": res.index_name })))
        }
        ("DELETE", "/indexes") => {
            let (db_name, coll, index_name) =
                match required(req, &["dbName", "collectionName", "indexName"]) {
                    Ok(v) => (v[0].to_string(), v[1].to_string(), v[2].to_string()),
                    Err(r) => return Ok(r),
                };
            client
                .database(&db_name)
                .collection::<Document>(&coll)
                .drop_index(index_name)
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/indexes/list") => {
            let (db_name, coll) = match required(req, &["dbName", "collectionName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            let collection = client.database(&db_name).collection::<Document>(&coll);
            let cursor = collection.list_indexes().await.map_err(|e| e.to_string())?;
            let indexes: Vec<_> = cursor.try_collect().await.map_err(|e| e.to_string())?;

            // Best-effort sizes/stats via $collStats (views and very old servers
            // don't support it — indexes still list, sizes just stay null).
            let mut index_sizes = Document::new();
            let mut total_index_size = Value::Null;
            let mut stats = Value::Null;
            if let Ok(cursor) = collection
                .aggregate(vec![doc! { "$collStats": { "storageStats": {} } }])
                .await
            {
                if let Ok(docs) = cursor.try_collect::<Vec<Document>>().await {
                    if let Some(ss) = docs.first().and_then(|d| d.get_document("storageStats").ok()) {
                        total_index_size =
                            ss.get("totalIndexSize").map(bson_to_json).unwrap_or(Value::Null);
                        if let Ok(sizes) = ss.get_document("indexSizes") {
                            index_sizes = sizes.clone();
                        }
                        stats = json!({
                            "count": ss.get("count").map(bson_to_json),
                            "size": ss.get("size").map(bson_to_json),
                            "storageSize": ss.get("storageSize").map(bson_to_json),
                            "avgObjSize": ss.get("avgObjSize").map(bson_to_json),
                        });
                    }
                }
            }

            let list: Vec<Value> = indexes
                .iter()
                .map(|i| {
                    let mut v = json!({ "key": bson_to_json(&Bson::Document(i.keys.clone())) });
                    if let Some(opts) = &i.options {
                        if let Some(name) = &opts.name {
                            v["name"] = json!(name);
                            if let Some(size) = index_sizes.get(name) {
                                v["size"] = bson_to_json(size);
                            }
                        }
                        if opts.unique == Some(true) {
                            v["unique"] = json!(true);
                        }
                        if opts.sparse == Some(true) {
                            v["sparse"] = json!(true);
                        }
                        if let Some(ttl) = opts.expire_after {
                            v["expireAfterSeconds"] = json!(ttl.as_secs());
                        }
                    }
                    v
                })
                .collect();
            Ok(ok(&json!({ "indexes": list, "totalIndexSize": total_index_size, "stats": stats })))
        }
        ("POST", "/collection/drop") => {
            let (db_name, coll) = match required(req, &["dbName", "collectionName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            client
                .database(&db_name)
                .collection::<Document>(&coll)
                .drop()
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/collection/rename") => {
            let (db_name, coll, new_name) =
                match required(req, &["dbName", "collectionName", "newCollectionName"]) {
                    Ok(v) => (v[0].to_string(), v[1].to_string(), v[2].to_string()),
                    Err(r) => return Ok(r),
                };
            client
                .database("admin")
                .run_command(doc! {
                    "renameCollection": format!("{db_name}.{coll}"),
                    "to": format!("{db_name}.{new_name}"),
                })
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/database/drop") => {
            let db_name = match required(req, &["dbName"]) {
                Ok(v) => v[0].to_string(),
                Err(r) => return Ok(r),
            };
            client.database(&db_name).drop().await.map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/database/rename") => {
            let (old_db, new_db) = match required(req, &["oldDbName", "newDbName"]) {
                Ok(v) => (v[0].to_string(), v[1].to_string()),
                Err(r) => return Ok(r),
            };
            let old = client.database(&old_db);
            let specs = old.list_collection_names().await.map_err(|e| e.to_string())?;
            for coll in specs {
                if coll.starts_with("system.") {
                    continue;
                }
                client
                    .database("admin")
                    .run_command(doc! {
                        "renameCollection": format!("{old_db}.{coll}"),
                        "to": format!("{new_db}.{coll}"),
                    })
                    .await
                    .map_err(|e| e.to_string())?;
            }
            Ok(ok(&json!({ "success": true })))
        }
        _ => Ok(err(404, "Not found")),
    }
}

async fn query_documents(client: &Client, req: &Value) -> HandlerResult {
    let (db_name, coll_name) = match required(req, &["dbName", "collectionName"]) {
        Ok(v) => (v[0].to_string(), v[1].to_string()),
        Err(r) => return Ok(r),
    };
    let limit = req["limit"].as_i64().unwrap_or(20).clamp(1, 2000);
    let skip = req["skip"].as_i64().unwrap_or(0).max(0) as u64;
    let sort_field = req["sortField"].as_str().unwrap_or("");
    let sort_dir: i32 = if req["sortDirection"].as_str() == Some("desc") { -1 } else { 1 };

    let raw_query = &req["query"];
    let parsed: Value = match raw_query {
        Value::String(s) => {
            let s = if s.trim().is_empty() { "{}" } else { s };
            match serde_json::from_str(s) {
                Ok(v) => v,
                Err(_) => return Ok(err(400, "Invalid JSON in query parameter")),
            }
        }
        Value::Null => json!({}),
        other => other.clone(),
    };

    let coll = client.database(&db_name).collection::<Document>(&coll_name);

    if let Value::Array(stages_json) = &parsed {
        if let Err(e) = validate_pipeline(stages_json) {
            return Ok(err(400, &e));
        }
        let stages: Vec<Document> = stages_json
            .iter()
            .map(json_to_doc)
            .collect::<Result<_, _>>()
            .map_err(|_| "Invalid aggregation stage".to_string())?;

        // Total via appended $count
        let mut count_stages = stages.clone();
        count_stages.push(doc! { "$count": "total" });
        let count_cursor = coll.aggregate(count_stages).await.map_err(|e| e.to_string())?;
        let count_docs: Vec<Document> = count_cursor.try_collect().await.map_err(|e| e.to_string())?;
        let total = count_docs
            .first()
            .and_then(|d| d.get("total").and_then(|b| b.as_i64().or(b.as_i32().map(i64::from))))
            .unwrap_or(0);

        let mut page_stages = stages;
        if !sort_field.is_empty() {
            page_stages.push(doc! { "$sort": { sort_field: sort_dir } });
        }
        page_stages.push(doc! { "$skip": skip as i64 });
        page_stages.push(doc! { "$limit": limit });
        let cursor = coll.aggregate(page_stages).await.map_err(|e| e.to_string())?;
        let docs: Vec<Document> = cursor.try_collect().await.map_err(|e| e.to_string())?;
        let documents: Vec<Value> = docs.iter().map(doc_to_json).collect();
        return Ok(ok(&json!({ "documents": documents, "total": total })));
    }

    let filter = json_to_doc(&parsed)?;
    // Empty filter: estimated count (metadata read) instead of a full scan-count
    // on every page change. Filtered queries still count exactly.
    let total = if filter.is_empty() {
        coll.estimated_document_count().await.map_err(|e| e.to_string())?
    } else {
        coll.count_documents(filter.clone()).await.map_err(|e| e.to_string())?
    };
    let mut find = coll.find(filter).skip(skip).limit(limit);
    if !sort_field.is_empty() {
        find = find.sort(doc! { sort_field: sort_dir });
    }
    let cursor = find.await.map_err(|e| e.to_string())?;
    let docs: Vec<Document> = cursor.try_collect().await.map_err(|e| e.to_string())?;
    let documents: Vec<Value> = docs.iter().map(doc_to_json).collect();
    Ok(ok(&json!({ "documents": documents, "total": total })))
}

/// Explain the current find filter or aggregation pipeline (executionStats).
/// Mirrors query_documents' query parsing: a JSON array runs as a pipeline.
async fn explain_query(client: &Client, req: &Value) -> HandlerResult {
    let (db_name, coll_name) = match required(req, &["dbName", "collectionName"]) {
        Ok(v) => (v[0].to_string(), v[1].to_string()),
        Err(r) => return Ok(r),
    };
    let sort_field = req["sortField"].as_str().unwrap_or("");
    let sort_dir: i32 = if req["sortDirection"].as_str() == Some("desc") { -1 } else { 1 };

    let raw_query = &req["query"];
    let parsed: Value = match raw_query {
        Value::String(s) => {
            let s = if s.trim().is_empty() { "{}" } else { s };
            match serde_json::from_str(s) {
                Ok(v) => v,
                Err(_) => return Ok(err(400, "Invalid JSON in query parameter")),
            }
        }
        Value::Null => json!({}),
        other => other.clone(),
    };

    let explained = if let Value::Array(stages_json) = &parsed {
        if let Err(e) = validate_pipeline(stages_json) {
            return Ok(err(400, &e));
        }
        let stages: Vec<Bson> = stages_json
            .iter()
            .map(|s| json_to_doc(s).map(Bson::Document))
            .collect::<Result<_, _>>()
            .map_err(|_| "Invalid aggregation stage".to_string())?;
        doc! {
            "explain": { "aggregate": coll_name, "pipeline": stages, "cursor": {} },
            "verbosity": "executionStats",
        }
    } else {
        let filter = json_to_doc(&parsed)?;
        let mut find = doc! { "find": coll_name, "filter": filter };
        if !sort_field.is_empty() {
            find.insert("sort", doc! { sort_field: sort_dir });
        }
        doc! { "explain": find, "verbosity": "executionStats" }
    };

    let result = client
        .database(&db_name)
        .run_command(explained)
        .await
        .map_err(|e| e.to_string())?;
    Ok(ok(&json!({ "explain": doc_to_json(&result) })))
}

fn bucket_type(b: &Bson) -> String {
    match b {
        Bson::Null => "null".into(),
        Bson::ObjectId(_) => "ObjectId".into(),
        Bson::DateTime(_) => "Date".into(),
        Bson::Array(_) => "Array".into(),
        Bson::Document(_) => "Object".into(),
        Bson::String(_) => "string".into(),
        Bson::Boolean(_) => "boolean".into(),
        Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_) | Bson::Decimal128(_) => "number".into(),
        other => format!("{other:?}").split('(').next().unwrap_or("unknown").to_string(),
    }
}

// ── Cross-connection sync ─────────────────────────────────────────────────────
// Copy a source collection into a target collection on any (possibly different)
// connection, matched by _id. "insert" adds missing docs only; "overwrite"
// replaces/inserts. ponytail: naive per-doc loop with a hard scan cap — swap to
// bulk_write batching if throughput on huge collections ever matters.
const SYNC_MAX_SCAN: usize = 100_000;

async fn mongo_sync(source_client: &Client, req: &Value) -> HandlerResult {
    let (src_db, src_coll) = match required(req, &["dbName", "collectionName"]) {
        Ok(v) => (v[0].to_string(), v[1].to_string()),
        Err(r) => return Ok(r),
    };
    let target = &req["target"];
    let tgt_conn = target["connectionString"].as_str().unwrap_or("");
    let tgt_db = target["dbName"].as_str().unwrap_or("");
    let tgt_coll = target["collectionName"].as_str().unwrap_or("");
    if tgt_conn.is_empty() || tgt_db.is_empty() || tgt_coll.is_empty() {
        return Ok(err(400, "Target connection, database and collection are required"));
    }
    if !tgt_conn.starts_with("mongodb://") && !tgt_conn.starts_with("mongodb+srv://") {
        return Ok(err(400, "Invalid target connection string"));
    }
    if target["readOnly"].as_bool().unwrap_or(false) {
        return Ok(err(403, "Target connection is read-only"));
    }
    let overwrite = req["mode"].as_str() == Some("overwrite");

    let target_client = get_client(tgt_conn).await?;
    let target_coll = target_client
        .database(tgt_db)
        .collection::<Document>(tgt_coll);
    let source = source_client
        .database(&src_db)
        .collection::<Document>(&src_coll);

    let mut cursor = source.find(doc! {}).await.map_err(|e| e.to_string())?;
    let (mut inserted, mut modified, mut skipped, mut scanned) = (0u64, 0u64, 0u64, 0usize);
    while let Some(doc) = cursor.try_next().await.map_err(|e| e.to_string())? {
        if scanned >= SYNC_MAX_SCAN {
            break;
        }
        scanned += 1;
        let id = doc.get("_id").cloned().unwrap_or(Bson::Null);
        if overwrite {
            let res = target_coll
                .replace_one(doc! { "_id": id }, doc.clone())
                .upsert(true)
                .await
                .map_err(|e| e.to_string())?;
            if res.upserted_id.is_some() {
                inserted += 1;
            } else {
                modified += 1;
            }
        } else {
            match target_coll.insert_one(doc.clone()).await {
                Ok(_) => inserted += 1,
                // Existing _id (E11000 duplicate key) → skip, that's the point of
                // insert mode. Any other write error aborts the sync.
                Err(e) if e.to_string().contains("E11000") => skipped += 1,
                Err(e) => return Err(e.to_string()),
            }
        }
    }

    Ok(ok(&json!({
        "scanned": scanned,
        "inserted": inserted,
        "modified": modified,
        "skipped": skipped,
        "capped": scanned >= SYNC_MAX_SCAN,
    })))
}

// ── GridFS ──────────────────────────────────────────────────────────────────
// base64 over the local IPC boundary; a hard size cap keeps a huge file from
// ballooning the JSON payload / RSS. ponytail: 32 MiB cap, stream to disk if
// bigger files ever matter.
const GRIDFS_MAX_BYTES: u64 = 32 * 1024 * 1024;

fn gridfs_bucket(client: &Client, db_name: &str, req: &Value) -> mongodb::gridfs::GridFsBucket {
    let name = req["bucket"].as_str().unwrap_or("fs").to_string();
    client
        .database(db_name)
        .gridfs_bucket(mongodb::options::GridFsBucketOptions::builder().bucket_name(name).build())
}

async fn gridfs_list(client: &Client, req: &Value) -> HandlerResult {
    let db_name = match required(req, &["dbName"]) {
        Ok(v) => v[0].to_string(),
        Err(r) => return Ok(r),
    };
    let bucket = gridfs_bucket(client, &db_name, req);
    let cursor = bucket.find(doc! {}).await.map_err(|e| e.to_string())?;
    let files: Vec<mongodb::gridfs::FilesCollectionDocument> =
        cursor.try_collect().await.map_err(|e| e.to_string())?;
    let out: Vec<Value> = files
        .into_iter()
        .map(|f| {
            json!({
                "id": bson_to_json(&f.id),
                "filename": f.filename,
                "length": f.length,
                "chunkSize": f.chunk_size_bytes,
                "uploadDate": bson_to_json(&Bson::DateTime(f.upload_date)),
                "metadata": f.metadata.map(|m| bson_to_json(&Bson::Document(m))),
            })
        })
        .collect();
    Ok(ok(&json!({ "files": out })))
}

async fn gridfs_download(client: &Client, req: &Value) -> HandlerResult {
    use futures_util::io::AsyncReadExt;
    let db_name = match required(req, &["dbName"]) {
        Ok(v) => v[0].to_string(),
        Err(r) => return Ok(r),
    };
    if req["id"].is_null() {
        return Ok(err(400, "Missing required parameters"));
    }
    let bucket = gridfs_bucket(client, &db_name, req);
    let id = json_to_bson(&req["id"], false);
    let mut stream = bucket
        .open_download_stream(id)
        .await
        .map_err(|e| e.to_string())?;
    let mut buf = Vec::new();
    stream.read_to_end(&mut buf).await.map_err(|e| e.to_string())?;
    if buf.len() as u64 > GRIDFS_MAX_BYTES {
        return Ok(err(413, "File exceeds the 32 MB download limit"));
    }
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Ok(ok(&json!({ "data": b64 })))
}

async fn gridfs_upload(client: &Client, req: &Value) -> HandlerResult {
    use futures_util::io::AsyncWriteExt;
    let (db_name, filename) = match required(req, &["dbName", "filename"]) {
        Ok(v) => (v[0].to_string(), v[1].to_string()),
        Err(r) => return Ok(r),
    };
    let Some(b64) = req["data"].as_str() else {
        return Ok(err(400, "data (base64) is required"));
    };
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64)
        .map_err(|_| "Invalid base64 data".to_string())?;
    if bytes.len() as u64 > GRIDFS_MAX_BYTES {
        return Ok(err(413, "File exceeds the 32 MB upload limit"));
    }
    let bucket = gridfs_bucket(client, &db_name, req);
    let mut stream = bucket.open_upload_stream(&filename).await.map_err(|e| e.to_string())?;
    stream.write_all(&bytes).await.map_err(|e| e.to_string())?;
    stream.close().await.map_err(|e| e.to_string())?;
    Ok(ok(&json!({ "id": bson_to_json(stream.id()) })))
}

async fn schema(client: &Client, req: &Value) -> HandlerResult {
    let (db_name, coll_name) = match required(req, &["dbName", "collectionName"]) {
        Ok(v) => (v[0].to_string(), v[1].to_string()),
        Err(r) => return Ok(r),
    };
    let sample_size = req["sampleSize"].as_i64().unwrap_or(200).min(1000);
    let db = client.database(&db_name);
    let coll = db.collection::<Document>(&coll_name);

    // Sampling strategy. "all" scans up to a hard cap so a huge collection can't
    // OOM the analyzer; the UI labels it as capped.
    const ALL_CAP: i64 = 10_000;
    let pipeline = match req["sampleMode"].as_str().unwrap_or("random") {
        "first" => vec![doc! { "$limit": sample_size }],
        "last" => vec![doc! { "$sort": { "_id": -1 } }, doc! { "$limit": sample_size }],
        "all" => vec![doc! { "$limit": ALL_CAP }],
        _ => vec![doc! { "$sample": { "size": sample_size } }],
    };
    let cursor = coll.aggregate(pipeline).await.map_err(|e| e.to_string())?;
    let docs: Vec<Document> = cursor.try_collect().await.map_err(|e| e.to_string())?;

    // Collection JSON-schema validator (if any) — read-only, best effort.
    let validator: Value = db
        .run_command(doc! { "listCollections": 1, "filter": { "name": &coll_name } })
        .await
        .ok()
        .and_then(|r| r.get_document("cursor").ok().cloned())
        .and_then(|c| c.get_array("firstBatch").ok().and_then(|b| b.first().cloned()))
        .and_then(|first| first.as_document().and_then(|d| d.get_document("options").ok().cloned()))
        .and_then(|opts| opts.get_document("validator").ok().map(|v| bson_to_json(&Bson::Document(v.clone()))))
        .unwrap_or(Value::Null);

    if docs.is_empty() {
        return Ok(ok(&json!({ "fields": [], "sampleSize": 0, "validator": validator })));
    }

    struct FieldStat {
        types: std::collections::BTreeMap<String, u64>,
        null_count: u64,
        count: u64,
        examples: Vec<Value>,
    }
    let mut fields: std::collections::BTreeMap<String, FieldStat> = Default::default();
    for d in &docs {
        for (k, v) in d {
            let stat = fields.entry(k.clone()).or_insert_with(|| FieldStat {
                types: Default::default(),
                null_count: 0,
                count: 0,
                examples: Vec::new(),
            });
            stat.count += 1;
            let t = bucket_type(v);
            if t == "null" {
                stat.null_count += 1;
            }
            *stat.types.entry(t).or_insert(0) += 1;
            if stat.examples.len() < 2 {
                stat.examples.push(bson_to_json(v));
            }
        }
    }
    let total = docs.len() as u64;
    let mut out: Vec<Value> = fields
        .into_iter()
        .map(|(name, s)| {
            json!({
                "name": name,
                "types": s.types,
                "nullCount": s.null_count,
                "count": s.count,
                "coverage": (s.count * 100) / total,
                "examples": s.examples,
            })
        })
        .collect();
    out.sort_by(|a, b| {
        let a_id = a["name"] == "_id";
        let b_id = b["name"] == "_id";
        b_id.cmp(&a_id)
            .then(b["coverage"].as_u64().cmp(&a["coverage"].as_u64()))
            .then(a["name"].as_str().cmp(&b["name"].as_str()))
    });
    Ok(ok(&json!({ "fields": out, "sampleSize": total, "validator": validator })))
}
