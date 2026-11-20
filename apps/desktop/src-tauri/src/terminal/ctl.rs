//! Control socket: lets an agent in one pane start and drive helper panes, and only those.
//! One JSON request line in (`{token, caller, op, ...}`), one JSON line out. Only `run` and
//! `list` act on the caller itself; every other op needs a pane the caller started.

use super::hooks::TermStatus;
use super::pty::{Session, SpawnRequest, TerminalState};
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

const MAX_REQUEST: u64 = 64 * 1024;
const OP_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_WAIT_S: u64 = 600;
const MAX_CHILDREN: usize = 4;
const TAIL_LINES: usize = 40;

#[derive(Deserialize, Default)]
#[serde(default)]
struct Req {
    token: String,
    caller: String,
    op: String,
    id: String,
    command: String,
    name: Option<String>,
    worktree: Option<String>,
    text: String,
    lines: Option<usize>,
    until: Option<String>,
    timeout_s: Option<u64>,
}

fn err(msg: &str) -> Value {
    json!({"error": msg})
}

/// Answer one request. Never logs: requests carry the token.
pub async fn handle(st: &Arc<TerminalState>, line: &str) -> Value {
    let Ok(r) = serde_json::from_str::<Req>(line) else { return err("bad request") };
    if r.token != st.token {
        return err("bad token");
    }
    if !st.is_live(&r.caller) {
        return err("unknown caller");
    }
    let op = r.op.clone();
    if op == "run" || op == "list" {
        return blocking(st, move |st| if op == "run" { run(st, r) } else { list(st, &r.caller) }).await;
    }
    if !["send", "read", "wait", "close"].contains(&op.as_str()) {
        return err("unknown op");
    }
    // Missing, foreign and own panes all look the same: no existence leak.
    let s = match st.get(&r.id) {
        Ok(s) if s.parent.as_deref() == Some(r.caller.as_str()) => s,
        _ => return err("not your pane"),
    };
    match op.as_str() {
        "wait" => {
            let until = r.until.as_deref().unwrap_or("done");
            if !["blocked", "done", "idle", "exit"].contains(&until) {
                return err("until must be blocked, done, idle or exit");
            }
            let timeout = Duration::from_secs(r.timeout_s.unwrap_or(MAX_WAIT_S).min(MAX_WAIT_S));
            wait(st, &s, &r.id, until, timeout).await
        }
        "read" => json!({"tail": s.tail(r.lines.unwrap_or(TAIL_LINES).clamp(1, 500))}),
        "send" => blocking(st, move |_| match s.send(r.text.as_bytes()) {
            Ok(()) => json!({"ok": true}),
            Err(e) => err(&e),
        })
        .await,
        _ => blocking(st, move |st| {
            st.close(&r.id);
            json!({"ok": true})
        })
        .await,
    }
}

/// Sync work (PTY writes can block, git can be slow) off the async workers, bounded to 10 s.
async fn blocking(st: &Arc<TerminalState>, f: impl FnOnce(&TerminalState) -> Value + Send + 'static) -> Value {
    let st = st.clone();
    match tokio::time::timeout(OP_TIMEOUT, tokio::task::spawn_blocking(move || f(&st))).await {
        Ok(Ok(v)) => v,
        Ok(Err(_)) => err("internal error"),
        Err(_) => err("timed out"),
    }
}

// ponytail: one global lock makes check-then-spawn atomic; per-caller locks if run ever gets hot.
static RUN: Mutex<()> = Mutex::new(());

fn run(st: &TerminalState, r: Req) -> Value {
    let _g = RUN.lock().unwrap_or_else(|e| e.into_inner());
    let Ok(caller) = st.get(&r.caller) else { return err("unknown caller") };
    let allowed = caller.project_id.as_ref().is_some_and(|p| st.spawn_projects.lock().unwrap().contains(p));
    if !allowed {
        return err("helper panes are off for this project");
    }
    if r.command.trim().is_empty() {
        return err("command required");
    }
    if st.children(&r.caller).iter().filter(|c| st.is_live(c)).count() >= MAX_CHILDREN {
        return err(&format!("helper limit reached ({MAX_CHILDREN})"));
    }
    let cwd = match &r.worktree {
        Some(task) => match super::git::worktree_add(Path::new(&caller.cwd()), task) {
            Ok(w) => w.path,
            Err(e) => return err(&e),
        },
        None => caller.cwd(),
    };
    let id = uuid::Uuid::new_v4().to_string();
    let req = SpawnRequest {
        id: id.clone(),
        cwd,
        cols: 80,
        rows: 24,
        project_name: caller.project_name.clone(),
        project_id: caller.project_id.clone(),
        parent: Some(r.caller.clone()),
        ..Default::default()
    };
    let res = match st.spawn_shell(req) {
        Ok(res) => res,
        Err(e) => return err(&e),
    };
    // Typeahead: the shell runs it once it has started.
    if let Err(e) = st.get(&id).and_then(|s| s.send(format!("{}\r", r.command).as_bytes())) {
        st.close(&id);
        return err(&e);
    }
    if let Some(f) = st.on_spawn_child.get() {
        f(json!({"parent": r.caller, "id": id, "name": r.name, "cwd": res.cwd}));
    }
    json!({"id": id})
}

fn name(s: TermStatus) -> &'static str {
    match s {
        TermStatus::Idle => "idle",
        TermStatus::Running => "running",
        TermStatus::Waiting => "blocked",
        TermStatus::Done => "done",
    }
}

fn list(st: &TerminalState, caller: &str) -> Value {
    let panes = st.children(caller).into_iter().filter_map(|id| {
        let s = st.get(&id).ok()?;
        Some(match s.exit_status() {
            Some(code) => json!({"id": id, "status": "exit", "exit_code": code}),
            None => json!({"id": id, "status": st.status_of(&id).map_or("unknown", name)}),
        })
    });
    Value::Array(panes.collect())
}

/// What `wait` returns for this state, if it is one to stop at. Blocked always stops it
/// (a blocked helper won't move on by itself), as do exit and close.
fn outcome(st: &TerminalState, s: &Session, id: &str, until: &str, status: Option<TermStatus>) -> Option<(&'static str, Option<i32>)> {
    if st.get(id).is_err() {
        return Some(("closed", None));
    }
    if let Some(code) = s.exit_status() {
        return Some(("exit", code));
    }
    let status = status?;
    // Some(code) once the shell's last command has finished (OSC 133 D).
    let last = s.last_command();
    let hit = match (until, status) {
        (_, TermStatus::Waiting) => true,
        ("done", TermStatus::Done) | ("idle", TermStatus::Idle | TermStatus::Done) => true,
        // Back at the prompt after a command: done (short commands never report Done).
        ("done", TermStatus::Idle) => last.is_some(),
        _ => false,
    };
    hit.then(|| (name(status), last.flatten()))
}

async fn wait(st: &Arc<TerminalState>, s: &Arc<Session>, id: &str, until: &str, timeout: Duration) -> Value {
    let start = Instant::now();
    let reply = |(status, code): (&str, Option<i32>)| {
        let mut v = json!({"status": status, "duration_ms": start.elapsed().as_millis() as u64, "tail": s.tail(TAIL_LINES)});
        if let Some(c) = code {
            v["exit_code"] = json!(c);
        }
        v
    };
    // Subscribe before reading the current state so nothing slips between the two.
    let mut rx = st.bus.subscribe();
    // The current status counts only if it postdates our last input to the pane.
    let current = || if s.fresh() { st.status_of(id) } else { None };
    let mut status = current();
    let deadline = tokio::time::Instant::now() + timeout;
    loop {
        if let Some(o) = outcome(st, s, id, until, status) {
            return reply(o);
        }
        status = match tokio::time::timeout_at(deadline, rx.recv()).await {
            Err(_) => return reply(("timeout", None)),
            Ok(Ok((i, got))) => (i == id).then_some(got).flatten(),
            Ok(Err(_)) => current(), // lagged: resync
        };
    }
}

/// `ctl.sock` beside the hook socket (same private dir, shorter name, so it fits too).
pub fn socket_path(hook_socket: &Path) -> PathBuf {
    hook_socket.with_file_name("ctl.sock")
}

#[cfg(unix)]
pub async fn serve(path: PathBuf, st: Arc<TerminalState>) -> Result<(), String> {
    use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
    let listener = super::hooks::bind_private(&path)?;
    loop {
        let stream = match listener.accept().await {
            Ok((s, _)) => s,
            Err(e) => {
                eprintln!("terminal ctl accept failed: {e}");
                tokio::time::sleep(Duration::from_millis(50)).await;
                continue;
            }
        };
        let st = st.clone();
        tokio::spawn(async move {
            // One request per connection: read one line (≤ 64 KiB, 10 s), answer, close.
            let (rd, mut wr) = stream.into_split();
            let mut buf = Vec::new();
            let mut rd = BufReader::new(rd.take(MAX_REQUEST));
            let Ok(Ok(n)) = tokio::time::timeout(OP_TIMEOUT, rd.read_until(b'\n', &mut buf)).await else { return };
            let reply = if n as u64 >= MAX_REQUEST && buf.last() != Some(&b'\n') {
                err("request too large")
            } else {
                handle(&st, &String::from_utf8_lossy(&buf)).await
            };
            let _ = tokio::time::timeout(OP_TIMEOUT, wr.write_all(format!("{reply}\n").as_bytes())).await;
        });
    }
}

#[cfg(not(unix))]
pub async fn serve(_: PathBuf, _: Arc<TerminalState>) -> Result<(), String> {
    Ok(())
}

/// Spawn the control server (call from `setup`); returns its socket path.
pub fn start(hook_socket: &Path, st: Arc<TerminalState>) -> PathBuf {
    let path = socket_path(hook_socket);
    let p = path.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = serve(p, st).await {
            eprintln!("terminal control socket disabled: {e}");
        }
    });
    path
}

/// UI pref: may agents in this project's panes start helper panes?
#[tauri::command]
pub fn terminal_set_project_prefs(state: tauri::State<'_, Arc<TerminalState>>, project_id: String, agents_can_spawn: bool) {
    let mut set = state.spawn_projects.lock().unwrap();
    if agents_can_spawn {
        set.insert(project_id);
    } else {
        set.remove(&project_id);
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::terminal::hooks::{apply_status_if_live, Source, TermStatus, ALL_STATES};
    use crate::terminal::pty::SpawnRequest;
    use std::time::{Duration, Instant};

    fn state() -> Arc<TerminalState> {
        let mut st = TerminalState::default();
        st.shell = "/bin/sh".into();
        Arc::new(st)
    }

    /// A live top-level pane (what the UI spawns) in `project`.
    fn pane(st: &TerminalState, id: &str, project: Option<&str>) {
        let req = SpawnRequest {
            id: id.into(),
            cwd: "/tmp".into(),
            cols: 80,
            rows: 24,
            project_id: project.map(Into::into),
            ..Default::default()
        };
        st.spawn(req, vec![], vec!["/bin/sh".into(), "-c".into(), "sleep 30".into()]).unwrap();
    }

    fn opt_in(st: &TerminalState, project: &str) {
        st.spawn_projects.lock().unwrap().insert(project.into());
    }

    async fn call(st: &Arc<TerminalState>, caller: &str, op: &str, args: Value) -> Value {
        let mut req = json!({"token": st.token, "caller": caller, "op": op});
        req.as_object_mut().unwrap().extend(args.as_object().unwrap().clone());
        handle(st, &req.to_string()).await
    }

    async fn run(st: &Arc<TerminalState>, caller: &str, command: &str) -> String {
        let r = call(st, caller, "run", json!({"command": command})).await;
        r["id"].as_str().unwrap_or_else(|| panic!("run failed: {r}")).to_string()
    }

    fn not_yours() -> Value {
        json!({"error": "not your pane"})
    }

    #[tokio::test]
    async fn rejects_bad_token_and_unknown_caller() {
        let st = state();
        pane(&st, "a", Some("p"));
        opt_in(&st, "p");
        let bad = json!({"token": "nope", "caller": "a", "op": "list"}).to_string();
        assert_eq!(handle(&st, &bad).await, json!({"error": "bad token"}));
        let bad = json!({"token": st.token, "caller": "ghost", "op": "list"}).to_string();
        assert_eq!(handle(&st, &bad).await, json!({"error": "unknown caller"}));
        assert_eq!(handle(&st, "not json").await, json!({"error": "bad request"}));
        // An exited pane is not a caller either.
        st.spawn(SpawnRequest { id: "x".into(), cwd: "/tmp".into(), cols: 80, rows: 24, ..Default::default() }, vec![], vec!["/bin/sh".into(), "-c".into(), "true".into()]).unwrap();
        let end = Instant::now() + Duration::from_secs(2);
        while st.is_live("x") && Instant::now() < end {
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
        assert_eq!(call(&st, "x", "list", json!({})).await, json!({"error": "unknown caller"}));
        assert_eq!(call(&st, "a", "list", json!({})).await, json!([]));
        assert_eq!(call(&st, "a", "bogus", json!({})).await, json!({"error": "unknown op"}));
        st.kill_all();
    }

    #[tokio::test]
    async fn run_requires_opt_in_and_caps_children() {
        let st = state();
        let events = Arc::new(std::sync::Mutex::new(vec![]));
        let ev = events.clone();
        let _ = st.on_spawn_child.set(Arc::new(move |v| ev.lock().unwrap().push(v)));
        pane(&st, "a", Some("p"));
        pane(&st, "n", None);
        let off = json!({"error": "helper panes are off for this project"});
        assert_eq!(call(&st, "a", "run", json!({"command": "sleep 30"})).await, off);
        opt_in(&st, "n"); // a pane with no project is never opted in
        assert_eq!(call(&st, "n", "run", json!({"command": "sleep 30"})).await, off);
        opt_in(&st, "p");
        assert_eq!(call(&st, "a", "run", json!({"command": ""})).await, json!({"error": "command required"}));
        let mut ids = vec![];
        for _ in 0..4 {
            ids.push(run(&st, "a", "sleep 30").await);
        }
        assert_eq!(call(&st, "a", "run", json!({"command": "sleep 30"})).await, json!({"error": "helper limit reached (4)"}));
        let mut kids = st.children("a");
        kids.sort();
        let mut want = ids.clone();
        want.sort();
        assert_eq!(kids, want);
        let list = call(&st, "a", "list", json!({})).await;
        assert_eq!(list.as_array().unwrap().len(), 4, "{list}");
        {
            let ev = events.lock().unwrap();
            assert_eq!(ev.len(), 4);
            assert_eq!(ev[0], json!({"parent": "a", "id": ids[0], "name": null, "cwd": "/tmp"}));
        }
        // A helper inherits its parent's project, so it can be scoped the same way.
        assert_eq!(st.get(&ids[0]).unwrap().project_id.as_deref(), Some("p"));
        // The cap counts live helpers: closing one frees a slot.
        assert_eq!(call(&st, "a", "close", json!({"id": ids[0]})).await, json!({"ok": true}));
        let r = call(&st, "a", "run", json!({"command": "sleep 30", "name": "tests"})).await;
        assert!(r["id"].is_string(), "{r}");
        assert_eq!(events.lock().unwrap().last().unwrap()["name"], "tests");
        // Opting out stops new helpers.
        st.spawn_projects.lock().unwrap().remove("p");
        assert_eq!(call(&st, "a", "run", json!({"command": "sleep 30"})).await, off);
        st.kill_all();
    }

    #[tokio::test]
    async fn cannot_touch_foreign_pane() {
        let st = state();
        opt_in(&st, "p");
        pane(&st, "a", Some("p"));
        pane(&st, "b", Some("p"));
        let h = run(&st, "a", "sleep 30").await;
        for (op, args) in [
            ("send", json!({"id": h, "text": "x"})),
            ("read", json!({"id": h, "lines": 5})),
            ("wait", json!({"id": h, "until": "done", "timeout_s": 1})),
            ("close", json!({"id": h})),
        ] {
            assert_eq!(call(&st, "b", op, args.clone()).await, not_yours(), "b {op} on a's helper");
        }
        // Not itself, not a sibling, not a pane that doesn't exist.
        for id in ["a", "b", "nope"] {
            assert_eq!(call(&st, "a", "read", json!({"id": id})).await, not_yours(), "a read {id}");
            assert_eq!(call(&st, "a", "close", json!({"id": id})).await, not_yours(), "a close {id}");
        }
        assert!(st.is_live(&h) && st.is_live("a") && st.is_live("b"));
        assert_eq!(call(&st, "b", "list", json!({})).await, json!([]));
        assert!(call(&st, "a", "read", json!({"id": h})).await["tail"].is_string());
        st.kill_all();
    }

    #[tokio::test]
    async fn wait_returns_when_child_exits_or_is_closed() {
        let st = state();
        opt_in(&st, "p");
        pane(&st, "a", Some("p"));
        let h = run(&st, "a", "sleep 30").await;
        let (st2, h2) = (st.clone(), h.clone());
        let w = tokio::spawn(async move { call(&st2, "a", "wait", json!({"id": h2, "until": "done", "timeout_s": 30})).await });
        tokio::time::sleep(Duration::from_millis(200)).await;
        assert_eq!(call(&st, "a", "close", json!({"id": h})).await, json!({"ok": true}));
        let r = tokio::time::timeout(Duration::from_secs(1), w).await.expect("wait hung after close").unwrap();
        assert_eq!(r["status"], "closed", "{r}");
        assert!(st.children("a").is_empty());
        // The helper's shell exits by itself.
        let h = run(&st, "a", "exit 7").await;
        let r = call(&st, "a", "wait", json!({"id": h, "until": "done", "timeout_s": 5})).await;
        assert_eq!((r["status"].as_str(), r["exit_code"].as_i64()), (Some("exit"), Some(7)), "{r}");
        st.kill_all();
    }

    #[tokio::test]
    async fn wait_done_returns_tail_and_exit_code() {
        let st = state();
        let weak = Arc::downgrade(&st);
        let _ = st.on_status.set(Arc::new(move |id: &str, src, s, _, _| {
            if let Some(st) = weak.upgrade() {
                apply_status_if_live(&st, id, src, s, None);
            }
        }));
        opt_in(&st, "p");
        pane(&st, "a", Some("p"));
        // A short shell command as shell integration reports it (OSC 133 C, D;3, A):
        // Running, then Idle at the prompt. The echoed command line never says MARK.
        let h = run(&st, "a", r"printf 'M%sK\n\033]133;C\007\033]133;D;3\007\033]133;A\007' AR").await;
        let r = call(&st, "a", "wait", json!({"id": h, "until": "done", "timeout_s": 5})).await;
        assert_eq!((r["status"].as_str(), r["exit_code"].as_i64()), (Some("idle"), Some(3)), "{r}");
        assert!(r["tail"].as_str().unwrap().contains("MARK"), "{r}");
        assert!(r["duration_ms"].is_u64());
        // After new input the old Idle no longer counts as done.
        assert_eq!(call(&st, "a", "send", json!({"id": h, "text": "true\r"})).await, json!({"ok": true}));
        let r = call(&st, "a", "wait", json!({"id": h, "until": "done", "timeout_s": 1})).await;
        assert_eq!(r["status"], "timeout", "{r}");
        // Status from any source reaches waiters (here: an agent hook reporting Done).
        apply_status_if_live(&st, &h, Source::Program, TermStatus::Done, Some(ALL_STATES));
        let r = call(&st, "a", "wait", json!({"id": h, "until": "done", "timeout_s": 5})).await;
        assert_eq!(r["status"], "done", "{r}");
        assert_eq!(call(&st, "a", "send", json!({"id": h, "text": "exit 5\r"})).await, json!({"ok": true}));
        let r = call(&st, "a", "wait", json!({"id": h, "until": "exit", "timeout_s": 5})).await;
        assert_eq!((r["status"].as_str(), r["exit_code"].as_i64()), (Some("exit"), Some(5)), "{r}");
        st.kill_all();
    }

    /// The socket: 0600, one JSON line in, one out, and requests over 64 KiB refused.
    #[tokio::test]
    async fn socket_answers_one_line_and_caps_size() {
        use std::os::unix::fs::PermissionsExt;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        let st = state();
        pane(&st, "a", Some("p"));
        let dir = std::env::temp_dir().join(format!("mdt-ctl-{}", std::process::id()));
        let path = dir.join("ctl.sock");
        tokio::spawn(serve(path.clone(), st.clone()));
        let ask = |body: Vec<u8>| {
            let path = path.clone();
            async move {
                let mut s = loop {
                    if let Ok(s) = tokio::net::UnixStream::connect(&path).await {
                        break s;
                    }
                    tokio::time::sleep(Duration::from_millis(20)).await;
                };
                let _ = s.write_all(&body).await;
                let mut out = String::new();
                s.read_to_string(&mut out).await.unwrap();
                out
            }
        };
        let list = format!("{}\n", json!({"token": st.token, "caller": "a", "op": "list"}));
        assert_eq!(ask(list.into_bytes()).await, "[]\n");
        assert_eq!(std::fs::metadata(&path).unwrap().permissions().mode() & 0o777, 0o600);
        let big = ask(vec![b'x'; 70 * 1024]).await;
        assert_eq!(big, format!("{}\n", json!({"error": "request too large"})));
        st.kill_all();
        let _ = std::fs::remove_dir_all(&dir);
    }
}
