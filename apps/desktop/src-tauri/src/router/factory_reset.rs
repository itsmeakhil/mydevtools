//! Factory reset (`POST /desktop/factory-reset`).
//!
//! Wipes every trace of app data: the SQLCipher DB (with WAL sidecars and
//! pre-migration snapshots), window state, and finally the Keychain device
//! key. The webview clears its own storage and relaunches afterwards; the
//! fresh boot recreates an empty DB and re-runs onboarding.
//!
//! Ordering is the whole point. Any partial state must still boot:
//!   - crash before file deletion  → data + key intact, reset was a no-op
//!   - files gone, key intact      → fresh DB under the old key
//!   - files gone, key gone        → fresh key + fresh DB (intended end state)
//! The lethal combination — key deleted while an encrypted DB file remains —
//! would brick startup (db::open's key check fails), so the Keychain entry is
//! deleted strictly LAST, and only after every DB file is confirmed gone.

use std::path::Path;

use serde_json::json;

use crate::db::device_key;
use crate::error::Result;
use crate::router::ApiResponse;
use crate::state::AppState;

pub fn handle(state: &AppState, method: &str) -> Result<ApiResponse> {
    if method != "POST" {
        return Ok(ApiResponse::detail(404, "Not found"));
    }
    let Some(dir) = state.data_dir.clone() else {
        return Ok(ApiResponse::detail(500, "No data directory"));
    };

    // Close the real DB by swapping in a throwaway in-memory connection —
    // dropping the old Connection runs sqlite3_close, which checkpoints and
    // removes the -wal/-shm sidecars. If wipe_files fails below, the app runs
    // on this throwaway conn until restart (route returns 500, disk state
    // still boots) — acceptable for a reset path.
    {
        let mut guard = state.db.lock().unwrap();
        *guard = rusqlite::Connection::open_in_memory()?;
    }

    wipe_files(&dir)?;

    // Point of no return passed: files are gone, so a Keychain failure is
    // benign (next boot just reuses the old key for the fresh empty DB).
    let keychain_cleared = device_key::delete().is_ok();
    ApiResponse::ok(&json!({ "ok": true, "keychain_cleared": keychain_cleared }))
}

/// Delete every app-data file. Missing files count as success so a retried
/// reset stays idempotent.
fn wipe_files(dir: &Path) -> Result<()> {
    for name in [
        "mydevtools.db",
        "mydevtools.db-wal",
        "mydevtools.db-shm",
        ".window-state.json",
        ".persisted-scope",
    ] {
        remove_ignoring_missing(&dir.join(name))?;
    }
    // Pre-migration snapshots (mydevtools.db.bak-v<N>) written by db::open.
    for entry in std::fs::read_dir(dir)? {
        let path = entry?.path();
        let is_bak = path
            .file_name()
            .and_then(|n| n.to_str())
            .is_some_and(|n| n.starts_with("mydevtools.db.bak-"));
        if is_bak {
            remove_ignoring_missing(&path)?;
        }
    }
    Ok(())
}

fn remove_ignoring_missing(path: &Path) -> std::io::Result<()> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wipe_files_removes_everything_and_is_idempotent() {
        let dir = std::env::temp_dir().join(format!("mdt-reset-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        for name in [
            "mydevtools.db",
            "mydevtools.db-wal",
            "mydevtools.db-shm",
            "mydevtools.db.bak-v1",
            "mydevtools.db.bak-v2",
            ".window-state.json",
        ] {
            std::fs::write(dir.join(name), b"x").unwrap();
        }
        std::fs::write(dir.join("unrelated.txt"), b"keep").unwrap();

        wipe_files(&dir).unwrap();
        let left: Vec<_> = std::fs::read_dir(&dir)
            .unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        assert_eq!(left, vec!["unrelated.txt"]);

        // Second run on the already-clean dir succeeds.
        wipe_files(&dir).unwrap();
        let _ = std::fs::remove_dir_all(&dir);
    }
}
