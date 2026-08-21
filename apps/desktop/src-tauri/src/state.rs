use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::db;
use crate::error::Result;

pub struct AppState {
    pub db: Mutex<rusqlite::Connection>,
    /// App data directory holding the DB files. None for in-memory test state,
    /// which keeps destructive file operations (factory reset) inert in tests.
    pub data_dir: Option<PathBuf>,
}

impl AppState {
    pub fn init(db_path: PathBuf) -> Result<Self> {
        let conn = db::open(&db_path)?;
        Ok(Self {
            db: Mutex::new(conn),
            data_dir: db_path.parent().map(Path::to_path_buf),
        })
    }

    /// In-memory state for tests (no Keychain, no SQLCipher key).
    #[cfg(test)]
    pub fn in_memory() -> Self {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        db::migrations::run(&conn).unwrap();
        Self { db: Mutex::new(conn), data_dir: None }
    }
}
