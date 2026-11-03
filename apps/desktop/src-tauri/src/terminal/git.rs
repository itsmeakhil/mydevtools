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
    // collide with the user's own git commands.
    let out = std::process::Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(["status", "--porcelain"])
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
}
