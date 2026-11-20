use std::path::{Path, PathBuf};

use serde::Serialize;

#[derive(Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub branch: Option<String>,
    pub changed: Option<u32>,
}

/// Walk up from `dir` to the first `.git` (dir, or file with `gitdir:` for worktrees/submodules)
/// and read HEAD: branch name, or the first 7 chars of a detached sha.
pub fn read_branch(dir: &Path) -> Option<String> {
    let mut cur = Some(dir);
    while let Some(d) = cur {
        let dot = d.join(".git");
        if dot.is_dir() {
            return parse_head(&dot);
        }
        if dot.is_file() {
            let txt = std::fs::read_to_string(&dot).ok()?;
            let target = txt.lines().find_map(|l| l.strip_prefix("gitdir:"))?.trim();
            let p = PathBuf::from(target);
            return parse_head(&if p.is_absolute() { p } else { d.join(p) });
        }
        cur = d.parent();
    }
    None
}

fn parse_head(git_dir: &Path) -> Option<String> {
    let head = std::fs::read_to_string(git_dir.join("HEAD")).ok()?;
    let head = head.trim();
    match head.strip_prefix("ref: ") {
        Some(r) => Some(r.strip_prefix("refs/heads/").unwrap_or(r).to_string()),
        None if head.len() >= 7 => Some(head[..7].to_string()),
        None => None,
    }
}

/// Number of lines of `git status --porcelain`; `None` if git is missing or fails.
pub fn changed_count(dir: &Path) -> Option<u32> {
    // No prompts and no index lock: this runs in the background and must never hang or
    // collide with the user's own git commands. core.fsmonitor off: the folder's repo
    // config is untrusted and would otherwise run its command on every poll.
    let out = std::process::Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(["-c", "core.fsmonitor=false", "status", "--porcelain"])
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_OPTIONAL_LOCKS", "0")
        .stdin(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .output()
        .ok()?;
    out.status.success().then(|| out.stdout.split(|&b| b == b'\n').filter(|l| !l.is_empty()).count() as u32)
}

#[tauri::command]
pub async fn terminal_git_info(path: String, with_changed: bool) -> GitInfo {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = PathBuf::from(path);
        GitInfo {
            branch: read_branch(&dir),
            changed: if with_changed { changed_count(&dir) } else { None },
        }
    })
    .await
    .unwrap_or_default()
}

/// Run git in `dir` without prompts and with the repo's fsmonitor off; stdout, or stderr as the error.
fn git(dir: &Path, args: &[&str]) -> Result<String, String> {
    let out = std::process::Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(["-c", "core.fsmonitor=false"])
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(std::process::Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// Branch/folder name for a task: lowercase letters, digits and single dashes, at most 48 chars.
pub fn slug(name: &str) -> String {
    let mut s = String::new();
    for c in name.trim().to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            s.push(c);
        } else if !s.ends_with('-') && !s.is_empty() {
            s.push('-');
        }
    }
    let s: String = s.chars().take(48).collect();
    match s.trim_end_matches('-') {
        "" => "task".into(),
        t => t.into(),
    }
}

#[derive(Serialize, Debug)]
pub struct Worktree {
    pub path: String,
    pub branch: String,
}

/// New branch `slug(name)` checked out at `<parent>/<repo>.worktrees/<slug>`: beside the
/// repo, so it never shows up as untracked files in the repo itself.
pub fn worktree_add(dir: &Path, name: &str) -> Result<Worktree, String> {
    let root = PathBuf::from(git(dir, &["rev-parse", "--show-toplevel"])?);
    let repo = root.file_name().and_then(|n| n.to_str()).ok_or("repository folder has no name")?;
    let branch = slug(name);
    let path = root.with_file_name(format!("{repo}.worktrees")).join(&branch);
    let p = path.to_str().ok_or("worktree path is not valid UTF-8")?;
    git(&root, &["worktree", "add", "-b", &branch, p])?;
    Ok(Worktree { path: p.to_string(), branch })
}

/// `git worktree remove` (no --force: uncommitted or untracked changes keep it). The branch stays.
pub fn worktree_remove(path: &Path) -> Result<(), String> {
    let common = PathBuf::from(git(path, &["rev-parse", "--path-format=absolute", "--git-common-dir"])?);
    let main = common.parent().ok_or("no main worktree")?;
    git(main, &["worktree", "remove", path.to_str().ok_or("path is not valid UTF-8")?]).map(|_| ())
}

#[tauri::command]
pub async fn terminal_worktree_add(path: String, name: String) -> Result<Worktree, String> {
    tauri::async_runtime::spawn_blocking(move || worktree_add(Path::new(&path), &name))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn terminal_worktree_remove(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || worktree_remove(Path::new(&path)))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn tmp(name: &str) -> PathBuf {
        let p = std::env::temp_dir().join(format!("mdt-git-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).unwrap();
        p
    }

    fn with_head(root: &Path, head: &str) {
        fs::create_dir_all(root.join(".git")).unwrap();
        fs::write(root.join(".git/HEAD"), head).unwrap();
    }

    #[test]
    fn branch_from_ref() {
        let d = tmp("ref");
        with_head(&d, "ref: refs/heads/feat/terminal\n");
        assert_eq!(read_branch(&d).as_deref(), Some("feat/terminal"));
    }

    #[test]
    fn branch_detached_short_sha() {
        let d = tmp("detached");
        with_head(&d, "0123456789abcdef0123456789abcdef01234567\n");
        assert_eq!(read_branch(&d).as_deref(), Some("0123456"));
    }

    #[test]
    fn branch_from_worktree_gitdir_file() {
        let d = tmp("wt");
        let real = d.join("real-gitdir");
        fs::create_dir_all(&real).unwrap();
        fs::write(real.join("HEAD"), "ref: refs/heads/wt-branch\n").unwrap();
        let wt = d.join("wt");
        fs::create_dir_all(&wt).unwrap();
        fs::write(wt.join(".git"), format!("gitdir: {}\n", real.display())).unwrap();
        assert_eq!(read_branch(&wt).as_deref(), Some("wt-branch"));
    }

    #[test]
    fn branch_from_subdir_walks_up() {
        let d = tmp("sub");
        with_head(&d, "ref: refs/heads/main\n");
        let sub = d.join("a/b");
        fs::create_dir_all(&sub).unwrap();
        assert_eq!(read_branch(&sub).as_deref(), Some("main"));
    }

    #[test]
    fn no_git_is_none() {
        // temp dir lives outside any repo
        assert_eq!(read_branch(&tmp("none")), None);
    }

    #[test]
    fn changed_count_counts_porcelain_lines() {
        let d = tmp("count");
        let ok = std::process::Command::new("git").arg("-C").arg(&d).arg("init").output();
        if !matches!(ok, Ok(o) if o.status.success()) {
            return; // git not available
        }
        fs::write(d.join("a"), "1").unwrap();
        fs::write(d.join("b"), "2").unwrap();
        assert_eq!(changed_count(&d), Some(2));
    }

    #[cfg(unix)]
    #[test]
    fn changed_count_ignores_repo_fsmonitor() {
        use std::os::unix::fs::PermissionsExt;
        let d = tmp("fsmon");
        let ok = std::process::Command::new("git").arg("-C").arg(&d).arg("init").output();
        if !matches!(ok, Ok(o) if o.status.success()) {
            return; // git not available
        }
        // An untrusted repo's config names a command; polling status must not run it.
        let marker = d.join("pwned");
        let hook = d.join("fsmon.sh");
        fs::write(&hook, format!("#!/bin/sh\ntouch '{}'\n", marker.display())).unwrap();
        fs::set_permissions(&hook, fs::Permissions::from_mode(0o755)).unwrap();
        let set = std::process::Command::new("git")
            .arg("-C").arg(&d)
            .args(["config", "core.fsmonitor"]).arg(&hook)
            .status().unwrap();
        assert!(set.success());
        assert!(changed_count(&d).is_some());
        assert!(!marker.exists(), "git status ran the repo's core.fsmonitor");
    }

    #[test]
    fn slug_makes_safe_branch_names() {
        assert_eq!(slug("Fix login bug!"), "fix-login-bug");
        assert_eq!(slug("  --weird__name--  "), "weird-name");
        assert_eq!(slug("日本語"), "task");
        assert_eq!(slug(&"a".repeat(60)).len(), 48);
    }

    #[test]
    fn worktree_add_then_remove() {
        let repo = tmp("wtrepo").join("app");
        fs::create_dir_all(&repo).unwrap();
        let run = |args: &[&str]| {
            let ok = std::process::Command::new("git").arg("-C").arg(&repo).args(args).output().unwrap().status.success();
            assert!(ok, "git {args:?}");
        };
        run(&["init", "-q", "-b", "main"]);
        run(&["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "init"]);
        let wt = worktree_add(&repo.join("."), "Fix login").unwrap();
        assert_eq!(wt.branch, "fix-login");
        let p = PathBuf::from(&wt.path);
        assert!(p.ends_with("app.worktrees/fix-login") && p.is_dir(), "{}", wt.path);
        assert_eq!(read_branch(&p).as_deref(), Some("fix-login"));
        assert!(worktree_add(&repo, "fix login").unwrap_err().contains("fix-login"), "same branch twice fails");
        // Untracked work blocks removal; a clean worktree goes.
        fs::write(p.join("wip.txt"), "x").unwrap();
        assert!(worktree_remove(&p).is_err());
        fs::remove_file(p.join("wip.txt")).unwrap();
        worktree_remove(&p).unwrap();
        assert!(!p.exists());
        let _ = fs::remove_dir_all(repo.parent().unwrap());
    }
}
