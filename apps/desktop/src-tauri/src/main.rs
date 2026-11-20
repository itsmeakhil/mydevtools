#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // `mdt-term` shim: handle before any Tauri/tokio setup so it starts instantly.
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("term") {
        std::process::exit(mydevtools_desktop_lib::term_cli(&args[2..]));
    }
    mydevtools_desktop_lib::run()
}
