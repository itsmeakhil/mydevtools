use std::path::PathBuf;
use std::sync::Mutex;

use crate::db;
use crate::error::Result;
use crate::http::remote::RemoteHttp;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    pub http: RemoteHttp,
}

impl AppState {
    pub fn init(db_path: PathBuf) -> Result<Self> {
        let conn = db::open(&db_path)?;
        let http = RemoteHttp::init(&conn)?;
        Ok(Self { db: Mutex::new(conn), http })
    }

    /// In-memory state for tests (no Keychain, no SQLCipher key).
    #[cfg(test)]
    pub fn in_memory() -> Self {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        db::migrations::run(&conn).unwrap();
        let http = RemoteHttp::init(&conn).unwrap();
        Self { db: Mutex::new(conn), http }
    }
}
