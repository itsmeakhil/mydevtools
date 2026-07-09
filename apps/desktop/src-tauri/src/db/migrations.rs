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

    CREATE TABLE sync_state (
      workspace_id TEXT NOT NULL,
      tool_kind    TEXT NOT NULL,
      last_pull_at INTEGER,
      PRIMARY KEY (workspace_id, tool_kind)
    );
    ",
];

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
