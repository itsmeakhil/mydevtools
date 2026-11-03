//! PTY sessions with a bounded scrollback so the UI can detach/re-attach.

use base64::Engine;
use dashmap::DashMap;
use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;

const SCROLLBACK_CAP: usize = 2 * 1024 * 1024;

/// Byte ring bounded by `cap`; when trimmed, drops through the first newline
/// so a replay never starts mid-line.
pub struct Scrollback {
    cap: usize,
    buf: Vec<u8>,
}

impl Scrollback {
    pub fn new(cap: usize) -> Self {
        Self { cap, buf: Vec::new() }
    }

    // ponytail: Vec::drain front is O(cap) per trim; swap for VecDeque if output rates make it show.
    pub fn push(&mut self, bytes: &[u8]) {
        self.buf.extend_from_slice(bytes);
        if self.buf.len() > self.cap {
            let excess = self.buf.len() - self.cap;
            self.buf.drain(..excess);
            let cut = self.buf.iter().position(|&b| b == b'\n').map_or(self.buf.len(), |i| i + 1);
            self.buf.drain(..cut);
        }
    }

    pub fn snapshot(&self) -> Vec<u8> {
        self.buf.clone()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnRequest {
    pub id: String,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
    pub project_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnResult {
    pub id: String,
    pub cwd: String,
    pub cwd_fallback: bool,
}

struct Inner {
    scrollback: Scrollback,
    channel: Option<Channel<Value>>,
    /// `Some(code)` once the process has exited.
    exit: Option<Option<i32>>,
}

pub struct Session {
    #[allow(dead_code)] // read by Task 6 notification titles
    pub project_name: String,
    cwd: String,
    cwd_fallback: bool,
    inner: Mutex<Inner>,
    writer: Mutex<Box<dyn Write + Send>>,
    master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
}

fn b64(bytes: &[u8]) -> Value {
    json!({"type": "data", "b64": base64::engine::general_purpose::STANDARD.encode(bytes)})
}

impl Session {
    #[cfg(test)]
    fn snapshot(&self) -> Vec<u8> {
        self.inner.lock().unwrap().scrollback.snapshot()
    }

    #[allow(dead_code)] // used by live_count (Task 6)
    fn exited(&self) -> bool {
        self.inner.lock().unwrap().exit.is_some()
    }

    /// Replay scrollback to `channel`, then make it the live sink. Under one
    /// lock so no output is lost or duplicated between snapshot and stream.
    fn attach(&self, channel: Channel<Value>) -> Result<(), String> {
        let mut g = self.inner.lock().unwrap();
        channel.send(b64(&g.scrollback.snapshot())).map_err(|e| e.to_string())?;
        if let Some(code) = g.exit {
            let _ = channel.send(json!({"type": "exit", "code": code}));
        }
        g.channel = Some(channel);
        Ok(())
    }

    fn write(&self, bytes: &[u8]) -> Result<(), String> {
        let mut w = self.writer.lock().unwrap();
        w.write_all(bytes).and_then(|_| w.flush()).map_err(|e| e.to_string())
    }

    fn resize(&self, cols: u16, rows: u16) -> Result<(), String> {
        match self.master.lock().unwrap().as_ref() {
            Some(m) => m
                .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
                .map_err(|e| e.to_string()),
            None => Ok(()),
        }
    }

    fn kill(&self) {
        let _ = self.killer.lock().unwrap().kill();
        self.master.lock().unwrap().take();
    }
}

#[derive(Default)]
pub struct TerminalState {
    sessions: DashMap<String, Arc<Session>>,
}

impl TerminalState {
    pub fn get(&self, id: &str) -> Result<Arc<Session>, String> {
        self.sessions.get(id).map(|s| s.clone()).ok_or_else(|| format!("no terminal session {id}"))
    }

    pub fn spawn(
        &self,
        req: SpawnRequest,
        env: Vec<(String, String)>,
        argv: Vec<String>,
    ) -> Result<SpawnResult, String> {
        if let Some(s) = self.sessions.get(&req.id) {
            return Ok(SpawnResult { id: req.id, cwd: s.cwd.clone(), cwd_fallback: s.cwd_fallback });
        }
        let (cwd, cwd_fallback) = if !req.cwd.is_empty() && std::path::Path::new(&req.cwd).is_dir() {
            (req.cwd.clone(), false)
        } else {
            (std::env::var("HOME").unwrap_or_else(|_| "/".into()), true)
        };
        let (program, args) = argv.split_first().ok_or("empty argv")?;
        let mut cmd = CommandBuilder::new(program);
        cmd.args(args);
        cmd.cwd(&cwd);
        for (k, v) in env {
            cmd.env(k, v);
        }
        cmd.env("TERM", "xterm-256color");
        cmd.env("COLORTERM", "truecolor");

        let pair = native_pty_system()
            .openpty(PtySize { rows: req.rows, cols: req.cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|e| e.to_string())?;
        let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
        drop(pair.slave);
        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session = Arc::new(Session {
            project_name: req.project_name,
            cwd: cwd.clone(),
            cwd_fallback,
            inner: Mutex::new(Inner { scrollback: Scrollback::new(SCROLLBACK_CAP), channel: None, exit: None }),
            writer: Mutex::new(writer),
            master: Mutex::new(Some(pair.master)),
            killer: Mutex::new(child.clone_killer()),
        });

        let s = session.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let mut g = s.inner.lock().unwrap();
                        g.scrollback.push(&buf[..n]);
                        if let Some(ch) = &g.channel {
                            let _ = ch.send(b64(&buf[..n]));
                        }
                    }
                }
            }
            let code = child.wait().ok().map(|st| st.exit_code() as i32);
            let mut g = s.inner.lock().unwrap();
            g.exit = Some(code);
            if let Some(ch) = &g.channel {
                let _ = ch.send(json!({"type": "exit", "code": code}));
            }
        });

        self.sessions.insert(req.id.clone(), session);
        Ok(SpawnResult { id: req.id, cwd, cwd_fallback })
    }

    #[allow(dead_code)] // Task 6
    pub fn live_count(&self) -> usize {
        self.sessions.iter().filter(|s| !s.exited()).count()
    }

    #[allow(dead_code)] // Task 6
    pub fn kill_all(&self) {
        for s in self.sessions.iter() {
            s.kill();
        }
    }
}

// ---- Tauri commands ----

fn default_launch() -> Vec<String> {
    // Interim: Task 3 replaces this with env::shell_launch.
    vec![std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into()), "-l".into()]
}

#[tauri::command]
pub fn terminal_spawn(
    state: tauri::State<'_, Arc<TerminalState>>,
    req: SpawnRequest,
) -> Result<SpawnResult, String> {
    state.spawn(req, vec![], default_launch())
}

#[tauri::command]
pub fn terminal_attach(
    state: tauri::State<'_, Arc<TerminalState>>,
    id: String,
    channel: Channel<Value>,
) -> Result<(), String> {
    state.get(&id)?.attach(channel)
}

#[tauri::command]
pub fn terminal_write(state: tauri::State<'_, Arc<TerminalState>>, id: String, b64: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD.decode(b64).map_err(|e| e.to_string())?;
    state.get(&id)?.write(&bytes)
}

#[tauri::command]
pub fn terminal_resize(state: tauri::State<'_, Arc<TerminalState>>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    state.get(&id)?.resize(cols, rows)
}

#[tauri::command]
pub fn terminal_kill(state: tauri::State<'_, Arc<TerminalState>>, id: String) -> Result<(), String> {
    if let Some((_, s)) = state.sessions.remove(&id) {
        s.kill();
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    fn req(id: &str, cwd: &str) -> SpawnRequest {
        SpawnRequest { id: id.into(), cwd: cwd.into(), cols: 80, rows: 24, project_name: "p".into() }
    }
    fn sh(cmd: &str) -> Vec<String> {
        vec!["/bin/sh".into(), "-c".into(), cmd.into()]
    }
    fn wait_for(f: impl Fn() -> bool, secs: u64) -> bool {
        let end = Instant::now() + Duration::from_secs(secs);
        while Instant::now() < end {
            if f() { return true; }
            std::thread::sleep(Duration::from_millis(20));
        }
        f()
    }

    #[test]
    fn scrollback_bounded_and_replay_starts_at_line() {
        let mut s = Scrollback::new(16);
        s.push(b"aaaa\nbbbb\ncccc\ndddd\n");
        let snap = s.snapshot();
        assert!(snap.len() <= 16);
        assert!(snap.starts_with(b"cccc") || snap.starts_with(b"bbbb") || snap.starts_with(b"dddd"));
        let mut s = Scrollback::new(16);
        let e = "é".as_bytes();
        s.push(&e[..1]);
        s.push(&e[1..]);
        assert_eq!(s.snapshot(), e);
    }

    #[test]
    fn spawn_echo_streams_output() {
        let st = TerminalState::default();
        st.spawn(req("a", "/tmp"), vec![], sh("printf hello")).unwrap();
        let s = st.get("a").unwrap();
        assert!(wait_for(|| String::from_utf8_lossy(&s.snapshot()).contains("hello") && s.exited(), 2));
    }

    #[test]
    fn spawn_missing_cwd_falls_back_to_home() {
        let st = TerminalState::default();
        let r = st.spawn(req("b", "/nonexistent-mdt-xyz"), vec![], sh("true")).unwrap();
        assert!(r.cwd_fallback);
        assert_eq!(r.cwd, std::env::var("HOME").unwrap());
    }

    #[test]
    fn kill_all_ends_sessions() {
        let st = TerminalState::default();
        st.spawn(req("c", "/tmp"), vec![], sh("sleep 30")).unwrap();
        assert_eq!(st.live_count(), 1);
        st.kill_all();
        assert!(wait_for(|| st.live_count() == 0, 1));
    }
}
