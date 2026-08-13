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

pub fn run() {
    tauri::Builder::default()
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
            proxy_grpc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
