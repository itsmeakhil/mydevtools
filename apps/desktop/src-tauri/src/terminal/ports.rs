//! Local servers a pane starts: URLs like `http://localhost:3000/api` in its output, kept only
//! while something actually listens on that port (loopback probe), so stale lines don't linger.

use serde::Serialize;
use std::time::Duration;

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LocalPort {
    pub port: u16,
    pub url: String,
}

/// Finds local URLs in output; carries the tail of each read so a URL split across reads is found.
#[derive(Default)]
pub struct Scanner {
    carry: String,
}

const CARRY: usize = 128;

fn url_re() -> &'static regex::Regex {
    static RE: std::sync::OnceLock<regex::Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| {
        regex::Regex::new(
            r#"(?i)(?:\b(https?)://)?(?:\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)|\[::1?\]):(\d{1,5})\b(/[^\s'"<>)\]]*)?"#,
        )
        .unwrap()
    })
}

/// Output text without colours and other escape sequences.
fn strip_ansi(s: &str) -> std::borrow::Cow<'_, str> {
    static RE: std::sync::OnceLock<regex::Regex> = std::sync::OnceLock::new();
    RE.get_or_init(|| regex::Regex::new(r"\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)?|[@-Z\\-_])").unwrap())
        .replace_all(s, "")
}

impl Scanner {
    pub fn feed(&mut self, bytes: &[u8], out: &mut Vec<LocalPort>) {
        let carried = self.carry.len();
        let text = format!("{}{}", self.carry, strip_ansi(&String::from_utf8_lossy(bytes)));
        for c in url_re().captures_iter(&text) {
            let m = c.get(0).unwrap();
            // Already reported from the carried tail, or possibly cut off (`:30` of `:3000`): the
            // next read finds it whole.
            if m.end() <= carried || m.end() == text.len() {
                continue;
            }
            let Some(port) = c[2].parse::<u16>().ok().filter(|p| *p > 0) else { continue };
            let scheme = c.get(1).map_or("http".to_string(), |s| s.as_str().to_ascii_lowercase());
            let path = c.get(3).map_or("", |p| p.as_str());
            out.push(LocalPort { port, url: format!("{scheme}://localhost:{port}{path}") });
        }
        let cut = text.char_indices().rev().nth(CARRY - 1).map_or(0, |(i, _)| i);
        self.carry = text[cut..].to_string();
    }
}

/// Is something accepting connections on this loopback port (IPv4, then IPv6)?
pub fn listening(port: u16) -> bool {
    let t = Duration::from_millis(150);
    [std::net::IpAddr::from([127, 0, 0, 1]), std::net::IpAddr::from(std::net::Ipv6Addr::LOCALHOST)]
        .iter()
        .any(|ip| std::net::TcpStream::connect_timeout(&std::net::SocketAddr::new(*ip, port), t).is_ok())
}

/// Most ports shown per pane (oldest dropped).
pub const MAX_PORTS: usize = 8;
/// Probes for a printed port before giving up on it (the poller ticks every 400 ms).
const CANDIDATE_TRIES: u8 = 5;

/// One pane's ports: printed ones waiting to be confirmed, and confirmed ones.
#[derive(Default)]
pub struct Ports {
    candidates: Vec<(LocalPort, u8)>,
    confirmed: Vec<LocalPort>,
}

impl Ports {
    /// Ports printed in output.
    pub fn offer(&mut self, found: impl IntoIterator<Item = LocalPort>) {
        for lp in found {
            let known = self.confirmed.iter().any(|c| c.port == lp.port) || self.candidates.iter().any(|(c, _)| c.port == lp.port);
            if !known {
                self.candidates.push((lp, 0));
            }
        }
    }
    /// Ports to probe now: candidates, plus confirmed ones when `recheck`.
    pub fn due(&self, recheck: bool) -> Vec<u16> {
        let mut v: Vec<u16> = self.candidates.iter().map(|(c, _)| c.port).collect();
        if recheck {
            v.extend(self.confirmed.iter().map(|c| c.port));
        }
        v
    }
    /// Apply probe results; the new confirmed list when it changed.
    pub fn apply(&mut self, results: &[(u16, bool)]) -> Option<Vec<LocalPort>> {
        let mut changed = false;
        for &(port, up) in results {
            if let Some(i) = self.candidates.iter().position(|(c, _)| c.port == port) {
                if up {
                    let (lp, _) = self.candidates.remove(i);
                    self.confirmed.push(lp);
                    changed = true;
                } else {
                    self.candidates[i].1 += 1;
                    if self.candidates[i].1 >= CANDIDATE_TRIES {
                        self.candidates.remove(i);
                    }
                }
            } else if !up {
                let before = self.confirmed.len();
                self.confirmed.retain(|c| c.port != port);
                changed |= self.confirmed.len() != before;
            }
        }
        if self.confirmed.len() > MAX_PORTS {
            self.confirmed.drain(..self.confirmed.len() - MAX_PORTS);
        }
        changed.then(|| self.list())
    }
    pub fn list(&self) -> Vec<LocalPort> {
        self.confirmed.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scan(chunks: &[&str]) -> Vec<LocalPort> {
        let mut s = Scanner::default();
        let mut out = vec![];
        for c in chunks {
            s.feed(c.as_bytes(), &mut out);
        }
        out
    }
    fn p(port: u16, url: &str) -> LocalPort {
        LocalPort { port, url: url.into() }
    }

    #[test]
    fn finds_local_urls() {
        assert_eq!(scan(&["  ➜  Local:   http://localhost:3000/api\n"]), vec![p(3000, "http://localhost:3000/api")]);
        assert_eq!(scan(&["listening on http://127.0.0.1:8080\n"]), vec![p(8080, "http://localhost:8080")]);
        assert_eq!(scan(&["Network: 0.0.0.0:5173\n"]), vec![p(5173, "http://localhost:5173")]);
        assert_eq!(scan(&["at [::1]:9000.\n"]), vec![p(9000, "http://localhost:9000")]);
        assert_eq!(scan(&["https://localhost:8443/ ready"]), vec![p(8443, "https://localhost:8443/")]);
    }

    #[test]
    fn finds_a_url_split_across_reads_and_through_colors() {
        assert_eq!(scan(&["see http://local", "host:3000 now"]), vec![p(3000, "http://localhost:3000")]);
        assert_eq!(scan(&["\x1b[36mhttp://localhost:\x1b[1m4000\x1b[0m/\n"]), vec![p(4000, "http://localhost:4000/")]);
        // Reported once even though the carried tail is scanned again.
        assert_eq!(scan(&["http://localhost:3000 ", "more output"]).len(), 1);
    }

    #[test]
    fn ignores_other_hosts_and_bad_ports() {
        assert_eq!(scan(&["localhost:99999 example.com:3000 mylocalhost:80 localhost:0\n"]), vec![]);
    }

    #[test]
    fn candidates_are_confirmed_or_given_up() {
        let mut ps = Ports::default();
        ps.offer([p(3000, "http://localhost:3000"), p(4000, "http://localhost:4000")]);
        assert_eq!(ps.due(false), vec![3000, 4000]);
        assert_eq!(ps.apply(&[(3000, true), (4000, false)]), Some(vec![p(3000, "http://localhost:3000")]));
        // 4000 is retried a few times, then dropped.
        for _ in 1..CANDIDATE_TRIES {
            assert_eq!(ps.due(false), vec![4000]);
            assert_eq!(ps.apply(&[(4000, false)]), None);
        }
        assert_eq!(ps.due(false), Vec::<u16>::new());
        // Printed again: a fresh candidate, and an already-confirmed port isn't re-added.
        ps.offer([p(3000, "http://localhost:3000/x")]);
        assert_eq!(ps.due(false), Vec::<u16>::new());
    }

    #[test]
    fn keeps_at_most_max_ports() {
        let mut ps = Ports::default();
        let all: Vec<_> = (1..=MAX_PORTS as u16 + 2).map(|i| p(3000 + i, &format!("http://localhost:{}", 3000 + i))).collect();
        ps.offer(all.clone());
        let res: Vec<_> = all.iter().map(|x| (x.port, true)).collect();
        let list = ps.apply(&res).unwrap();
        assert_eq!(list.len(), MAX_PORTS);
        assert_eq!(list[0].port, 3003, "oldest dropped");
    }

    #[test]
    fn ports_dropped_when_nothing_listens() {
        let l = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        let mut ps = Ports::default();
        let mut found = vec![];
        Scanner::default().feed(format!("ready on http://localhost:{port}\n").as_bytes(), &mut found);
        ps.offer(found);
        let probe = |ps: &Ports, recheck| ps.due(recheck).into_iter().map(|q| (q, listening(q))).collect::<Vec<_>>();
        let r = probe(&ps, false);
        assert_eq!(ps.apply(&r).map(|v| v.len()), Some(1));
        drop(l);
        // Not rechecked until the poller asks.
        let r = probe(&ps, false);
        assert_eq!(ps.apply(&r), None);
        let r = probe(&ps, true);
        assert_eq!(ps.apply(&r), Some(vec![]));
    }
}
