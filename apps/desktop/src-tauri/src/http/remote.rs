//! Remote bridge: Rust-side HTTP to the FastAPI backend with a persistent
//! cookie jar (HttpOnly JWT cookies live here, never in the webview).
//!
//! Rust HTTP has no CORS, so the existing backend cookie flow works with zero
//! backend changes. The jar is serialized into the SQLCipher kv table so the
//! session survives restarts.

use std::io::Cursor;
use std::sync::Arc;

use reqwest_cookie_store::CookieStoreMutex;
use rusqlite::OptionalExtension;
use serde::Serialize;

use crate::error::{AppError, Result};
use crate::state::AppState;

const KV_JAR: &str = "cookie_jar";

#[derive(Serialize)]
pub struct RemoteResponse {
    pub status: u16,
    pub body: String,
}

pub struct RemoteHttp {
    pub client: reqwest::Client,
    pub jar: Arc<CookieStoreMutex>,
}

impl RemoteHttp {
    pub fn init(db: &rusqlite::Connection) -> Result<Self> {
        let raw: Option<String> = db
            .query_row("SELECT v FROM kv WHERE k = ?1", [KV_JAR], |r| r.get(0))
            .optional()?;
        let store = match raw {
            Some(json) => cookie_store::serde::json::load(Cursor::new(json.into_bytes()))
                .unwrap_or_default(),
            None => cookie_store::CookieStore::default(),
        };
        let jar = Arc::new(CookieStoreMutex::new(store));
        let client = reqwest::Client::builder()
            .cookie_provider(jar.clone())
            .user_agent("mydevtools-desktop")
            .build()
            .map_err(|e| AppError::Other(e.to_string()))?;
        Ok(Self { client, jar })
    }

    pub fn persist_jar(&self, db: &rusqlite::Connection) -> Result<()> {
        let mut buf = Vec::new();
        {
            let store = self.jar.lock().unwrap();
            cookie_store::serde::json::save_incl_expired_and_nonpersistent(&store, &mut buf)
                .map_err(|e| AppError::Other(e.to_string()))?;
        }
        let json = String::from_utf8_lossy(&buf).to_string();
        db.execute(
            "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
            [KV_JAR, &json],
        )?;
        Ok(())
    }

    pub fn clear_jar(&self, db: &rusqlite::Connection) -> Result<()> {
        self.jar.lock().unwrap().clear();
        db.execute("DELETE FROM kv WHERE k = ?1", [KV_JAR])?;
        Ok(())
    }
}

/// Perform an HTTP request against the backend with the persistent jar.
/// `url` is the full URL (base comes from the frontend's baked env config).
pub async fn request(
    state: &AppState,
    method: &str,
    url: &str,
    body: Option<String>,
) -> Result<RemoteResponse> {
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|_| AppError::Other(format!("bad method {method}")))?;
    let mut req = state.http.client.request(method, url);
    if let Some(b) = body {
        req = req.header("Content-Type", "application/json").body(b);
    }
    let res = req.send().await.map_err(|e| AppError::Other(format!("network error: {e}")))?;
    let status = res.status().as_u16();
    let body = res.text().await.unwrap_or_default();

    // Persist cookies after every call — refresh rotations must survive restart.
    {
        let db = state.db.lock().unwrap();
        state.http.persist_jar(&db)?;
    }
    Ok(RemoteResponse { status, body })
}
