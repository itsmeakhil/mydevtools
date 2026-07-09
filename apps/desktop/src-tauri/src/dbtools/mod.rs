//! Native drivers for the live-DB tools (sql-client, database-explorer,
//! redis-commander), mirroring the Next.js API route contracts under
//! `/api/sql-client/*`, `/api/nosql/*`, `/api/redis-commander/*`.
//!
//! Async (unlike the sync local router) — dispatched separately from lib.rs.

pub mod mongo;
pub mod redis_tool;
pub mod sql;
pub mod sqlsplit;

use crate::router::ApiResponse;
use serde_json::Value;

pub fn err(status: u16, msg: &str) -> ApiResponse {
    ApiResponse {
        status,
        body: serde_json::json!({ "error": msg }).to_string(),
    }
}

pub fn ok(value: &Value) -> ApiResponse {
    ApiResponse { status: 200, body: value.to_string() }
}

pub fn parse_body(body: Option<&str>) -> Result<Value, ApiResponse> {
    serde_json::from_str(body.unwrap_or("{}")).map_err(|_| err(400, "Invalid JSON body"))
}

pub fn is_dbtool_path(path: &str) -> bool {
    let p = path.split('?').next().unwrap_or(path);
    p.starts_with("/api/sql-client/")
        || p.starts_with("/api/nosql/")
        || p.starts_with("/api/redis-commander/")
}

pub async fn route(method: &str, full_path: &str, body: Option<&str>) -> ApiResponse {
    let (path, _query) = match full_path.split_once('?') {
        Some((p, q)) => (p, q),
        None => (full_path, ""),
    };
    let path = path.trim_end_matches('/');

    let result = if let Some(rest) = path.strip_prefix("/api/sql-client") {
        sql::handle(method, rest, body).await
    } else if let Some(rest) = path.strip_prefix("/api/nosql") {
        mongo::handle(method, rest, body).await
    } else if let Some(rest) = path.strip_prefix("/api/redis-commander") {
        redis_tool::handle(method, rest, body).await
    } else {
        Ok(err(404, "Not found"))
    };

    result.unwrap_or_else(|e| err(500, &e))
}

// Integration tests against local services (run with `cargo test -- --ignored`
// while mongod is on :27017 and redis on :6379).
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn body_json(r: &ApiResponse) -> Value {
        serde_json::from_str(&r.body).unwrap()
    }

    #[tokio::test]
    #[ignore]
    async fn mongo_roundtrip() {
        let conn = json!({"connectionString": "mongodb://localhost:27017"});
        let mk = |extra: Value| {
            let mut b = conn.clone();
            for (k, v) in extra.as_object().unwrap() {
                b[k] = v.clone();
            }
            Some(b.to_string())
        };

        let r = route("POST", "/api/nosql/connect", mk(json!({})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert_eq!(body_json(&r)["success"], true);

        // insert
        let r = route("POST", "/api/nosql/documents",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","document":{"name":"a","n":1}})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        let inserted_id = body_json(&r)["result"]["insertedId"].as_str().unwrap().to_string();

        // query
        let r = route("POST", "/api/nosql/documents/query",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","query":"{}","limit":10,"skip":0})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        let v = body_json(&r);
        assert!(v["total"].as_i64().unwrap() >= 1);
        assert!(v["documents"][0]["_id"].is_string()); // node-style hex string

        // aggregation pipeline
        let r = route("POST", "/api/nosql/documents/query",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","query":[{"$match":{"name":"a"}}],"limit":10})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert!(body_json(&r)["total"].as_i64().unwrap() >= 1);

        // blocked stage
        let r = route("POST", "/api/nosql/documents/query",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","query":[{"$where":"1"}]})).as_deref()).await;
        assert_eq!(r.status, 400);

        // update + delete by id
        let r = route("PUT", "/api/nosql/documents",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","documentId":inserted_id,"update":{"n":2}})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        let r = route("DELETE", "/api/nosql/documents",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","documentId":inserted_id})).as_deref()).await;
        assert_eq!(body_json(&r)["result"]["deletedCount"], 1);

        // schema + collections + drop db
        route("POST", "/api/nosql/documents",
            mk(json!({"dbName":"mdt_test","collectionName":"t1","document":{"name":"b"}})).as_deref()).await;
        let r = route("POST", "/api/nosql/schema",
            mk(json!({"dbName":"mdt_test","collectionName":"t1"})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert_eq!(body_json(&r)["fields"][0]["name"], "_id");
        let r = route("POST", "/api/nosql/collections", mk(json!({"dbName":"mdt_test"})).as_deref()).await;
        assert!(body_json(&r)["collections"].as_array().unwrap().len() >= 1);
        let r = route("POST", "/api/nosql/database/drop", mk(json!({"dbName":"mdt_test"})).as_deref()).await;
        assert_eq!(body_json(&r)["success"], true);
    }

    #[tokio::test]
    #[ignore]
    async fn redis_roundtrip() {
        let base = json!({"redisUrl": "redis://localhost:6379", "db": 15});
        let mk = |extra: Value| {
            let mut b = base.clone();
            for (k, v) in extra.as_object().unwrap() {
                b[k] = v.clone();
            }
            Some(b.to_string())
        };

        let r = route("POST", "/api/redis-commander/connect", mk(json!({})).as_deref()).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert_eq!(body_json(&r)["pong"], "PONG");

        // set via execute, read via key, list via keys (scan)
        let r = route("POST", "/api/redis-commander/execute",
            mk(json!({"command":["SET","mdt:test:k1","v1"]})).as_deref()).await;
        assert_eq!(body_json(&r)["result"], "OK");
        let r = route("POST", "/api/redis-commander/key", mk(json!({"key":"mdt:test:k1"})).as_deref()).await;
        let v = body_json(&r);
        assert_eq!(v["type"], "string");
        assert_eq!(v["value"], "v1");
        let r = route("POST", "/api/redis-commander/keys",
            mk(json!({"pattern":"mdt:test:*","cursor":"0","count":100})).as_deref()).await;
        assert!(body_json(&r)["keys"].as_array().unwrap().len() >= 1);

        // hash PUT roundtrip
        let r = route("PUT", "/api/redis-commander/key",
            mk(json!({"key":"mdt:test:h1","type":"hash","value":{"f":"x"},"ttl":60})).as_deref()).await;
        assert_eq!(body_json(&r)["success"], true);
        let r = route("POST", "/api/redis-commander/key", mk(json!({"key":"mdt:test:h1"})).as_deref()).await;
        let v = body_json(&r);
        assert_eq!(v["value"]["f"], "x");
        assert!(v["ttl"].as_i64().unwrap() > 0);

        // dangerous command blocked
        let r = route("POST", "/api/redis-commander/execute",
            mk(json!({"command":["FLUSHALL"]})).as_deref()).await;
        assert_eq!(r.status, 403);

        // rename + copy conflict semantics
        route("POST", "/api/redis-commander/execute", mk(json!({"command":["SET","mdt:test:k2","v2"]})).as_deref()).await;
        let r = route("POST", "/api/redis-commander/key/rename",
            mk(json!({"key":"mdt:test:k2","newKey":"mdt:test:k1"})).as_deref()).await;
        assert_eq!(r.status, 409);

        // info + bulk-delete cleanup
        let r = route("POST", "/api/redis-commander/info", mk(json!({})).as_deref()).await;
        assert!(body_json(&r)["sections"]["server"]["redis_version"].is_string());
        let r = route("POST", "/api/redis-commander/bulk-delete",
            mk(json!({"pattern":"mdt:test:*","dryRun":false})).as_deref()).await;
        assert!(body_json(&r)["affected"].as_u64().unwrap() >= 3);

        // monitor deferred
        let r = route("GET", "/api/redis-commander/monitor?redisUrl=redis://localhost:6379", None).await;
        assert_eq!(r.status, 501);
    }
}
