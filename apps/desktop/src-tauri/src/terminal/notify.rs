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
    /// A quit was handed to the UI and not yet answered.
    quit_pending: AtomicBool,
}

impl Default for Ui {
    fn default() -> Self {
        Self {
            viewing: Mutex::default(),
            // Replaced by the localized string from `terminal_set_strings`.
            waiting_body: Mutex::new("Claude is waiting for you".into()),
            quit_pending: AtomicBool::new(false),
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

#[derive(Debug, PartialEq)]
pub enum QuitDecision {
    Exit,
    AskUi,
}

/// Ask the UI first while terminals are live — but a second quit while one is
/// pending goes through, so a dead/unloaded webview can never trap the user.
pub fn quit_decision(live: usize, pending: bool) -> QuitDecision {
    if live > 0 && !pending {
        QuitDecision::AskUi
    } else {
        QuitDecision::Exit
    }
}

/// `true` → the quit was handed to the UI and the caller must prevent it.
fn ask_ui_before_quit(app: &AppHandle) -> bool {
    let term = app.state::<Arc<TerminalState>>();
    let ui = app.state::<Ui>();
    let live = term.live_count();
    match quit_decision(live, ui.quit_pending.load(Ordering::SeqCst)) {
        QuitDecision::AskUi => {
            ui.quit_pending.store(true, Ordering::SeqCst);
            show(app);
            let _ = app.emit("terminal://quit-requested", json!({"count": live}));
            true
        }
        QuitDecision::Exit => {
            if live > 0 {
                term.kill_all();
            }
            false
        }
    }
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
            if ask_ui_before_quit(app) {
                api.prevent_close();
            }
        }
        // Restart (updater relaunch) cannot be prevented; don't raise a dialog for it.
        RunEvent::ExitRequested { api, code, .. } if *code != Some(tauri::RESTART_EXIT_CODE) => {
            if ask_ui_before_quit(app) {
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

#[cfg_attr(not(target_os = "macos"), allow(dead_code))] // menu is macOS-only
#[derive(Debug, PartialEq)]
pub enum CloseAction {
    ClosePane(String),
    HideWindow,
}

#[cfg_attr(not(target_os = "macos"), allow(dead_code))] // menu is macOS-only
/// ⌘W: close the viewed Terminal pane (UI-reported via `terminal_set_viewing`),
/// otherwise hide the window like the close button. Never quits.
pub fn close_window_action(viewing: Option<&str>) -> CloseAction {
    viewing.map_or(CloseAction::HideWindow, |id| CloseAction::ClosePane(id.into()))
}

#[cfg(target_os = "macos")]
const QUIT_MENU_ID: &str = "mdt-quit";
#[cfg(target_os = "macos")]
const CLOSE_MENU_ID: &str = "mdt-close-window";

/// Tauri's `Menu::default` for macOS, except Quit and Close Window are custom items:
/// the predefined Quit sends `terminate:`, which tao turns straight into `RunEvent::Exit`
/// (no `ExitRequested`), and the predefined ⌘W would pre-empt the webview's pane close.
#[cfg(target_os = "macos")]
pub fn app_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{
        AboutMetadata, Menu, MenuItem, PredefinedMenuItem as P, Submenu, HELP_SUBMENU_ID,
        WINDOW_SUBMENU_ID,
    };
    let (pkg, config) = (app.package_info(), app.config());
    let about = AboutMetadata {
        name: Some(pkg.name.clone()),
        version: Some(pkg.version.to_string()),
        copyright: config.bundle.copyright.clone(),
        authors: config.bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };
    let quit = MenuItem::with_id(app, QUIT_MENU_ID, format!("Quit {}", pkg.name), true, Some("CmdOrCtrl+Q"))?;
    let close = MenuItem::with_id(app, CLOSE_MENU_ID, "Close Window", true, Some("CmdOrCtrl+W"))?;
    Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                pkg.name.clone(),
                true,
                &[
                    &P::about(app, None, Some(about))?,
                    &P::separator(app)?,
                    &P::services(app, None)?,
                    &P::separator(app)?,
                    &P::hide(app, None)?,
                    &P::hide_others(app, None)?,
                    &P::separator(app)?,
                    &quit,
                ],
            )?,
            &Submenu::with_items(app, "File", true, &[&close])?,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &P::undo(app, None)?,
                    &P::redo(app, None)?,
                    &P::separator(app)?,
                    &P::cut(app, None)?,
                    &P::copy(app, None)?,
                    &P::paste(app, None)?,
                    &P::select_all(app, None)?,
                ],
            )?,
            &Submenu::with_items(app, "View", true, &[&P::fullscreen(app, None)?])?,
            &Submenu::with_id_and_items(
                app,
                WINDOW_SUBMENU_ID,
                "Window",
                true,
                &[
                    &P::minimize(app, None)?,
                    &P::maximize(app, None)?,
                    &P::separator(app)?,
                    &close,
                ],
            )?,
            &Submenu::with_id_and_items(app, HELP_SUBMENU_ID, "Help", true, &[])?,
        ],
    )
}

#[cfg(target_os = "macos")]
pub fn on_menu_event(app: &AppHandle, e: tauri::menu::MenuEvent) {
    if e.id() == QUIT_MENU_ID {
        app.exit(0); // → RunEvent::ExitRequested → confirm-quit check
    } else if e.id() == CLOSE_MENU_ID {
        let viewing = app.state::<Ui>().viewing.lock().unwrap().clone();
        match close_window_action(viewing.as_deref()) {
            CloseAction::ClosePane(id) => {
                let _ = app.emit("terminal://close-pane", json!({"id": id}));
            }
            CloseAction::HideWindow => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
        }
    }
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
    ui.quit_pending.store(false, Ordering::SeqCst);
    app.state::<Arc<TerminalState>>().kill_all(); // live_count → 0, so the exit below passes
    app.exit(0);
}

#[tauri::command]
pub fn app_quit_cancelled(ui: State<'_, Ui>) {
    ui.quit_pending.store(false, Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quit_decision_table() {
        use QuitDecision::*;
        assert_eq!(quit_decision(0, false), Exit);
        assert_eq!(quit_decision(0, true), Exit);
        assert_eq!(quit_decision(2, false), AskUi);
        assert_eq!(quit_decision(2, true), Exit); // second ⌘Q always quits
    }

    #[test]
    fn close_window_action_table() {
        assert_eq!(close_window_action(Some("a")), CloseAction::ClosePane("a".into()));
        assert_eq!(close_window_action(None), CloseAction::HideWindow);
    }

    #[test]
    fn should_notify_table() {
        assert!(!should_notify(true, Some("a"), "a"));
        assert!(should_notify(true, Some("b"), "a"));
        assert!(should_notify(false, Some("a"), "a"));
        assert!(should_notify(true, None, "a"));
    }
}
