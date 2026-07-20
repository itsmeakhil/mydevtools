//! Native gRPC (HTTP/2) transport for the api-client.
//!
//! The webview does all protobuf work — requests arrive as base64-encoded,
//! already 5-byte-framed gRPC messages (see `lib/grpc-web.ts` sendNativeGrpc).
//! This is a raw h2 transport whose one job reqwest can't do: surface HTTP/2
//! trailers, where `grpc-status`/`grpc-message` live. ALPN "h2" TLS for
//! https targets; prior-knowledge (h2c) for http targets. Unary,
//! server-streaming and client-streaming all reduce to "send N framed
//! messages, return all response DATA bytes + trailers".

use base64::Engine;
use serde_json::{json, Map, Value};
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
    let url = input["url"].as_str().ok_or("missing url")?;
    let parsed = reqwest::Url::parse(url).map_err(|e| format!("invalid url: {e}"))?;
    crate::http::proxy::assert_hop_allowed(&parsed)?;
    let https = parsed.scheme() == "https";
    let host = parsed.host_str().ok_or("url has no host")?.to_string();
    let port = parsed.port().unwrap_or(if https { 443 } else { 80 });

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

    let tcp = tokio::net::TcpStream::connect((host.as_str(), port))
        .await
        .map_err(|e| format!("connect to {host}:{port} failed: {e}"))?;
    let io: Box<dyn AsyncRw> = if https {
        let connector = native_tls::TlsConnector::builder()
            .request_alpns(&["h2"])
            .build()
            .map_err(|e| format!("TLS setup failed: {e}"))?;
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
    let mut client = client.ready().await.map_err(|e| e.to_string())?;

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

    let (response_fut, mut send_stream) =
        client.send_request(request, false).map_err(|e| e.to_string())?;
    let last = frames.len() - 1;
    for (i, frame) in frames.into_iter().enumerate() {
        send_frame(&mut send_stream, frame, i == last).await?;
    }

    let response = response_fut
        .await
        .map_err(|e| format!("gRPC request failed: {e}"))?;
    let status = response.status().as_u16();
    let mut headers_map = Map::new();
    for (k, v) in response.headers() {
        headers_map.insert(k.to_string(), json!(v.to_str().unwrap_or("")));
    }

    let mut recv = response.into_body();
    let mut body_bytes: Vec<u8> = Vec::new();
    while let Some(chunk) = std::future::poll_fn(|cx| recv.poll_data(cx)).await {
        let chunk = chunk.map_err(|e| format!("stream error: {e}"))?;
        let _ = recv.flow_control().release_capacity(chunk.len());
        body_bytes.extend_from_slice(&chunk);
    }
    let mut trailers_map = Map::new();
    if let Ok(Some(trailers)) = std::future::poll_fn(|cx| recv.poll_trailers(cx)).await {
        for (k, v) in trailers.iter() {
            trailers_map.insert(k.to_string(), json!(v.to_str().unwrap_or("")));
        }
    }

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
        "body": b64().encode(&body_bytes),
        "headers": headers_map,
        "trailers": trailers_map,
        "sizeBytes": body_bytes.len(),
    });
    if let Some(s) = grpc_status {
        envelope["grpcStatus"] = json!(s);
    }
    if let Some(m) = grpc_message {
        envelope["grpcMessage"] = json!(m);
    }
    Ok(envelope)
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
}
