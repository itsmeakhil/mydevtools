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
    // Safety net: before a new app version applies schema migrations, keep an
    // encrypted, consistent copy of the pre-upgrade DB so a bad migration (or a
    // rolled-back release) can never strand the user's offline data.
    snapshot_before_upgrade(&conn, path);
    migrations::run(&conn)?;
    Ok(conn)
}

/// Copy the DB to a sibling `mydevtools.db.bak-v<version>` when a pending schema
/// upgrade is about to run. Uses SQLCipher `VACUUM INTO`, which writes a
/// consistent snapshot encrypted with the same device key. Best-effort — a
/// snapshot failure must never block the app from opening.
fn snapshot_before_upgrade(conn: &Connection, path: &Path) {
    let version: i64 = match conn.query_row("PRAGMA user_version", [], |r| r.get(0)) {
        Ok(v) => v,
        Err(_) => return,
    };
    // version 0 = brand-new/empty DB (nothing to protect); >= latest = already
    // current. Only snapshot a real upgrade of existing data.
    if version == 0 || version >= migrations::latest_version() {
        return;
    }
    let bak = path.with_file_name(format!("mydevtools.db.bak-v{version}"));
    let _ = std::fs::remove_file(&bak); // VACUUM INTO refuses an existing target
    let bak_str = bak.to_string_lossy().replace('\'', "''");
    let _ = conn.execute_batch(&format!("VACUUM INTO '{bak_str}';"));
}

/// Current time as epoch milliseconds (matches the API's createdAt/updatedAt).
pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshots_only_when_upgrading_existing_data() {
        let dir = std::env::temp_dir().join(format!("mdt-snap-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("mydevtools.db");

        let conn = Connection::open(&db_path).unwrap();
        conn.execute_batch("CREATE TABLE t (x); INSERT INTO t VALUES (1);").unwrap();

        // A DB one version behind → snapshot is written.
        assert!(migrations::latest_version() >= 2);
        conn.pragma_update(None, "user_version", 1i64).unwrap();
        snapshot_before_upgrade(&conn, &db_path);
        let bak = db_path.with_file_name("mydevtools.db.bak-v1");
        assert!(bak.exists(), "expected snapshot for a pending upgrade");

        // Already at the latest version → no snapshot.
        let cur = migrations::latest_version();
        conn.pragma_update(None, "user_version", cur).unwrap();
        let bak_cur = db_path.with_file_name(format!("mydevtools.db.bak-v{cur}"));
        snapshot_before_upgrade(&conn, &db_path);
        assert!(!bak_cur.exists(), "no snapshot when already current");

        // Fresh DB (version 0) → no snapshot.
        conn.pragma_update(None, "user_version", 0i64).unwrap();
        snapshot_before_upgrade(&conn, &db_path);
        assert!(!db_path.with_file_name("mydevtools.db.bak-v0").exists());

        drop(conn);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
