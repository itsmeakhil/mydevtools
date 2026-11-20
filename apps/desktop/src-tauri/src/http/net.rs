//! Per-request network setup for api-client sends: client certificates (PEM or
//! PFX) picked by host pattern, extra CA certificates, and the proxy mode.
//!
//! The webview sends `input.net = { certs: [...], caPaths: [...], proxy: {...} }`
//! (global Preferences merged with the collection's own entries). Only file
//! PATHS cross the bridge; the files are read here at send time.
//!
//! Clients are cached by everything that shapes them — proxy, cert checking,
//! the identity's bytes, the CA bytes — so a connection opened with one
//! identity is never reused for another.

use serde_json::Value;
use std::collections::HashMap;
use std::io::Write;
use std::sync::{Mutex, OnceLock};

#[derive(Debug, Clone, Default, PartialEq)]
pub struct CertEntry {
    /// `example.com`, `*.example.com`, `api.example.com:8443` or `*`.
    pub host: String,
    pub cert_path: String,
    pub key_path: String,
    pub pfx_path: String,
    pub passphrase: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ProxyMode {
    /// OS / environment proxy settings (reqwest default).
    System,
    Off,
    Manual { url: String, username: String, password: String, bypass: String },
}

#[derive(Debug, Clone, PartialEq)]
pub struct NetConfig {
    pub certs: Vec<CertEntry>,
    pub ca_paths: Vec<String>,
    pub proxy: ProxyMode,
}

impl Default for NetConfig {
    fn default() -> Self {
        NetConfig { certs: Vec::new(), ca_paths: Vec::new(), proxy: ProxyMode::System }
    }
}

fn s(v: &Value) -> String {
    v.as_str().unwrap_or("").trim().to_string()
}

impl NetConfig {
    pub fn from_input(input: &Value) -> Self {
        let net = &input["net"];
        let certs = net["certs"]
            .as_array()
            .map(|list| {
                list.iter()
                    .filter(|c| c["enabled"].as_bool() != Some(false))
                    .map(|c| CertEntry {
                        host: s(&c["host"]),
                        cert_path: s(&c["certPath"]),
                        key_path: s(&c["keyPath"]),
                        pfx_path: s(&c["pfxPath"]),
                        // Passphrases are taken verbatim (no trim).
                        passphrase: c["passphrase"].as_str().unwrap_or("").to_string(),
                    })
                    .filter(|c| !c.host.is_empty() && (!c.cert_path.is_empty() || !c.pfx_path.is_empty()))
                    .collect()
            })
            .unwrap_or_default();
        let ca_paths = net["caPaths"]
            .as_array()
            .map(|l| l.iter().map(s).filter(|p| !p.is_empty()).collect())
            .unwrap_or_default();
        let p = &net["proxy"];
        let proxy = match p["mode"].as_str() {
            Some("off") => ProxyMode::Off,
            Some("manual") if !s(&p["url"]).is_empty() => ProxyMode::Manual {
                url: s(&p["url"]),
                username: s(&p["username"]),
                password: p["password"].as_str().unwrap_or("").to_string(),
                bypass: s(&p["bypass"]),
            },
            _ => ProxyMode::System,
        };
        NetConfig { certs, ca_paths, proxy }
    }

    /// First entry whose host pattern matches `url` (callers put collection
    /// entries before global ones).
    pub fn cert_for(&self, url: &reqwest::Url) -> Option<&CertEntry> {
        self.certs.iter().find(|c| host_matches(&c.host, url))
    }
}

/// Bruno/Postman-style host pattern: `host[:port]`, `*.domain` (any depth of
/// subdomain, not the bare domain), or `*` for every host. A scheme prefix is
/// ignored. Without a port the pattern matches any port.
pub fn host_matches(pattern: &str, url: &reqwest::Url) -> bool {
    let p = pattern.trim().to_lowercase();
    let p = p.split("://").last().unwrap_or("").trim_end_matches('/');
    if p == "*" {
        return true;
    }
    let host = url.host_str().unwrap_or("").to_lowercase();
    let (p_host, p_port) = match p.rsplit_once(':') {
        Some((h, port)) if port.chars().all(|c| c.is_ascii_digit()) && !port.is_empty() => (h, Some(port)),
        _ => (p, None),
    };
    if let Some(port) = p_port {
        if url.port_or_known_default().map(|x| x.to_string()).as_deref() != Some(port) {
            return false;
        }
    }
    match p_host.strip_prefix("*.") {
        Some(domain) => host.ends_with(&format!(".{domain}")),
        None => host == p_host,
    }
}

fn read(path: &str, what: &str) -> Result<Vec<u8>, String> {
    std::fs::read(path).map_err(|e| format!("Can't read {what} {path}: {e}"))
}

/// What identifies a client identity: its file bytes (+ passphrase for PFX).
/// Building the reqwest Identity only happens on a cache miss.
fn identity_material(entry: &CertEntry) -> Result<Vec<u8>, String> {
    if !entry.pfx_path.is_empty() {
        let mut m = b"pfx\0".to_vec();
        m.extend(read(&entry.pfx_path, "PFX file")?);
        m.push(0);
        m.extend(entry.passphrase.as_bytes());
        return Ok(m);
    }
    let mut m = b"pem\0".to_vec();
    m.extend(read(&entry.cert_path, "certificate")?);
    if !entry.key_path.is_empty() {
        m.push(b'\n');
        m.extend(read(&entry.key_path, "private key")?);
    }
    Ok(m)
}

/// PKCS#12 → PEM (cert chain + unencrypted key), in memory.
///
/// ponytail: shells out to the system `openssl` (LibreSSL ships at
/// /usr/bin/openssl on macOS) because the rustls stack has no PKCS#12 parser
/// and no PKCS#12 crate is in the tree. Upgrade: a pure-Rust p12 crate.
fn pfx_to_pem(pfx: &[u8], passphrase: &str) -> Result<Vec<u8>, String> {
    use std::process::{Command, Stdio};
    let bin = if std::path::Path::new("/usr/bin/openssl").exists() { "/usr/bin/openssl" } else { "openssl" };
    let mut child = Command::new(bin)
        .args(["pkcs12", "-nodes", "-passin", "env:MDT_PFX_PASS"])
        .env("MDT_PFX_PASS", passphrase)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Reading PFX files needs the openssl tool: {e}"))?;
    let mut stdin = child.stdin.take().ok_or("openssl stdin unavailable")?;
    let input = pfx.to_vec();
    let writer = std::thread::spawn(move || stdin.write_all(&input));
    let out = child.wait_with_output().map_err(|e| e.to_string())?;
    let _ = writer.join();
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        let first = err.lines().next().unwrap_or("").trim();
        return Err(format!("Can't open the PFX file (wrong passphrase?): {first}"));
    }
    Ok(out.stdout)
}

fn reqwest_identity(entry: &CertEntry, material: &[u8]) -> Result<reqwest::Identity, String> {
    let pem = if entry.pfx_path.is_empty() {
        material[4..].to_vec()
    } else {
        pfx_to_pem(&read(&entry.pfx_path, "PFX file")?, &entry.passphrase)?
    };
    reqwest::Identity::from_pem(&pem).map_err(|e| {
        let encrypted = String::from_utf8_lossy(&pem).contains("ENCRYPTED");
        if encrypted {
            "Encrypted PEM keys aren't supported — use an unencrypted key or a PFX file with a passphrase".to_string()
        } else {
            format!("Invalid client certificate/key: {e}")
        }
    })
}

fn ca_material(cfg: &NetConfig) -> Result<Vec<u8>, String> {
    let mut all = Vec::new();
    for p in &cfg.ca_paths {
        all.extend(read(p, "CA certificate")?);
        all.push(b'\n');
    }
    Ok(all)
}

#[derive(Hash, PartialEq, Eq, Clone, Debug)]
struct ClientKey {
    insecure: bool,
    /// Effective proxy for this target, flattened (`system`, `off`, `manual\0…`).
    proxy: String,
    identity: Option<Vec<u8>>,
    ca: Vec<u8>,
}

fn proxy_key(cfg: &NetConfig, local_target: bool) -> String {
    // Loopback/private targets never go through a proxy (browsers do the same).
    if local_target {
        return "off".into();
    }
    match &cfg.proxy {
        ProxyMode::System => "system".into(),
        ProxyMode::Off => "off".into(),
        ProxyMode::Manual { url, username, password, bypass } => format!("manual\0{url}\0{username}\0{password}\0{bypass}"),
    }
}

/// `*.corp.example` → `.corp.example` (reqwest NoProxy's subdomain form);
/// entries separated by commas, spaces or newlines.
fn no_proxy_list(bypass: &str) -> String {
    bypass
        .split(|c: char| c == ',' || c.is_whitespace())
        .filter(|e| !e.is_empty())
        .map(|e| e.strip_prefix("*.").map(|d| format!(".{d}")).unwrap_or_else(|| e.to_string()))
        .collect::<Vec<_>>()
        .join(",")
}

fn manual_proxy(url: &str, username: &str, password: &str, bypass: &str) -> Result<reqwest::Proxy, String> {
    let mut u = reqwest::Url::parse(url).map_err(|_| format!("Invalid proxy URL: {url}"))?;
    match u.scheme() {
        "http" | "https" | "socks5" | "socks5h" => {}
        s => return Err(format!("Unsupported proxy scheme: {s} (use http, https or socks5)")),
    }
    if !username.is_empty() {
        u.set_username(username).map_err(|_| "Invalid proxy username")?;
        u.set_password(Some(password)).map_err(|_| "Invalid proxy password")?;
    }
    let proxy = reqwest::Proxy::all(u.as_str()).map_err(|e| e.to_string())?;
    Ok(proxy.no_proxy(reqwest::NoProxy::from_string(&no_proxy_list(bypass))))
}

static CLIENTS: OnceLock<Mutex<HashMap<ClientKey, reqwest::Client>>> = OnceLock::new();
const MAX_CACHED_CLIENTS: usize = 32;

/// Pooled client for a request to `url` under `cfg`. `local_target` = the host is
/// loopback/private (always direct).
pub fn client_for(url: &reqwest::Url, cfg: &NetConfig, insecure: bool, local_target: bool) -> Result<reqwest::Client, String> {
    let cert = cfg.cert_for(url);
    let key = ClientKey {
        insecure,
        proxy: proxy_key(cfg, local_target),
        identity: cert.map(identity_material).transpose()?,
        ca: ca_material(cfg)?,
    };
    let cache = CLIENTS.get_or_init(|| Mutex::new(HashMap::new()));
    if let Some(c) = cache.lock().unwrap().get(&key) {
        return Ok(c.clone());
    }

    let mut builder = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("mydevtools-desktop");
    match (&cfg.proxy, local_target) {
        (_, true) | (ProxyMode::Off, _) => builder = builder.no_proxy(),
        (ProxyMode::System, _) => {}
        (ProxyMode::Manual { url, username, password, bypass }, _) => {
            builder = builder.no_proxy().proxy(manual_proxy(url, username, password, bypass)?);
        }
    }
    if insecure {
        builder = builder.danger_accept_invalid_certs(true);
    }
    if let (Some(entry), Some(material)) = (cert, key.identity.as_ref()) {
        builder = builder.identity(reqwest_identity(entry, material)?);
    }
    if !key.ca.is_empty() {
        let certs = reqwest::Certificate::from_pem_bundle(&key.ca).map_err(|e| format!("Invalid CA certificate: {e}"))?;
        builder = builder.tls_certs_merge(certs);
    }
    let client = builder.build().map_err(|e| {
        // reqwest's Display is just "builder error"; the cause is in the chain.
        let mut msg = e.to_string();
        let mut src = std::error::Error::source(&e);
        while let Some(inner) = src {
            msg.push_str(": ");
            msg.push_str(&inner.to_string());
            src = inner.source();
        }
        msg
    })?;

    let mut map = cache.lock().unwrap();
    // ponytail: wholesale clear past the cap; distinct configs are few in practice.
    if map.len() >= MAX_CACHED_CLIENTS {
        map.clear();
    }
    map.insert(key, client.clone());
    Ok(client)
}

/// Apply the matching client certificate and extra CAs to a native-tls
/// connector (the gRPC transport). Proxies don't apply there (raw TCP).
pub fn apply_native_tls(
    builder: &mut native_tls::TlsConnectorBuilder,
    cfg: &NetConfig,
    url: &reqwest::Url,
) -> Result<(), String> {
    if let Some(entry) = cfg.cert_for(url) {
        let identity = if !entry.pfx_path.is_empty() {
            native_tls::Identity::from_pkcs12(&read(&entry.pfx_path, "PFX file")?, &entry.passphrase)
                .map_err(|e| format!("Can't open the PFX file (wrong passphrase?): {e}"))?
        } else {
            let cert = read(&entry.cert_path, "certificate")?;
            let key = if entry.key_path.is_empty() { cert.clone() } else { read(&entry.key_path, "private key")? };
            native_tls::Identity::from_pkcs8(&cert, &key)
                .map_err(|e| format!("Invalid client certificate/key (gRPC needs a PKCS#8 key): {e}"))?
        };
        builder.identity(identity);
    }
    let ca = ca_material(cfg)?;
    let text = String::from_utf8_lossy(&ca);
    for block in text.split_inclusive("-----END CERTIFICATE-----").filter(|b| b.contains("BEGIN CERTIFICATE")) {
        let cert = native_tls::Certificate::from_pem(block.trim_start().as_bytes()).map_err(|e| format!("Invalid CA certificate: {e}"))?;
        builder.add_root_certificate(cert);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn url(u: &str) -> reqwest::Url {
        reqwest::Url::parse(u).unwrap()
    }

    #[test]
    fn host_patterns() {
        assert!(host_matches("api.example.com", &url("https://api.example.com/x")));
        assert!(host_matches("API.Example.com", &url("https://api.example.com:9443/x")));
        assert!(!host_matches("example.com", &url("https://api.example.com")));
        assert!(host_matches("*.example.com", &url("https://a.b.example.com")));
        assert!(!host_matches("*.example.com", &url("https://example.com")));
        assert!(!host_matches("*.example.com", &url("https://badexample.com")));
        assert!(host_matches("api.example.com:8443", &url("https://api.example.com:8443/")));
        assert!(!host_matches("api.example.com:8443", &url("https://api.example.com/")));
        assert!(host_matches("api.example.com:443", &url("https://api.example.com/")));
        assert!(host_matches("https://api.example.com/", &url("https://api.example.com/v1")));
        assert!(host_matches("*", &url("http://anything.test")));
    }

    #[test]
    fn config_parsing() {
        let cfg = NetConfig::from_input(&json!({ "net": {
            "certs": [
                { "host": "a.test", "certPath": "/c.pem", "keyPath": "/k.pem" },
                { "host": "b.test", "pfxPath": "/b.pfx", "passphrase": " pw " },
                { "host": "c.test", "certPath": "/c.pem", "enabled": false },
                { "host": "", "certPath": "/x.pem" },
                { "host": "d.test" }
            ],
            "caPaths": ["/ca.pem", " "],
            "proxy": { "mode": "manual", "url": "socks5://p:1080", "username": "u", "password": "pw", "bypass": "*.corp, localhost" }
        }}));
        assert_eq!(cfg.certs.len(), 2);
        assert_eq!(cfg.certs[1].passphrase, " pw ");
        assert_eq!(cfg.ca_paths, vec!["/ca.pem"]);
        assert!(matches!(cfg.proxy, ProxyMode::Manual { ref url, .. } if url == "socks5://p:1080"));
        assert_eq!(cfg.cert_for(&url("https://b.test")).unwrap().pfx_path, "/b.pfx");
        assert!(cfg.cert_for(&url("https://c.test")).is_none());

        assert_eq!(NetConfig::from_input(&json!({})), NetConfig::default());
        assert_eq!(NetConfig::from_input(&json!({ "net": { "proxy": { "mode": "manual" } } })).proxy, ProxyMode::System);
        assert_eq!(NetConfig::from_input(&json!({ "net": { "proxy": { "mode": "off" } } })).proxy, ProxyMode::Off);
    }

    #[test]
    fn proxy_helpers() {
        assert_eq!(no_proxy_list("*.corp.example, localhost\n10.0.0.0/8"), ".corp.example,localhost,10.0.0.0/8");
        assert!(manual_proxy("socks5://127.0.0.1:1080", "u", "p", "").is_ok());
        assert!(manual_proxy("http://proxy:3128", "", "", "*.local").is_ok());
        assert!(manual_proxy("ftp://proxy", "", "", "").unwrap_err().contains("Unsupported proxy scheme"));
        assert!(manual_proxy("not a url", "", "", "").is_err());
    }

    #[test]
    fn cache_key_separates_configs() {
        let manual = NetConfig {
            proxy: ProxyMode::Manual { url: "http://p:1".into(), username: String::new(), password: String::new(), bypass: String::new() },
            ..NetConfig::default()
        };
        assert_eq!(proxy_key(&manual, true), "off", "local targets are always direct");
        assert_ne!(proxy_key(&manual, false), proxy_key(&NetConfig::default(), false));
        let a = client_for(&url("https://x.test"), &NetConfig::default(), false, false).unwrap();
        let _ = a; // building must succeed without any files
        assert!(client_for(&url("https://x.test"), &manual, false, false).is_ok());
    }

    /// Self-signed X.509 v3 cert + key from the system openssl (rustls rejects
    /// v1 certs, which `req -x509` makes without extensions).
    fn make_pem(dir: &std::path::Path, name: &str, ca: bool) -> Option<(String, String)> {
        let cert = dir.join(format!("{name}.crt.pem"));
        let key = dir.join(format!("{name}.key.pem"));
        let constraints = if ca { "basicConstraints=critical,CA:TRUE" } else { "basicConstraints=critical,CA:FALSE" };
        let usage = if ca { "keyUsage=keyCertSign,cRLSign" } else { "extendedKeyUsage=clientAuth" };
        let ok = std::process::Command::new("/usr/bin/openssl")
            .args(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=mdt-test"])
            .args(["-addext", constraints, "-addext", usage])
            .arg("-keyout").arg(&key).arg("-out").arg(&cert)
            .output().ok()?.status.success();
        ok.then(|| (cert.to_string_lossy().into(), key.to_string_lossy().into()))
    }

    fn tmpdir(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("mdt-net-{name}-{}", std::process::id()));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn pem_and_pfx_identities_load_and_key_the_cache() {
        let dir = tmpdir("ident");
        let Some((cert, key)) = make_pem(&dir, "client", false) else {
            eprintln!("skipping: /usr/bin/openssl unavailable");
            return;
        };
        let pfx = dir.join("id.pfx");
        let made = std::process::Command::new("/usr/bin/openssl")
            .args(["pkcs12", "-export", "-passout", "pass:s3cret", "-inkey", &key, "-in", &cert])
            .arg("-out").arg(&pfx)
            .output().unwrap().status.success();
        assert!(made);

        let pem_cfg = NetConfig {
            certs: vec![CertEntry { host: "*.mtls.test".into(), cert_path: cert.clone(), key_path: key.clone(), ..Default::default() }],
            ..NetConfig::default()
        };
        client_for(&url("https://a.mtls.test"), &pem_cfg, false, false).unwrap();

        let pfx_entry = |pass: &str| CertEntry {
            host: "*".into(),
            pfx_path: pfx.to_string_lossy().into(),
            passphrase: pass.into(),
            ..Default::default()
        };
        let good = NetConfig { certs: vec![pfx_entry("s3cret")], ..NetConfig::default() };
        client_for(&url("https://x.test"), &good, false, false).unwrap();
        let bad = NetConfig { certs: vec![pfx_entry("nope")], ..NetConfig::default() };
        assert!(client_for(&url("https://x.test"), &bad, false, false).unwrap_err().contains("wrong passphrase"));

        // Different identity bytes ⇒ different cache keys.
        assert_ne!(identity_material(&pem_cfg.certs[0]).unwrap(), identity_material(&good.certs[0]).unwrap());

        // The same files work for the native-tls (gRPC) path.
        let mut b = native_tls::TlsConnector::builder();
        apply_native_tls(&mut b, &good, &url("https://x.test")).unwrap();

        // CA bundle: two CA certs concatenated, as an extra root set.
        let (ca1, _) = make_pem(&dir, "ca1", true).unwrap();
        let (ca2, _) = make_pem(&dir, "ca2", true).unwrap();
        let bundle = dir.join("bundle.pem");
        std::fs::write(&bundle, [std::fs::read(&ca1).unwrap(), std::fs::read(&ca2).unwrap()].concat()).unwrap();
        let ca_cfg = NetConfig { ca_paths: vec![bundle.to_string_lossy().into()], ..NetConfig::default() };
        client_for(&url("https://x.test"), &ca_cfg, false, false).unwrap();
        let mut b = native_tls::TlsConnector::builder();
        apply_native_tls(&mut b, &ca_cfg, &url("https://x.test")).unwrap();

        let missing = NetConfig { ca_paths: vec!["/nope/ca.pem".into()], ..NetConfig::default() };
        assert!(client_for(&url("https://x.test"), &missing, false, false).unwrap_err().contains("Can't read CA certificate"));
        let _ = std::fs::remove_dir_all(dir);
    }
}
