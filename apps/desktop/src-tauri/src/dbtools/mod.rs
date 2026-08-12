//! Native drivers for the live-DB tools (sql-client, database-explorer,
//! redis-commander), mirroring the Next.js API route contracts under
//! `/api/sql-client/*`, `/api/nosql/*`, `/api/redis-commander/*`.
//!
//! Async (unlike the sync local router) — dispatched separately from lib.rs.

pub mod mongo;
pub mod redis_tool;
pub mod sql;
pub mod sqlite;
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

    // ── SQL ────────────────────────────────────────────────────────────────
    //
    // These cover what unit tests structurally cannot: that the positional row
    // format, the read-only session guard, the update transaction and the
    // statement splitter behave that way against a real server.
    //
    // Postgres on :5432 as `postgres`/`postgres` db `postgres`;
    // MySQL or MariaDB on :3306 as `root` db `mysql`.

    fn pg_base() -> Value {
        json!({
            "type": "postgresql", "host": "127.0.0.1", "port": 5432,
            "database": "postgres", "username": "postgres", "password": "postgres",
            "ssl": false
        })
    }

    fn mysql_base() -> Value {
        json!({
            "type": "mysql", "host": "127.0.0.1", "port": 3306,
            "database": "mysql", "username": "root", "password": "root",
            "ssl": false
        })
    }

    fn merge(base: &Value, extra: Value) -> Option<String> {
        let mut b = base.clone();
        for (k, v) in extra.as_object().unwrap() {
            b[k] = v.clone();
        }
        Some(b.to_string())
    }

    async fn sql(base: &Value, path: &str, extra: Value) -> ApiResponse {
        route("POST", path, merge(base, extra).as_deref()).await
    }

    async fn run(base: &Value, query: &str) -> ApiResponse {
        sql(base, "/api/sql-client/query", json!({ "query": query })).await
    }

    #[tokio::test]
    #[ignore]
    async fn sql_postgres_roundtrip() {
        let base = pg_base();

        let r = sql(&base, "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert!(body_json(&r)["version"].as_str().unwrap().contains("PostgreSQL"));

        // An out-of-range port must be rejected, not wrapped to 0 by `as u16`.
        let r = sql(&base, "/api/sql-client/connect", json!({ "port": 65536 })).await;
        assert_eq!(r.status, 400, "{}", r.body);

        // Two columns with the same name both survive: positional rows.
        let r = run(&base, "SELECT 3 AS id, 7 AS id").await;
        assert_eq!(r.status, 200, "{}", r.body);
        let v = body_json(&r);
        assert_eq!(v["columns"], json!(["id", "id"]));
        assert_eq!(v["rows"][0], json!(["3", "7"]));

        // Multiple statements in one run share a connection, so a transaction
        // sent together actually commits.
        let r = run(
            &base,
            "DROP SCHEMA IF EXISTS mdt_test CASCADE;
             CREATE SCHEMA mdt_test;
             CREATE TABLE mdt_test.t (id int PRIMARY KEY, label text, tag text);
             BEGIN;
             INSERT INTO mdt_test.t VALUES (1,'a','dup'),(2,'b','dup'),(3,'c','uniq');
             COMMIT;",
        )
        .await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert_eq!(body_json(&r)["results"].as_array().unwrap().len(), 6);

        // Truncation is reported rather than implied.
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({ "query": "SELECT * FROM mdt_test.t ORDER BY id", "limit": 2 }),
        )
        .await;
        let v = body_json(&r);
        assert_eq!(v["rowCount"], 3);
        assert_eq!(v["rows"].as_array().unwrap().len(), 2);
        assert_eq!(v["truncated"], true);

        // The tree's initial load asks for no columns and must get none.
        let r = sql(&base, "/api/sql-client/tables", json!({ "includeColumns": false })).await;
        let v = body_json(&r);
        assert!(v["columns"].as_array().unwrap().is_empty());
        assert!(v["tables"].as_array().unwrap().iter().any(|t| t["name"] == "t"));
        let r = sql(&base, "/api/sql-client/tables", json!({})).await;
        assert!(!body_json(&r)["columns"].as_array().unwrap().is_empty());

        // A quoted literal is "unknown"-typed, so digits land in a text column.
        // A bare `123` would be `integer` and Postgres would reject the update.
        let upd = json!({
            "schema": "mdt_test", "table": "t",
            "set": { "label": "123" }, "where": { "id": 1 }
        });
        let r = sql(&base, "/api/sql-client/update-row", upd).await;
        assert_eq!(r.status, 200, "{}", r.body);
        let v = body_json(&r);
        assert_eq!(v["rowCount"], 1);
        assert_eq!(v["rolledBack"], false);

        // A filter matching more than one row changes nothing at all.
        let r = sql(
            &base,
            "/api/sql-client/update-row",
            json!({
                "schema": "mdt_test", "table": "t",
                "set": { "label": "clobbered" }, "where": { "tag": "dup" }
            }),
        )
        .await;
        let v = body_json(&r);
        assert_eq!(v["rowCount"], 2);
        assert_eq!(v["rolledBack"], true);
        assert_eq!(v["success"], false);
        let r = run(&base, "SELECT label FROM mdt_test.t WHERE tag = 'dup' ORDER BY id").await;
        assert_eq!(body_json(&r)["rows"], json!([["123"], ["b"]]), "rollback did not restore");

        // Read-only is enforced by the session, not by inspecting the SQL.
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({ "query": "INSERT INTO mdt_test.t VALUES (99,'x','y')", "readOnly": true }),
        )
        .await;
        assert_eq!(r.status, 500, "{}", r.body);
        assert!(r.body.contains("read-only"), "{}", r.body);
        let r = sql(
            &base,
            "/api/sql-client/update-row",
            json!({
                "readOnly": true, "schema": "mdt_test", "table": "t",
                "set": { "label": "x" }, "where": { "id": 1 }
            }),
        )
        .await;
        assert_eq!(r.status, 403, "{}", r.body);

        // Read-only blocks DDL too, which a statement blocklist would miss.
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({ "query": "CREATE TABLE mdt_test.sneaky (x int)", "readOnly": true }),
        )
        .await;
        assert_eq!(r.status, 500, "{}", r.body);

        let r = run(&base, "DROP SCHEMA mdt_test CASCADE").await;
        assert_eq!(r.status, 200, "{}", r.body);
    }

    #[tokio::test]
    #[ignore]
    async fn sql_mysql_roundtrip() {
        let base = mysql_base();

        let r = sql(&base, "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert!(body_json(&r)["version"].is_string());

        let r = run(&base, "SELECT 3 AS id, 7 AS id").await;
        assert_eq!(r.status, 200, "{}", r.body);
        let v = body_json(&r);
        assert_eq!(v["columns"], json!(["id", "id"]));
        // Strings, not numbers: `query_iter` uses MySQL's text protocol, which
        // sends every value as bytes. Typed values only come back through the
        // binary protocol (prepared statements), so the query path loses JSON
        // types exactly the way the Postgres one does.
        assert_eq!(v["rows"][0], json!(["3", "7"]));

        let r = run(
            &base,
            "DROP DATABASE IF EXISTS mdt_test;
             CREATE DATABASE mdt_test;
             CREATE TABLE mdt_test.t (id int PRIMARY KEY, label varchar(64), tag varchar(64), blob_col blob);
             INSERT INTO mdt_test.t VALUES (1,'a','dup',NULL),(2,'b','dup',NULL),(3,'c','uniq',UNHEX('FF0041'));",
        )
        .await;
        assert_eq!(r.status, 200, "{}", r.body);

        // A BLOB is not text: raw bytes come back as hex, not U+FFFD soup.
        let r = run(&base, "SELECT blob_col FROM mdt_test.t WHERE id = 3").await;
        assert_eq!(body_json(&r)["rows"][0][0]["$binary"], "ff0041");

        // Microseconds survive the round trip.
        let r = run(&base, "SELECT CAST('2026-08-11 09:30:15.123456' AS DATETIME(6)) AS d").await;
        assert_eq!(body_json(&r)["rows"][0][0], "2026-08-11 09:30:15.123456");

        // DELIMITER is a client directive; without honouring it the body splits
        // on its own semicolons and every fragment fails.
        let r = run(
            &base,
            "DELIMITER //\n\
             CREATE PROCEDURE mdt_test.p() BEGIN SELECT 1; SELECT 2; END //\n\
             DELIMITER ;",
        )
        .await;
        assert_eq!(r.status, 200, "{}", r.body);

        // CALL returns several result sets; reading only the first leaves the
        // connection dirty for everything after it.
        let r = run(&base, "CALL mdt_test.p(); SELECT 42 AS after_call").await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert_eq!(body_json(&r)["rows"][0][0], "42", "connection was left dirty");

        let updated = json!({
            "database": "mdt_test", "table": "t",
            "set": { "label": "123" }, "where": { "id": 1 }
        });
        let r = sql(&base, "/api/sql-client/update-row", updated).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert_eq!(body_json(&r)["rowCount"], 1);

        let r = sql(
            &base,
            "/api/sql-client/update-row",
            json!({
                "database": "mdt_test", "table": "t",
                "set": { "label": "clobbered" }, "where": { "tag": "dup" }
            }),
        )
        .await;
        let v = body_json(&r);
        assert_eq!(v["rowCount"], 2);
        assert_eq!(v["rolledBack"], true);
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({
                "database": "mdt_test",
                "query": "SELECT label FROM t WHERE tag = 'dup' ORDER BY id"
            }),
        )
        .await;
        assert_eq!(body_json(&r)["rows"], json!([["123"], ["b"]]), "rollback did not restore");

        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({
                "database": "mdt_test", "readOnly": true,
                "query": "INSERT INTO t VALUES (99,'x','y',NULL)"
            }),
        )
        .await;
        assert_eq!(r.status, 500, "{}", r.body);

        let r = run(&base, "DROP DATABASE mdt_test").await;
        assert_eq!(r.status, 200, "{}", r.body);
    }

    // ── SQLite ─────────────────────────────────────────────────────────────
    //
    // Not #[ignore]d: SQLite needs no server, so this runs on every
    // `cargo test` and the whole path stays covered for free.

    struct TempDb(std::path::PathBuf);

    impl TempDb {
        fn new(name: &str) -> Self {
            let path = std::env::temp_dir().join(format!("mdt_{name}_{}.db", std::process::id()));
            let _ = std::fs::remove_file(&path);
            Self(path)
        }
        fn as_str(&self) -> &str {
            self.0.to_str().unwrap()
        }
    }

    impl Drop for TempDb {
        fn drop(&mut self) {
            // WAL leaves sidecars behind; take them too or the next run inherits them.
            for suffix in ["", "-wal", "-shm"] {
                let _ = std::fs::remove_file(format!("{}{suffix}", self.0.display()));
            }
        }
    }

    fn sqlite_base(path: &str) -> Value {
        json!({ "type": "sqlite", "path": path })
    }

    #[tokio::test]
    async fn sqlite_roundtrip() {
        let db = TempDb::new("sqlite_roundtrip");
        {
            let seed = rusqlite::Connection::open(db.as_str()).unwrap();
            seed.execute_batch(
                "CREATE TABLE t (id INTEGER PRIMARY KEY, label TEXT, tag TEXT, payload BLOB, big INTEGER);
                 INSERT INTO t VALUES (1,'a','dup',NULL,1),(2,'b','dup',NULL,2),
                                      (3,'c','uniq',x'ff0041',9007199254740993);
                 CREATE VIEW v AS SELECT id FROM t;",
            )
            .unwrap();
        }
        let base = sqlite_base(db.as_str());

        let r = sql(&base, "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 200, "{}", r.body);
        assert!(body_json(&r)["version"].as_str().unwrap().starts_with("SQLite"));

        // Unlike the server engines this is not a text protocol, so values keep
        // their real JSON types.
        let r = run(&base, "SELECT id, label FROM t WHERE id = 1").await;
        assert_eq!(body_json(&r)["rows"][0], json!([1, "a"]));

        // Duplicate column names survive, same as everywhere else.
        let r = run(&base, "SELECT 3 AS id, 7 AS id").await;
        let v = body_json(&r);
        assert_eq!(v["columns"], json!(["id", "id"]));
        assert_eq!(v["rows"][0], json!([3, 7]));

        // A BLOB is not text, and an integer past 2^53 is not a JSON number.
        let r = run(&base, "SELECT payload, big FROM t WHERE id = 3").await;
        let v = body_json(&r);
        assert_eq!(v["rows"][0][0]["$binary"], "ff0041");
        assert_eq!(v["rows"][0][1], json!("9007199254740993"));

        // Streaming still reports the full count behind the cap.
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({ "query": "SELECT * FROM t ORDER BY id", "limit": 2 }),
        )
        .await;
        let v = body_json(&r);
        assert_eq!(v["rowCount"], 3);
        assert_eq!(v["rows"].as_array().unwrap().len(), 2);
        assert_eq!(v["truncated"], true);

        // Sidebar load: tables and views, no column sweep.
        let r = sql(&base, "/api/sql-client/tables", json!({ "includeColumns": false })).await;
        let v = body_json(&r);
        assert!(v["columns"].as_array().unwrap().is_empty());
        let names: Vec<&str> =
            v["tables"].as_array().unwrap().iter().map(|t| t["name"].as_str().unwrap()).collect();
        assert!(names.contains(&"t") && names.contains(&"v"), "{names:?}");
        let view = v["tables"].as_array().unwrap().iter().find(|t| t["name"] == "v").unwrap();
        assert_eq!(view["type"], "VIEW");

        // Full load: columns and the primary key the grid needs to edit.
        let r = sql(&base, "/api/sql-client/tables", json!({})).await;
        let v = body_json(&r);
        assert!(!v["columns"].as_array().unwrap().is_empty());
        assert_eq!(v["primaryKeys"][0]["column_name"], "id");

        let r = sql(
            &base,
            "/api/sql-client/update-row",
            json!({ "table": "t", "set": { "label": "renamed" }, "where": { "id": 1 } }),
        )
        .await;
        assert_eq!(body_json(&r)["rowCount"], 1);

        // A filter matching two rows changes nothing at all.
        let r = sql(
            &base,
            "/api/sql-client/update-row",
            json!({ "table": "t", "set": { "label": "clobbered" }, "where": { "tag": "dup" } }),
        )
        .await;
        let v = body_json(&r);
        assert_eq!(v["rowCount"], 2);
        assert_eq!(v["rolledBack"], true);
        let r = run(&base, "SELECT label FROM t WHERE tag = 'dup' ORDER BY id").await;
        assert_eq!(body_json(&r)["rows"], json!([["renamed"], ["b"]]), "rollback did not restore");

        // Read-only is the open flag, not a statement blocklist — DDL included.
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({ "query": "INSERT INTO t VALUES (99,'x','y',NULL,0)", "readOnly": true }),
        )
        .await;
        assert_eq!(r.status, 500, "{}", r.body);
        let r = sql(
            &base,
            "/api/sql-client/query",
            json!({ "query": "CREATE TABLE sneaky (x int)", "readOnly": true }),
        )
        .await;
        assert_eq!(r.status, 500, "{}", r.body);
        let r = sql(
            &base,
            "/api/sql-client/update-row",
            json!({ "readOnly": true, "table": "t", "set": { "label": "x" }, "where": { "id": 1 } }),
        )
        .await;
        assert_eq!(r.status, 403, "{}", r.body);
    }

    #[tokio::test]
    async fn sqlite_bad_paths_never_create_a_database() {
        // A typo in the path must be an error. Opening with SQLITE_OPEN_CREATE
        // would hand back a pristine empty database that looks like data loss.
        let missing = std::env::temp_dir().join("mdt_definitely_not_here.db");
        let _ = std::fs::remove_file(&missing);
        let r = sql(&sqlite_base(missing.to_str().unwrap()), "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 500, "{}", r.body);
        assert!(!missing.exists(), "connect created the database it was asked to open");

        // A directory.
        let dir = std::env::temp_dir();
        let r = sql(&sqlite_base(dir.to_str().unwrap()), "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 500, "{}", r.body);

        // A file that exists but is not a database — the same error an
        // encrypted SQLCipher database produces.
        let not_a_db = std::env::temp_dir().join(format!("mdt_not_a_db_{}.txt", std::process::id()));
        std::fs::write(&not_a_db, b"just some text, definitely not a database").unwrap();
        let r = sql(&sqlite_base(not_a_db.to_str().unwrap()), "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 500, "{}", r.body);
        assert!(r.body.contains("not a database"), "{}", r.body);
        let _ = std::fs::remove_file(&not_a_db);

        // A relative path would resolve against an invisible working directory.
        let r = sql(&sqlite_base("app.db"), "/api/sql-client/connect", json!({})).await;
        assert_eq!(r.status, 400, "{}", r.body);
    }
}
