//! api-client HTTP engine: mirrors the web `/api/proxy` envelope
//! (`{status, statusText, headers, setCookies, redirectChain, body, isBase64,
//! time, size, error?}`) and the `/api/proxy-stream` SSE relay.
//!
//! Rust-side HTTP has no CORS. Unlike the web proxy, localhost/private
//! targets are allowed (it's the user's own machine); only cloud metadata
//! endpoints stay blocked. The system proxy is bypassed for loopback/private
//! targets (browsers do this; reqwest doesn't) so a dev's `HTTP_PROXY` env
//! doesn't break `127.0.0.1` requests.

use base64::Engine;
use dashmap::DashMap;
use futures_util::StreamExt;
use serde_json::{json, Map, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;
use tauri::ipc::Channel;

const MAX_REDIRECTS: usize = 5;
const DEFAULT_TIMEOUT_MS: u64 = 30_000;
const MAX_TIMEOUT_MS: u64 = 600_000;

const METADATA_HOSTS: &[&str] = &[
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.google",
    "100.100.100.200",
];

static STREAMS: OnceLock<DashMap<u64, tokio::sync::watch::Sender<bool>>> = OnceLock::new();
static STREAM_ID: AtomicU64 = AtomicU64::new(1);

fn streams() -> &'static DashMap<u64, tokio::sync::watch::Sender<bool>> {
    STREAMS.get_or_init(DashMap::new)
}

fn envelope_error(status: u16, status_text: &str, msg: &str) -> Value {
    json!({
        "status": status, "statusText": status_text, "headers": {},
        "body": msg, "time": 0, "size": 0, "error": msg,
    })
}

pub(crate) fn assert_hop_allowed(url: &reqwest::Url) -> Result<(), String> {
    match url.scheme() {
        "http" | "https" => {}
        s => return Err(format!("Blocked scheme: {s}:")),
    }
    let host = url.host_str().unwrap_or("").to_lowercase();
    if METADATA_HOSTS.contains(&host.as_str()) {
        return Err(format!("Blocked target: {host}"));
    }
    Ok(())
}

/// reqwest's `Display` only prints the top-level message ("error sending request
/// for url (…)") and swallows the actual cause (connection refused, proxy failure,
/// DNS, TLS). Walk the source chain so the user sees why it failed.
fn full_error_chain(e: &dyn std::error::Error) -> String {
    let mut msg = e.to_string();
    let mut src = e.source();
    while let Some(inner) = src {
        msg.push_str(": ");
        msg.push_str(&inner.to_string());
        src = inner.source();
    }
    msg
}

/// Browsers bypass the system proxy for loopback/private hosts; reqwest does not.
/// A dev with `HTTP_PROXY`/`ALL_PROXY` set would otherwise route `127.0.0.1:8000`
/// through the proxy and fail. Bypass the proxy for local targets, keep it for the rest.
fn is_local_target(url: &reqwest::Url) -> bool {
    let host = url.host_str().unwrap_or("").to_lowercase();
    if host == "localhost" || host.ends_with(".localhost") {
        return true;
    }
    // ponytail: string parse over url::Host; bracketed IPv6 (`[::1]`) won't parse
    // here but `localhost`/IPv4 loopback (the common dev cases) are covered.
    match host.parse::<std::net::IpAddr>() {
        Ok(std::net::IpAddr::V4(v4)) => v4.is_loopback() || v4.is_private() || v4.is_link_local(),
        Ok(std::net::IpAddr::V6(v6)) => v6.is_loopback(),
        Err(_) => false,
    }
}

fn is_textual_content_type(ct: &str) -> bool {
    let l = ct.to_lowercase();
    l.starts_with("text/")
        || ["json", "xml", "javascript", "ecmascript", "html", "yaml", "csv", "urlencoded", "graphql", "x-ndjson"]
            .iter()
            .any(|t| l.contains(t))
}

fn plain_client(bypass_proxy: bool) -> Result<reqwest::Client, String> {
    let mut builder = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("mydevtools-desktop");
    if bypass_proxy {
        builder = builder.no_proxy();
    }
    builder.build().map_err(|e| e.to_string())
}

fn build_body(body: &Value) -> Result<Option<BodyKind>, String> {
    if body.is_null() {
        return Ok(None);
    }
    if let Some(s) = body.as_str() {
        return Ok(Some(BodyKind::Text(s.to_string())));
    }
    if body["mode"].as_str() == Some("form-data") {
        return Ok(Some(BodyKind::Multipart(body["entries"].as_array().cloned().unwrap_or_default())));
    }
    // Raw binary body (e.g. S3 direct uploads): {mode: "base64", data: "<b64>"}.
    if body["mode"].as_str() == Some("base64") {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(body["data"].as_str().unwrap_or(""))
            .map_err(|e| e.to_string())?;
        return Ok(Some(BodyKind::Bytes(bytes)));
    }
    Ok(Some(BodyKind::Text(body.to_string())))
}

enum BodyKind {
    Text(String),
    Bytes(Vec<u8>),
    Multipart(Vec<Value>),
}

impl BodyKind {
    fn apply(&self, mut req: reqwest::RequestBuilder) -> Result<reqwest::RequestBuilder, String> {
        match self {
            BodyKind::Text(s) => Ok(req.body(s.clone())),
            BodyKind::Bytes(b) => Ok(req.body(b.clone())),
            BodyKind::Multipart(entries) => {
                let mut form = reqwest::multipart::Form::new();
                for entry in entries {
                    let Some(key) = entry["key"].as_str().filter(|k| !k.is_empty()) else {
                        continue;
                    };
                    if entry["type"].as_str() == Some("file") {
                        let Some(b64) = entry["fileContentBase64"].as_str() else { continue };
                        let bytes = base64::engine::general_purpose::STANDARD
                            .decode(b64)
                            .map_err(|e| e.to_string())?;
                        let part = reqwest::multipart::Part::bytes(bytes)
                            .file_name(entry["fileName"].as_str().unwrap_or("upload.bin").to_string())
                            .mime_str(entry["fileType"].as_str().unwrap_or("application/octet-stream"))
                            .map_err(|e| e.to_string())?;
                        form = form.part(key.to_string(), part);
                    } else {
                        form = form.text(key.to_string(), entry["value"].as_str().unwrap_or("").to_string());
                    }
                }
                req = req.multipart(form);
                Ok(req)
            }
        }
    }
}

struct Walked {
    response: reqwest::Response,
    chain: Vec<Value>,
}

async fn fetch_following_redirects(
    client: &reqwest::Client,
    initial_url: &str,
    method: &str,
    headers: &Map<String, Value>,
    body: &Option<BodyKind>,
    timeout: std::time::Duration,
    is_multipart: bool,
) -> Result<Walked, String> {
    let mut current_url = initial_url.to_string();
    let mut current_method = method.to_uppercase();
    let mut drop_body = false;
    let mut chain: Vec<Value> = Vec::new();

    for _hop in 0..=MAX_REDIRECTS {
        let url = reqwest::Url::parse(&current_url).map_err(|_| "Invalid URL format".to_string())?;
        assert_hop_allowed(&url)?;

        let m = reqwest::Method::from_bytes(current_method.as_bytes()).map_err(|e| e.to_string())?;
        let mut req = client.request(m, url).timeout(timeout);
        for (k, v) in headers {
            // Let reqwest set the multipart boundary itself.
            if is_multipart && k.to_lowercase() == "content-type" {
                continue;
            }
            if let Some(s) = v.as_str() {
                req = req.header(k, s);
            }
        }
        let use_body = !drop_body && current_method != "GET" && current_method != "HEAD";
        if use_body {
            if let Some(b) = body {
                req = b.apply(req)?;
            }
        }

        let response = req.send().await.map_err(|e| full_error_chain(&e))?;
        let status = response.status().as_u16();
        let is_redirect = (300..400).contains(&status) && status != 304;
        if !is_redirect {
            return Ok(Walked { response, chain });
        }
        let Some(location) = response
            .headers()
            .get("location")
            .and_then(|l| l.to_str().ok())
            .map(str::to_string)
        else {
            return Ok(Walked { response, chain });
        };
        chain.push(json!({ "url": current_url, "status": status }));
        let next = reqwest::Url::parse(&current_url)
            .and_then(|base| base.join(&location))
            .map_err(|e| e.to_string())?;
        if status == 303 || ((status == 301 || status == 302) && current_method != "GET" && current_method != "HEAD") {
            current_method = "GET".into();
            drop_body = true;
        }
        current_url = next.to_string();
    }
    Err(format!("Too many redirects (>{MAX_REDIRECTS})"))
}

/// Non-streaming request. Returns the `/api/proxy` envelope as JSON.
pub async fn http_request(input: Value) -> Value {
    let url = input["url"].as_str().unwrap_or("");
    if url.is_empty() {
        return envelope_error(400, "Bad Request", "URL is required");
    }
    let parsed = match reqwest::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return envelope_error(400, "Bad Request", "Invalid URL format"),
    };
    if let Err(e) = assert_hop_allowed(&parsed) {
        return envelope_error(403, "Forbidden", &e);
    }
    let method = input["method"].as_str().unwrap_or("GET");
    let headers = input["headers"].as_object().cloned().unwrap_or_default();
    let timeout_ms = input["timeoutMs"].as_u64().filter(|t| *t > 0).unwrap_or(DEFAULT_TIMEOUT_MS).min(MAX_TIMEOUT_MS);
    let body = match build_body(&input["body"]) {
        Ok(b) => b,
        Err(e) => return envelope_error(0, "Error", &e),
    };
    let is_multipart = matches!(body, Some(BodyKind::Multipart(_)));

    let client = match plain_client(is_local_target(&parsed)) {
        Ok(c) => c,
        Err(e) => return envelope_error(0, "Error", &e),
    };
    let started = std::time::Instant::now();
    let walked = match fetch_following_redirects(
        &client,
        url,
        method,
        &headers,
        &body,
        std::time::Duration::from_millis(timeout_ms),
        is_multipart,
    )
    .await
    {
        Ok(w) => w,
        Err(e) => {
            let status = if e.starts_with("Blocked") { 403 } else { 0 };
            return envelope_error(status, if status == 403 { "Forbidden" } else { "Error" }, &e);
        }
    };
    let time = started.elapsed().as_millis() as u64;

    let response = walked.response;
    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("").to_string();
    let mut resp_headers = Map::new();
    let mut set_cookies: Vec<String> = Vec::new();
    for (k, v) in response.headers() {
        let val = String::from_utf8_lossy(v.as_bytes()).to_string();
        if k.as_str().eq_ignore_ascii_case("set-cookie") {
            set_cookies.push(val.clone());
        }
        resp_headers.insert(k.as_str().to_string(), json!(val));
    }
    let declared_len = response.content_length().unwrap_or(0);
    let content_type = resp_headers
        .get("content-type")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    let bytes = match response.bytes().await {
        Ok(b) => b,
        Err(e) => return envelope_error(0, "Error", &e.to_string()),
    };
    let (body_str, is_base64) = if is_textual_content_type(&content_type) {
        (String::from_utf8_lossy(&bytes).to_string(), false)
    } else {
        (base64::engine::general_purpose::STANDARD.encode(&bytes), true)
    };
    let size = if declared_len > 0 { declared_len } else { bytes.len() as u64 };

    json!({
        "status": status,
        "statusText": status_text,
        "headers": resp_headers,
        "setCookies": set_cookies,
        "redirectChain": walked.chain,
        "body": body_str,
        "isBase64": is_base64,
        "time": time,
        "size": size,
    })
}

/// Streaming request (SSE relay). Emits events over the channel:
/// `{kind:"meta", status, statusText, headers}` → `{kind:"chunk", data}`* →
/// `{kind:"end"}` | `{kind:"error", message}`. Returns a stream id usable
/// with `http_request_stream_cancel`.
pub async fn http_request_stream(input: Value, channel: Channel<Value>) -> Result<u64, String> {
    let url = input["url"].as_str().unwrap_or("").to_string();
    if url.is_empty() {
        return Err("URL is required".into());
    }
    let parsed = reqwest::Url::parse(&url).map_err(|_| "Invalid URL format".to_string())?;
    assert_hop_allowed(&parsed)?;
    let bypass_proxy = is_local_target(&parsed);
    let method = input["method"].as_str().unwrap_or("GET").to_string();
    let headers = input["headers"].as_object().cloned().unwrap_or_default();
    let body = input["body"].as_str().map(str::to_string);

    let id = STREAM_ID.fetch_add(1, Ordering::Relaxed);
    let (cancel_tx, mut cancel_rx) = tokio::sync::watch::channel(false);
    streams().insert(id, cancel_tx);

    tauri::async_runtime::spawn(async move {
        let emit = |v: Value| {
            let _ = channel.send(v);
        };
        let client = match plain_client(bypass_proxy) {
            Ok(c) => c,
            Err(e) => {
                emit(json!({ "kind": "error", "message": e }));
                return;
            }
        };
        let m = match reqwest::Method::from_bytes(method.as_bytes()) {
            Ok(m) => m,
            Err(e) => {
                emit(json!({ "kind": "error", "message": e.to_string() }));
                return;
            }
        };
        let mut req = client.request(m, &url);
        for (k, v) in &headers {
            if let Some(s) = v.as_str() {
                req = req.header(k, s);
            }
        }
        if let Some(b) = body {
            req = req.body(b);
        }
        let response = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                emit(json!({ "kind": "error", "message": full_error_chain(&e) }));
                streams().remove(&id);
                return;
            }
        };
        let mut resp_headers = Map::new();
        for (k, v) in response.headers() {
            resp_headers.insert(k.as_str().to_string(), json!(String::from_utf8_lossy(v.as_bytes())));
        }
        emit(json!({
            "kind": "meta",
            "status": response.status().as_u16(),
            "statusText": response.status().canonical_reason().unwrap_or(""),
            "headers": resp_headers,
        }));
        let mut stream = response.bytes_stream();
        loop {
            tokio::select! {
                _ = cancel_rx.changed() => break,
                chunk = stream.next() => match chunk {
                    Some(Ok(bytes)) => emit(json!({ "kind": "chunk", "data": String::from_utf8_lossy(&bytes) })),
                    Some(Err(e)) => {
                        emit(json!({ "kind": "error", "message": e.to_string() }));
                        break;
                    }
                    None => break,
                },
            }
        }
        emit(json!({ "kind": "end" }));
        streams().remove(&id);
    });

    Ok(id)
}

pub fn cancel_stream(id: u64) {
    if let Some((_, tx)) = streams().remove(&id) {
        let _ = tx.send(true);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_target_detection() {
        let local = |u: &str| is_local_target(&reqwest::Url::parse(u).unwrap());
        assert!(local("http://127.0.0.1:8000/health"));
        assert!(local("http://localhost:3000"));
        assert!(local("http://api.localhost/v1"));
        assert!(local("http://10.0.0.5/x"));
        assert!(local("http://192.168.1.10:8080"));
        assert!(!local("https://api.example.com/v1"));
        assert!(!local("http://8.8.8.8/x"));
    }

    #[test]
    fn textual_content_type_detection() {
        assert!(is_textual_content_type("application/json; charset=utf-8"));
        assert!(is_textual_content_type("text/html"));
        assert!(!is_textual_content_type("application/octet-stream"));
        assert!(!is_textual_content_type(""));
    }

    #[tokio::test]
    #[ignore] // network
    async fn httpbin_get_and_redirect() {
        let r = http_request(json!({
            "url": "https://httpbin.org/get?x=1",
            "method": "GET",
            "headers": { "X-Test": "yes" },
        }))
        .await;
        assert_eq!(r["status"], 200, "{r}");
        assert_eq!(r["isBase64"], false);
        let body: Value = serde_json::from_str(r["body"].as_str().unwrap()).unwrap();
        assert_eq!(body["args"]["x"], "1");
        assert_eq!(body["headers"]["X-Test"], "yes");

        // POST json
        let r = http_request(json!({
            "url": "https://httpbin.org/post",
            "method": "POST",
            "headers": { "Content-Type": "application/json" },
            "body": "{\"a\":1}",
        }))
        .await;
        assert_eq!(r["status"], 200, "{r}");

        // redirect chain recorded; 302 flips POST→GET
        let r = http_request(json!({
            "url": "https://httpbin.org/redirect-to?url=%2Fget&status_code=302",
            "method": "POST",
            "headers": {},
            "body": "x",
        }))
        .await;
        assert_eq!(r["status"], 200, "{r}");
        assert_eq!(r["redirectChain"].as_array().unwrap().len(), 1);

        // binary → base64
        let r = http_request(json!({
            "url": "https://httpbin.org/bytes/16",
            "method": "GET",
            "headers": {},
        }))
        .await;
        assert_eq!(r["isBase64"], true);

        // metadata host blocked
        let r = http_request(json!({ "url": "http://169.254.169.254/latest", "method": "GET" })).await;
        assert_eq!(r["status"], 403);
    }
}
