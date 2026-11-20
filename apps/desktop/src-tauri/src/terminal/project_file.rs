//! The project's committed terminal config, `<project>/.mydevtools/terminal.json`.
//! Only that one path is ever read or written, never through a symlink, so a cloned
//! repo can't point the app's writes at (or its reads into) files elsewhere.

use std::path::{Path, PathBuf};

/// Larger files are refused: a terminal config is a few KB.
pub const MAX_BYTES: usize = 256 * 1024;

fn not_symlink(p: &Path) -> Result<bool, String> {
    match std::fs::symlink_metadata(p) {
        Ok(m) if m.file_type().is_symlink() => Err(format!("{} is a symlink; refusing to follow it", p.display())),
        Ok(_) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

/// `<project>/.mydevtools/terminal.json`, checked: absolute project dir, no symlinks on the way.
/// Returns (dir, file, file exists).
fn locate(project: &Path) -> Result<(PathBuf, PathBuf, bool), String> {
    if !project.is_absolute() || !project.is_dir() {
        return Err(format!("not a project folder: {}", project.display()));
    }
    let dir = project.join(".mydevtools");
    let file = dir.join("terminal.json");
    not_symlink(&dir)?;
    let exists = not_symlink(&file)?;
    Ok((dir, file, exists))
}

/// The file's text, or `None` when the project has none.
pub fn read(project: &Path) -> Result<Option<String>, String> {
    let (_, file, exists) = locate(project)?;
    if !exists {
        return Ok(None);
    }
    let len = std::fs::metadata(&file).map_err(|e| e.to_string())?.len();
    if len > MAX_BYTES as u64 {
        return Err(format!("{} is larger than {} KB", file.display(), MAX_BYTES / 1024));
    }
    std::fs::read_to_string(&file).map(Some).map_err(|e| e.to_string())
}

/// Replace the file atomically (temp file in the same folder, then rename).
pub fn write(project: &Path, text: &str) -> Result<(), String> {
    if text.len() > MAX_BYTES {
        return Err(format!("terminal config is larger than {} KB", MAX_BYTES / 1024));
    }
    let (dir, file, _) = locate(project)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    not_symlink(&dir)?;
    let tmp = dir.join(format!(".terminal.json.{}.tmp", uuid::Uuid::new_v4()));
    let written = (|| {
        use std::io::Write;
        let mut f = std::fs::OpenOptions::new().write(true).create_new(true).open(&tmp)?;
        f.write_all(text.as_bytes())?;
        f.sync_all()?;
        std::fs::rename(&tmp, &file)
    })();
    if written.is_err() {
        let _ = std::fs::remove_file(&tmp);
    }
    written.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn terminal_project_file_read(project: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || read(Path::new(&project))).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn terminal_project_file_write(project: String, text: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || write(Path::new(&project), &text)).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    fn project(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("mdt-pfile-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn missing_file_reads_as_none_and_write_creates_it() {
        let p = project("rw");
        assert_eq!(read(&p).unwrap(), None);
        write(&p, "{\"version\":1}\n").unwrap();
        assert_eq!(read(&p).unwrap().as_deref(), Some("{\"version\":1}\n"));
        let names: Vec<_> = std::fs::read_dir(p.join(".mydevtools")).unwrap().map(|e| e.unwrap().file_name()).collect();
        assert_eq!(names, vec!["terminal.json"], "no temp files left behind");
    }

    #[test]
    fn refuses_symlinked_file_or_dir() {
        let p = project("link");
        let outside = p.join("outside.txt");
        std::fs::write(&outside, "secret").unwrap();
        std::fs::create_dir_all(p.join(".mydevtools")).unwrap();
        symlink(&outside, p.join(".mydevtools/terminal.json")).unwrap();
        assert!(read(&p).is_err());
        assert!(write(&p, "{}").is_err());
        assert_eq!(std::fs::read_to_string(&outside).unwrap(), "secret", "target untouched");

        let q = project("linkdir");
        let elsewhere = q.join("elsewhere");
        std::fs::create_dir_all(&elsewhere).unwrap();
        symlink(&elsewhere, q.join(".mydevtools")).unwrap();
        assert!(write(&q, "{}").is_err());
        assert!(!elsewhere.join("terminal.json").exists());
    }

    #[test]
    fn refuses_huge_files_and_relative_projects() {
        let p = project("huge");
        std::fs::create_dir_all(p.join(".mydevtools")).unwrap();
        std::fs::write(p.join(".mydevtools/terminal.json"), "x".repeat(MAX_BYTES + 1)).unwrap();
        assert!(read(&p).is_err());
        assert!(write(&p, &"x".repeat(MAX_BYTES + 1)).is_err());
        assert!(read(std::path::Path::new("relative/dir")).is_err());
    }
}
