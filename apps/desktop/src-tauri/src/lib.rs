mod db;
mod error;
mod router;
mod state;

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
    router::route(&state, &method, &path, body.as_deref()).map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let state = AppState::init(dir.join("mydevtools.db"))
                .map_err(|e| format!("failed to open local database: {e}"))?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![local_api])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
