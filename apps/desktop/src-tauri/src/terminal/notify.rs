//! "Claude needs you" (Dock badge + notification), hide-on-close and confirm-quit.

use super::hooks::{self, Transition};
use super::pty::TerminalState;
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WindowEvent};
use tauri_plugin_notification::NotificationExt;

/// Skip the notification only when the user is already looking at that pane.
pub fn should_notify(window_focused: bool, viewing: Option<&str>, id: &str) -> bool {
    !(window_focused && viewing == Some(id))
}

/// UI-reported state (managed).
pub struct Ui {
    viewing: Mutex<Option<String>>,
    waiting_body: Mutex<String>,
    quit_confirmed: AtomicBool,
}

impl Default for Ui {
    fn default() -> Self {
        Self {
            viewing: Mutex::default(),
            // Replaced by the localized string from `terminal_set_strings`.
            waiting_body: Mutex::new("Claude is waiting for you".into()),
            quit_confirmed: AtomicBool::new(false),
        }
    }
}

fn show(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Update the Dock badge after any transition; notify on entering Waiting.
pub fn on_transition(t: &Transition, message: Option<&str>, app: &AppHandle) {
    let term = app.state::<Arc<TerminalState>>();
    let win = app.get_webview_window("main");
    #[cfg(target_os = "macos")]
    if let Some(w) = &win {
        let n = term.statuses.lock().unwrap().waiting_count();
        let _ = w.set_badge_count((n > 0).then_some(n as i64));
    }
    if !t.entered_waiting {
        return;
    }
    let ui = app.state::<Ui>();
    let focused = win.and_then(|w| w.is_focused().ok()).unwrap_or(false);
    if !should_notify(focused, ui.viewing.lock().unwrap().as_deref(), &t.id) {
        return;
    }
    let body = message.map_or_else(|| ui.waiting_body.lock().unwrap().clone(), str::to_owned);
    let mut b = app.notification().builder().body(body).extra("terminalId", &t.id);
    // No title → the plugin falls back to productName.
    if let Ok(s) = term.get(&t.id) {
        b = b.title(&s.project_name);
    }
    if let Err(e) = b.show() {
        eprintln!("terminal: notification failed: {e}");
    }
}

/// Drop a killed/exited terminal's status (and badge contribution).
pub fn forget(app: &AppHandle, id: &str) {
    let t = app.state::<Arc<TerminalState>>().statuses.lock().unwrap().remove(id);
    if let Some(t) = t {
        hooks::publish(app, &t, None);
    }
}

/// Call from `setup` after the notification plugin is registered.
pub fn init(app: &AppHandle) {
    let handle = app.clone();
    let _ = app.notification().on_action(move |a| {
        if a.action_id() != "tap" {
            return;
        }
        show(&handle);
        let id = a.notification().and_then(|n| n.extra().get("terminalId")?.as_str());
        if let Some(id) = id {
            let _ = handle.emit("terminal://focus", json!({"id": id}));
        }
    });
}

/// Live terminals and quit not yet confirmed → raise the window and let the UI ask.
fn quit_blocked(app: &AppHandle) -> bool {
    let count = app.state::<Arc<TerminalState>>().live_count();
    if count == 0 || app.state::<Ui>().quit_confirmed.load(Ordering::SeqCst) {
        return false;
    }
    show(app);
    let _ = app.emit("terminal://quit-requested", json!({"count": count}));
    true
}

pub fn on_run_event(app: &AppHandle, event: &RunEvent) {
    match event {
        RunEvent::WindowEvent { label, event: WindowEvent::CloseRequested { api, .. }, .. }
            if label == "main" =>
        {
            #[cfg(target_os = "macos")]
            {
                api.prevent_close();
                if let Some(w) = app.get_webview_window(label) {
                    let _ = w.hide();
                }
            }
            // No Dock to reopen from: closing the window is quitting.
            #[cfg(not(target_os = "macos"))]
            if quit_blocked(app) {
                api.prevent_close();
            }
        }
        // Restart (updater relaunch) cannot be prevented; don't raise a dialog for it.
        RunEvent::ExitRequested { api, code, .. } if *code != Some(tauri::RESTART_EXIT_CODE) => {
            if quit_blocked(app) {
                api.prevent_exit();
            }
        }
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => show(app),
        // Also reached by paths that skip ExitRequested (Dock menu Quit, logout).
        RunEvent::Exit => app.state::<Arc<TerminalState>>().kill_all(),
        _ => {}
    }
}

/// macOS: the default Quit item sends `terminate:`, which tao turns straight into
/// `RunEvent::Exit` (no `ExitRequested`). Replace it with one that calls `app.exit`.
#[cfg(target_os = "macos")]
pub const QUIT_MENU_ID: &str = "mdt-quit";

#[cfg(target_os = "macos")]
pub fn app_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{Menu, MenuItem};
    let menu = Menu::default(app)?;
    if let Some(sub) = menu.items()?.first().and_then(|i| i.as_submenu().cloned()) {
        let n = sub.items()?.len();
        if n > 0 {
            sub.remove_at(n - 1)?; // PredefinedMenuItem::quit (last in Menu::default's app menu)
        }
        let label = format!("Quit {}", app.package_info().name);
        sub.append(&MenuItem::with_id(app, QUIT_MENU_ID, label, true, Some("CmdOrCtrl+Q"))?)?;
    }
    Ok(menu)
}

#[tauri::command]
pub fn terminal_set_viewing(app: AppHandle, ui: State<'_, Ui>, id: Option<String>) {
    if let Some(id) = &id {
        let t = app.state::<Arc<TerminalState>>().statuses.lock().unwrap().clear_waiting(id);
        if let Some(t) = t {
            hooks::publish(&app, &t, None);
        }
    }
    *ui.viewing.lock().unwrap() = id;
}

/// `quit_title` is accepted for the UI contract; the quit dialog itself is rendered by the UI.
#[tauri::command]
pub fn terminal_set_strings(ui: State<'_, Ui>, waiting_body: String, quit_title: String) {
    let _ = quit_title;
    *ui.waiting_body.lock().unwrap() = waiting_body;
}

#[tauri::command]
pub fn app_quit_confirmed(app: AppHandle, ui: State<'_, Ui>) {
    ui.quit_confirmed.store(true, Ordering::SeqCst);
    app.state::<Arc<TerminalState>>().kill_all();
    app.exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_notify_table() {
        assert!(!should_notify(true, Some("a"), "a"));
        assert!(should_notify(true, Some("b"), "a"));
        assert!(should_notify(false, Some("a"), "a"));
        assert!(should_notify(true, None, "a"));
    }
}
