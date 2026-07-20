//! Local mock server for the api-client.
//!
//! Serves a collection's saved response examples over a loopback HTTP
//! listener so external tools (curl, the user's own app) can call the mock:
//!
//!   http://127.0.0.1:<port>/<collectionId>/<path...>
//!
//! Matching mirrors the web matcher (`lib/__tests__/mock-server.test.ts`):
//! HTTP method (case-insensitive) + exact pathname of the example's stored
//! URL; tree order, first match wins. The collection is re-read from the
//! local DB on every request, so edits to examples are live immediately.
//! Started lazily by the `mock_server_start` command; runs until app exit.

use std::sync::{Mutex, OnceLock};

use base64::Engine;
use serde_json::Value;
use tauri::Manager;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

use crate::router::entries::{active_workspace, get_doc};
use crate::state::AppState;

/// Stable port so copied mock URLs survive app restarts; falls back to an
/// ephemeral port if something else holds it.
const PREFERRED_PORT: u16 = 8940;

static RUNNING: OnceLock<Mutex<Option<u16>>> = OnceLock::new();

fn running() -> &'static Mutex<Option<u16>> {
    RUNNING.get_or_init(|| Mutex::new(None))
}

/// Start the mock server (idempotent) and return its port.
pub async fn start(app: tauri::AppHandle) -> Result<u16, String> {
    if let Some(port) = *running().lock().unwrap() {
        return Ok(port);
    }
    let listener = match TcpListener::bind(("127.0.0.1", PREFERRED_PORT)).await {
        Ok(l) => l,
        Err(_) => TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("failed to bind mock server port: {e}"))?,
    };
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    *running().lock().unwrap() = Some(port);

    tauri::async_runtime::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((socket, _)) => {
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        let _ = handle_conn(socket, app).await;
                    });
                }
                // Transient accept errors (e.g. fd exhaustion): back off, keep serving.
                Err(_) => tokio::time::sleep(std::time::Duration::from_millis(100)).await,
            }
        }
    });
    Ok(port)
}

async fn handle_conn(mut socket: TcpStream, app: tauri::AppHandle) -> std::io::Result<()> {
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

    let Some(collection) = collection else {
        return write_json(&mut socket, 404, r#"{"error":"Collection not found"}"#).await;
    };
    let items = collection["items"].as_array().cloned().unwrap_or_default();
    match find_first_match(&items, &method, &request_path) {
        Some(response) => write_example(&mut socket, response).await,
        None => {
            let msg = format!(
                r#"{{"error":"No matching example for {} {}"}}"#,
                method.to_uppercase(),
                request_path
            );
            write_json(&mut socket, 404, &msg).await
        }
    }
}

// ── Matcher (mirrors lib/__tests__/mock-server.test.ts) ────────────────────

fn find_first_match<'a>(items: &'a [Value], method: &str, pathname: &str) -> Option<&'a Value> {
    for item in items {
        if item["type"].as_str() == Some("folder") {
            if let Some(children) = item["items"].as_array() {
                if let Some(hit) = find_first_match(children, method, pathname) {
                    return Some(hit);
                }
            }
            continue;
        }
        if let Some(examples) = item["examples"].as_array() {
            for ex in examples {
                if example_matches(ex, method, pathname) {
                    return Some(&ex["response"]);
                }
            }
        }
    }
    None
}

fn example_matches(ex: &Value, method: &str, pathname: &str) -> bool {
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
    stored == pathname
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
        assert_eq!(hit["body"], "a");
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
}
