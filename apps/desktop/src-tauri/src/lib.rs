mod db;
mod dbtools;
mod error;
mod http;
mod router;
mod state;

use http::remote::RemoteResponse;
use router::ApiResponse;
use state::AppState;
use tauri::Manager;

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
async fn remote_api(
    state: tauri::State<'_, AppState>,
    method: String,
    url: String,
    body: Option<String>,
) -> Result<RemoteResponse, String> {
    http::remote::request(&state, &method, &url, body)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn clear_remote_session(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock().unwrap();
    state.http.clear_jar(&db).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let state = AppState::init(dir.join("mydevtools.db"))
                .map_err(|e| format!("failed to open local database: {e}"))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![local_api, remote_api, clear_remote_session])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
