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
            // Replay from a line start when there is one; else keep the tail (a TUI or progress bar).
            if let Some(i) = self.buf.iter().position(|&b| b == b'\n') {
                self.buf.drain(..=i);
            }
        }
    }

    pub fn snapshot(&self) -> Vec<u8> {
        self.buf.clone()
    }
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SpawnRequest {
    pub id: String,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
    pub project_name: String,
    /// Open in this live terminal's current directory (OSC 7) when it has one.
    #[serde(default)]
    pub inherit_cwd_from: Option<String>,
    /// Scrollback replayed before the new shell's output (restored after a restart).
    #[serde(skip)]
    pub seed: Vec<u8>,
    /// Extra environment for a fresh session only (e.g. a DB password for `psql`). Held by the
    /// process alone: never typed into the shell, never saved. Checked by `extra_env_ok`.
    #[serde(default)]
    pub env: std::collections::BTreeMap<String, String>,
    /// Terminal project this pane belongs to (helper-pane opt-in is per project).
    #[serde(default)]
    pub project_id: Option<String>,
    /// Pane that started this one over the control socket. Never set by the UI.
    #[serde(skip)]
    pub parent: Option<String>,
}

/// Variables that would change how the shell itself starts or what it runs are refused.
pub fn extra_env_ok(name: &str, value: &str) -> bool {
    const DENY: &[&str] = &["PATH", "HOME", "SHELL", "USER", "LOGNAME", "TERM", "ZDOTDIR", "ENV", "BASH_ENV", "PROMPT_COMMAND", "IFS"];
    let valid_name = !name.is_empty()
        && name.len() <= 64
        && name.bytes().enumerate().all(|(i, b)| b == b'_' || b.is_ascii_uppercase() || b.is_ascii_lowercase() || (i > 0 && b.is_ascii_digit()));
    valid_name
        && !DENY.contains(&name)
        && !["LD_", "DYLD_", "MDT_", "BASH_FUNC_"].iter().any(|p| name.starts_with(p))
        && value.len() <= 64 * 1024
        && !value.contains('\0')
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnResult {
    pub id: String,
    pub cwd: String,
    pub cwd_fallback: bool,
    /// Agent that was running in this pane when the app last quit (offered to resume).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resume: Option<super::restore::Resume>,
}

struct Inner {
    scrollback: Scrollback,
    channel: Option<Channel<Value>>,
    /// `Some(code)` once the process has exited.
    exit: Option<Option<i32>>,
}

pub struct Session {
    pub project_name: String,
    pub project_id: Option<String>,
    /// Pane that started this one (ctl `run`); only it may drive this pane over the socket.
    pub parent: Option<String>,
    cwd: String,
    /// Last directory the shell reported (OSC 7).
    live_cwd: Mutex<Option<String>>,
    cwd_fallback: bool,
    pid: Option<u32>,
    inner: Mutex<Inner>,
    writer: Mutex<Box<dyn Write + Send>>,
    master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
    /// Claude's session id, from its hooks: lets a restored pane resume that exact conversation.
    pub agent_session: Mutex<Option<String>>,
    /// Rendered screen + agent status for `poll_agents`.
    det: Mutex<super::detect::Pane>,
    /// False from a control-socket `send` until the pane's status next changes: until then
    /// its status predates that input, so `wait` must not take it as an answer.
    fresh: std::sync::atomic::AtomicBool,
    /// `Some(code)` once the shell's last command finished (OSC 133 D); `None` while one runs.
    last_cmd: Mutex<Option<Option<i32>>>,
    /// The pane started work (a shell command, an agent turn) since the last control-socket input.
    worked: std::sync::atomic::AtomicBool,
    /// `on_child_closed` already reported this helper closed (an exit after that is not reported).
    closed_reported: std::sync::atomic::AtomicBool,
}

pub type JsonFn = Arc<dyn Fn(Value) + Send + Sync>;

/// Tell `f` that helper pane `id` ended; top-level panes are not reported. `closed`: removed
/// (reported once; the UI drops its pane); else its process exited (the pane and its session
/// stay, so the user sees the output and `wait` answers with the exit, until it's closed).
fn report_child_closed(f: Option<&JsonFn>, id: &str, s: &Session, closed: bool) {
    use std::sync::atomic::Ordering::SeqCst;
    if let (Some(f), Some(parent)) = (f, &s.parent) {
        let first = if closed { !s.closed_reported.swap(true, SeqCst) } else { !s.closed_reported.load(SeqCst) };
        if first {
            f(json!({"id": id, "parent": parent, "reason": if closed { "closed" } else { "exited" }}));
        }
    }
}

fn b64(bytes: &[u8]) -> Value {
    json!({"type": "data", "b64": base64::engine::general_purpose::STANDARD.encode(bytes)})
}

impl Session {
    fn exited(&self) -> bool {
        self.inner.lock().unwrap().exit.is_some()
    }

    /// `Some(exit code)` once the process has exited.
    pub fn exit_status(&self) -> Option<Option<i32>> {
        self.inner.lock().unwrap().exit
    }

    pub fn last_command(&self) -> Option<Option<i32>> {
        *self.last_cmd.lock().unwrap()
    }

    pub fn fresh(&self) -> bool {
        self.fresh.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn worked(&self) -> bool {
        self.worked.load(std::sync::atomic::Ordering::SeqCst)
    }

    /// Input from the control socket (a helper's command, `send`).
    pub fn send(&self, bytes: &[u8]) -> Result<(), String> {
        self.fresh.store(false, std::sync::atomic::Ordering::SeqCst);
        self.worked.store(false, std::sync::atomic::Ordering::SeqCst);
        self.write(bytes)
    }

    /// Last `lines` non-empty rows of the rendered screen.
    pub fn tail(&self, lines: usize) -> String {
        self.det.lock().unwrap().tail(lines)
    }

    /// The shell's current directory, else the one it started in.
    pub fn cwd(&self) -> String {
        self.live_cwd.lock().unwrap().clone().unwrap_or_else(|| self.cwd.clone())
    }

    /// Coding agent in the foreground right now (manifest id).
    pub fn agent(&self) -> Option<&'static str> {
        self.det.lock().unwrap().agent_id()
    }

    pub fn scrollback(&self) -> Vec<u8> {
        self.inner.lock().unwrap().scrollback.snapshot()
    }

    fn clear_scrollback(&self) {
        self.inner.lock().unwrap().scrollback = Scrollback::new(SCROLLBACK_CAP);
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
        self.det.lock().unwrap().resize(rows, cols);
        match self.master.lock().unwrap().as_ref() {
            Some(m) => m
                .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
                .map_err(|e| e.to_string()),
            None => Ok(()),
        }
    }

    /// Kill the whole process group (portable-pty setsid's the child, so pgid == pid),
    /// drop the master, and report exit now rather than waiting for reader EOF
    /// (background children may hold the slave open). No signals once exited: the
    /// reader reaped the child, so its pid (= pgid) may belong to someone else now.
    fn kill(&self) {
        if !self.exited() {
            #[cfg(unix)]
            if let Some(pid) = self.pid {
                unsafe {
                    libc::killpg(pid as i32, libc::SIGHUP);
                    libc::killpg(pid as i32, libc::SIGKILL);
                }
            }
            let _ = self.killer.lock().unwrap().kill();
        }
        self.master.lock().unwrap().take();
        self.mark_exit(None);
    }

    /// First exit wins; notifies the attached channel once.
    fn mark_exit(&self, code: Option<i32>) {
        let mut g = self.inner.lock().unwrap();
        if g.exit.is_some() {
            return;
        }
        g.exit = Some(code);
        if let Some(ch) = &g.channel {
            let _ = ch.send(json!({"type": "exit", "code": code}));
        }
    }
}

pub struct TerminalState {
    sessions: DashMap<String, Arc<Session>>,
    /// Per-launch secret the hook script must echo back over the socket.
    pub token: String,
    /// Per-launch key for the per-pane control tokens. Never exported or logged.
    ctl_secret: [u8; 32],
    pub statuses: Mutex<super::hooks::StatusMap>,
    /// Set once in `setup`; unset (e.g. in tests) → plain login shell.
    pub launch: std::sync::OnceLock<super::env::Launch>,
    /// Set once in `setup`; called with the terminal id when a session's process exits.
    pub on_exit: std::sync::OnceLock<Arc<dyn Fn(&str) + Send + Sync>>,
    /// Set once in `setup`; called for status the program reported in-band (OSC 133 / 7501).
    pub on_status: std::sync::OnceLock<StatusFn>,
    /// Set once in `setup`; called when a pane's foreground agent changes.
    pub on_agent: std::sync::OnceLock<AgentFn>,
    /// Set once in `setup`; told `{parent, id, name, cwd}` when a pane starts a helper (ctl `run`).
    pub on_spawn_child: std::sync::OnceLock<JsonFn>,
    /// Set once in `setup`; told `{id, parent, reason}` when a helper exits (`exited`) and once when it's closed (`closed`).
    pub on_child_closed: std::sync::OnceLock<JsonFn>,
    /// Projects whose agents may start helper panes (UI pref, `terminal_set_project_prefs`).
    pub spawn_projects: Mutex<std::collections::HashSet<String>>,
    /// Login shell for new panes (`$SHELL`).
    pub shell: String,
    /// Every status transition (`Some`) and exit/close (`None`) per pane, for ctl `wait`.
    pub bus: tokio::sync::broadcast::Sender<(String, Option<super::hooks::TermStatus>)>,
}

/// (pane, status, program's message, how a long shell command ended)
pub type StatusFn =
    Arc<dyn Fn(&str, super::hooks::Source, super::hooks::TermStatus, Option<String>, Option<super::osc::CmdEnd>) + Send + Sync>;
pub type AgentFn = Arc<dyn Fn(&str, Option<&str>) + Send + Sync>;

#[derive(Debug, PartialEq)]
pub enum AgentEvent {
    /// Pane's foreground agent changed (manifest id; `None`: back to the shell or unknown program).
    Agent(String, Option<&'static str>),
    Status(String, super::hooks::TermStatus),
}

impl Default for TerminalState {
    fn default() -> Self {
        let mut b = [0u8; 32];
        getrandom::fill(&mut b).expect("os rng");
        let mut ctl_secret = [0u8; 32];
        getrandom::fill(&mut ctl_secret).expect("os rng");
        Self {
            sessions: DashMap::new(),
            token: b.iter().map(|x| format!("{x:02x}")).collect(),
            ctl_secret,
            statuses: Mutex::default(),
            launch: std::sync::OnceLock::new(),
            on_exit: std::sync::OnceLock::new(),
            on_status: std::sync::OnceLock::new(),
            on_agent: std::sync::OnceLock::new(),
            on_spawn_child: std::sync::OnceLock::new(),
            on_child_closed: std::sync::OnceLock::new(),
            spawn_projects: Mutex::default(),
            shell: std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".into()),
            bus: tokio::sync::broadcast::channel(256).0,
        }
    }
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
            return Ok(SpawnResult { id: req.id, cwd: s.cwd.clone(), cwd_fallback: s.cwd_fallback, resume: None });
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
        let mut scrollback = Scrollback::new(SCROLLBACK_CAP);
        scrollback.push(&req.seed);
        drop(pair.slave);
        let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        let session = Arc::new(Session {
            project_name: req.project_name,
            project_id: req.project_id,
            parent: req.parent,
            cwd: cwd.clone(),
            cwd_fallback,
            live_cwd: Mutex::new(None),
            pid: child.process_id(),
            inner: Mutex::new(Inner { scrollback, channel: None, exit: None }),
            writer: Mutex::new(writer),
            master: Mutex::new(Some(pair.master)),
            killer: Mutex::new(child.clone_killer()),
            agent_session: Mutex::new(None),
            det: Mutex::new(super::detect::Pane::new(req.rows, req.cols)),
            fresh: true.into(),
            last_cmd: Mutex::new(None),
            worked: true.into(),
            closed_reported: false.into(),
        });

        let s = session.clone();
        let (id, on_exit, on_status) = (req.id.clone(), self.on_exit.get().cloned(), self.on_status.get().cloned());
        let (bus, on_child_closed) = (self.bus.clone(), self.on_child_closed.get().cloned());
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            let mut scanner = super::osc::Scanner::default();
            let mut found = Vec::new();
            let mut commands = super::osc::Commands::default();
            let status = |src, st, msg, cmd| {
                if let Some(f) = &on_status {
                    f(&id, src, st, msg, cmd)
                }
            };
            use super::hooks::Source::{Program, Shell};
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        {
                            let mut g = s.inner.lock().unwrap();
                            g.scrollback.push(&buf[..n]);
                            if let Some(ch) = &g.channel {
                                let _ = ch.send(b64(&buf[..n]));
                            }
                        }
                        s.det.lock().unwrap().feed(&buf[..n]);
                        scanner.feed(&buf[..n], &mut found);
                        for o in found.drain(..) {
                            match o {
                                super::osc::Osc::Cwd(c) => *s.live_cwd.lock().unwrap() = Some(c),
                                super::osc::Osc::Title(t) => s.det.lock().unwrap().set_title(t),
                                super::osc::Osc::Progress(p) => s.det.lock().unwrap().set_progress(p),
                                super::osc::Osc::CommandStart => {
                                    *s.last_cmd.lock().unwrap() = None;
                                    s.worked.store(true, std::sync::atomic::Ordering::SeqCst);
                                    s.det.lock().unwrap().take_agent_seen();
                                    commands.start(std::time::Instant::now());
                                    status(Shell, super::hooks::TermStatus::Running, None, None)
                                }
                                super::osc::Osc::CommandEnd(code) => {
                                    // The rc files send D before every prompt, the first one too:
                                    // only a D that closes a C is a finished command.
                                    if commands.running() {
                                        *s.last_cmd.lock().unwrap() = Some(code);
                                    }
                                    let agent = s.det.lock().unwrap().take_agent_seen();
                                    if let Some((st, cmd)) = commands.end(code, std::time::Instant::now(), agent) {
                                        status(Shell, st, None, Some(cmd))
                                    }
                                }
                                super::osc::Osc::Prompt => {
                                    if commands.prompt() {
                                        status(Shell, super::hooks::TermStatus::Idle, None, None)
                                    }
                                }
                                super::osc::Osc::Status(st, msg) => status(Program, st, msg, None),
                            }
                        }
                    }
                }
            }
            let code = child.wait().ok().map(|st| st.exit_code() as i32);
            s.mark_exit(code);
            if let Some(f) = on_exit {
                f(&id);
            }
            report_child_closed(on_child_closed.as_ref(), &id, &s, false);
            let _ = bus.send((id, None));
        });

        self.sessions.insert(req.id.clone(), session);
        Ok(SpawnResult { id: req.id, cwd, cwd_fallback, resume: None })
    }

    /// The user's shell with our integration (when set up) plus `req.env`, as the UI opens panes.
    pub fn spawn_shell(&self, mut req: SpawnRequest) -> Result<SpawnResult, String> {
        let extra = std::mem::take(&mut req.env);
        if let Some((k, _)) = extra.iter().find(|(k, v)| !extra_env_ok(k, v)) {
            return Err(format!("environment variable not allowed: {k}"));
        }
        let (argv, env) = match self.launch.get() {
            Some(l) => super::env::shell_launch(&self.shell, &l.res_dir, l.pane_env(&req.id, &self.token, &self.ctl_token(&req.id))),
            None => (vec![self.shell.clone(), "-l".into()], vec![]),
        };
        self.spawn(req, env.into_iter().chain(extra).collect(), argv)
    }

    /// The pane's control-socket token (`MDT_CTL_TOKEN`): keyed by a secret no pane sees,
    /// so nothing in one pane's env yields another pane's token.
    pub fn ctl_token(&self, pane_id: &str) -> String {
        super::ctl::hmac_sha256_hex(&self.ctl_secret, pane_id.as_bytes())
    }

    /// Kill and forget a session; `wait`ers see it closed.
    pub fn close(&self, id: &str) {
        if let Some((_, s)) = self.sessions.remove(id) {
            s.kill();
            report_child_closed(self.on_child_closed.get(), id, &s, true);
        }
        let _ = self.bus.send((id.to_string(), None));
    }

    /// Input reached pane `id` (see `StatusMap::new_input`).
    pub fn input(&self, id: &str) {
        self.statuses.lock().unwrap().new_input(id);
    }

    pub fn status_of(&self, id: &str) -> Option<super::hooks::TermStatus> {
        self.statuses.lock().unwrap().get(id)
    }

    /// A status transition was applied (see `hooks::apply_status_if_live`): wake `wait`ers.
    pub fn status_changed(&self, id: &str, status: super::hooks::TermStatus) {
        if let Some(s) = self.sessions.get(id) {
            s.fresh.store(true, std::sync::atomic::Ordering::SeqCst);
            if status == super::hooks::TermStatus::Running {
                s.worked.store(true, std::sync::atomic::Ordering::SeqCst);
            }
        }
        let _ = self.bus.send((id.to_string(), Some(status)));
    }

    /// Every session still in the layout (exited ones included), for saving at quit.
    pub fn all(&self) -> Vec<(String, Arc<Session>)> {
        self.sessions.iter().map(|e| (e.key().clone(), e.value().clone())).collect()
    }

    /// Which agent each pane runs, and screen-detected status changes (see `detect.rs`).
    /// `skip` names agents whose status comes another way (claude's hooks): identified, not scraped.
    pub fn poll_agents(&self, skip: impl Fn(&super::detect::Manifest) -> bool) -> Vec<AgentEvent> {
        let mut out = vec![];
        for (id, s) in self.all() {
            if s.exited() {
                continue;
            }
            // Foreground job; the shell itself in front means no agent.
            #[cfg(unix)]
            let fg = s.master.lock().unwrap().as_ref().and_then(|m| m.process_group_leader());
            #[cfg(not(unix))]
            let fg: Option<i32> = None;
            let fg = fg.filter(|p| Some(*p as u32) != s.pid);
            if s.det.lock().unwrap().pgid() != fg {
                // `ps` outside the lock so the reader thread isn't held up.
                let agent = fg.and_then(super::detect::cmdline).and_then(|c| super::detect::identify(&c));
                let mut det = s.det.lock().unwrap();
                let before = det.agent_id();
                det.set_agent(fg, agent, agent.is_some_and(|m| !skip(m)));
                if det.agent_id() != before {
                    out.push(AgentEvent::Agent(id.clone(), det.agent_id()));
                }
            }
            if let Some(st) = s.det.lock().unwrap().step() {
                out.push(AgentEvent::Status(id, st));
            }
        }
        out
    }

    /// Background thread feeding `poll_agents` results into `on_status` / `on_agent`.
    pub fn start_agent_poller(self: &Arc<Self>) {
        let state = self.clone();
        std::thread::spawn(move || loop {
            std::thread::sleep(std::time::Duration::from_millis(400));
            // Claude reports through our hooks whenever shell integration is on.
            let hooks = state.launch.get().is_some();
            for e in state.poll_agents(|m| hooks && m.id == "claude") {
                match e {
                    AgentEvent::Status(id, st) => {
                        if let Some(f) = state.on_status.get() {
                            f(&id, super::hooks::Source::Screen, st, None, None)
                        }
                    }
                    AgentEvent::Agent(id, agent) => {
                        if let Some(f) = state.on_agent.get() {
                            f(&id, agent)
                        }
                    }
                }
            }
        });
    }

    /// Panes `id` started over the control socket (exited ones too, until closed).
    pub fn children(&self, id: &str) -> Vec<String> {
        self.sessions.iter().filter(|e| e.parent.as_deref() == Some(id)).map(|e| e.key().clone()).collect()
    }

    pub fn is_live(&self, id: &str) -> bool {
        self.sessions.get(id).is_some_and(|s| !s.exited())
    }

    pub fn live_count(&self) -> usize {
        self.sessions.iter().filter(|s| !s.exited()).count()
    }

    pub fn kill_all(&self) {
        // Skip exited sessions: their pid (= pgid) may already be recycled.
        for s in self.sessions.iter().filter(|s| !s.exited()) {
            s.kill();
        }
    }
}

// ---- Tauri commands ----

#[tauri::command]
pub async fn terminal_spawn(
    state: tauri::State<'_, Arc<TerminalState>>,
    app_state: tauri::State<'_, crate::state::AppState>,
    mut req: SpawnRequest,
) -> Result<SpawnResult, String> {
    if state.sessions.contains_key(&req.id) {
        return state.spawn(req, vec![], vec![]);
    }
    // Directory preference: where this pane was at the last quit, then the pane it was
    // split from, then the project folder (spawn falls back to $HOME from there).
    let restored = super::restore::take(&app_state.db.lock().unwrap(), &req.id);
    let inherited = req.inherit_cwd_from.as_deref().and_then(|from| state.get(from).ok()).map(|s| s.cwd());
    let is_dir = |p: &String| std::path::Path::new(p).is_dir();
    if let Some(c) = restored.as_ref().and_then(|r| r.cwd.clone()).filter(is_dir).or(inherited.filter(is_dir)) {
        req.cwd = c;
    }
    let resume = restored.as_ref().and_then(|r| r.resume.clone());
    if let Some(r) = restored {
        req.seed = super::restore::seed(&r.bytes);
    }
    state.spawn_shell(req).map(|r| SpawnResult { resume, ..r })
}

/// Last lines of a pane's rendered screen (board previews); `lines` clamped to 1..=40.
#[tauri::command]
pub fn terminal_screen_tail(state: tauri::State<'_, Arc<TerminalState>>, id: String, lines: usize) -> Result<String, String> {
    Ok(state.get(&id)?.tail(lines.clamp(1, 40)))
}

#[tauri::command]
pub async fn terminal_attach(
    state: tauri::State<'_, Arc<TerminalState>>,
    id: String,
    channel: Channel<Value>,
) -> Result<(), String> {
    state.get(&id)?.attach(channel)
}

#[tauri::command]
pub async fn terminal_write(state: tauri::State<'_, Arc<TerminalState>>, id: String, b64: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD.decode(b64).map_err(|e| e.to_string())?;
    let s = state.get(&id)?;
    state.input(&id);
    s.write(&bytes)
}

#[tauri::command]
pub async fn terminal_clear_scrollback(state: tauri::State<'_, Arc<TerminalState>>, id: String) -> Result<(), String> {
    state.get(&id)?.clear_scrollback();
    Ok(())
}

#[tauri::command]
pub async fn terminal_resize(state: tauri::State<'_, Arc<TerminalState>>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    state.get(&id)?.resize(cols, rows)
}

#[tauri::command]
pub async fn terminal_kill(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<TerminalState>>,
    id: String,
) -> Result<(), String> {
    state.close(&id);
    super::notify::forget(&app, &id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{Duration, Instant};

    fn req(id: &str, cwd: &str) -> SpawnRequest {
        SpawnRequest { id: id.into(), cwd: cwd.into(), cols: 80, rows: 24, project_name: "p".into(), ..Default::default() }
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
        // No newline left (one huge line / full-screen TUI): keep the tail, don't wipe.
        let mut s = Scrollback::new(16);
        let long: Vec<u8> = (0..40u8).map(|i| b'a' + i % 26).collect();
        s.push(&long);
        let snap = s.snapshot();
        assert!(!snap.is_empty() && snap.len() <= 16);
        assert!(long.ends_with(&snap));
    }

    #[test]
    fn spawn_echo_streams_output() {
        let st = TerminalState::default();
        st.spawn(req("a", "/tmp"), vec![], sh("printf hello")).unwrap();
        let s = st.get("a").unwrap();
        assert!(wait_for(|| String::from_utf8_lossy(&s.scrollback()).contains("hello") && s.exited(), 2));
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

    #[test]
    fn on_exit_hook_fires_with_id() {
        let st = TerminalState::default();
        let (tx, rx) = std::sync::mpsc::channel();
        let tx = Mutex::new(tx);
        let _ = st.on_exit.set(Arc::new(move |id: &str| {
            let _ = tx.lock().unwrap().send(id.to_string());
        }));
        st.spawn(req("e", "/tmp"), vec![], sh("true")).unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(2)).unwrap(), "e");
    }

    #[cfg(unix)]
    #[test]
    fn kill_takes_down_background_children() {
        let st = TerminalState::default();
        st.spawn(req("d", "/tmp"), vec![], sh("sleep 30 & echo pid=$!; wait")).unwrap();
        let s = st.get("d").unwrap();
        let text = || String::from_utf8_lossy(&s.scrollback()).to_string();
        assert!(wait_for(|| text().contains("pid=") && text().contains('\n'), 2));
        let t = text();
        let pid: i32 = t.split("pid=").nth(1).unwrap().trim().lines().next().unwrap().trim().parse().unwrap();
        assert_eq!(unsafe { libc::kill(pid, 0) }, 0);
        st.kill_all();
        assert!(s.exited());
        assert!(wait_for(|| unsafe { libc::kill(pid, 0) } != 0, 1));
    }

    #[cfg(unix)]
    #[test]
    fn kill_after_exit_spares_recycled_pgid() {
        use std::os::unix::process::CommandExt;
        let st = TerminalState::default();
        st.spawn(req("r", "/tmp"), vec![], sh("true")).unwrap();
        let (_, mut s) = st.sessions.remove("r").unwrap();
        // Reader thread done (child reaped, exit marked) once we hold the only Arc.
        assert!(wait_for(|| Arc::strong_count(&s) == 1, 2));
        // Simulate pid reuse: the exited session's pid is now another group's leader.
        let mut other = std::process::Command::new("sleep").arg("30").process_group(0).spawn().unwrap();
        Arc::get_mut(&mut s).unwrap().pid = Some(other.id());
        s.kill();
        std::thread::sleep(Duration::from_millis(100)); // let a stray SIGKILL land
        let alive = other.try_wait().unwrap().is_none();
        let _ = other.kill();
        let _ = other.wait();
        assert!(alive, "kill() on an exited session signalled a recycled process group");
    }

    /// Real PTY + our zsh integration: prompt marks drive status, OSC 7 drives `cwd()`.
    #[test]
    fn zsh_in_pty_reports_status_and_cwd() {
        if !std::path::Path::new("/bin/zsh").exists() {
            return;
        }
        let res = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources");
        let home = std::env::temp_dir().join(format!("mdt-pty-zsh-{}", std::process::id()));
        std::fs::create_dir_all(&home).unwrap();
        let app = |k: &str| match k {
            "PATH" => Some("/usr/bin:/bin".to_string()),
            "HOME" => Some(home.display().to_string()),
            _ => None,
        };
        let (argv, mut env) = super::super::env::shell_launch_with("/bin/zsh", &res, vec![], &app);
        env.push(("HOME".into(), home.display().to_string()));
        let st = TerminalState::default();
        let (tx, rx) = std::sync::mpsc::channel();
        let tx = Mutex::new(tx);
        let _ = st.on_status.set(Arc::new(move |_: &str, _, s, _, _| {
            let _ = tx.lock().unwrap().send(s);
        }));
        st.spawn(req("z", "/tmp"), env, argv).unwrap();
        let next = || rx.recv_timeout(Duration::from_secs(5)).unwrap();
        assert_eq!(next(), super::super::hooks::TermStatus::Idle, "first prompt");
        st.get("z").unwrap().write(b"cd /usr\n").unwrap();
        assert_eq!(next(), super::super::hooks::TermStatus::Running);
        assert_eq!(next(), super::super::hooks::TermStatus::Idle);
        let s = st.get("z").unwrap();
        assert!(wait_for(|| s.cwd() == "/usr", 2), "cwd {}", s.cwd());
        st.kill_all();
        let _ = std::fs::remove_dir_all(&home);
    }

    /// Real PTY: a job-controlled foreground program named `gemini` is identified
    /// via `ps` and its screen drives working → (held idle) → waiting.
    #[test]
    fn foreground_agent_screen_drives_status() {
        use super::super::hooks::TermStatus;
        let dir = std::env::temp_dir().join(format!("mdt-agent-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let fake = dir.join("gemini");
        std::fs::write(&fake, "#!/bin/sh\nprintf 'esc to cancel'; sleep 1\nprintf '\\033[2J\\033[H> Type your message'; sleep 30\n").unwrap();
        std::fs::set_permissions(&fake, std::os::unix::fs::PermissionsExt::from_mode(0o755)).unwrap();
        let st = TerminalState::default();
        let script = format!("set -m; '{}'", fake.display());
        st.spawn(req("a", "/tmp"), vec![], vec!["/bin/bash".into(), "-c".into(), script]).unwrap();
        let (mut seen, mut agents) = (vec![], vec![]);
        let end = Instant::now() + Duration::from_secs(5);
        while Instant::now() < end && !seen.contains(&TermStatus::Done) {
            for e in st.poll_agents(|_| false) {
                match e {
                    AgentEvent::Status(_, s) => seen.push(s),
                    AgentEvent::Agent(_, a) => agents.push(a),
                }
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        st.kill_all();
        let _ = std::fs::remove_dir_all(&dir);
        // An Idle may come first if a poll lands before the program's first output.
        assert!(seen.ends_with(&[TermStatus::Running, TermStatus::Done]), "{seen:?}");
        assert_eq!(agents, vec![Some("gemini")]);
    }

    #[test]
    fn extra_env_names_and_values() {
        assert!(extra_env_ok("PGPASSWORD", "s3cret"));
        assert!(extra_env_ok("my_token_2", ""));
        for bad in ["PATH", "HOME", "ZDOTDIR", "BASH_ENV", "LD_PRELOAD", "DYLD_INSERT_LIBRARIES", "MDT_TERMINAL_ID", "2FA", "A-B", "", "BASH_FUNC_x%%"] {
            assert!(!extra_env_ok(bad, "x"), "{bad}");
        }
        assert!(!extra_env_ok("TOKEN", "a\0b"));
        assert!(!extra_env_ok("TOKEN", &"x".repeat(64 * 1024 + 1)));
    }

    #[test]
    fn extra_env_reaches_the_process() {
        let st = TerminalState::default();
        let env = vec![("MDT_TEST_SECRET_ENV".to_string(), "hunter2".to_string())];
        st.spawn(req("e", "/tmp"), env, sh("printf %s \"$MDT_TEST_SECRET_ENV\"")).unwrap();
        let s = st.get("e").unwrap();
        assert!(wait_for(|| String::from_utf8_lossy(&s.scrollback()).contains("hunter2"), 3));
        st.kill_all();
    }
}
