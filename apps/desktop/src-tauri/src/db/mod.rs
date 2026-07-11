pub mod device_key;
pub mod migrations;

use std::path::Path;

use rusqlite::Connection;

use crate::error::Result;

/// Opens (creating if needed) the SQLCipher database keyed by the
/// Keychain-stored device key.
pub fn open(path: &Path) -> Result<Connection> {
    let key = device_key::get_or_create()?;
    let conn = Connection::open(path)?;
    // Raw-key form: PRAGMA key = "x'<64 hex chars>'"
    conn.execute_batch(&format!("PRAGMA key = \"x'{key}'\";"))?;
    // Fail fast if the key is wrong / file is not a valid encrypted DB.
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(()))?;
    conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;")?;
    migrations::run(&conn)?;
    Ok(conn)
}

/// Current time as epoch milliseconds (matches the API's createdAt/updatedAt).
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
