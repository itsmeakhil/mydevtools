mod csp;
mod db;
mod dbtools;
mod error;
mod http;
mod router;
mod state;
mod terminal;

use router::ApiResponse;
use state::AppState;
use tauri::{Emitter, Manager};
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
async fn mock_server_start(
    app: tauri::AppHandle,
    port: Option<u16>,
    latency_ms: Option<u64>,
) -> Result<u16, String> {
    http::mock_server::start(app, port, latency_ms).await
}

#[tauri::command]
async fn mock_server_stop() {
    http::mock_server::stop().await
}

#[tauri::command]
async fn mock_server_status() -> http::mock_server::Status {
    http::mock_server::status().await
}

#[tauri::command]
fn mock_server_clear_log() {
    http::mock_server::clear_log()
}

#[tauri::command]
async fn proxy_grpc(input: serde_json::Value) -> Result<serde_json::Value, String> {
    Ok(http::grpc::proxy_grpc(input).await)
}

#[tauri::command]
async fn grpc_stream_start(
    input: serde_json::Value,
    channel: tauri::ipc::Channel<serde_json::Value>,
) -> Result<u64, String> {
    let emit: http::grpc::Emit = std::sync::Arc::new(move |v| {
        let _ = channel.send(v);
    });
    http::grpc::stream_start(input, emit).await
}

#[tauri::command]
fn grpc_stream_send(id: u64, frame: String) -> Result<(), String> {
    http::grpc::stream_send(id, &frame)
}

#[tauri::command]
fn grpc_stream_end(id: u64) -> Result<(), String> {
    http::grpc::stream_end(id)
}

#[tauri::command]
fn grpc_stream_cancel(id: u64) {
    http::grpc::stream_cancel(id)
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

/// Decrypted Secure Files payload as raw bytes (webview gets an ArrayBuffer —
/// no base64 round-trip through the JSON router).
#[tauri::command]
fn secure_file_read(state: tauri::State<'_, AppState>, id: String) -> Result<tauri::ipc::Response, String> {
    router::secure_files::read_plaintext(&state, &id).map(tauri::ipc::Response::new)
}

/// `mdt-term` (the agent helper CLI): run before any Tauri setup, returns the exit code.
pub fn term_cli(args: &[String]) -> i32 {
    terminal::ctl::cli(args)
}

pub fn run() {
    let builder = tauri::Builder::default()
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
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let state = AppState::init(dir.join("mydevtools.db"))
                .map_err(|e| format!("failed to open local database: {e}"))?;
            app.manage(state);
            let term = std::sync::Arc::new(terminal::pty::TerminalState::default());
            app.manage(term.clone());
            app.manage(terminal::notify::Ui::default());
            terminal::notify::init(app.handle());
            let handle = app.handle().clone();
            let _ = term.on_exit.set(std::sync::Arc::new(move |id: &str| {
                terminal::notify::forget(&handle, id)
            }));
            let handle = app.handle().clone();
            let _ = term.on_status.set(std::sync::Arc::new(move |id, source, status, msg, cmd| {
                let term = handle.state::<std::sync::Arc<terminal::pty::TerminalState>>();
                // OSC 7501 reports every state, so it takes over from the screen reader for this run.
                let covers = (source == terminal::hooks::Source::Program).then_some(terminal::hooks::ALL_STATES);
                if let Some(t) = terminal::hooks::apply_status_if_live(&term, id, source, status, covers) {
                    terminal::hooks::publish(&handle, &t, msg.as_deref(), cmd);
                }
            }));
            term.start_agent_poller();
            let handle = app.handle().clone();
            let _ = term.on_agent.set(std::sync::Arc::new(move |id, agent| {
                let _ = handle.emit("terminal://agent", serde_json::json!({"id": id, "agent": agent}));
            }));
            let handle = app.handle().clone();
            let _ = term.on_spawn_child.set(std::sync::Arc::new(move |v| {
                let _ = handle.emit("terminal://spawn-child", v);
            }));
            let handle = app.handle().clone();
            let _ = term.on_child_closed.set(std::sync::Arc::new(move |v| {
                let _ = handle.emit("terminal://child-closed", v);
            }));
            let socket = terminal::hooks::start(app.handle(), &dir, term.clone());
            let ctl_socket = terminal::ctl::start(&socket, term.clone());
            // Bundled at $RESOURCE/resources/terminal; in dev tauri-build copies it next to
            // the binary (target/<profile>/resources), which resource_dir() resolves to.
            // Unresolvable / not absolute / scripts missing → no integration at all:
            // `launch` stays unset and panes get a plain `$SHELL -l`.
            match app.path().resource_dir().map(|d| d.join("resources")) {
                Ok(res_dir) if terminal::env::resources_ok(&res_dir) => {
                    let hook_bin = res_dir.join("terminal/bin/mdt-hook");
                    // A missing settings file only makes the claude shim pass through.
                    let settings = terminal::env::write_claude_settings(&dir, &hook_bin)
                        .unwrap_or_else(|e| {
                            eprintln!("terminal: claude hooks settings not written: {e}");
                            dir.join("terminal/claude-hooks.json")
                        });
                    let _ = term.launch.set(terminal::env::Launch { res_dir, socket, ctl_socket, settings });
                }
                r => eprintln!("terminal: shell integration disabled, resources unusable: {r:?}"),
            }

            // Created here rather than from config so every asset response, worker
            // scripts included, carries the CSP (see csp.rs).
            let main = app.config().app.windows.iter().find(|w| w.label == "main")
                .ok_or("main window config missing")?;
            tauri::WebviewWindowBuilder::from_config(app.handle(), main)?
                .on_web_resource_request(|_req, res| csp::apply(res))
                .build()?;

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
            mock_server_stop,
            mock_server_status,
            mock_server_clear_log,
            proxy_grpc,
            grpc_stream_start,
            grpc_stream_send,
            grpc_stream_end,
            grpc_stream_cancel,
            fs_allow_collection_dir,
            file_collections_registry_load,
            file_collections_registry_save,
            secure_file_read,
            terminal::pty::terminal_spawn,
            terminal::pty::terminal_attach,
            terminal::pty::terminal_write,
            terminal::pty::terminal_resize,
            terminal::pty::terminal_kill,
            terminal::pty::terminal_clear_scrollback,
            terminal::hooks::terminal_statuses,
            terminal::hooks::terminal_clear_waiting,
            terminal::git::terminal_git_info,
            terminal::pty::terminal_screen_tail,
            terminal::files::terminal_resolve_paths,
            terminal::files::terminal_open_path,
            terminal::paste::terminal_save_image,
            terminal::project_file::terminal_project_file_read,
            terminal::project_file::terminal_project_file_write,
            terminal::notify::terminal_set_notify,
            terminal::git::terminal_worktree_add,
            terminal::git::terminal_worktree_remove,
            terminal::notify::terminal_set_viewing,
            terminal::notify::terminal_set_strings,
            terminal::notify::app_quit_confirmed,
            terminal::notify::app_quit_cancelled,
            terminal::ctl::terminal_set_project_prefs
        ]);
    #[cfg(target_os = "macos")]
    let builder = builder
        .menu(terminal::notify::app_menu)
        .on_menu_event(terminal::notify::on_menu_event);
    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| terminal::notify::on_run_event(app, &event));
}
