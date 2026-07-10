//! Loopback OAuth callback server.
//!
//! Native-app auth pattern: bind an ephemeral localhost port, open the system
//! browser to the web login (passing the port), and let the browser redirect
//! the minted token back to `http://127.0.0.1:<port>/callback?token=...`. Works
//! identically in `tauri dev` and the packaged app — no URL-scheme / Info.plist
//! registration needed (unlike the mydevtools:// deep link, which macOS only
//! routes to a bundled .app).

use std::time::Duration;

use tauri::ipc::Channel;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

const AUTH_TIMEOUT: Duration = Duration::from_secs(300);

fn parse_token(request: &str) -> Option<String> {
    // First line: "GET /callback?token=XXX HTTP/1.1"
    let line = request.lines().next()?;
    let path = line.split_whitespace().nth(1)?;
    let query = path.split_once('?')?.1;
    for pair in query.split('&') {
        if let Some(v) = pair.strip_prefix("token=") {
            return Some(urldecode(v));
        }
    }
    None
}

fn urldecode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).ok();
                if let Some(b) = hex.and_then(|h| u8::from_str_radix(h, 16).ok()) {
                    out.push(b);
                    i += 3;
                    continue;
                }
                out.push(bytes[i]);
                i += 1;
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b => {
                out.push(b);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

const DONE_HTML: &str = "<!doctype html><html><head><meta charset='utf-8'><title>MyDevTools</title></head><body style='font-family:-apple-system,sans-serif;text-align:center;padding-top:5rem;background:#0b0b0f;color:#e5e5ea'><h2>Signed in ✓</h2><p style='color:#8e8e93'>You can close this tab and return to the MyDevTools app.</p></body></html>";

/// Bind a loopback listener, report its port on `port_channel`, then await the
/// browser's `/callback?token=...` request and return the token.
pub async fn await_browser_auth(port_channel: Channel<serde_json::Value>) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("failed to bind auth callback port: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    port_channel
        .send(serde_json::json!({ "port": port }))
        .map_err(|e| e.to_string())?;

    match tokio::time::timeout(AUTH_TIMEOUT, accept_callback(&listener)).await {
        Ok(result) => result,
        Err(_) => Err("Sign-in timed out — no callback received".into()),
    }
}

/// Await the browser's `/callback?token=...` on an already-bound listener.
/// Non-callback requests (favicon, preflight) get a 204 and are ignored.
async fn accept_callback(listener: &TcpListener) -> Result<String, String> {
    loop {
        let (mut socket, _) = listener.accept().await.map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; 8192];
        let n = socket.read(&mut buf).await.map_err(|e| e.to_string())?;
        let request = String::from_utf8_lossy(&buf[..n]);
        if let Some(token) = parse_token(&request) {
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                DONE_HTML.len(),
                DONE_HTML
            );
            let _ = socket.write_all(resp.as_bytes()).await;
            let _ = socket.flush().await;
            return Ok(token);
        }
        let _ = socket
            .write_all(b"HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n")
            .await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_token_from_request() {
        let req = "GET /callback?token=abc.def-ghi%3D&x=1 HTTP/1.1\r\nHost: localhost\r\n\r\n";
        assert_eq!(parse_token(req).as_deref(), Some("abc.def-ghi="));
    }

    #[test]
    fn no_token_returns_none() {
        assert_eq!(parse_token("GET /favicon.ico HTTP/1.1\r\n\r\n"), None);
    }

    #[tokio::test]
    async fn loopback_callback_roundtrip() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let server = tokio::spawn(async move { accept_callback(&listener).await });

        // Simulate the browser: a favicon probe (ignored) then the real callback.
        let mut ignored = tokio::net::TcpStream::connect(("127.0.0.1", port)).await.unwrap();
        ignored
            .write_all(b"GET /favicon.ico HTTP/1.1\r\nHost: localhost\r\n\r\n")
            .await
            .unwrap();
        let mut sink = Vec::new();
        let _ = ignored.read_to_end(&mut sink).await;

        let mut cb = tokio::net::TcpStream::connect(("127.0.0.1", port)).await.unwrap();
        cb.write_all(b"GET /callback?token=tok-123%3D HTTP/1.1\r\nHost: localhost\r\n\r\n")
            .await
            .unwrap();
        let mut resp = Vec::new();
        cb.read_to_end(&mut resp).await.unwrap();
        assert!(String::from_utf8_lossy(&resp).contains("Signed in"));

        let token = server.await.unwrap().unwrap();
        assert_eq!(token, "tok-123=");
    }
}
