//! Content-Security-Policy for every asset the webview loads.
//!
//! Tauri's own `app.security.csp` is attached to `.html` responses only, so the
//! api-client script sandbox (a module worker served as `.js`) would run with no
//! policy at all. The main window sets this header on every response instead.
//!
//! Only script loading is restricted: request scripts must not pull code from, or
//! smuggle data in a URL to, arbitrary hosts via `import()` / `importScripts`.
//! connect/img/style/font stay open: the API client, WebSocket and SSE features
//! talk to any host the user points them at.
use std::borrow::Cow;
use tauri::http::{header::CONTENT_SECURITY_POLICY, HeaderValue, Response};

/// Monaco is loaded from jsdelivr (`@monaco-editor/loader` default, see commit
/// abf5190e) — allowed by exact package path only, not the whole CDN, which also
/// serves arbitrary GitHub/npm content. Keep in sync with the loader's `vs` path;
/// `src/__tests__/webview-csp.test.ts` in desktop-ui fails on drift.
pub const CSP: &str = "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' \
https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/; \
worker-src 'self' blob: data:; object-src 'none'; base-uri 'self'";

pub fn apply(res: &mut Response<Cow<'static, [u8]>>) {
    res.headers_mut().insert(CONTENT_SECURITY_POLICY, HeaderValue::from_static(CSP));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn directive(name: &str) -> Option<&'static str> {
        CSP.split(';').map(str::trim).find_map(|d| d.strip_prefix(name)).map(str::trim)
    }

    #[test]
    fn scripts_are_locked_to_self_and_the_monaco_package() {
        let script = directive("script-src ").expect("script-src");
        let hosts: Vec<_> = script.split_whitespace().filter(|s| !s.starts_with('\'')).collect();
        assert_eq!(hosts, ["https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/"]);
    }

    #[test]
    fn network_directives_stay_open() {
        for d in ["default-src", "connect-src", "img-src", "style-src", "font-src"] {
            assert!(directive(d).is_none(), "{d} would restrict API client traffic or rendering");
        }
    }

    #[test]
    fn header_is_set_on_any_response() {
        let mut res = Response::new(Cow::Borrowed(&b"self.onmessage = () => {}"[..]));
        apply(&mut res);
        assert_eq!(res.headers()[CONTENT_SECURITY_POLICY], CSP);
    }
}
