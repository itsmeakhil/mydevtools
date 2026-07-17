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
    if !conn_str.starts_with("mongodb://") && !conn_str.starts_with("mongodb+srv://") {
        return Ok(err(400, "Invalid MongoDB connection string"));
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
            let res = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .update_one(id_filter(&doc_id), doc! { "$set": update })
                .await
                .map_err(|e| e.to_string())?;
            Ok(ok(&json!({ "result": {
                "acknowledged": true,
                "matchedCount": res.matched_count,
                "modifiedCount": res.modified_count,
                "upsertedId": res.upserted_id.as_ref().map(bson_to_json),
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
            let cursor = client
                .database(&db_name)
                .collection::<Document>(&coll)
                .list_indexes()
                .await
                .map_err(|e| e.to_string())?;
            let indexes: Vec<_> = cursor.try_collect().await.map_err(|e| e.to_string())?;
            let list: Vec<Value> = indexes
                .iter()
                .map(|i| {
                    let mut v = json!({ "key": bson_to_json(&Bson::Document(i.keys.clone())) });
                    if let Some(opts) = &i.options {
                        if let Some(name) = &opts.name {
                            v["name"] = json!(name);
                        }
                        if opts.unique == Some(true) {
                            v["unique"] = json!(true);
                        }
                        if opts.sparse == Some(true) {
                            v["sparse"] = json!(true);
                        }
                    }
                    v
                })
                .collect();
            Ok(ok(&json!({ "indexes": list, "totalIndexSize": Value::Null })))
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
    let limit = req["limit"].as_i64().unwrap_or(20).clamp(1, 500);
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
    let total = coll.count_documents(filter.clone()).await.map_err(|e| e.to_string())?;
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

async fn schema(client: &Client, req: &Value) -> HandlerResult {
    let (db_name, coll_name) = match required(req, &["dbName", "collectionName"]) {
        Ok(v) => (v[0].to_string(), v[1].to_string()),
        Err(r) => return Ok(r),
    };
    let sample_size = req["sampleSize"].as_i64().unwrap_or(200).min(1000);
    let coll = client.database(&db_name).collection::<Document>(&coll_name);
    let cursor = coll
        .aggregate(vec![doc! { "$sample": { "size": sample_size } }])
        .await
        .map_err(|e| e.to_string())?;
    let docs: Vec<Document> = cursor.try_collect().await.map_err(|e| e.to_string())?;
    if docs.is_empty() {
        return Ok(ok(&json!({ "fields": [], "sampleSize": 0 })));
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
    Ok(ok(&json!({ "fields": out, "sampleSize": total })))
}
