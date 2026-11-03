use super::notify;
use super::pty::TerminalState;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum TermStatus {
    Idle,
    Running,
    Waiting,
}

#[derive(Deserialize, Debug)]
pub struct HookMsg {
    pub token: String,
    pub terminal_id: String,
    pub event: String,
    #[serde(default)]
    pub payload: Value,
}

pub fn parse_line(line: &str, token: &str) -> Option<HookMsg> {
    let m: HookMsg = serde_json::from_str(line.trim()).ok()?;
    (m.token == token).then_some(m)
}

pub fn status_for(event: &str) -> Option<TermStatus> {
    match event {
        "claude-UserPromptSubmit" | "claude-PreToolUse" | "shell-exec" => Some(TermStatus::Running),
        "claude-Notification" | "claude-Stop" => Some(TermStatus::Waiting),
        "claude-SessionEnd" | "shell-prompt" => Some(TermStatus::Idle),
        _ => None,
    }
}

#[derive(Debug, PartialEq)]
pub struct Transition {
    pub id: String,
    pub status: TermStatus,
    pub entered_waiting: bool,
}

#[derive(Default)]
pub struct StatusMap(HashMap<String, TermStatus>);

impl StatusMap {
    pub fn apply(&mut self, id: &str, s: TermStatus) -> Option<Transition> {
        let prev = self.0.insert(id.to_string(), s);
        (prev != Some(s)).then(|| Transition {
            id: id.to_string(),
            status: s,
            entered_waiting: s == TermStatus::Waiting,
        })
    }

    pub fn clear_waiting(&mut self, id: &str) -> Option<Transition> {
        (self.0.get(id) == Some(&TermStatus::Waiting)).then(|| self.apply(id, TermStatus::Idle))?
    }

    pub fn waiting_count(&self) -> usize {
        self.0.values().filter(|s| **s == TermStatus::Waiting).count()
    }

    pub fn snapshot(&self) -> HashMap<String, TermStatus> {
        self.0.clone()
    }
}

/// AF_UNIX paths are capped (~104 bytes on macOS); fall back to a short /tmp dir.
pub fn socket_path(data_dir: &Path, uid: u32) -> PathBuf {
    let p = data_dir.join("terminal").join("hooks.sock");
    if p.as_os_str().len() <= 100 {
        return p;
    }
    PathBuf::from(format!("/tmp/mdt-{uid}")).join("hooks.sock")
}

#[cfg(unix)]
pub async fn serve(path: PathBuf, token: String, on_msg: impl Fn(HookMsg) + Send + Sync + 'static) {
    use std::os::unix::fs::PermissionsExt;
    use tokio::io::{AsyncBufReadExt, BufReader};
    use tokio::net::UnixListener;

    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
        let _ = std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700));
    }
    let _ = std::fs::remove_file(&path);
    let listener = match UnixListener::bind(&path) {
        Ok(l) => l,
        Err(e) => {
            eprintln!("terminal hook socket bind failed: {e}");
            return;
        }
    };
    let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    let on_msg = Arc::new(on_msg);
    let token = Arc::new(token);
    loop {
        let Ok((stream, _)) = listener.accept().await else { continue };
        let (on_msg, token) = (on_msg.clone(), token.clone());
        tokio::spawn(async move {
            // lines() yields a final unterminated line too
            let mut lines = BufReader::new(stream).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(m) = parse_line(&line, &token) {
                    on_msg(m);
                }
            }
        });
    }
}

#[cfg(not(unix))]
pub async fn serve(_: PathBuf, _: String, _: impl Fn(HookMsg) + Send + Sync + 'static) {}

fn emit_status(app: &AppHandle, id: &str, status: TermStatus, message: Option<&str>) {
    let _ = app.emit("terminal://status", json!({"id": id, "status": status, "message": message}));
}

/// Spawn the hook server for this launch (call from `setup`).
pub fn start(app: &AppHandle, data_dir: &Path, state: Arc<TerminalState>) {
    #[cfg(unix)]
    let uid = unsafe { libc::getuid() };
    #[cfg(not(unix))]
    let uid = 0;
    let (path, token, app) = (socket_path(data_dir, uid), state.token.clone(), app.clone());
    tauri::async_runtime::spawn(serve(path, token, move |m| {
        let Some(s) = status_for(&m.event) else { return };
        let t = state.statuses.lock().unwrap().apply(&m.terminal_id, s);
        if let Some(t) = t {
            let msg = (m.event == "claude-Notification")
                .then(|| m.payload.get("message").and_then(Value::as_str))
                .flatten();
            emit_status(&app, &t.id, t.status, msg);
            notify::on_transition(&t, &app);
        }
    }));
}

#[tauri::command]
pub fn terminal_statuses(state: State<'_, Arc<TerminalState>>) -> HashMap<String, TermStatus> {
    state.statuses.lock().unwrap().snapshot()
}

#[tauri::command]
pub fn terminal_clear_waiting(app: AppHandle, state: State<'_, Arc<TerminalState>>, id: String) {
    let t = state.statuses.lock().unwrap().clear_waiting(&id);
    if let Some(t) = t {
        emit_status(&app, &t.id, t.status, None);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(token: &str) -> String {
        json!({"token": token, "terminal_id": "t1", "event": "shell-prompt", "payload": {}}).to_string()
    }

    #[test]
    fn parse_line_rejects_bad_token() {
        assert!(parse_line(&line("bad"), "good").is_none());
        assert!(parse_line("not json", "good").is_none());
    }

    #[test]
    fn parse_line_accepts_valid() {
        let m = parse_line(&line("good"), "good").unwrap();
        assert_eq!((m.terminal_id.as_str(), m.event.as_str()), ("t1", "shell-prompt"));
    }

    #[test]
    fn status_mapping_table() {
        use TermStatus::*;
        for (e, s) in [
            ("claude-UserPromptSubmit", Running),
            ("claude-PreToolUse", Running),
            ("claude-Notification", Waiting),
            ("claude-Stop", Waiting),
            ("claude-SessionEnd", Idle),
            ("shell-prompt", Idle),
            ("shell-exec", Running),
        ] {
            assert_eq!(status_for(e), Some(s), "{e}");
        }
        assert_eq!(status_for("claude-Unknown"), None);
    }

    #[test]
    fn waiting_transition_fires_once() {
        let mut m = StatusMap::default();
        assert!(m.apply("a", TermStatus::Waiting).unwrap().entered_waiting);
        assert!(m.apply("a", TermStatus::Waiting).is_none());
        assert_eq!(m.waiting_count(), 1);
        m.apply("a", TermStatus::Running);
        assert!(m.apply("a", TermStatus::Waiting).unwrap().entered_waiting);
        let t = m.clear_waiting("a").unwrap();
        assert_eq!(t.status, TermStatus::Idle);
        assert_eq!(m.waiting_count(), 0);
        assert!(m.clear_waiting("a").is_none());
    }

    #[test]
    fn socket_path_falls_back_when_too_long() {
        let long = PathBuf::from("a".repeat(120));
        assert_eq!(socket_path(&long, 501), PathBuf::from("/tmp/mdt-501/hooks.sock"));
        let short = PathBuf::from("/d");
        assert_eq!(socket_path(&short, 501), PathBuf::from("/d/terminal/hooks.sock"));
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn bind_replaces_stale_socket() {
        use tokio::io::AsyncWriteExt;
        let dir = std::env::temp_dir().join(format!("mdt-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("h.sock");
        std::fs::write(&path, b"stale").unwrap();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
        tokio::spawn(serve(path.clone(), "tok".into(), move |m| {
            let _ = tx.send(m.event);
        }));
        let mut stream = loop {
            if let Ok(s) = tokio::net::UnixStream::connect(&path).await {
                break s;
            }
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        };
        // no trailing newline: must still be parsed at EOF
        stream.write_all(line("tok").as_bytes()).await.unwrap();
        drop(stream);
        let ev = tokio::time::timeout(std::time::Duration::from_secs(1), rx.recv()).await.unwrap();
        assert_eq!(ev.as_deref(), Some("shell-prompt"));
        let _ = std::fs::remove_dir_all(&dir);
    }
}
