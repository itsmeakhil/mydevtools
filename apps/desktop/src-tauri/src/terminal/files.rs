//! File references in pane output (`src/a.ts:12:5`): which ones exist, and opening them
//! at the line in the user's editor. Paths resolve against the pane's live directory.

use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use super::pty::TerminalState;

/// Paths per `terminal_resolve_paths` call (one terminal row's worth).
const MAX_PATHS: usize = 32;
const MAX_PATH_LEN: usize = 1024;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Resolved {
    pub abs: String,
    pub is_dir: bool,
}

/// `path` as an existing file or directory: `~/` from HOME, relative ones from `cwd`.
pub fn resolve(cwd: &str, path: &str) -> Option<Resolved> {
    if path.is_empty() || path.len() > MAX_PATH_LEN || path.contains('\0') {
        return None;
    }
    let full = if path == "~" || path.starts_with("~/") {
        PathBuf::from(std::env::var("HOME").ok()?).join(path.trim_start_matches('~').trim_start_matches('/'))
    } else {
        Path::new(cwd).join(path)
    };
    // Drop `.` segments; `..` stays (it has meaning across symlinks).
    let full: PathBuf = full.components().filter(|c| !matches!(c, std::path::Component::CurDir)).collect();
    let meta = std::fs::metadata(&full).ok()?;
    Some(Resolved { abs: full.to_str()?.to_string(), is_dir: meta.is_dir() })
}

/// Percent-encodes everything but unreserved characters and `/`.
fn encode_path(p: &str) -> String {
    p.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' | b'/' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

/// The editor's "open this file at this line" URL; None for "system" or an unknown editor.
pub fn editor_url(editor: &str, abs: &str, line: Option<u32>, col: Option<u32>) -> Option<String> {
    let scheme = match editor {
        "vscode" | "cursor" | "zed" => editor,
        _ => return None,
    };
    let mut url = format!("{scheme}://file{}", encode_path(abs));
    if let Some(l) = line {
        url += &format!(":{l}");
        if let Some(c) = col {
            url += &format!(":{c}");
        }
    }
    Some(url)
}

/// Which of `paths` (as printed in pane `id`) exist, resolved against its current directory.
#[tauri::command]
pub fn terminal_resolve_paths(state: tauri::State<'_, Arc<TerminalState>>, id: String, paths: Vec<String>) -> Result<Vec<Option<Resolved>>, String> {
    if paths.len() > MAX_PATHS {
        return Err("too many paths".into());
    }
    let cwd = state.get(&id)?.cwd();
    Ok(paths.iter().map(|p| resolve(&cwd, p)).collect())
}

/// Opens a path printed in pane `id`: a directory in the file manager, a file at `line`:`col`
/// in `editor` ("vscode" | "cursor" | "zed"), else (or if that fails) with the system default.
#[tauri::command]
pub fn terminal_open_path(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<TerminalState>>,
    id: String,
    path: String,
    line: Option<u32>,
    col: Option<u32>,
    editor: String,
) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let cwd = state.get(&id)?.cwd();
    let r = resolve(&cwd, &path).ok_or_else(|| format!("{path}: not found"))?;
    let opener = app.opener();
    if !r.is_dir {
        if let Some(url) = editor_url(&editor, &r.abs, line, col) {
            if opener.open_url(url, None::<&str>).is_ok() {
                return Ok(());
            }
        }
    }
    opener.open_path(r.abs, None::<&str>).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("mdt-files-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(d.join("src")).unwrap();
        std::fs::write(d.join("src/a.ts"), "x").unwrap();
        d
    }

    #[test]
    fn resolve_relative_to_live_cwd() {
        let d = tmp("rel");
        let cwd = d.display().to_string();
        let r = resolve(&cwd, "src/a.ts").unwrap();
        assert_eq!(r, Resolved { abs: d.join("src/a.ts").display().to_string(), is_dir: false });
        assert_eq!(resolve(&cwd, "./src").unwrap().is_dir, true);
        assert_eq!(resolve("/", &d.join("src/a.ts").display().to_string()).unwrap().abs, r.abs);
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn resolve_expands_tilde() {
        let home = std::env::var("HOME").unwrap();
        assert_eq!(resolve("/", "~").map(|r| r.abs), Some(home.clone()));
        assert_eq!(resolve("/", "~/").map(|r| r.is_dir), Some(true));
    }

    #[test]
    fn resolve_skips_missing_and_oversized() {
        let d = tmp("miss");
        let cwd = d.display().to_string();
        assert_eq!(resolve(&cwd, "src/nope.ts"), None);
        assert_eq!(resolve(&cwd, &format!("src/{}", "a".repeat(MAX_PATH_LEN))), None);
        assert_eq!(resolve(&cwd, ""), None);
        assert_eq!(resolve(&cwd, "src/a.ts\0x"), None);
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn editor_url_encodes_spaces() {
        assert_eq!(editor_url("vscode", "/a b/c.ts", Some(3), None).as_deref(), Some("vscode://file/a%20b/c.ts:3"));
        assert_eq!(editor_url("cursor", "/x/y.rs", Some(5), Some(9)).as_deref(), Some("cursor://file/x/y.rs:5:9"));
        assert_eq!(editor_url("zed", "/x/y.rs", None, None).as_deref(), Some("zed://file/x/y.rs"));
        // A column without a line means nothing to the editors.
        assert_eq!(editor_url("vscode", "/x", None, Some(4)).as_deref(), Some("vscode://file/x"));
        assert_eq!(editor_url("vscode", "/x#y?z%", None, None).as_deref(), Some("vscode://file/x%23y%3Fz%25"));
    }

    #[test]
    fn unknown_editor_is_none() {
        assert_eq!(editor_url("system", "/x", Some(1), None), None);
        assert_eq!(editor_url("emacs", "/x", Some(1), None), None);
    }
}
