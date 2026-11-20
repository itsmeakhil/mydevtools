//! HTTP Digest auth (RFC 7616, RFC 2617, RFC 2069) — the client side of the
//! 401 challenge/response. The proxy sends the request once; on a `401` with a
//! `WWW-Authenticate: Digest …` challenge it answers with [`authorization`] and
//! resends once.

use md5::Md5;
use sha2::{Digest, Sha256, Sha512_256};

pub struct Credentials {
    pub username: String,
    pub password: String,
}

impl Credentials {
    pub fn from_input(v: &serde_json::Value) -> Option<Self> {
        let username = v["username"].as_str()?.to_string();
        Some(Credentials { username, password: v["password"].as_str().unwrap_or("").to_string() })
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Algorithm {
    Md5,
    Sha256,
    Sha512_256,
}

impl Algorithm {
    fn hash_bytes(self, data: &[u8]) -> String {
        fn hex(bytes: &[u8]) -> String {
            bytes.iter().map(|b| format!("{b:02x}")).collect()
        }
        match self {
            Algorithm::Md5 => hex(&Md5::digest(data)),
            Algorithm::Sha256 => hex(&Sha256::digest(data)),
            Algorithm::Sha512_256 => hex(&Sha512_256::digest(data)),
        }
    }

    fn hash(self, data: &str) -> String {
        self.hash_bytes(data.as_bytes())
    }

    /// Stronger first, so a server offering several challenges gets the best one.
    fn rank(self) -> u8 {
        match self {
            Algorithm::Sha512_256 => 3,
            Algorithm::Sha256 => 2,
            Algorithm::Md5 => 1,
        }
    }
}

/// One `Digest` challenge from a `WWW-Authenticate` header.
#[derive(Debug, Clone)]
pub struct Challenge {
    realm: String,
    nonce: String,
    opaque: Option<String>,
    algorithm: Algorithm,
    /// The `-sess` variant of `algorithm`.
    sess: bool,
    qop: Vec<String>,
    userhash: bool,
    /// Name as the server sent it (`SHA-256-sess`), echoed back.
    algorithm_name: Option<String>,
}

/// Split `k=v, k="quoted, with \"escapes\"", …` into pairs.
fn parse_params(s: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let mut chars = s.chars().peekable();
    loop {
        while matches!(chars.peek(), Some(c) if c.is_whitespace() || *c == ',') {
            chars.next();
        }
        let key: String = std::iter::from_fn(|| chars.next_if(|c| *c != '=' && *c != ',')).collect();
        if key.trim().is_empty() {
            break;
        }
        if chars.next_if_eq(&'=').is_none() {
            continue;
        }
        let mut value = String::new();
        if chars.next_if_eq(&'"').is_some() {
            while let Some(c) = chars.next() {
                match c {
                    '\\' => value.extend(chars.next()),
                    '"' => break,
                    c => value.push(c),
                }
            }
        } else {
            value = std::iter::from_fn(|| chars.next_if(|c| *c != ',')).collect::<String>().trim().to_string();
        }
        out.push((key.trim().to_ascii_lowercase(), value));
    }
    out
}

fn parse_challenge(params: &str) -> Option<Challenge> {
    let mut c = Challenge {
        realm: String::new(),
        nonce: String::new(),
        opaque: None,
        algorithm: Algorithm::Md5,
        sess: false,
        qop: Vec::new(),
        userhash: false,
        algorithm_name: None,
    };
    let mut nonce = None;
    for (k, v) in parse_params(params) {
        match k.as_str() {
            "realm" => c.realm = v,
            "nonce" => nonce = Some(v),
            "opaque" => c.opaque = Some(v),
            "qop" => c.qop = v.split(',').map(|q| q.trim().to_ascii_lowercase()).filter(|q| !q.is_empty()).collect(),
            "userhash" => c.userhash = v.eq_ignore_ascii_case("true"),
            "algorithm" => {
                let upper = v.to_ascii_uppercase();
                let (base, sess) = match upper.strip_suffix("-SESS") {
                    Some(b) => (b.to_string(), true),
                    None => (upper.clone(), false),
                };
                c.algorithm = match base.as_str() {
                    "MD5" => Algorithm::Md5,
                    "SHA-256" => Algorithm::Sha256,
                    "SHA-512-256" => Algorithm::Sha512_256,
                    _ => return None, // unknown algorithm: can't answer this challenge
                };
                c.sess = sess;
                c.algorithm_name = Some(v);
            }
            _ => {}
        }
    }
    c.nonce = nonce?;
    Some(c)
}

/// The strongest Digest challenge among `WWW-Authenticate` header values.
/// A value may hold several schemes (`Digest …, Basic realm="x"`).
pub fn pick_challenge<'a>(header_values: impl Iterator<Item = &'a str>) -> Option<Challenge> {
    let mut best: Option<Challenge> = None;
    for value in header_values {
        // Each "Digest" token starts a challenge that runs until the next scheme token.
        let mut rest = value;
        while let Some(pos) = find_scheme(rest, "digest") {
            let after = &rest[pos + "digest".len()..];
            let end = next_scheme_start(after).unwrap_or(after.len());
            if let Some(c) = parse_challenge(&after[..end]) {
                if best.as_ref().is_none_or(|b| c.algorithm.rank() > b.algorithm.rank()) {
                    best = Some(c);
                }
            }
            rest = &after[end..];
        }
    }
    best
}

/// Byte offset of `scheme` as an auth-scheme token (start of value or after a comma).
fn find_scheme(s: &str, scheme: &str) -> Option<usize> {
    let lower = s.to_ascii_lowercase();
    let mut from = 0;
    while let Some(i) = lower[from..].find(scheme).map(|i| i + from) {
        let before = lower[..i].trim_end();
        let after = lower[i + scheme.len()..].chars().next();
        if (before.is_empty() || before.ends_with(',')) && after.is_none_or(|c| c.is_whitespace()) {
            return Some(i);
        }
        from = i + scheme.len();
    }
    None
}

/// Start of the next `Scheme param=…` token: a bare word followed by a space (not by `=`).
fn next_scheme_start(s: &str) -> Option<usize> {
    let mut in_quotes = false;
    let mut escaped = false;
    for (i, c) in s.char_indices() {
        if escaped {
            escaped = false;
            continue;
        }
        match c {
            '\\' if in_quotes => escaped = true,
            '"' => in_quotes = !in_quotes,
            ',' if !in_quotes => {
                let tail = s[i + 1..].trim_start();
                let word: String = tail.chars().take_while(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
                let next = tail[word.len()..].chars().next();
                if !word.is_empty() && next.is_some_and(|c| c.is_whitespace()) {
                    return Some(i);
                }
            }
            _ => {}
        }
    }
    None
}

fn quote(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
}

/// `Authorization` value answering `challenge`. `uri` is the request-target
/// (path + query); `body` is needed only when the server insists on `auth-int`
/// — pass `None` when the body isn't available as bytes (multipart).
/// Returns `None` when the challenge can't be answered (auth-int without a body).
pub fn authorization(
    challenge: &Challenge,
    creds: &Credentials,
    method: &str,
    uri: &str,
    body: Option<&[u8]>,
    cnonce: &str,
    nc: u32,
) -> Option<String> {
    let alg = challenge.algorithm;
    let h = |s: &str| alg.hash(s);
    let qop = if challenge.qop.iter().any(|q| q == "auth") {
        Some("auth")
    } else if challenge.qop.iter().any(|q| q == "auth-int") {
        body?;
        Some("auth-int")
    } else if challenge.qop.is_empty() {
        None // RFC 2069
    } else {
        return None;
    };
    let nc = format!("{nc:08x}");

    let mut ha1 = h(&format!("{}:{}:{}", creds.username, challenge.realm, creds.password));
    if challenge.sess {
        ha1 = h(&format!("{ha1}:{}:{cnonce}", challenge.nonce));
    }
    let ha2 = match qop {
        Some("auth-int") => h(&format!("{method}:{uri}:{}", alg.hash_bytes(body.unwrap_or_default()))),
        _ => h(&format!("{method}:{uri}")),
    };
    let response = match qop {
        Some(q) => h(&format!("{ha1}:{}:{nc}:{cnonce}:{q}:{ha2}", challenge.nonce)),
        None => h(&format!("{ha1}:{}:{ha2}", challenge.nonce)),
    };

    let username = if challenge.userhash {
        h(&format!("{}:{}", creds.username, challenge.realm))
    } else {
        creds.username.clone()
    };
    let mut parts = vec![
        format!("username={}", quote(&username)),
        format!("realm={}", quote(&challenge.realm)),
        format!("nonce={}", quote(&challenge.nonce)),
        format!("uri={}", quote(uri)),
    ];
    if let Some(name) = &challenge.algorithm_name {
        parts.push(format!("algorithm={name}"));
    }
    if let Some(q) = qop {
        parts.push(format!("qop={q}"));
        parts.push(format!("nc={nc}"));
        parts.push(format!("cnonce={}", quote(cnonce)));
    }
    parts.push(format!("response={}", quote(&response)));
    if let Some(o) = &challenge.opaque {
        parts.push(format!("opaque={}", quote(o)));
    }
    if challenge.userhash {
        parts.push("userhash=true".into());
    }
    Some(format!("Digest {}", parts.join(", ")))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn response_of(header: &str) -> String {
        parse_params(header.trim_start_matches("Digest "))
            .into_iter()
            .find(|(k, _)| k == "response")
            .unwrap()
            .1
    }

    const RFC7616_MD5: &str = r#"Digest realm="http-auth@example.org", qop="auth, auth-int", algorithm=MD5, nonce="7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v", opaque="FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS""#;
    const RFC7616_SHA256: &str = r#"Digest realm="http-auth@example.org", qop="auth, auth-int", algorithm=SHA-256, nonce="7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v", opaque="FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS""#;
    const RFC7616_CNONCE: &str = "f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ";

    fn mufasa(password: &str) -> Credentials {
        Credentials { username: "Mufasa".into(), password: password.into() }
    }

    #[test]
    fn rfc7616_md5_and_sha256_vectors() {
        let creds = mufasa("Circle of Life");
        let md5 = pick_challenge([RFC7616_MD5].into_iter()).unwrap();
        let h = authorization(&md5, &creds, "GET", "/dir/index.html", None, RFC7616_CNONCE, 1).unwrap();
        assert_eq!(response_of(&h), "8ca523f5e9506fed4657c9700eebdbec");
        assert!(h.contains(r#"opaque="FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS""#), "{h}");
        assert!(h.contains("qop=auth,") && h.contains("nc=00000001"), "{h}");

        let sha = pick_challenge([RFC7616_SHA256].into_iter()).unwrap();
        let h = authorization(&sha, &creds, "GET", "/dir/index.html", None, RFC7616_CNONCE, 1).unwrap();
        assert_eq!(response_of(&h), "753927fa0e85d155564e2e272a28d1802ca10daf4496794697cf8db5856cb6c1");
        assert!(h.contains("algorithm=SHA-256"), "{h}");
    }

    #[test]
    fn rfc2617_vector() {
        let ch = pick_challenge(
            [r#"Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41""#]
                .into_iter(),
        )
        .unwrap();
        let h = authorization(&ch, &mufasa("Circle Of Life"), "GET", "/dir/index.html", None, "0a4f113b", 1).unwrap();
        assert_eq!(response_of(&h), "6629fae49393a05397450978507c4ef1");
        // No algorithm in the challenge → none echoed back.
        assert!(!h.contains("algorithm="), "{h}");
    }

    #[test]
    fn rfc2069_without_qop() {
        // RFC 2069 example: response = MD5(HA1:nonce:HA2).
        let ch = pick_challenge([r#"Digest realm="testrealm@host.com", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41""#].into_iter()).unwrap();
        let h = authorization(&ch, &mufasa("CircleOfLife"), "GET", "/dir/index.html", None, "x", 1).unwrap();
        assert_eq!(response_of(&h), "1949323746fe6a43ef61f9606e7febea");
        assert!(!h.contains("qop=") && !h.contains("cnonce="), "{h}");
    }

    #[test]
    fn picks_strongest_challenge_among_schemes() {
        let headers = [
            r#"Basic realm="x", Digest realm="r", nonce="n1", algorithm=MD5, qop="auth""#,
            r#"Digest realm="r", nonce="n2", algorithm=SHA-256, qop="auth""#,
        ];
        let ch = pick_challenge(headers.into_iter()).unwrap();
        assert_eq!(ch.algorithm, Algorithm::Sha256);
        assert_eq!(ch.nonce, "n2");
        // A Basic-only challenge has nothing to answer.
        assert!(pick_challenge([r#"Basic realm="x""#].into_iter()).is_none());
        // Unknown algorithms are skipped, not mis-answered.
        assert!(pick_challenge([r#"Digest realm="r", nonce="n", algorithm=SHA-1"#].into_iter()).is_none());
    }

    #[test]
    fn sess_auth_int_userhash_and_quoting() {
        let ch = pick_challenge([r#"Digest realm="r", nonce="n", algorithm=SHA-256-sess, qop="auth-int", userhash=true"#].into_iter()).unwrap();
        let creds = Credentials { username: r#"a"b"#.into(), password: "p".into() };
        // auth-int needs the body bytes.
        assert!(authorization(&ch, &creds, "POST", "/x", None, "c", 1).is_none());
        let h = authorization(&ch, &creds, "POST", "/x", Some(b"{}"), "c", 1).unwrap();
        assert!(h.contains("qop=auth-int") && h.contains("algorithm=SHA-256-sess") && h.contains("userhash=true"), "{h}");
        // userhash replaces the username with H(user:realm), so no raw quote leaks in.
        assert!(!h.contains(r#"a\"b"#), "{h}");

        let plain = pick_challenge([r#"Digest realm="r\"q", nonce="n", qop="auth""#].into_iter()).unwrap();
        let h = authorization(&plain, &creds, "GET", "/", None, "c", 1).unwrap();
        assert!(h.contains(r#"username="a\"b""#) && h.contains(r#"realm="r\"q""#), "{h}");
    }
}
