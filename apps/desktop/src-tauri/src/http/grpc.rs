//! Native gRPC (HTTP/2) transport for the api-client.
//!
//! The webview does all protobuf work — requests arrive as base64-encoded,
//! already 5-byte-framed gRPC messages (see `lib/grpc-web.ts` sendNativeGrpc).
//! This is a raw h2 transport whose one job reqwest can't do: surface HTTP/2
//! trailers, where `grpc-status`/`grpc-message` live. ALPN "h2" TLS for
//! https targets; prior-knowledge (h2c) for http targets. `proxy_grpc`
//! reduces unary / server-streaming / staged client-streaming to "send N framed
//! messages, return all response DATA bytes + trailers"; `stream_*` keeps a call
//! open so client and server messages interleave (bidi).

use base64::Engine;
use dashmap::DashMap;
use serde_json::{json, Map, Value};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};
use tokio::io::{AsyncRead, AsyncWrite};

const DEFAULT_TIMEOUT_MS: u64 = 30_000;
const MAX_TIMEOUT_MS: u64 = 600_000;

trait AsyncRw: AsyncRead + AsyncWrite + Unpin + Send {}
impl<T: AsyncRead + AsyncWrite + Unpin + Send> AsyncRw for T {}

fn b64() -> base64::engine::general_purpose::GeneralPurpose {
    base64::engine::general_purpose::STANDARD
}

fn error_envelope(msg: &str) -> Value {
    json!({ "status": 502, "body": "", "headers": {}, "trailers": {}, "error": msg })
}

/// Entry point: mirrors the web `/api/proxy-grpc` JSON envelope. Errors are
/// returned in-envelope (`{error}`), never thrown — the client treats them as
/// soft failures.
pub async fn proxy_grpc(input: Value) -> Value {
    let started = Instant::now();
    let timeout_ms = input["timeoutMs"]
        .as_u64()
        .unwrap_or(DEFAULT_TIMEOUT_MS)
        .clamp(1, MAX_TIMEOUT_MS);
    match tokio::time::timeout(Duration::from_millis(timeout_ms), run(&input)).await {
        Ok(Ok(mut envelope)) => {
            envelope["timeMs"] = json!(started.elapsed().as_millis() as u64);
            envelope
        }
        Ok(Err(e)) => error_envelope(&e),
        Err(_) => error_envelope(&format!("gRPC request timed out after {timeout_ms}ms")),
    }
}

async fn run(input: &Value) -> Result<Value, String> {
    // Request frames — already 5-byte framed by the webview.
    let mut frames: Vec<Vec<u8>> = Vec::new();
    if let Some(list) = input["bodyFrames"].as_array() {
        for f in list {
            frames.push(
                b64().decode(f.as_str().unwrap_or(""))
                    .map_err(|e| format!("bad frame base64: {e}"))?,
            );
        }
    } else if let Some(body) = input["body"].as_str() {
        frames.push(b64().decode(body).map_err(|e| format!("bad body base64: {e}"))?);
    }
    if frames.is_empty() {
        frames.push(Vec::new());
    }
    let (client, request) = open(input).await?;
    send_and_collect(client, request, frames).await
}

/// Connect (TLS + ALPN h2 for https, prior-knowledge h2c for http), handshake,
/// and build the POST request carrying the caller's metadata. Shared by the
/// one-shot call and live streaming sessions.
async fn open(input: &Value) -> Result<(h2::client::SendRequest<bytes::Bytes>, http::Request<()>), String> {
    let url = input["url"].as_str().ok_or("missing url")?;
    let parsed = reqwest::Url::parse(url).map_err(|e| format!("invalid url: {e}"))?;
    crate::http::proxy::assert_hop_allowed(&parsed)?;
    let https = parsed.scheme() == "https";
    let host = parsed.host_str().ok_or("url has no host")?.to_string();
    let port = parsed.port().unwrap_or(if https { 443 } else { 80 });

    let tcp = tokio::net::TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| format!("connect to {host}:{port} failed: {e}"))?;
    let io: Box<dyn AsyncRw> = if https {
        let mut builder = native_tls::TlsConnector::builder();
        builder.request_alpns(&["h2"]);
        // Client certificate + extra CAs from Preferences / the collection.
        // ponytail: proxies don't apply here — this is a raw TCP connect.
        crate::http::net::apply_native_tls(&mut builder, &crate::http::net::NetConfig::from_input(input), &parsed)?;
        let connector = builder.build().map_err(|e| format!("TLS setup failed: {e}"))?;
        let connector = tokio_native_tls::TlsConnector::from(connector);
        Box::new(
            connector
                .connect(&host, tcp)
                .await
                .map_err(|e| format!("TLS handshake failed: {e}"))?,
        )
    } else {
        Box::new(tcp)
    };

    let (client, connection) = h2::client::handshake(io)
        .await
        .map_err(|e| format!("HTTP/2 handshake failed (server may not speak h2): {e}"))?;
    tokio::spawn(async move {
        let _ = connection.await;
    });
    let client = client.ready().await.map_err(|e| e.to_string())?;

    let mut builder = http::Request::builder()
        .method("POST")
        .uri(url)
        .header("content-type", "application/grpc")
        .header("te", "trailers")
        .header("user-agent", "mydevtools-desktop-grpc");
    if let Some(headers) = input["headers"].as_object() {
        for (k, v) in headers {
            let key = k.to_lowercase();
            // Connection-specific headers are forbidden in HTTP/2.
            if ["host", "connection", "content-length", "transfer-encoding", "te", "keep-alive", "upgrade"]
                .contains(&key.as_str())
            {
                continue;
            }
            if let Some(value) = v.as_str() {
                builder = builder.header(k.as_str(), value);
            }
        }
    }
    let request = builder.body(()).map_err(|e| format!("bad request: {e}"))?;
    Ok((client, request))
}

async fn send_and_collect(
    mut client: h2::client::SendRequest<bytes::Bytes>,
    request: http::Request<()>,
    frames: Vec<Vec<u8>>,
) -> Result<Value, String> {
    let (response_fut, mut send_stream) =
        client.send_request(request, false).map_err(|e| e.to_string())?;
    let last = frames.len() - 1;
    for (i, frame) in frames.into_iter().enumerate() {
        send_frame(&mut send_stream, frame, i == last).await?;
    }

    let mut body_bytes: Vec<u8> = Vec::new();
    let mut envelope = read_response(response_fut, |chunk| body_bytes.extend_from_slice(chunk)).await?;
    envelope["body"] = json!(b64().encode(&body_bytes));
    envelope["sizeBytes"] = json!(body_bytes.len());
    Ok(envelope)
}

/// Await the response, hand every DATA chunk to `on_data`, and return
/// `{status, headers, trailers, grpcStatus?, grpcMessage?}`.
async fn read_response(
    response_fut: h2::client::ResponseFuture,
    mut on_data: impl FnMut(&[u8]),
) -> Result<Value, String> {
    let response = response_fut
        .await
        .map_err(|e| format!("gRPC request failed: {e}"))?;
    let status = response.status().as_u16();
    let headers_map = headers_json(response.headers());

    let mut recv = response.into_body();
    while let Some(chunk) = std::future::poll_fn(|cx| recv.poll_data(cx)).await {
        let chunk = chunk.map_err(|e| format!("stream error: {e}"))?;
        let _ = recv.flow_control().release_capacity(chunk.len());
        on_data(&chunk);
    }
    let trailers_map = match std::future::poll_fn(|cx| recv.poll_trailers(cx)).await {
        Ok(Some(trailers)) => headers_json(&trailers),
        _ => Map::new(),
    };

    // grpc-status normally arrives in trailers; trailers-only responses put it
    // straight on the headers.
    let pick = |key: &str| -> Option<String> {
        trailers_map
            .get(key)
            .or_else(|| headers_map.get(key))
            .and_then(Value::as_str)
            .map(String::from)
    };
    let grpc_status = pick("grpc-status").and_then(|s| s.parse::<i64>().ok());
    let grpc_message = pick("grpc-message");

    let mut envelope = json!({
        "status": status,
        "headers": headers_map,
        "trailers": trailers_map,
    });
    if let Some(s) = grpc_status {
        envelope["grpcStatus"] = json!(s);
    }
    if let Some(m) = grpc_message {
        envelope["grpcMessage"] = json!(m);
    }
    Ok(envelope)
}

fn headers_json(headers: &http::HeaderMap) -> Map<String, Value> {
    headers
        .iter()
        .map(|(k, v)| (k.to_string(), json!(v.to_str().unwrap_or(""))))
        .collect()
}

// ── Live calls (client-streaming / bidi) ─────────────────────────────────
//
// The webview opens a call, then sends messages one at a time while server
// messages stream back — they interleave, unlike `proxy_grpc` which sends
// everything and then reads. Messages arrive already 5-byte framed; server
// DATA goes back raw (base64) and the webview reassembles frames.

enum Cmd {
    Send(Vec<u8>),
    End,
}

struct Session {
    cmds: tokio::sync::mpsc::UnboundedSender<Cmd>,
    cancel: tokio::sync::watch::Sender<bool>,
}

static SESSIONS: OnceLock<DashMap<u64, Session>> = OnceLock::new();
static SESSION_ID: AtomicU64 = AtomicU64::new(1);

fn sessions() -> &'static DashMap<u64, Session> {
    SESSIONS.get_or_init(DashMap::new)
}

pub type Emit = Arc<dyn Fn(Value) + Send + Sync>;

/// Open a live call. Emits `{kind:"data", data}`* (base64 DATA bytes), then
/// exactly one of `{kind:"end", status, headers, trailers, grpcStatus?,
/// grpcMessage?, cancelled?}` or `{kind:"error", message}`. Returns the call id
/// for `stream_send` / `stream_end` / `stream_cancel`.
pub async fn stream_start(input: Value, emit: Emit) -> Result<u64, String> {
    let (mut client, request) = tokio::time::timeout(Duration::from_millis(DEFAULT_TIMEOUT_MS), open(&input))
        .await
        .map_err(|_| format!("gRPC connect timed out after {DEFAULT_TIMEOUT_MS}ms"))??;
    let (response_fut, mut send_stream) =
        client.send_request(request, false).map_err(|e| e.to_string())?;

    let id = SESSION_ID.fetch_add(1, Ordering::Relaxed);
    let (cmd_tx, mut cmd_rx) = tokio::sync::mpsc::unbounded_channel();
    let (cancel_tx, cancel_rx) = tokio::sync::watch::channel(false);
    sessions().insert(id, Session { cmds: cmd_tx, cancel: cancel_tx });

    // Writer: user messages out until End, cancel, or the call finishing.
    let mut write_cancel = cancel_rx.clone();
    let write_emit = emit.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                biased;
                _ = write_cancel.changed() => {
                    send_stream.send_reset(h2::Reason::CANCEL);
                    break;
                }
                cmd = cmd_rx.recv() => match cmd {
                    Some(Cmd::Send(frame)) => {
                        if let Err(e) = send_frame(&mut send_stream, frame, false).await {
                            write_emit(json!({ "kind": "error", "message": e }));
                            break;
                        }
                    }
                    Some(Cmd::End) | None => {
                        let _ = send_frame(&mut send_stream, Vec::new(), true).await;
                        break;
                    }
                },
            }
        }
    });

    // Reader: server messages in, then the final status.
    let mut read_cancel = cancel_rx;
    tokio::spawn(async move {
        let data_emit = emit.clone();
        let on_data = move |chunk: &[u8]| data_emit(json!({ "kind": "data", "data": b64().encode(chunk) }));
        let cancelled = json!({ "kind": "end", "cancelled": true, "headers": {}, "trailers": {} });
        let event = tokio::select! {
            biased;
            _ = read_cancel.changed() => cancelled,
            r = read_response(response_fut, on_data) => match r {
                Ok(mut end) => {
                    end["kind"] = json!("end");
                    end
                }
                // The writer's RST_STREAM can surface here before the flag is seen.
                Err(_) if *read_cancel.borrow() => cancelled,
                Err(e) => json!({ "kind": "error", "message": e }),
            },
        };
        sessions().remove(&id);
        emit(event);
    });

    Ok(id)
}

fn session_cmd(id: u64, cmd: Cmd) -> Result<(), String> {
    sessions()
        .get(&id)
        .ok_or("gRPC stream is closed")?
        .cmds
        .send(cmd)
        .map_err(|_| "gRPC stream is closed".to_string())
}

/// Queue one already-framed message (base64) on a live call.
pub fn stream_send(id: u64, frame: &str) -> Result<(), String> {
    let bytes = b64().decode(frame).map_err(|e| format!("bad frame base64: {e}"))?;
    session_cmd(id, Cmd::Send(bytes))
}

/// Half-close: no more client messages; server messages keep arriving.
pub fn stream_end(id: u64) -> Result<(), String> {
    session_cmd(id, Cmd::End)
}

/// Abort the call (RST_STREAM CANCEL). No-op if it already finished.
pub fn stream_cancel(id: u64) {
    if let Some(s) = sessions().get(&id) {
        let _ = s.cancel.send(true);
    }
}

/// Send one framed message respecting h2 flow control (chunked to the window).
async fn send_frame(
    stream: &mut h2::SendStream<bytes::Bytes>,
    data: Vec<u8>,
    end_stream: bool,
) -> Result<(), String> {
    let mut buf = bytes::Bytes::from(data);
    if buf.is_empty() {
        return stream.send_data(buf, end_stream).map_err(|e| e.to_string());
    }
    while !buf.is_empty() {
        stream.reserve_capacity(buf.len());
        let available = std::future::poll_fn(|cx| stream.poll_capacity(cx))
            .await
            .ok_or("stream closed while sending request body")?
            .map_err(|e| e.to_string())?;
        if available == 0 {
            continue;
        }
        let chunk = buf.split_to(available.min(buf.len()));
        let is_last = end_stream && buf.is_empty();
        stream
            .send_data(chunk, is_last)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::{HeaderMap, HeaderValue, Response, StatusCode};
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn rejects_missing_and_invalid_urls() {
        let e = proxy_grpc(json!({})).await;
        assert_eq!(e["error"], "missing url");
        let e = proxy_grpc(json!({ "url": "ftp://x/Svc/M" })).await;
        assert!(e["error"].as_str().unwrap().contains("Blocked scheme"));
    }

    #[tokio::test]
    async fn blocks_metadata_hosts() {
        let e = proxy_grpc(json!({ "url": "http://169.254.169.254/Svc/M" })).await;
        assert!(e["error"].as_str().unwrap().contains("Blocked target"));
    }

    /// End-to-end over h2c: loopback h2 server echoes one DATA frame and
    /// grpc-status trailers; client envelope must carry both.
    #[tokio::test]
    async fn h2c_roundtrip_with_trailers() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();

        tokio::spawn(async move {
            let (socket, _) = listener.accept().await.unwrap();
            let mut conn = h2::server::handshake(socket).await.unwrap();
            if let Some(result) = conn.accept().await {
                let (request, mut respond) = result.unwrap();
                // The Connection must keep being polled to drive stream I/O.
                tokio::spawn(async move { while conn.accept().await.is_some() {} });
                assert_eq!(request.uri().path(), "/pkg.Svc/Method");
                let mut body = request.into_body();
                // Drain the request body.
                while let Some(chunk) = std::future::poll_fn(|cx| body.poll_data(cx)).await {
                    let c = chunk.unwrap();
                    let _ = body.flow_control().release_capacity(c.len());
                }
                let response = Response::builder()
                    .status(StatusCode::OK)
                    .header("content-type", "application/grpc")
                    .body(())
                    .unwrap();
                let mut send = respond.send_response(response, false).unwrap();
                send.send_data(bytes::Bytes::from_static(b"\x00\x00\x00\x00\x02hi"), false)
                    .unwrap();
                let mut trailers = HeaderMap::new();
                trailers.insert("grpc-status", HeaderValue::from_static("0"));
                trailers.insert("grpc-message", HeaderValue::from_static("OK"));
                send.send_trailers(trailers).unwrap();
            }
        });

        let input = json!({
            "url": format!("http://127.0.0.1:{port}/pkg.Svc/Method"),
            "headers": { "authorization": "Bearer t" },
            "body": b64().encode(b"\x00\x00\x00\x00\x01x"),
            "timeoutMs": 3000,
        });
        let envelope = proxy_grpc(input).await;
        assert!(envelope["error"].is_null(), "unexpected error: {envelope}");
        assert_eq!(envelope["status"], 200);
        assert_eq!(envelope["grpcStatus"], 0);
        assert_eq!(envelope["grpcMessage"], "OK");
        assert_eq!(envelope["trailers"]["grpc-status"], "0");
        let body = b64().decode(envelope["body"].as_str().unwrap()).unwrap();
        assert_eq!(&body, b"\x00\x00\x00\x00\x02hi");
    }

    /// h2c server that answers headers at once, echoes every DATA chunk as it
    /// arrives, and sends grpc-status 0 once the client half-closes.
    async fn echo_server() -> u16 {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move {
            let (socket, _) = listener.accept().await.unwrap();
            let mut conn = h2::server::handshake(socket).await.unwrap();
            let (request, mut respond) = conn.accept().await.unwrap().unwrap();
            tokio::spawn(async move { while conn.accept().await.is_some() {} });
            let response = Response::builder().status(StatusCode::OK).body(()).unwrap();
            let mut send = respond.send_response(response, false).unwrap();
            let mut body = request.into_body();
            while let Some(Ok(chunk)) = std::future::poll_fn(|cx| body.poll_data(cx)).await {
                let _ = body.flow_control().release_capacity(chunk.len());
                if send.send_data(chunk, false).is_err() {
                    return;
                }
            }
            let mut trailers = HeaderMap::new();
            trailers.insert("grpc-status", HeaderValue::from_static("0"));
            let _ = send.send_trailers(trailers);
        });
        port
    }

    async fn live(port: u16) -> (u64, tokio::sync::mpsc::UnboundedReceiver<Value>) {
        let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
        let emit: Emit = Arc::new(move |v| {
            let _ = tx.send(v);
        });
        let input = json!({ "url": format!("http://127.0.0.1:{port}/pkg.Svc/Chat") });
        (stream_start(input, emit).await.unwrap(), rx)
    }

    async fn next(rx: &mut tokio::sync::mpsc::UnboundedReceiver<Value>) -> Value {
        tokio::time::timeout(Duration::from_secs(3), rx.recv()).await.unwrap().unwrap()
    }

    #[tokio::test]
    async fn bidi_messages_interleave_then_end_with_status() {
        let (id, mut rx) = live(echo_server().await).await;
        for msg in [&b"\x00\x00\x00\x00\x01a"[..], b"\x00\x00\x00\x00\x01b"] {
            stream_send(id, &b64().encode(msg)).unwrap();
            // The reply arrives before the client half-closes.
            let ev = next(&mut rx).await;
            assert_eq!(ev["kind"], "data");
            assert_eq!(b64().decode(ev["data"].as_str().unwrap()).unwrap(), msg);
        }
        stream_end(id).unwrap();
        let end = next(&mut rx).await;
        assert_eq!(end["kind"], "end", "{end}");
        assert_eq!(end["grpcStatus"], 0);
        assert!(stream_send(id, "AA==").is_err(), "finished call must be gone");
    }

    #[tokio::test]
    async fn cancel_ends_the_call() {
        let (id, mut rx) = live(echo_server().await).await;
        stream_cancel(id);
        let end = next(&mut rx).await;
        assert_eq!(end["kind"], "end");
        assert_eq!(end["cancelled"], true);
        assert!(stream_end(id).is_err());
    }

    #[tokio::test]
    async fn live_call_rejects_blocked_targets() {
        let (tx, _rx) = tokio::sync::mpsc::unbounded_channel::<Value>();
        let emit: Emit = Arc::new(move |v| {
            let _ = tx.send(v);
        });
        let e = stream_start(json!({ "url": "http://169.254.169.254/S/M" }), emit).await.unwrap_err();
        assert!(e.contains("Blocked target"), "{e}");
    }
}
