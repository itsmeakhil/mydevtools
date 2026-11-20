//! Scrollback + working directory of each open pane, saved to the encrypted DB
//! at quit and replayed (dimmed history, then a fresh shell) on next launch.
//! Processes themselves don't survive: that would need a daemon.

use super::pty::{Scrollback, TerminalState};
use base64::Engine;
use rusqlite::{Connection, OptionalExtension};
use serde_json::json;

/// Saved tail per pane; trimmed to a line start like the live scrollback.
const KEEP: usize = 256 * 1024;
const PREFIX: &str = "terminal:scrollback:";
/// Leave whatever modes the old program left on (alt screen, mouse, hidden
/// cursor, bracketed paste, colors), then draw a faint rule above the new shell.
const RESET: &[u8] = b"\x1b[?1049l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l\x1b[?25h\x1b[0m\r\n\x1b[2m\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\x1b[0m\r\n";

pub struct Saved {
    pub cwd: Option<String>,
    pub bytes: Vec<u8>,
}

fn tail(bytes: &[u8]) -> Vec<u8> {
    let mut s = Scrollback::new(KEEP);
    s.push(bytes);
    s.snapshot()
}

/// Save every session whose pane is still in the persisted layout, and drop saved
/// rows for panes that are gone. Panes not opened this launch keep their old row.
pub fn save_all(db: &mut Connection, term: &TerminalState) -> rusqlite::Result<()> {
    let layout: String = db
        .query_row("SELECT v FROM kv WHERE k = 'terminal:state'", [], |r| r.get(0))
        .optional()?
        .unwrap_or_default();
    // Terminal ids are UUIDs, so a substring test against the layout JSON is exact enough.
    let in_layout = |id: &str| !id.is_empty() && layout.contains(&format!("\"{id}\""));
    let tx = db.transaction()?;
    let keys: Vec<String> = tx
        .prepare("SELECT k FROM kv WHERE k LIKE 'terminal:scrollback:%'")?
        .query_map([], |r| r.get(0))?
        .collect::<Result<_, _>>()?;
    for k in keys {
        if !in_layout(&k[PREFIX.len()..]) {
            tx.execute("DELETE FROM kv WHERE k = ?1", [&k])?;
        }
    }
    for (id, s) in term.all() {
        let bytes = s.scrollback();
        if !in_layout(&id) || bytes.is_empty() {
            continue;
        }
        let v = json!({"cwd": s.cwd(), "b64": base64::engine::general_purpose::STANDARD.encode(tail(&bytes))});
        tx.execute(
            "INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
            [format!("{PREFIX}{id}"), v.to_string()],
        )?;
    }
    tx.commit()
}

/// Remove and return the saved state for `id` (each row is replayed once).
pub fn take(db: &Connection, id: &str) -> Option<Saved> {
    let k = format!("{PREFIX}{id}");
    let raw: String = db.query_row("SELECT v FROM kv WHERE k = ?1", [&k], |r| r.get(0)).optional().ok()??;
    let _ = db.execute("DELETE FROM kv WHERE k = ?1", [&k]);
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    Some(Saved {
        cwd: v["cwd"].as_str().map(String::from),
        bytes: base64::engine::general_purpose::STANDARD.decode(v["b64"].as_str()?).ok()?,
    })
}

/// What the restored pane replays before its new shell.
pub fn seed(bytes: &[u8]) -> Vec<u8> {
    [bytes, RESET].concat()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::AppState;
    use crate::terminal::pty::SpawnRequest;

    fn spawn(st: &TerminalState, id: &str, cmd: &str) {
        let req = SpawnRequest { id: id.into(), cwd: "/tmp".into(), cols: 80, rows: 24, ..Default::default() };
        st.spawn(req, vec![], vec!["/bin/sh".into(), "-c".into(), cmd.into()]).unwrap();
    }

    #[test]
    fn saves_open_panes_and_prunes_closed_ones() {
        let app = AppState::in_memory();
        let mut db = app.db.lock().unwrap();
        let (a, b, gone) = ("11111111-a", "22222222-b", "33333333-gone");
        db.execute(
            "INSERT INTO kv (k, v) VALUES ('terminal:state', ?1)",
            [json!({"projects": [{"tabs": [{"layout": {"kind": "split", "children": [{"kind": "leaf", "id": a}, {"kind": "leaf", "id": b}]}}]}]}).to_string()],
        )
        .unwrap();
        // `b` wasn't opened this launch: its old row must survive. `gone` was closed.
        for id in [b, gone] {
            db.execute("INSERT INTO kv (k, v) VALUES (?1, '{}')", [format!("{PREFIX}{id}")]).unwrap();
        }
        let st = TerminalState::default();
        spawn(&st, a, "printf 'hello\\n'");
        spawn(&st, "not-in-layout", "printf x");
        let s = st.get(a).unwrap();
        let end = std::time::Instant::now() + std::time::Duration::from_secs(2);
        while s.scrollback().is_empty() && std::time::Instant::now() < end {
            std::thread::sleep(std::time::Duration::from_millis(20));
        }

        save_all(&mut db, &st).unwrap();
        let keys: Vec<String> = db
            .prepare("SELECT k FROM kv WHERE k LIKE 'terminal:scrollback:%' ORDER BY k")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(keys, vec![format!("{PREFIX}{a}"), format!("{PREFIX}{b}")]);

        let got = take(&db, a).expect("saved");
        assert_eq!(got.cwd.as_deref(), Some("/tmp"));
        assert!(String::from_utf8_lossy(&got.bytes).contains("hello"));
        assert!(take(&db, a).is_none(), "replayed once");
    }

    #[test]
    fn tail_is_bounded_and_seed_resets_modes() {
        let big = "line\n".repeat(KEEP);
        let t = tail(big.as_bytes());
        assert!(t.len() <= KEEP && t.starts_with(b"line"));
        let s = seed(b"\x1b[?1049hTUI");
        assert!(s.starts_with(b"\x1b[?1049hTUI") && s.ends_with(b"\x1b[0m\r\n"));
        assert!(s.windows(8).any(|w| w == b"\x1b[?1049l"));
    }
}
