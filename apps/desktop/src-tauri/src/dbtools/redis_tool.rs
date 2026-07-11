//! /api/redis-commander/* — Redis via redis-rs, one client per request
//! (mirrors the web routes, which have no pool). MONITOR and pub/sub
//! subscribe are SSE on the web and deferred to v1.1 on desktop.

use redis::aio::MultiplexedConnection;
use redis::Value as RV;
use serde_json::{json, Map, Value};

use super::{err, ok, parse_body};
use crate::router::ApiResponse;

type HandlerResult = Result<ApiResponse, String>;

const DANGEROUS_COMMANDS: &[&str] = &[
    "FLUSHALL", "FLUSHDB", "CONFIG", "DEBUG", "SHUTDOWN", "SLAVEOF", "REPLICAOF",
    "BGREWRITEAOF", "BGSAVE", "SAVE",
];
const MAX_SCAN_LIMIT: usize = 100_000;
const MAX_EXPORT_KEYS: usize = 10_000;
const MAX_SAMPLE: i64 = 5_000;

async fn connect(req: &Value) -> Result<MultiplexedConnection, String> {
    let url = req["redisUrl"].as_str().unwrap_or("");
    if !url.starts_with("redis://") && !url.starts_with("rediss://") {
        return Err("redisUrl must start with redis:// or rediss://".into());
    }
    let client = redis::Client::open(url).map_err(|e| e.to_string())?;
    let mut conn = tokio::time::timeout(
        std::time::Duration::from_secs(10),
        client.get_multiplexed_async_connection(),
    )
    .await
    .map_err(|_| "Connection timed out".to_string())?
    .map_err(|e| e.to_string())?;
    if let Some(db) = req["db"].as_i64() {
        let _: RV = redis::cmd("SELECT").arg(db).query_async(&mut conn).await.map_err(|e| e.to_string())?;
    }
    Ok(conn)
}

fn rv_to_json(v: &RV) -> Value {
    match v {
        RV::Nil => Value::Null,
        RV::Int(i) => json!(i),
        RV::Double(d) => json!(d),
        RV::Boolean(b) => json!(b),
        RV::BulkString(b) => json!(String::from_utf8_lossy(b)),
        RV::SimpleString(s) => json!(s),
        RV::Okay => json!("OK"),
        RV::Array(a) | RV::Set(a) => Value::Array(a.iter().map(rv_to_json).collect()),
        RV::Map(m) => {
            let mut obj = Map::new();
            for (k, val) in m {
                let key = match rv_to_json(k) {
                    Value::String(s) => s,
                    other => other.to_string(),
                };
                obj.insert(key, rv_to_json(val));
            }
            Value::Object(obj)
        }
        RV::VerbatimString { text, .. } => json!(text),
        RV::BigNumber(n) => json!(n.to_string()),
        other => json!(format!("{other:?}")),
    }
}

async fn cmd(conn: &mut MultiplexedConnection, parts: &[&str]) -> Result<RV, String> {
    let mut c = redis::cmd(parts[0]);
    for p in &parts[1..] {
        c.arg(*p);
    }
    c.query_async(conn).await.map_err(|e| e.to_string())
}

async fn cmd_json(conn: &mut MultiplexedConnection, parts: &[&str]) -> Result<Value, String> {
    Ok(rv_to_json(&cmd(conn, parts).await?))
}

fn as_str_vec(v: &Value) -> Vec<String> {
    match v {
        Value::Array(a) => a.iter().filter_map(|x| x.as_str().map(str::to_string)).collect(),
        _ => Vec::new(),
    }
}

/// SCAN one page → (next_cursor, keys)
async fn scan_page(
    conn: &mut MultiplexedConnection,
    cursor: &str,
    pattern: &str,
    count: usize,
) -> Result<(String, Vec<String>), String> {
    let v = cmd(conn, &["SCAN", cursor, "MATCH", pattern, "COUNT", &count.to_string()]).await?;
    if let RV::Array(items) = v {
        let next = match items.first() {
            Some(RV::BulkString(b)) => String::from_utf8_lossy(b).to_string(),
            Some(RV::SimpleString(s)) => s.clone(),
            Some(RV::Int(i)) => i.to_string(),
            _ => "0".into(),
        };
        let keys = match items.get(1) {
            Some(RV::Array(ks)) => ks
                .iter()
                .filter_map(|k| match k {
                    RV::BulkString(b) => Some(String::from_utf8_lossy(b).to_string()),
                    RV::SimpleString(s) => Some(s.clone()),
                    _ => None,
                })
                .collect(),
            _ => Vec::new(),
        };
        Ok((next, keys))
    } else {
        Err("Unexpected SCAN reply".into())
    }
}

async fn scan_all(
    conn: &mut MultiplexedConnection,
    pattern: &str,
    page: usize,
    max: usize,
) -> Result<(Vec<String>, usize, bool), String> {
    let mut cursor = "0".to_string();
    let mut keys = Vec::new();
    let mut scanned = 0usize;
    let mut truncated = false;
    loop {
        let (next, batch) = scan_page(conn, &cursor, pattern, page).await?;
        scanned += batch.len();
        keys.extend(batch);
        cursor = next;
        if keys.len() >= max {
            truncated = cursor != "0";
            keys.truncate(max);
            break;
        }
        if cursor == "0" {
            break;
        }
    }
    Ok((keys, scanned, truncated))
}

/// Read a key's value by type (shared by key GET / export).
async fn read_typed_value(
    conn: &mut MultiplexedConnection,
    key: &str,
) -> Result<(String, i64, Value), String> {
    let ty = match cmd_json(conn, &["TYPE", key]).await? {
        Value::String(s) => s,
        _ => "none".into(),
    };
    let ttl = cmd_json(conn, &["TTL", key]).await?.as_i64().unwrap_or(-1);
    let value = match ty.as_str() {
        "string" => cmd_json(conn, &["GET", key]).await?,
        "list" => cmd_json(conn, &["LRANGE", key, "0", "-1"]).await?,
        "set" => cmd_json(conn, &["SMEMBERS", key]).await?,
        "zset" => {
            let raw = cmd_json(conn, &["ZRANGE", key, "0", "-1", "WITHSCORES"]).await?;
            let flat = raw.as_array().cloned().unwrap_or_default();
            let mut out = Vec::new();
            let mut i = 0;
            while i + 1 < flat.len() {
                let member = flat[i].clone();
                let score = flat[i + 1]
                    .as_str()
                    .and_then(|s| s.parse::<f64>().ok())
                    .or(flat[i + 1].as_f64())
                    .unwrap_or(0.0);
                out.push(json!({ "member": member, "score": score }));
                i += 2;
            }
            Value::Array(out)
        }
        "hash" => {
            // RESP2 returns a flat [field, value, ...] array; RESP3 a map.
            match cmd_json(conn, &["HGETALL", key]).await? {
                Value::Array(flat) => {
                    let mut obj = Map::new();
                    let mut i = 0;
                    while i + 1 < flat.len() {
                        if let Some(f) = flat[i].as_str() {
                            obj.insert(f.to_string(), flat[i + 1].clone());
                        }
                        i += 2;
                    }
                    Value::Object(obj)
                }
                other => other,
            }
        }
        _ => Value::Null,
    };
    Ok((ty, ttl, value))
}

/// Recreate a key from an exported {type, value} (shared by key PUT / import).
async fn write_typed_value(
    conn: &mut MultiplexedConnection,
    key: &str,
    ty: &str,
    value: &Value,
    ttl: i64,
) -> Result<(), String> {
    let _ = cmd(conn, &["DEL", key]).await?;
    match ty {
        "string" => {
            let s = value.as_str().map(str::to_string).unwrap_or_else(|| value.to_string());
            cmd(conn, &["SET", key, &s]).await?;
        }
        "list" => {
            for item in value.as_array().cloned().unwrap_or_default() {
                let s = item.as_str().map(str::to_string).unwrap_or_else(|| item.to_string());
                cmd(conn, &["RPUSH", key, &s]).await?;
            }
        }
        "set" => {
            for item in value.as_array().cloned().unwrap_or_default() {
                let s = item.as_str().map(str::to_string).unwrap_or_else(|| item.to_string());
                cmd(conn, &["SADD", key, &s]).await?;
            }
        }
        "zset" => {
            for item in value.as_array().cloned().unwrap_or_default() {
                let member = item["member"].as_str().unwrap_or_default().to_string();
                let score = item["score"].as_f64().unwrap_or(0.0).to_string();
                cmd(conn, &["ZADD", key, &score, &member]).await?;
            }
        }
        "hash" => {
            if let Some(obj) = value.as_object() {
                for (f, v) in obj {
                    let s = v.as_str().map(str::to_string).unwrap_or_else(|| v.to_string());
                    cmd(conn, &["HSET", key, f, &s]).await?;
                }
            }
        }
        _ => return Err(format!("Unknown type: {ty}")),
    }
    if ttl > 0 {
        cmd(conn, &["EXPIRE", key, &ttl.to_string()]).await?;
    } else if ttl == -1 {
        cmd(conn, &["PERSIST", key]).await?;
    }
    Ok(())
}

pub async fn handle(method: &str, rest: &str, body: Option<&str>) -> HandlerResult {
    // Streaming routes (SSE on web) are not available on desktop v1.
    if rest == "/monitor" || (rest == "/pubsub" && method == "GET") {
        return Ok(err(501, "Live monitor/subscribe is not available in the desktop app yet"));
    }
    let req = match parse_body(body) {
        Ok(v) => v,
        Err(r) => return Ok(r),
    };
    if req["redisUrl"].as_str().unwrap_or("").is_empty() {
        return Ok(err(400, "redisUrl is required"));
    }
    let mut conn = connect(&req).await?;
    match (method, rest) {
        ("POST", "/connect") => {
            let info = cmd_json(&mut conn, &["INFO", "server"]).await?;
            let version = info
                .as_str()
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.starts_with("redis_version:"))
                        .map(|l| l.trim_start_matches("redis_version:").trim().to_string())
                })
                .unwrap_or_default();
            let pong = cmd_json(&mut conn, &["PING"]).await?;
            Ok(ok(&json!({ "success": true, "version": version, "pong": pong })))
        }
        ("POST", "/execute") => {
            let parts = as_str_vec(&req["command"]);
            if parts.is_empty() {
                return Ok(err(400, "command array is required"));
            }
            let upper = parts[0].to_uppercase();
            if DANGEROUS_COMMANDS.contains(&upper.as_str()) {
                return Ok(err(403, &format!("Command {upper} is disabled")));
            }
            let started = std::time::Instant::now();
            let refs: Vec<&str> = parts.iter().map(String::as_str).collect();
            let result = cmd_json(&mut conn, &refs).await?;
            Ok(ok(&json!({ "result": result, "executionTime": started.elapsed().as_millis() as u64 })))
        }
        ("POST", "/keys") => {
            let pattern = req["pattern"].as_str().unwrap_or("*");
            let cursor = match &req["cursor"] {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                _ => "0".into(),
            };
            let count = req["count"].as_u64().unwrap_or(100) as usize;
            let (next, keys) = scan_page(&mut conn, &cursor, pattern, count).await?;
            let mut out = Vec::new();
            for key in keys {
                let ty = cmd_json(&mut conn, &["TYPE", &key]).await?;
                let ttl = cmd_json(&mut conn, &["TTL", &key]).await?;
                out.push(json!({ "key": key, "type": ty, "ttl": ttl }));
            }
            let dbsize = cmd_json(&mut conn, &["DBSIZE"]).await?;
            Ok(ok(&json!({ "cursor": next, "keys": out, "dbSize": dbsize })))
        }
        (m, "/key") => {
            let key = req["key"].as_str().unwrap_or("");
            if key.is_empty() {
                return Ok(err(400, "key is required"));
            }
            match m {
                "POST" => {
                    let (ty, ttl, value) = read_typed_value(&mut conn, key).await?;
                    Ok(ok(&json!({ "key": key, "type": ty, "ttl": ttl, "value": value })))
                }
                "PUT" => {
                    let ty = req["type"].as_str().unwrap_or("");
                    let ttl = req["ttl"].as_i64().unwrap_or(0);
                    write_typed_value(&mut conn, key, ty, &req["value"], ttl)
                        .await
                        .map_err(|e| e)?;
                    Ok(ok(&json!({ "success": true })))
                }
                "DELETE" => {
                    let deleted = cmd_json(&mut conn, &["DEL", key]).await?;
                    Ok(ok(&json!({ "deleted": deleted })))
                }
                _ => Ok(err(405, "Method not allowed")),
            }
        }
        ("POST", "/key/copy") => {
            let key = req["key"].as_str().unwrap_or("");
            let dest = req["destination"].as_str().unwrap_or("");
            if key.is_empty() || dest.is_empty() {
                return Ok(err(400, "key and destination are required"));
            }
            let mut parts: Vec<String> = vec!["COPY".into(), key.into(), dest.into()];
            if let Some(ddb) = req["destinationDb"].as_i64() {
                parts.push("DB".into());
                parts.push(ddb.to_string());
            }
            if req["overwrite"].as_bool() == Some(true) {
                parts.push("REPLACE".into());
            }
            let refs: Vec<&str> = parts.iter().map(String::as_str).collect();
            let result = cmd_json(&mut conn, &refs).await?;
            if result.as_i64() == Some(0) {
                return Ok(err(409, &format!("Destination '{dest}' already exists. Enable overwrite to replace it.")));
            }
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/key/rename") => {
            let key = req["key"].as_str().unwrap_or("");
            let new_key = req["newKey"].as_str().unwrap_or("");
            if key.is_empty() || new_key.is_empty() {
                return Ok(err(400, "key and newKey are required"));
            }
            if key == new_key {
                return Ok(err(400, "New name must be different"));
            }
            if req["overwrite"].as_bool() == Some(true) {
                cmd(&mut conn, &["RENAME", key, new_key]).await?;
            } else {
                let r = cmd_json(&mut conn, &["RENAMENX", key, new_key]).await?;
                if r.as_i64() == Some(0) {
                    return Ok(err(409, &format!("Key '{new_key}' already exists. Enable overwrite to replace it.")));
                }
            }
            Ok(ok(&json!({ "success": true })))
        }
        ("POST", "/bulk-delete") => {
            let pattern = req["pattern"].as_str().unwrap_or("");
            if pattern.is_empty() || pattern == "*" {
                return Ok(err(400, "Refusing to bulk-delete all keys — use Flush instead"));
            }
            let dry_run = req["dryRun"].as_bool().unwrap_or(false);
            let (keys, scanned, truncated) = scan_all(&mut conn, pattern, 500, MAX_SCAN_LIMIT).await?;
            let sample: Vec<&String> = keys.iter().take(20).collect();
            let affected = keys.len();
            if !dry_run {
                for chunk in keys.chunks(500) {
                    let mut parts: Vec<&str> = vec!["DEL"];
                    parts.extend(chunk.iter().map(String::as_str));
                    cmd(&mut conn, &parts).await?;
                }
            }
            Ok(ok(&json!({ "dryRun": dry_run, "affected": affected, "scanned": scanned, "sample": sample, "truncated": truncated })))
        }
        ("POST", "/flush") => {
            let pattern = req["pattern"].as_str().unwrap_or("");
            if pattern.is_empty() || pattern == "*" {
                return Ok(err(403, "Full flush is disabled"));
            }
            let (keys, ..) = scan_all(&mut conn, pattern, 100, MAX_SCAN_LIMIT).await?;
            let deleted = keys.len();
            for chunk in keys.chunks(500) {
                let mut parts: Vec<&str> = vec!["DEL"];
                parts.extend(chunk.iter().map(String::as_str));
                cmd(&mut conn, &parts).await?;
            }
            Ok(ok(&json!({ "success": true, "deleted": deleted })))
        }
        ("POST", "/export") => {
            let pattern = req["pattern"].as_str().unwrap_or("*");
            let (keys, _scanned, truncated) = scan_all(&mut conn, pattern, 500, MAX_EXPORT_KEYS).await?;
            let mut out = Vec::new();
            for key in &keys {
                let (ty, ttl, value) = read_typed_value(&mut conn, key).await?;
                out.push(json!({ "key": key, "type": ty, "ttl": ttl, "value": value }));
            }
            Ok(ok(&json!({
                "exportedAt": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0),
                "pattern": pattern,
                "count": out.len(),
                "truncated": truncated,
                "keys": out,
            })))
        }
        ("POST", "/import") => {
            let Some(keys) = req["keys"].as_array() else {
                return Ok(err(400, "keys array is required"));
            };
            if keys.is_empty() {
                return Ok(ok(&json!({ "imported": 0, "skipped": 0 })));
            }
            let overwrite = req["overwrite"].as_bool().unwrap_or(false);
            let mut imported = 0u64;
            let mut skipped = 0u64;
            let mut errors: Vec<String> = Vec::new();
            for entry in keys {
                let key = entry["key"].as_str().unwrap_or("");
                let ty = entry["type"].as_str().unwrap_or("");
                if key.is_empty() || ty.is_empty() {
                    continue;
                }
                if !overwrite {
                    let exists = cmd_json(&mut conn, &["EXISTS", key]).await?;
                    if exists.as_i64() == Some(1) {
                        skipped += 1;
                        continue;
                    }
                }
                let ttl = entry["ttl"].as_i64().unwrap_or(-1);
                match write_typed_value(&mut conn, key, ty, &entry["value"], ttl).await {
                    Ok(()) => imported += 1,
                    Err(e) => errors.push(format!("{key}: {e}")),
                }
            }
            Ok(ok(&json!({ "imported": imported, "skipped": skipped, "errors": errors })))
        }
        ("POST", "/info") => {
            let raw = cmd_json(&mut conn, &["INFO"]).await?;
            let mut sections: Map<String, Value> = Map::new();
            let mut current = String::new();
            for line in raw.as_str().unwrap_or("").lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                if let Some(name) = line.strip_prefix("# ") {
                    current = name.to_lowercase();
                    sections.insert(current.clone(), json!({}));
                } else if let Some((k, v)) = line.split_once(':') {
                    if let Some(Value::Object(sec)) = sections.get_mut(&current) {
                        sec.insert(k.to_string(), json!(v));
                    }
                }
            }
            let dbsize = cmd_json(&mut conn, &["DBSIZE"]).await?;
            Ok(ok(&json!({ "sections": sections, "dbsize": dbsize })))
        }
        ("POST", "/clients") => {
            match req["action"].as_str().unwrap_or("list") {
                "kill" => {
                    let Some(client_id) = req["clientId"].as_str().map(str::to_string).or_else(|| req["clientId"].as_i64().map(|i| i.to_string())) else {
                        return Ok(err(400, "clientId is required"));
                    };
                    let killed = cmd_json(&mut conn, &["CLIENT", "KILL", "ID", &client_id]).await?;
                    Ok(ok(&json!({ "killed": killed })))
                }
                _ => {
                    let raw = cmd_json(&mut conn, &["CLIENT", "LIST"]).await?;
                    let clients: Vec<Value> = raw
                        .as_str()
                        .unwrap_or("")
                        .lines()
                        .filter(|l| !l.trim().is_empty())
                        .map(|line| {
                            let mut fields = Map::new();
                            for pair in line.split(' ') {
                                if let Some((k, v)) = pair.split_once('=') {
                                    fields.insert(k.to_string(), json!(v));
                                }
                            }
                            let g = |k: &str| fields.get(k).cloned().unwrap_or(Value::Null);
                            json!({
                                "id": g("id"), "addr": g("addr"), "name": g("name"),
                                "age": g("age"), "idle": g("idle"), "db": g("db"),
                                "cmd": g("cmd"), "user": g("user"), "raw": fields,
                            })
                        })
                        .collect();
                    Ok(ok(&json!({ "clients": clients })))
                }
            }
        }
        ("POST", "/slowlog") => {
            match req["action"].as_str().unwrap_or("get") {
                "reset" => {
                    cmd(&mut conn, &["SLOWLOG", "RESET"]).await?;
                    Ok(ok(&json!({ "success": true })))
                }
                "len" => {
                    let len = cmd_json(&mut conn, &["SLOWLOG", "LEN"]).await?;
                    Ok(ok(&json!({ "length": len })))
                }
                _ => {
                    let count = req["count"].as_u64().unwrap_or(50).to_string();
                    let raw = cmd_json(&mut conn, &["SLOWLOG", "GET", &count]).await?;
                    let entries: Vec<Value> = raw
                        .as_array()
                        .cloned()
                        .unwrap_or_default()
                        .iter()
                        .map(|e| {
                            let a = e.as_array().cloned().unwrap_or_default();
                            json!({
                                "id": a.first().cloned().unwrap_or(Value::Null),
                                "ts": a.get(1).cloned().unwrap_or(Value::Null),
                                "durationMicros": a.get(2).cloned().unwrap_or(Value::Null),
                                "command": a.get(3).cloned().unwrap_or(json!([])),
                                "clientAddr": a.get(4).cloned(),
                                "clientName": a.get(5).cloned(),
                            })
                        })
                        .collect();
                    Ok(ok(&json!({ "entries": entries })))
                }
            }
        }
        ("POST", "/scanner") => {
            let pattern = req["pattern"].as_str().unwrap_or("*");
            let sample_size = req["sampleSize"].as_i64().unwrap_or(1000).min(MAX_SAMPLE) as usize;
            let (keys, scanned, truncated) = scan_all(&mut conn, pattern, 500, sample_size).await?;
            let mut total_bytes: u64 = 0;
            let mut by_type: Map<String, Value> = Map::new();
            let mut detail: Vec<(String, String, u64, i64)> = Vec::new();
            let mut no_ttl = 0u64;
            let mut expiring = 0u64;
            for key in &keys {
                let ty = match cmd_json(&mut conn, &["TYPE", key]).await? {
                    Value::String(s) => s,
                    _ => "unknown".into(),
                };
                let bytes = cmd_json(&mut conn, &["MEMORY", "USAGE", key, "SAMPLES", "0"])
                    .await
                    .ok()
                    .and_then(|v| v.as_u64())
                    .unwrap_or(0);
                let ttl = cmd_json(&mut conn, &["TTL", key]).await?.as_i64().unwrap_or(-1);
                total_bytes += bytes;
                if ttl == -1 {
                    no_ttl += 1;
                } else if ttl > 0 {
                    expiring += 1;
                }
                let entry = by_type.entry(ty.clone()).or_insert_with(|| json!({ "count": 0, "bytes": 0 }));
                entry["count"] = json!(entry["count"].as_u64().unwrap_or(0) + 1);
                entry["bytes"] = json!(entry["bytes"].as_u64().unwrap_or(0) + bytes);
                detail.push((key.clone(), ty, bytes, ttl));
            }
            detail.sort_by(|a, b| b.2.cmp(&a.2));
            let top: Vec<Value> = detail
                .iter()
                .take(50)
                .map(|(key, ty, bytes, ttl)| json!({ "key": key, "type": ty, "bytes": bytes, "ttl": ttl }))
                .collect();
            Ok(ok(&json!({
                "pattern": pattern, "sampledKeys": keys.len(), "truncated": truncated,
                "scanned": scanned, "totalBytes": total_bytes, "byType": by_type,
                "topByBytes": top,
                "ttlSummary": { "noTtl": no_ttl, "expiring": expiring, "expired": 0 },
            })))
        }
        ("POST", "/pubsub") => {
            let channel = req["channel"].as_str().unwrap_or("");
            if channel.is_empty() {
                return Ok(err(400, "channel is required"));
            }
            let message = req["message"].as_str().map(str::to_string).unwrap_or_else(|| req["message"].to_string());
            let receivers = cmd_json(&mut conn, &["PUBLISH", channel, &message]).await?;
            Ok(ok(&json!({ "receivers": receivers })))
        }
        (m, "/json") => {
            if m == "GET" {
                let raw = cmd_json(&mut conn, &["MODULE", "LIST"]).await?;
                let names: Vec<Value> = raw
                    .as_array()
                    .cloned()
                    .unwrap_or_default()
                    .iter()
                    .filter_map(|module| {
                        let v = if module.is_object() {
                            module.get("name").cloned()
                        } else {
                            let a = module.as_array()?;
                            a.iter().position(|x| x.as_str() == Some("name")).and_then(|i| a.get(i + 1).cloned())
                        };
                        v
                    })
                    .collect();
                return Ok(ok(&json!({ "modules": names })));
            }
            let action = req["action"].as_str().unwrap_or("");
            if action == "modules" {
                let raw = cmd_json(&mut conn, &["MODULE", "LIST"]).await?;
                return Ok(ok(&json!({ "modules": raw })));
            }
            let key = req["key"].as_str().unwrap_or("");
            if key.is_empty() {
                return Ok(err(400, "key is required"));
            }
            let path = req["path"].as_str().unwrap_or("$");
            match action {
                "get" => {
                    let value = cmd_json(&mut conn, &["JSON.GET", key, path]).await?;
                    Ok(ok(&json!({ "value": value })))
                }
                "set" => {
                    if req["value"].is_null() {
                        return Ok(err(400, "value is required"));
                    }
                    let payload = req["value"].to_string();
                    let result = cmd_json(&mut conn, &["JSON.SET", key, path, &payload]).await?;
                    Ok(ok(&json!({ "result": result })))
                }
                "del" => {
                    let deleted = cmd_json(&mut conn, &["JSON.DEL", key, path]).await?;
                    Ok(ok(&json!({ "deleted": deleted })))
                }
                "type" => {
                    let ty = cmd_json(&mut conn, &["JSON.TYPE", key, path]).await?;
                    Ok(ok(&json!({ "type": ty })))
                }
                _ => Ok(err(400, "Unknown action")),
            }
        }
        ("POST", "/search") => {
            match req["action"].as_str().unwrap_or("list") {
                "list" => {
                    let indexes = cmd_json(&mut conn, &["FT._LIST"]).await?;
                    Ok(ok(&json!({ "indexes": indexes })))
                }
                "info" => {
                    let index = req["index"].as_str().unwrap_or("");
                    if index.is_empty() {
                        return Ok(err(400, "index is required"));
                    }
                    let info = cmd_json(&mut conn, &["FT.INFO", index]).await?;
                    Ok(ok(&json!({ "info": info })))
                }
                "explain" => {
                    let index = req["index"].as_str().unwrap_or("");
                    let query = req["query"].as_str().unwrap_or("");
                    if index.is_empty() || query.is_empty() {
                        return Ok(err(400, "index and query are required"));
                    }
                    let explain = cmd_json(&mut conn, &["FT.EXPLAIN", index, query]).await?;
                    Ok(ok(&json!({ "explain": explain })))
                }
                "search" => {
                    let index = req["index"].as_str().unwrap_or("");
                    let query = req["query"].as_str().unwrap_or("");
                    if index.is_empty() || query.is_empty() {
                        return Ok(err(400, "index and query are required"));
                    }
                    let offset = req["offset"].as_u64().unwrap_or(0).to_string();
                    let limit = req["limit"].as_u64().unwrap_or(25).to_string();
                    let raw = cmd_json(&mut conn, &["FT.SEARCH", index, query, "LIMIT", &offset, &limit]).await?;
                    let arr = raw.as_array().cloned().unwrap_or_default();
                    let total = arr.first().and_then(Value::as_i64).unwrap_or(0);
                    let mut results = Vec::new();
                    let mut i = 1;
                    while i + 1 < arr.len() + 1 && i < arr.len() {
                        let key = arr[i].clone();
                        let fields_arr = arr.get(i + 1).and_then(Value::as_array).cloned().unwrap_or_default();
                        let mut fields = Map::new();
                        let mut j = 0;
                        while j + 1 < fields_arr.len() {
                            if let Some(name) = fields_arr[j].as_str() {
                                fields.insert(name.to_string(), fields_arr[j + 1].clone());
                            }
                            j += 2;
                        }
                        results.push(json!({ "key": key, "fields": fields }));
                        i += 2;
                    }
                    Ok(ok(&json!({ "total": total, "results": results })))
                }
                _ => Ok(err(400, "Unknown action")),
            }
        }
        ("POST", "/streams") => streams(&mut conn, &req).await,
        ("POST", "/timeseries") => {
            let key = req["key"].as_str().unwrap_or("");
            if key.is_empty() {
                return Ok(err(400, "key is required"));
            }
            match req["action"].as_str().unwrap_or("range") {
                "info" => {
                    let info = cmd_json(&mut conn, &["TS.INFO", key]).await?;
                    Ok(ok(&json!({ "info": info })))
                }
                _ => {
                    let from = req["from"].as_str().unwrap_or("-").to_string();
                    let to = req["to"].as_str().unwrap_or("+").to_string();
                    let count = req["count"].as_u64().unwrap_or(500).to_string();
                    let mut parts: Vec<String> = vec!["TS.RANGE".into(), key.into(), from, to];
                    if let (Some(agg), Some(bucket)) = (req["aggregation"].as_str(), req["bucketMs"].as_u64()) {
                        parts.push("AGGREGATION".into());
                        parts.push(agg.to_string());
                        parts.push(bucket.to_string());
                    }
                    parts.push("COUNT".into());
                    parts.push(count);
                    let refs: Vec<&str> = parts.iter().map(String::as_str).collect();
                    let raw = cmd_json(&mut conn, &refs).await?;
                    let samples: Vec<Value> = raw
                        .as_array()
                        .cloned()
                        .unwrap_or_default()
                        .iter()
                        .filter_map(|s| {
                            let a = s.as_array()?;
                            let ts = a.first()?.as_i64()?;
                            let value = a.get(1)?.as_str().and_then(|v| v.parse::<f64>().ok()).or(a.get(1)?.as_f64())?;
                            Some(json!({ "ts": ts, "value": value }))
                        })
                        .collect();
                    Ok(ok(&json!({ "samples": samples })))
                }
            }
        }
        _ => Ok(err(404, "Not found")),
    }
}

async fn streams(conn: &mut MultiplexedConnection, req: &Value) -> HandlerResult {
    let key = req["key"].as_str().unwrap_or("");
    let action = req["action"].as_str().unwrap_or("");
    if key.is_empty() || action.is_empty() {
        return Ok(err(400, "key and action are required"));
    }
    let entries_from = |raw: Value| -> Vec<Value> {
        raw.as_array()
            .cloned()
            .unwrap_or_default()
            .iter()
            .filter_map(|e| {
                let a = e.as_array()?;
                let id = a.first()?.clone();
                let flat = a.get(1).and_then(Value::as_array).cloned().unwrap_or_default();
                let mut fields = Map::new();
                let mut i = 0;
                while i + 1 < flat.len() {
                    if let Some(name) = flat[i].as_str() {
                        fields.insert(name.to_string(), flat[i + 1].clone());
                    }
                    i += 2;
                }
                Some(json!({ "id": id, "fields": fields }))
            })
            .collect()
    };
    match action {
        "info" => {
            let info = cmd_json(conn, &["XINFO", "STREAM", key]).await?;
            Ok(ok(&json!({ "info": info })))
        }
        "range" => {
            let start = req["start"].as_str().unwrap_or("-").to_string();
            let end = req["end"].as_str().unwrap_or("+").to_string();
            let count = req["count"].as_u64().unwrap_or(50).to_string();
            let raw = cmd_json(conn, &["XRANGE", key, &start, &end, "COUNT", &count]).await?;
            Ok(ok(&json!({ "entries": entries_from(raw) })))
        }
        "add" => {
            let Some(fields) = req["fields"].as_object() else {
                return Ok(err(400, "fields object is required"));
            };
            let id = req["id"].as_str().unwrap_or("*").to_string();
            let mut parts: Vec<String> = vec!["XADD".into(), key.into(), id];
            for (f, v) in fields {
                parts.push(f.clone());
                parts.push(v.as_str().map(str::to_string).unwrap_or_else(|| v.to_string()));
            }
            let refs: Vec<&str> = parts.iter().map(String::as_str).collect();
            let new_id = cmd_json(conn, &refs).await?;
            Ok(ok(&json!({ "id": new_id })))
        }
        "del" => {
            let ids = as_str_vec(&req["ids"]);
            let mut parts: Vec<&str> = vec!["XDEL", key];
            parts.extend(ids.iter().map(String::as_str));
            let deleted = cmd_json(conn, &parts).await?;
            Ok(ok(&json!({ "deleted": deleted })))
        }
        "trim" => {
            let maxlen = req["maxlen"].as_u64().unwrap_or(0).to_string();
            let trimmed = cmd_json(conn, &["XTRIM", key, "MAXLEN", "~", &maxlen]).await?;
            Ok(ok(&json!({ "trimmed": trimmed })))
        }
        "groups" => {
            let groups = cmd_json(conn, &["XINFO", "GROUPS", key]).await?;
            Ok(ok(&json!({ "groups": groups })))
        }
        "pending" => {
            let group = req["group"].as_str().unwrap_or("");
            let pending = cmd_json(conn, &["XPENDING", key, group]).await?;
            Ok(ok(&json!({ "pending": pending })))
        }
        "ack" => {
            let group = req["group"].as_str().unwrap_or("");
            let ids = as_str_vec(&req["ids"]);
            let mut parts: Vec<&str> = vec!["XACK", key, group];
            parts.extend(ids.iter().map(String::as_str));
            let acked = cmd_json(conn, &parts).await?;
            Ok(ok(&json!({ "acked": acked })))
        }
        "claim" => {
            let group = req["group"].as_str().unwrap_or("");
            let consumer = req["consumer"].as_str().unwrap_or("");
            let min_idle = req["minIdle"].as_u64().unwrap_or(0).to_string();
            let ids = as_str_vec(&req["ids"]);
            let mut parts: Vec<&str> = vec!["XCLAIM", key, group, consumer, &min_idle];
            parts.extend(ids.iter().map(String::as_str));
            let raw = cmd_json(conn, &parts).await?;
            Ok(ok(&json!({ "claimed": entries_from(raw) })))
        }
        _ => Ok(err(400, "Unknown action")),
    }
}
