mod db;
mod dbtools;
mod error;
mod http;
mod router;
mod state;

use router::ApiResponse;
use state::AppState;
use tauri::Manager;
use tauri_plugin_window_state::StateFlags;

#[tauri::command]
async fn local_api(
    state: tauri::State<'_, AppState>,
    method: String,
    path: String,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    if dbtools::is_dbtool_path(&path) {
        return Ok(dbtools::route(&method, &path, body.as_deref()).await);
    }
    router::route(&state, &method, &path, body.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn http_request(input: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(http::proxy::http_request(input).await)
}

#[tauri::command]
async fn http_request_stream(
    input: serde_json::Value,
    channel: tauri::ipc::Channel<serde_json::Value>,
) -> Result<u64, String> {
    http::proxy::http_request_stream(input, channel).await
}

#[tauri::command]
fn http_request_stream_cancel(id: u64) {
    http::proxy::cancel_stream(id);
}

#[tauri::command]
async fn mock_server_start(app: tauri::AppHandle) -> Result<u16, String> {
    http::mock_server::start(app).await
}

#[tauri::command]
async fn proxy_grpc(input: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(http::grpc::proxy_grpc(input).await)
}

/// Registry of opened folder-collection dirs, stored as a JSON file in the app
/// data dir. localStorage is origin-scoped (dev server vs installed app have
/// different origins), so it silently "forgets" registered folders — this doesn't.
fn file_collections_registry_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("file-collections.json"))
}

#[tauri::command]
fn file_collections_registry_load(app: tauri::AppHandle) -> Result<String, String> {
    let path = file_collections_registry_path(&app)?;
    Ok(std::fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string()))
}

#[tauri::command]
fn file_collections_registry_save(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let path = file_collections_registry_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

/// Recursively allow a folder-collection dir in the fs scope. The dialog plugin
/// only scopes the picked path itself; files inside it (and registered dirs on
/// relaunch) need an explicit recursive grant.
#[tauri::command]
fn fs_allow_collection_dir(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_fs::FsExt;
    app.fs_scope()
        .allow_directory(std::path::Path::new(&path), true)
        .map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // Folder-collection dirs picked via the dialog are added to the fs scope
        // at runtime; persisted-scope keeps them allowed across restarts.
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_opener::init())
        // Restore everything except SIZE. Sizes are saved in physical pixels, so
        // a size saved on a HiDPI (scale-2) display restores 2x too large on a
        // scale-1 monitor, opening the window wider than the screen. The window
        // instead always opens at the config size, which fits any display.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::all() & !StateFlags::SIZE)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let state = AppState::init(dir.join("mydevtools.db"))
                .map_err(|e| format!("failed to open local database: {e}"))?;
            app.manage(state);

            // window-state plugin restores the last saved geometry, which can be
            // wider/taller than the current monitor (smaller screen, unplugged
            // external display). Clamp it to the monitor so it never opens
            // off-screen forcing a horizontal scroll to reach the window edge.
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let screen = monitor.size();
                    if let Ok(size) = window.outer_size() {
                        let max_w = (screen.width as f64 * 0.95) as u32;
                        let max_h = (screen.height as f64 * 0.92) as u32;
                        if size.width > max_w || size.height > max_h {
                            let _ = window.set_size(tauri::PhysicalSize::new(
                                size.width.min(max_w),
                                size.height.min(max_h),
                            ));
                            let _ = window.center();
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            local_api,
            http_request,
            http_request_stream,
            http_request_stream_cancel,
            mock_server_start,
            proxy_grpc,
            fs_allow_collection_dir,
            file_collections_registry_load,
            file_collections_registry_save
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
