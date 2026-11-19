//! Local mock server for the api-client.
//!
//! Serves a collection's saved response examples over a loopback HTTP
//! listener so external tools (curl, the user's own app) can call the mock:
//!
//!   http://127.0.0.1:<port>/<collectionId>/<path...>
//!
//! Matching mirrors the web matcher (`lib/__tests__/mock-server.test.ts`):
//! HTTP method (case-insensitive) + pathname of the example's stored URL,
//! where a `:name` segment matches any one segment. Exact paths win over
//! `:param` ones; otherwise tree order, first match wins. The collection is
//! re-read from the local DB on every request, so edits to examples are live
//! immediately. Started by `mock_server_start`, stopped by `mock_server_stop`.

use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::Serialize;
use serde_json::Value;
use tauri::Manager;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

use crate::router::entries::{active_workspace, get_doc};
use crate::state::AppState;

/// Stable port so copied mock URLs survive app restarts; falls back to an
/// ephemeral port if something else holds it (only when no port was asked for).
const PREFERRED_PORT: u16 = 8940;
const LOG_CAP: usize = 200;
const MAX_LATENCY_MS: u64 = 60_000;

struct Running {
    port: u16,
    task: tauri::async_runtime::JoinHandle<()>,
}

/// Async mutex: start/stop hold it across bind/abort so concurrent calls serialize.
fn control() -> &'static tokio::sync::Mutex<Option<Running>> {
    static CONTROL: OnceLock<tokio::sync::Mutex<Option<Running>>> = OnceLock::new();
    CONTROL.get_or_init(|| tokio::sync::Mutex::new(None))
}

static LATENCY_MS: AtomicU64 = AtomicU64::new(0);
static LOG: Mutex<VecDeque<LogEntry>> = Mutex::new(VecDeque::new());

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    /// Unix epoch milliseconds.
    at: u64,
    collection_id: String,
    method: String,
    path: String,
    status: u16,
    /// Name of the matched example, if any.
    example: Option<String>,
    duration_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    port: Option<u16>,
    latency_ms: u64,
    log: Vec<LogEntry>,
}

/// Start the mock server and return its port. `port: None` keeps a running
/// server, or binds 8940 with an ephemeral fallback; an explicit port restarts
/// the server there and fails if it is taken. `latency_ms` delays every response.
pub async fn start(
    app: tauri::AppHandle,
    port: Option<u16>,
    latency_ms: Option<u64>,
) -> Result<u16, String> {
    if let Some(ms) = latency_ms {
        LATENCY_MS.store(ms.min(MAX_LATENCY_MS), Ordering::Relaxed);
    }
    let mut guard = control().lock().await;
    if let Some(r) = guard.as_ref() {
        if port.is_none() || port == Some(r.port) {
            return Ok(r.port);
        }
    }
    if let Some(r) = guard.take() {
        shutdown(r).await;
    }
    let listener = bind(port).await?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let task = tauri::async_runtime::spawn(serve(listener, app));
    *guard = Some(Running { port, task });
    Ok(port)
}

/// Stop the server and free its port. In-flight responses still complete.
pub async fn stop() {
    if let Some(r) = control().lock().await.take() {
        shutdown(r).await;
    }
}

pub async fn status() -> Status {
    Status {
        port: control().lock().await.as_ref().map(|r| r.port),
        latency_ms: LATENCY_MS.load(Ordering::Relaxed),
        log: LOG.lock().unwrap().iter().cloned().collect(),
    }
}

pub fn clear_log() {
    LOG.lock().unwrap().clear();
}

async fn shutdown(r: Running) {
    r.task.abort();
    // Wait for the task to drop its listener so the port is free on return.
    let _ = r.task.await;
}

async fn bind(port: Option<u16>) -> Result<TcpListener, String> {
    // Loopback only — the mock is never reachable from other machines.
    match port {
        Some(p) => TcpListener::bind(("127.0.0.1", p)).await.map_err(|e| {
            if e.kind() == std::io::ErrorKind::AddrInUse {
                format!("Port {p} is already in use")
            } else {
                format!("failed to bind mock server port {p}: {e}")
            }
        }),
        None => match TcpListener::bind(("127.0.0.1", PREFERRED_PORT)).await {
            Ok(l) => Ok(l),
            Err(_) => TcpListener::bind("127.0.0.1:0")
                .await
                .map_err(|e| format!("failed to bind mock server port: {e}")),
        },
    }
}

async fn serve(listener: TcpListener, app: tauri::AppHandle) {
    loop {
        match listener.accept().await {
            Ok((socket, _)) => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = handle_conn(socket, app).await;
                });
            }
            // Transient accept errors (e.g. fd exhaustion): back off, keep serving.
            Err(_) => tokio::time::sleep(Duration::from_millis(100)).await,
        }
    }
}

fn record(entry: LogEntry) {
    let mut log = LOG.lock().unwrap();
    if log.len() >= LOG_CAP {
        log.pop_front();
    }
    log.push_back(entry);
}

async fn handle_conn(mut socket: TcpStream, app: tauri::AppHandle) -> std::io::Result<()> {
    let started = Instant::now();
    // ponytail: single 64KB read — matching only needs the request line, which
    // arrives in the first segment for any realistic client. Switch to
    // read-until-blank-line if giant request lines ever truncate.
    let mut buf = vec![0u8; 65536];
    let n = socket.read(&mut buf).await?;
    let head = String::from_utf8_lossy(&buf[..n]);
    let mut request_line = head.lines().next().unwrap_or("").split_whitespace();
    let method = request_line.next().unwrap_or("").to_string();
    let raw_path = request_line.next().unwrap_or("/");
    let path = raw_path.split('?').next().unwrap_or("/");

    // CORS preflight so browser apps can call the mock.
    if method.eq_ignore_ascii_case("OPTIONS") {
        return write_response(
            &mut socket,
            204,
            "No Content",
            "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: *\r\nAccess-Control-Allow-Headers: *\r\n",
            b"",
        )
        .await;
    }

    let mut segments = path.trim_start_matches('/').splitn(2, '/');
    let collection_id = segments.next().unwrap_or("").to_string();
    let request_path = format!("/{}", segments.next().unwrap_or(""));

    // Scope the DB lock so the guard is dropped before any await.
    let collection = {
        let state = app.state::<AppState>();
        let db = state.db.lock().unwrap();
        let ws = active_workspace(&db);
        get_doc(&db, "api_client_collections", &ws, &collection_id)
            .ok()
            .flatten()
    };

    let latency = LATENCY_MS.load(Ordering::Relaxed);
    if latency > 0 {
        tokio::time::sleep(Duration::from_millis(latency)).await;
    }

    let items = collection
        .as_ref()
        .and_then(|c| c["items"].as_array().cloned())
        .unwrap_or_default();
    let hit = find_first_match(&items, &method, &request_path);
    let status = match (&collection, hit) {
        (Some(_), Some(ex)) => ex["response"]["status"].as_u64().unwrap_or(200) as u16,
        _ => 404,
    };
    record(LogEntry {
        at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0),
        collection_id,
        method: method.to_uppercase(),
        path: request_path.clone(),
        status,
        example: hit.and_then(|ex| ex["name"].as_str().map(String::from)),
        duration_ms: started.elapsed().as_millis() as u64,
    });

    match (collection, hit) {
        (None, _) => write_json(&mut socket, 404, r#"{"error":"Collection not found"}"#).await,
        (Some(_), Some(ex)) => write_example(&mut socket, &ex["response"]).await,
        (Some(_), None) => {
            let msg = serde_json::json!({
                "error": format!("No matching example for {} {}", method.to_uppercase(), request_path)
            });
            write_json(&mut socket, 404, &msg.to_string()).await
        }
    }
}

// ── Matcher (mirrors lib/__tests__/mock-server.test.ts) ────────────────────

/// The matching example (not just its response, so the log can name it).
fn find_first_match<'a>(items: &'a [Value], method: &str, pathname: &str) -> Option<&'a Value> {
    find_in(items, method, pathname, true).or_else(|| find_in(items, method, pathname, false))
}

fn find_in<'a>(items: &'a [Value], method: &str, pathname: &str, exact: bool) -> Option<&'a Value> {
    for item in items {
        if item["type"].as_str() == Some("folder") {
            if let Some(children) = item["items"].as_array() {
                if let Some(hit) = find_in(children, method, pathname, exact) {
                    return Some(hit);
                }
            }
            continue;
        }
        if let Some(examples) = item["examples"].as_array() {
            for ex in examples {
                if example_matches(ex, method, pathname, exact) {
                    return Some(ex);
                }
            }
        }
    }
    None
}

fn example_matches(ex: &Value, method: &str, pathname: &str, exact: bool) -> bool {
    let ex_method = ex["request"]["method"].as_str().unwrap_or("");
    if !ex_method.eq_ignore_ascii_case(method) {
        return false;
    }
    let url = ex["request"]["url"].as_str().unwrap_or("");
    // Web matcher: URL pathname, falling back to the literal string when
    // unparseable (relative URLs), empty → "/".
    let stored = match reqwest::Url::parse(url) {
        Ok(u) => u.path().to_string(),
        Err(_) if url.is_empty() => "/".to_string(),
        Err(_) => url.to_string(),
    };
    if exact {
        stored == pathname
    } else {
        param_path_matches(&stored, pathname)
    }
}

/// `/users/:id` matches `/users/42`: a `:name` segment matches any one
/// non-empty segment; every other segment must be equal.
fn param_path_matches(pattern: &str, path: &str) -> bool {
    let p: Vec<&str> = pattern.split('/').collect();
    let a: Vec<&str> = path.split('/').collect();
    p.len() == a.len()
        && p.iter()
            .zip(&a)
            .all(|(p, a)| p == a || (p.len() > 1 && p.starts_with(':') && !a.is_empty()))
}

// ── Response writing ───────────────────────────────────────────────────────

async fn write_example(socket: &mut TcpStream, response: &Value) -> std::io::Result<()> {
    let status = response["status"].as_u64().unwrap_or(200) as u16;
    let status_text = response["statusText"].as_str().unwrap_or("").to_string();
    let body: Vec<u8> = if response["isBase64"].as_bool().unwrap_or(false) {
        base64::engine::general_purpose::STANDARD
            .decode(response["body"].as_str().unwrap_or(""))
            .unwrap_or_default()
    } else {
        response["body"].as_str().unwrap_or("").as_bytes().to_vec()
    };

    let mut headers = String::new();
    let mut has_content_type = false;
    if let Some(map) = response["headers"].as_object() {
        for (k, v) in map {
            let Some(value) = v.as_str() else { continue };
            // Framing headers describe the captured upstream transfer, not ours.
            let key = k.to_lowercase();
            if ["content-length", "transfer-encoding", "connection", "content-encoding"]
                .contains(&key.as_str())
            {
                continue;
            }
            if k.contains(['\r', '\n']) || value.contains(['\r', '\n']) {
                continue;
            }
            if key == "content-type" {
                has_content_type = true;
            }
            headers.push_str(&format!("{k}: {value}\r\n"));
        }
    }
    if !has_content_type {
        if let Some(ct) = response["contentType"].as_str() {
            if !ct.is_empty() && !ct.contains(['\r', '\n']) {
                headers.push_str(&format!("Content-Type: {ct}\r\n"));
            }
        }
    }
    headers.push_str("Access-Control-Allow-Origin: *\r\n");
    write_response(socket, status, &status_text, &headers, &body).await
}

async fn write_json(socket: &mut TcpStream, status: u16, body: &str) -> std::io::Result<()> {
    write_response(
        socket,
        status,
        "",
        "Content-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\n",
        body.as_bytes(),
    )
    .await
}

async fn write_response(
    socket: &mut TcpStream,
    status: u16,
    status_text: &str,
    headers: &str,
    body: &[u8],
) -> std::io::Result<()> {
    let head = format!(
        "HTTP/1.1 {status} {status_text}\r\n{headers}Content-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    socket.write_all(head.as_bytes()).await?;
    socket.write_all(body).await?;
    socket.flush().await
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn example(method: &str, url: &str) -> Value {
        json!({
            "id": "x", "name": "ex", "capturedAt": 1,
            "request": { "method": method, "url": url, "headers": [], "body": { "type": "none", "content": "" } },
            "response": { "status": 200, "statusText": "OK", "headers": {}, "body": "{}" }
        })
    }

    fn request_with(examples: Vec<Value>) -> Value {
        json!({ "id": "r", "name": "r", "method": "GET", "url": "https://api.test/", "examples": examples })
    }

    #[test]
    fn matches_method_and_pathname_ignoring_host() {
        let items = vec![request_with(vec![example("POST", "https://OTHER-HOST.test/v1/login")])];
        assert!(find_first_match(&items, "post", "/v1/login").is_some());
        assert!(find_first_match(&items, "GET", "/v1/login").is_none());
        assert!(find_first_match(&items, "POST", "/nope").is_none());
    }

    #[test]
    fn walks_nested_folders() {
        let inner = request_with(vec![example("GET", "https://api.test/deep")]);
        let items = vec![json!({ "id": "f1", "name": "f", "type": "folder", "items": [inner] })];
        assert!(find_first_match(&items, "GET", "/deep").is_some());
    }

    #[test]
    fn first_hit_wins() {
        let mut a = example("GET", "https://api.test/dup");
        a["response"]["body"] = json!("a");
        let mut b = example("GET", "https://api.test/dup");
        b["response"]["body"] = json!("b");
        let items = vec![request_with(vec![a, b])];
        let hit = find_first_match(&items, "GET", "/dup").unwrap();
        assert_eq!(hit["response"]["body"], "a");
    }

    #[test]
    fn unparseable_url_falls_back_to_literal() {
        let items = vec![request_with(vec![example("GET", "/relative-url")])];
        assert!(find_first_match(&items, "GET", "/relative-url").is_some());
    }

    #[test]
    fn bare_host_url_matches_root() {
        let items = vec![request_with(vec![example("GET", "https://api.test")])];
        assert!(find_first_match(&items, "GET", "/").is_some());
    }

    #[test]
    fn param_segments_match_one_segment() {
        let items = vec![request_with(vec![example("GET", "https://api.test/users/:id/posts")])];
        assert!(find_first_match(&items, "GET", "/users/42/posts").is_some());
        assert!(find_first_match(&items, "GET", "/users/42").is_none());
        assert!(find_first_match(&items, "GET", "/users//posts").is_none());
        assert!(find_first_match(&items, "GET", "/users/1/2/posts").is_none());
    }

    #[test]
    fn exact_path_beats_earlier_param_path() {
        let mut param = example("GET", "https://api.test/users/:id");
        param["name"] = json!("param");
        let mut exact = example("GET", "https://api.test/users/me");
        exact["name"] = json!("exact");
        let items = vec![request_with(vec![param, exact])];
        assert_eq!(find_first_match(&items, "GET", "/users/me").unwrap()["name"], "exact");
        assert_eq!(find_first_match(&items, "GET", "/users/7").unwrap()["name"], "param");
    }

    #[tokio::test]
    async fn bind_reports_port_in_use_and_frees_port_after_drop() {
        let held = bind(Some(0)).await.unwrap();
        let port = held.local_addr().unwrap().port();
        let err = bind(Some(port)).await.unwrap_err();
        assert_eq!(err, format!("Port {port} is already in use"));
        drop(held);
        assert!(bind(Some(port)).await.is_ok());
    }

    #[tokio::test]
    async fn shutdown_frees_the_port_for_a_restart() {
        let listener = bind(Some(0)).await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let task = tauri::async_runtime::spawn(async move {
            let _l = listener;
            std::future::pending::<()>().await
        });
        assert!(bind(Some(port)).await.is_err());
        shutdown(Running { port, task }).await;
        let rebound = bind(Some(port)).await;
        assert!(rebound.is_ok(), "{:?}", rebound.err());
    }
}
