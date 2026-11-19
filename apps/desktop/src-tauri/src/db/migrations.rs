use rusqlite::{params, Connection};
use serde_json::Value;

use crate::error::Result;

enum Step {
    Sql(&'static str),
    Rust(fn(&Connection) -> Result<()>),
}
use Step::{Rust, Sql};

const MIGRATIONS: &[Step] = &[
    // v1 — initial schema
    Sql("
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
    "),
    // v2 — conflict archive. When two devices edit the same row while offline,
    // sync keeps applying last-writer-wins but stores the LOSING version here so
    // nothing is ever silently destroyed. `loser_doc` is the raw doc as stored
    // (opaque {encryptedData, iv} for credential tools — Rust never decrypts).
    Sql("
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
    "),
    // v3 — accounts removed. Drop the leftovers of the old sign-in flow: the
    // serialized backend cookie jar (session tokens for a backend that no
    // longer exists) and the activation snapshot that used to gate the app.
    Sql("
    DELETE FROM kv WHERE k IN ('cookie_jar', 'activation');
    "),
    // v4 — API-client request auth `none` used to mean "inherit from folder /
    // collection" (it was the new-request default). It now means "send no auth",
    // so saved requests keep their behaviour by becoming `inherit`.
    Rust(request_auth_none_to_inherit),
];

fn request_auth_none_to_inherit(conn: &Connection) -> Result<()> {
    fn walk(items: &mut Value) {
        let Some(items) = items.as_array_mut() else { return };
        for item in items {
            if item.get("items").is_some_and(Value::is_array) {
                walk(&mut item["items"]); // folder: its `defaultAuth` keeps its meaning
            } else if item.pointer("/auth/type").and_then(Value::as_str) == Some("none") {
                item["auth"]["type"] = Value::from("inherit");
            }
        }
    }
    let tx = conn.unchecked_transaction()?;
    let rows: Vec<(String, String, String)> = tx
        .prepare("SELECT workspace_id, id, meta_json FROM entries WHERE tool_kind = 'api_client_collections' AND meta_json IS NOT NULL")?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))?
        .collect::<rusqlite::Result<_>>()?;
    for (ws, id, raw) in rows {
        let Ok(mut doc) = serde_json::from_str::<Value>(&raw) else { continue };
        let before = doc.clone();
        walk(&mut doc["items"]);
        if doc != before {
            tx.execute(
                "UPDATE entries SET meta_json = ?3 WHERE tool_kind = 'api_client_collections' AND workspace_id = ?1 AND id = ?2",
                params![ws, id, serde_json::to_string(&doc)?],
            )?;
        }
    }
    tx.commit()?;
    Ok(())
}

/// Highest schema version this build knows how to migrate to.
pub fn latest_version() -> i64 {
    MIGRATIONS.len() as i64
}

pub fn run(conn: &Connection) -> Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    for (i, step) in MIGRATIONS.iter().enumerate() {
        let target = (i + 1) as i64;
        if version < target {
            match step {
                Sql(sql) => conn.execute_batch(sql)?,
                Rust(f) => f(conn)?,
            }
            conn.pragma_update(None, "user_version", target)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn v4_turns_request_auth_none_into_inherit() {
        let conn = Connection::open_in_memory().unwrap();
        conn.pragma_update(None, "user_version", 0i64).unwrap();
        for (i, step) in MIGRATIONS.iter().take(3).enumerate() {
            if let Sql(sql) = step { conn.execute_batch(sql).unwrap() }
            conn.pragma_update(None, "user_version", (i + 1) as i64).unwrap();
        }
        let doc = r#"{"name":"C","defaultAuth":{"type":"none"},"items":[
            {"id":"r1","auth":{"type":"none"}},
            {"id":"r2","auth":{"type":"bearer","token":"t"}},
            {"id":"f","type":"folder","defaultAuth":{"type":"none"},"items":[{"id":"r3","auth":{"type":"none"}}]}]}"#;
        conn.execute(
            "INSERT INTO entries (tool_kind, workspace_id, id, meta_json, created_at, updated_at) VALUES ('api_client_collections','w','c',?1,0,0)",
            [doc],
        ).unwrap();
        run(&conn).unwrap();
        let out: Value = serde_json::from_str(
            &conn.query_row("SELECT meta_json FROM entries WHERE id='c'", [], |r| r.get::<_, String>(0)).unwrap(),
        ).unwrap();
        assert_eq!(out.pointer("/items/0/auth/type").unwrap(), "inherit");
        assert_eq!(out.pointer("/items/1/auth/type").unwrap(), "bearer");
        assert_eq!(out.pointer("/items/2/items/0/auth/type").unwrap(), "inherit");
        assert_eq!(out.pointer("/items/2/defaultAuth/type").unwrap(), "none");
        assert_eq!(out.pointer("/defaultAuth/type").unwrap(), "none");
        assert_eq!(conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0)).unwrap(), latest_version());
    }
}
