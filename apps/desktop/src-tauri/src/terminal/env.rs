//! Shell launch + environment for Terminal PTYs: the `claude` shim on PATH,
//! the `mdt-hook` emitter, and zsh/bash integration (resources/terminal).

use serde_json::{json, Value};
use std::path::{Path, PathBuf};

/// argv + env for a Terminal shell. `res_dir` holds `terminal/`; `base_env`
/// carries the per-pane `MDT_*` values and is passed through.
pub fn shell_launch(
    shell: &str,
    res_dir: &Path,
    base_env: Vec<(String, String)>,
) -> (Vec<String>, Vec<(String, String)>) {
    shell_launch_with(shell, res_dir, base_env, &|k| std::env::var(k).ok())
}

/// The integration needs an absolute resource dir holding both scripts. A
/// relative path would resolve against the shell's cwd (e.g. a cloned repo's
/// `resources/terminal/bin`) and run whatever is there.
pub fn resources_ok(res_dir: &Path) -> bool {
    let bin = res_dir.join("terminal/bin");
    res_dir.is_absolute() && bin.join("claude").is_file() && bin.join("mdt-hook").is_file()
}

/// `shell_launch` with the app's environment injected (testable). Without
/// usable resources: a plain login shell with no `MDT_*`/PATH changes.
pub fn shell_launch_with(
    shell: &str,
    res_dir: &Path,
    mut env: Vec<(String, String)>,
    app_env: &dyn Fn(&str) -> Option<String>,
) -> (Vec<String>, Vec<(String, String)>) {
    let login = vec![shell.to_string(), "-l".to_string()];
    if !resources_ok(res_dir) {
        return (login, vec![]);
    }
    let term = res_dir.join("terminal");
    let shim = term.join("bin");
    let s = |p: &Path| p.display().to_string();
    let path = match app_env("PATH") {
        Some(p) if !p.is_empty() => format!("{}:{p}", s(&shim)),
        _ => s(&shim),
    };
    env.extend([
        ("PATH".into(), path),
        ("MDT_SHIM_DIR".into(), s(&shim)),
        ("MDT_HOOK_BIN".into(), s(&shim.join("mdt-hook"))),
    ]);
    if app_env("MDT_SHELL_INTEGRATION").as_deref() == Some("0") {
        return (login, env);
    }
    let name = Path::new(shell)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    let zdot = term.join("zsh");
    let rc = term.join("bash").join("rc.bash");
    // Only redirect startup files we actually have, else the user's config would silently not load.
    if name == "zsh" && zdot.join(".zshrc").is_file() {
        let user = app_env("ZDOTDIR")
            .or_else(|| app_env("HOME"))
            .unwrap_or_default();
        env.push(("ZDOTDIR".into(), s(&zdot)));
        env.push(("MDT_USER_ZDOTDIR".into(), user));
        (login, env)
    } else if name == "bash" && rc.is_file() {
        (
            vec![shell.to_string(), "--rcfile".into(), s(&rc), "-i".into()],
            env,
        )
    } else {
        (login, env)
    }
}

/// Claude Code `--settings` JSON adding our hooks. Hook entries merge with the
/// user's own across settings levels, so this never replaces their hooks.
pub fn claude_hooks_settings(hook_bin: &Path) -> Value {
    let bin = format!(
        "'{}'",
        hook_bin.display().to_string().replace('\'', r"'\''")
    );
    let group =
        |ev: &str| json!({"hooks": [{"type": "command", "command": format!("{bin} claude-{ev}")}]});
    let mut pre = group("PreToolUse");
    pre["matcher"] = json!("*");
    json!({"hooks": {
        "UserPromptSubmit": [group("UserPromptSubmit")],
        "PreToolUse": [pre],
        "Notification": [group("Notification")],
        "Stop": [group("Stop")],
        "SessionEnd": [group("SessionEnd")],
    }})
}

/// Per-launch paths resolved in `setup`, read by every spawn.
pub struct Launch {
    /// Holds `terminal/` (bundled resources).
    pub res_dir: PathBuf,
    pub socket: PathBuf,
    pub settings: PathBuf,
}

impl Launch {
    /// The per-pane `MDT_*` env for `shell_launch`.
    pub fn pane_env(&self, id: &str, token: &str) -> Vec<(String, String)> {
        vec![
            ("MDT_TERMINAL_ID".into(), id.into()),
            ("MDT_HOOK_SOCKET".into(), self.socket.display().to_string()),
            ("MDT_HOOK_TOKEN".into(), token.into()),
            (
                "MDT_CLAUDE_SETTINGS".into(),
                self.settings.display().to_string(),
            ),
        ]
    }
}

/// Write `<data_dir>/terminal/claude-hooks.json`; returns its path.
pub fn write_claude_settings(data_dir: &Path, hook_bin: &Path) -> std::io::Result<PathBuf> {
    let dir = data_dir.join("terminal");
    std::fs::create_dir_all(&dir)?;
    let path = dir.join("claude-hooks.json");
    std::fs::write(
        &path,
        serde_json::to_vec_pretty(&claude_hooks_settings(hook_bin))?,
    )?;
    Ok(path)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::io::{BufRead, BufReader};
    use std::process::{Command, Output, Stdio};
    use std::time::{Duration, Instant};

    fn res() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources")
    }

    fn shim_dir() -> String {
        res().join("terminal/bin").display().to_string()
    }

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("mdt-env-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    /// Temp dir with a fake `claude` that prints one arg per line.
    fn fake_claude(name: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;
        let d = tmp(name);
        let f = d.join("claude");
        std::fs::write(&f, "#!/bin/sh\nfor a in \"$@\"; do echo \"$a\"; done\n").unwrap();
        std::fs::set_permissions(&f, std::fs::Permissions::from_mode(0o755)).unwrap();
        d
    }

    fn run_bash(script: &str, env: &[(&str, String)]) -> Output {
        let mut c = Command::new("/bin/bash");
        c.arg("-c")
            .arg(script)
            .env_clear()
            .env("HOME", std::env::temp_dir());
        for (k, v) in env {
            c.env(k, v);
        }
        c.output().unwrap()
    }

    fn lines(o: &Output) -> Vec<String> {
        String::from_utf8_lossy(&o.stdout)
            .lines()
            .map(String::from)
            .collect()
    }

    fn terminal_env(fake: &Path, settings: &Path) -> Vec<(&'static str, String)> {
        vec![
            (
                "PATH",
                format!("{}:{}:/usr/bin:/bin", shim_dir(), fake.display()),
            ),
            ("MDT_TERMINAL_ID", "t1".into()),
            ("MDT_SHIM_DIR", shim_dir()),
            ("MDT_CLAUDE_SETTINGS", settings.display().to_string()),
        ]
    }

    #[test]
    fn shim_injects_settings() {
        let fake = fake_claude("inject");
        let settings = fake.join("hooks.json");
        std::fs::write(&settings, "{}").unwrap();
        let o = run_bash("claude foo", &terminal_env(&fake, &settings));
        assert_eq!(
            lines(&o),
            vec![
                "--settings".to_string(),
                settings.display().to_string(),
                "foo".into()
            ]
        );
    }

    #[test]
    fn shim_passthrough_when_user_settings() {
        let fake = fake_claude("user");
        let settings = fake.join("hooks.json");
        std::fs::write(&settings, "{}").unwrap();
        let o = run_bash(
            "claude --settings mine.json foo",
            &terminal_env(&fake, &settings),
        );
        assert_eq!(lines(&o), vec!["--settings", "mine.json", "foo"]);
        let o = run_bash(
            "claude --settings=mine.json foo",
            &terminal_env(&fake, &settings),
        );
        assert_eq!(lines(&o), vec!["--settings=mine.json", "foo"]);
    }

    #[test]
    fn shim_passthrough_outside_terminal() {
        let fake = fake_claude("outside");
        let settings = fake.join("hooks.json");
        std::fs::write(&settings, "{}").unwrap();
        let mut env = terminal_env(&fake, &settings);
        env.retain(|(k, _)| *k != "MDT_TERMINAL_ID");
        assert_eq!(lines(&run_bash("claude foo", &env)), vec!["foo"]);
        // disabled, or settings file missing → untouched too
        let mut env = terminal_env(&fake, &settings);
        env.push(("MDT_CLAUDE_HOOKS_DISABLED", "1".into()));
        assert_eq!(lines(&run_bash("claude foo", &env)), vec!["foo"]);
        let env = terminal_env(&fake, &fake.join("missing.json"));
        assert_eq!(lines(&run_bash("claude foo", &env)), vec!["foo"]);
    }

    #[test]
    fn shim_skips_itself_on_path() {
        let fake = fake_claude("skip");
        let settings = fake.join("hooks.json");
        std::fs::write(&settings, "{}").unwrap();
        let mut env = terminal_env(&fake, &settings);
        env[0].1 = format!("{0}:{0}/:{1}:/usr/bin:/bin", shim_dir(), fake.display());
        let o = run_bash("claude foo", &env);
        assert_eq!(lines(&o).last().map(String::as_str), Some("foo"));
        assert_eq!(lines(&o)[0], "--settings");

        // no real claude anywhere → 127 + message, not a loop
        env[0].1 = format!("{0}:{0}:/usr/bin:/bin", shim_dir());
        let o = run_bash("claude foo", &env);
        assert_eq!(o.status.code(), Some(127));
        assert!(String::from_utf8_lossy(&o.stderr).contains("claude: command not found"));
    }

    fn hook_env(sock: &Path) -> Vec<(&'static str, String)> {
        vec![
            ("PATH", "/usr/bin:/bin".into()),
            ("MDT_HOOK_SOCKET", sock.display().to_string()),
            ("MDT_HOOK_TOKEN", "tok".into()),
            ("MDT_TERMINAL_ID", "t1".into()),
        ]
    }

    #[test]
    fn mdt_hook_sends_line() {
        let dir = tmp("hook");
        let sock = dir.join("h.sock");
        let listener = std::os::unix::net::UnixListener::bind(&sock).unwrap();
        // Mirror the app server: read lines until the client half-closes. A read
        // timeout instead of EOF means the hook never sent EOF.
        let reader = std::thread::spawn(move || {
            let (s, _) = listener.accept().unwrap();
            // EINVAL on macOS if the hook already closed (then reads just hit EOF).
            let _ = s.set_read_timeout(Some(Duration::from_secs(3)));
            let lines = BufReader::new(&s).lines().collect::<Result<Vec<_>, _>>();
            // macOS: also keep the connection open after EOF (a stalled app), so a
            // hook that waits for the server to close (`nc -w 1` lingered ~1 s on
            // every Claude hook) fails the bound below. Elsewhere OpenBSD nc -N
            // waits for that close by design (capped by -w 1), so close like the app.
            (lines, cfg!(target_os = "macos").then_some(s))
        });
        let hook = res().join("terminal/bin/mdt-hook");
        let t0 = Instant::now();
        let o = run_bash(
            &format!(
                "echo '{{\"message\":\"hi\"}}' | '{}' claude-Notification",
                hook.display()
            ),
            &hook_env(&sock),
        );
        let took = t0.elapsed();
        assert!(o.status.success());
        assert!(o.stdout.is_empty());
        let (got, _open) = reader.join().unwrap();
        let got = got.expect("hook sent EOF");
        // Claude blocks on every hook, so the send must not linger.
        assert!(took < Duration::from_millis(300), "mdt-hook took {took:?}");
        let m = crate::terminal::hooks::parse_line(&got[0], "tok").expect("valid line");
        assert_eq!(m.event, "claude-Notification");
        assert_eq!(m.terminal_id, "t1");
        assert_eq!(m.payload["message"], "hi");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn mdt_hook_silent_without_env() {
        let hook = res().join("terminal/bin/mdt-hook");
        let o = run_bash(
            &format!("echo '{{}}' | '{}' claude-Stop", hook.display()),
            &[("PATH", "/usr/bin:/bin".into())],
        );
        assert!(o.status.success());
        assert!(o.stdout.is_empty());
        // socket env set but nobody listening: still silent, exit 0
        let o = run_bash(
            &format!("'{}' shell-prompt", hook.display()),
            &hook_env(Path::new("/nonexistent/h.sock")),
        );
        assert!(o.status.success());
        assert!(o.stdout.is_empty());
    }

    #[test]
    fn zsh_integration_keeps_user_rc() {
        if !Path::new("/bin/zsh").exists() {
            return;
        }
        let home = tmp("zhome");
        let user = tmp("zdot");
        std::fs::write(
            user.join(".zshrc"),
            "export MDT_TEST_MARK=1\nexport PATH=/usr/bin:$PATH\n",
        )
        .unwrap();
        let base = vec![
            ("HOME".to_string(), home.display().to_string()),
            ("ZDOTDIR".to_string(), user.display().to_string()),
            ("PATH".to_string(), "/usr/bin:/bin".to_string()),
        ];
        // shell_launch reads the app's env for ZDOTDIR/PATH; run it in a child-like view via base env.
        let (argv, env) = launch_with_app_env("/bin/zsh", &base);
        assert_eq!(argv, vec!["/bin/zsh".to_string(), "-l".into()]);
        let mut c = Command::new(&argv[0]);
        c.args(&argv[1..])
            .args([
                "-i",
                "-c",
                "echo $MDT_TEST_MARK; command -v claude; echo $ZDOTDIR; echo $HISTFILE",
            ])
            .env_clear()
            .stdin(Stdio::null());
        for (k, v) in base.iter().chain(env.iter()) {
            c.env(k, v);
        }
        let o = c.output().unwrap();
        let out = lines(&o);
        assert_eq!(
            out,
            vec![
                "1".to_string(),
                format!("{}/claude", shim_dir()),
                user.display().to_string(),
                user.join(".zsh_history").display().to_string(),
            ],
            "stderr: {}",
            String::from_utf8_lossy(&o.stderr)
        );
        let _ = std::fs::remove_dir_all(&home);
        let _ = std::fs::remove_dir_all(&user);
    }

    /// Output with OSC sequences (BEL-terminated, as our rc files write them) removed.
    fn strip_osc(s: &str) -> String {
        let mut out = String::new();
        let mut rest = s;
        while let Some(i) = rest.find("\x1b]") {
            out.push_str(&rest[..i]);
            rest = rest[i..].split_once('\x07').map_or("", |(_, r)| r);
        }
        out + rest
    }

    #[test]
    fn bash_integration_keeps_underscore_and_prompt_command() {
        use std::io::Write;
        if !Path::new("/bin/bash").exists() {
            return;
        }
        let home = tmp("bhome");
        std::fs::write(home.join(".bashrc"), "PROMPT_COMMAND='echo user-pc'\n").unwrap();
        let app = |k: &str| (k == "PATH").then(|| "/usr/bin:/bin".to_string());
        let (argv, env) = shell_launch_with("/bin/bash", &res(), vec![], &app);
        let mut c = Command::new(&argv[0]);
        c.args(&argv[1..])
            .env_clear()
            .env("HOME", &home)
            .current_dir(&home)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        for (k, v) in &env {
            c.env(k, v);
        }
        let mut child = c.spawn().unwrap();
        // one command line, two empty Enters, exit
        child
            .stdin
            .take()
            .unwrap()
            .write_all(b"echo hi there; echo $_\n\n\nexit\n")
            .unwrap();
        let o = child.wait_with_output().unwrap();
        let raw = String::from_utf8_lossy(&o.stdout).to_string();
        let out: Vec<String> = strip_osc(&raw).lines().map(String::from).collect();
        assert!(out.windows(2).any(|w| w == ["hi there", "there"]), "{out:?}");
        assert!(out.iter().any(|l| l == "user-pc"), "{out:?}");
        // prompts: initial + after the command + 2 empty Enters; commands: the line + exit
        let count = |m: &str| raw.matches(m).count();
        assert_eq!((count("\x1b]133;A\x07"), count("\x1b]133;C\x07")), (4, 2), "{raw:?}");
        let cwd = format!("\x1b]7;file://");
        assert!(raw.contains(&cwd) && raw.contains(&format!("{}\x07", home.display())), "{raw:?}");
        let _ = std::fs::remove_dir_all(&home);
    }

    #[test]
    fn zsh_integration_writes_prompt_marks() {
        if !Path::new("/bin/zsh").exists() {
            return;
        }
        let home = tmp("zmarks");
        let app = |k: &str| match k {
            "PATH" => Some("/usr/bin:/bin".to_string()),
            "HOME" => Some(home.display().to_string()),
            _ => None,
        };
        let (argv, env) = shell_launch_with("/bin/zsh", &res(), vec![], &app);
        // `-i` + script on stdin: precmd runs before each prompt, preexec before each command.
        let o = Command::new(&argv[0])
            .args(&argv[1..])
            .arg("-i")
            .env_clear()
            .env("HOME", &home)
            .envs(env.iter().map(|(k, v)| (k, v)))
            .current_dir(&home)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .and_then(|mut c| {
                use std::io::Write;
                c.stdin.take().unwrap().write_all(b"echo one\nexit\n")?;
                c.wait_with_output()
            })
            .unwrap();
        let raw = String::from_utf8_lossy(&o.stdout).to_string();
        assert!(raw.contains("\x1b]133;A\x07") && raw.contains("\x1b]133;C\x07"), "{raw:?}");
        assert!(strip_osc(&raw).contains("one"), "{raw:?}");
        let _ = std::fs::remove_dir_all(&home);
    }

    /// shell_launch with the given app env values for ZDOTDIR/HOME/PATH.
    fn launch_with_app_env(
        shell: &str,
        app: &[(String, String)],
    ) -> (Vec<String>, Vec<(String, String)>) {
        let get = |k: &str| app.iter().find(|(n, _)| n == k).map(|(_, v)| v.clone());
        shell_launch_with(shell, &res(), vec![], &get)
    }

    #[test]
    fn launch_shapes() {
        let app = |k: &str| match k {
            "HOME" => Some("/h".to_string()),
            "PATH" => Some("/usr/bin".to_string()),
            _ => None,
        };
        let shim = shim_dir();
        let get = |env: &[(String, String)], k: &str| {
            env.iter().find(|(n, _)| n == k).map(|(_, v)| v.clone())
        };

        let (argv, env) =
            shell_launch_with("/bin/zsh", &res(), vec![("X".into(), "1".into())], &app);
        assert_eq!(argv, vec!["/bin/zsh", "-l"]);
        assert_eq!(
            get(&env, "ZDOTDIR"),
            Some(res().join("terminal/zsh").display().to_string())
        );
        assert_eq!(get(&env, "MDT_USER_ZDOTDIR").as_deref(), Some("/h"));
        assert_eq!(get(&env, "PATH"), Some(format!("{shim}:/usr/bin")));
        assert_eq!(get(&env, "MDT_SHIM_DIR"), Some(shim.clone()));
        assert_eq!(get(&env, "MDT_HOOK_BIN"), Some(format!("{shim}/mdt-hook")));
        assert_eq!(get(&env, "X").as_deref(), Some("1"));

        let (argv, env) = shell_launch_with("/bin/bash", &res(), vec![], &app);
        let rc = res().join("terminal/bash/rc.bash").display().to_string();
        assert_eq!(
            argv,
            vec!["/bin/bash".to_string(), "--rcfile".into(), rc, "-i".into()]
        );
        assert_eq!(get(&env, "ZDOTDIR"), None);

        let (argv, env) = shell_launch_with("/opt/homebrew/bin/fish", &res(), vec![], &app);
        assert_eq!(argv, vec!["/opt/homebrew/bin/fish", "-l"]);
        assert_eq!(get(&env, "PATH"), Some(format!("{shim}:/usr/bin")));

        let off = |k: &str| {
            if k == "MDT_SHELL_INTEGRATION" {
                Some("0".to_string())
            } else {
                app(k)
            }
        };
        let (argv, env) = shell_launch_with("/bin/zsh", &res(), vec![], &off);
        assert_eq!(argv, vec!["/bin/zsh", "-l"]);
        assert_eq!(get(&env, "ZDOTDIR"), None);
        assert_eq!(get(&env, "PATH"), Some(format!("{shim}:/usr/bin")));

        // resources missing or relative → plain login shell: no shim on PATH, no
        // ZDOTDIR/rcfile, no MDT_* (incl. MDT_CLAUDE_SETTINGS) at all
        let pane = vec![("MDT_CLAUDE_SETTINGS".to_string(), "/s.json".to_string())];
        for dir in [
            Path::new("/nonexistent"),
            Path::new("resources"),
            Path::new(""),
        ] {
            for sh in ["/bin/zsh", "/bin/bash"] {
                let (argv, env) = shell_launch_with(sh, dir, pane.clone(), &app);
                assert_eq!(argv, vec![sh, "-l"], "{dir:?}");
                assert!(env.is_empty(), "{dir:?} {env:?}");
            }
        }
        assert!(resources_ok(&res()));
        assert!(!resources_ok(Path::new("resources")));
    }

    #[test]
    fn hooks_settings_shape() {
        let v = claude_hooks_settings(Path::new("/A B/it's/mdt-hook"));
        let hooks = v["hooks"].as_object().unwrap();
        let mut keys: Vec<_> = hooks.keys().cloned().collect();
        keys.sort();
        assert_eq!(
            keys,
            vec![
                "Notification",
                "PreToolUse",
                "SessionEnd",
                "Stop",
                "UserPromptSubmit"
            ]
        );
        for (ev, groups) in hooks {
            let g = &groups[0];
            assert_eq!(g["hooks"][0]["type"], "command");
            assert_eq!(
                g["hooks"][0]["command"],
                format!("'/A B/it'\\''s/mdt-hook' claude-{ev}")
            );
        }
        assert_eq!(hooks["PreToolUse"][0]["matcher"], "*");
    }
}
