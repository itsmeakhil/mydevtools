//! Clipboard images pasted into a pane are saved as files and their path typed, since
//! agents (Claude, Codex) take screenshots as file paths.

use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

const MAX_BYTES: usize = 20 * 1024 * 1024;
const KEEP: Duration = Duration::from_secs(7 * 86_400);
const PNG_MAGIC: &[u8] = b"\x89PNG\r\n\x1a\n";

/// Write `bytes` (must be a PNG, ≤ 20 MiB) to `dir/<uuid>.png`, owner-only, after removing
/// pastes older than 7 days from `dir`. Returns the new file's path.
pub fn save_png(dir: &Path, bytes: &[u8], now: SystemTime) -> Result<PathBuf, String> {
    if bytes.len() > MAX_BYTES {
        return Err("image too large".into());
    }
    if !bytes.starts_with(PNG_MAGIC) {
        return Err("clipboard image is not a PNG".into());
    }
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for e in entries.flatten() {
            let old = e.metadata().and_then(|m| m.modified()).is_ok_and(|t| now.duration_since(t).is_ok_and(|age| age > KEEP));
            if old {
                let _ = std::fs::remove_file(e.path());
            }
        }
    }
    let path = dir.join(format!("{}.png", uuid::Uuid::new_v4()));
    write_private(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path)
}

fn write_private(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    use std::io::Write;
    let mut o = std::fs::OpenOptions::new();
    o.write(true).create_new(true);
    #[cfg(unix)]
    std::os::unix::fs::OpenOptionsExt::mode(&mut o, 0o600);
    o.open(path)?.write_all(bytes)
}

/// Save a pasted clipboard image under `<app data>/terminal/pastes` and return its path.
#[tauri::command]
pub async fn terminal_save_image(app: tauri::AppHandle, png_b64: String) -> Result<String, String> {
    use base64::Engine;
    use tauri::Manager;
    // Base64 is 4/3 the size: refuse before decoding something far over the limit.
    if png_b64.len() > MAX_BYTES / 3 * 4 + 8 {
        return Err("image too large".into());
    }
    let bytes = base64::engine::general_purpose::STANDARD.decode(png_b64).map_err(|e| e.to_string())?;
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("terminal/pastes");
    tauri::async_runtime::spawn_blocking(move || save_png(&dir, &bytes, SystemTime::now()))
        .await
        .map_err(|e| e.to_string())?
        .map(|p| p.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;
    use std::time::{Duration, SystemTime};

    const PNG: &[u8] = b"\x89PNG\r\n\x1a\nrest-of-image";

    fn tmp(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("mdt-paste-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn saves_png_and_prunes_old() {
        let dir = tmp("save");
        let now = SystemTime::now();
        let old = dir.join("old.png");
        std::fs::write(&old, PNG).unwrap();
        std::fs::File::options().write(true).open(&old).unwrap().set_modified(now - Duration::from_secs(8 * 86_400)).unwrap();
        let recent = dir.join("recent.png");
        std::fs::write(&recent, PNG).unwrap();

        let p = save_png(&dir, PNG, now).unwrap();
        assert_eq!(p.parent(), Some(dir.as_path()));
        assert_eq!(p.extension().unwrap(), "png");
        assert_eq!(std::fs::read(&p).unwrap(), PNG);
        assert_eq!(std::fs::metadata(&p).unwrap().permissions().mode() & 0o777, 0o600);
        assert!(!old.exists(), "older than 7 days is pruned");
        assert!(recent.exists());
    }

    #[test]
    fn rejects_non_png_and_huge() {
        let dir = tmp("reject");
        assert!(save_png(&dir, b"GIF89a....", SystemTime::now()).unwrap_err().contains("PNG"));
        let mut huge = PNG.to_vec();
        huge.resize(20 * 1024 * 1024 + 1, 0);
        assert_eq!(save_png(&dir, &huge, SystemTime::now()).unwrap_err(), "image too large");
        assert_eq!(std::fs::read_dir(&dir).unwrap().count(), 0, "nothing written");
    }
}
