use rusqlite::Connection;

use crate::error::Result;

const MIGRATIONS: &[&str] = &[
    // v1 — initial schema
    "
    CREATE TABLE entries (
      tool_kind      TEXT NOT NULL,
      workspace_id   TEXT NOT NULL,
      id             TEXT NOT NULL,
      encrypted_data TEXT,
      iv             TEXT,
      meta_json      TEXT,
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL,
      deleted_at     INTEGER,
      dirty          INTEGER NOT NULL DEFAULT 1,
      last_synced_at INTEGER,
      PRIMARY KEY (tool_kind, workspace_id, id)
    );
    CREATE INDEX idx_entries_dirty ON entries(dirty) WHERE dirty = 1;
    CREATE INDEX idx_entries_list ON entries(tool_kind, workspace_id, deleted_at);

    CREATE TABLE kv (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL
    );

    -- ponytail: cloud sync removed; sync_state (and conflicts below) kept so
    -- existing DBs migrate cleanly. Dead tables, no writers.
    CREATE TABLE sync_state (
      workspace_id TEXT NOT NULL,
      tool_kind    TEXT NOT NULL,
      last_pull_at INTEGER,
      PRIMARY KEY (workspace_id, tool_kind)
    );
    ",
    // v2 — conflict archive. When two devices edit the same row while offline,
    // sync keeps applying last-writer-wins but stores the LOSING version here so
    // nothing is ever silently destroyed. `loser_doc` is the raw doc as stored
    // (opaque {encryptedData, iv} for credential tools — Rust never decrypts).
    "
    CREATE TABLE conflicts (
      id                TEXT PRIMARY KEY,
      tool_kind         TEXT NOT NULL,
      workspace_id      TEXT NOT NULL,
      entry_id          TEXT NOT NULL,
      loser_side        TEXT NOT NULL,   -- 'local' | 'remote'
      loser_doc         TEXT NOT NULL,
      loser_updated_at  INTEGER NOT NULL,
      winner_updated_at INTEGER NOT NULL,
      created_at        INTEGER NOT NULL,
      resolved_at       INTEGER          -- set when the user dismisses/keeps
    );
    CREATE INDEX idx_conflicts_open ON conflicts(created_at) WHERE resolved_at IS NULL;
    ",
];

/// Highest schema version this build knows how to migrate to.
pub fn latest_version() -> i64 {
    MIGRATIONS.len() as i64
}

pub fn run(conn: &Connection) -> Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    for (i, sql) in MIGRATIONS.iter().enumerate() {
        let target = (i + 1) as i64;
        if version < target {
            conn.execute_batch(sql)?;
            conn.pragma_update(None, "user_version", target)?;
        }
    }
    Ok(())
}
