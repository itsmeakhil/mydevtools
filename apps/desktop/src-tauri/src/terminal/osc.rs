//! Streaming scanner for the few OSC sequences the app reads from PTY output:
//! OSC 7 (cwd), OSC 133 (prompt marks) and OSC 7501 (program status). Sequences
//! may be split across reads, so the scanner keeps state between `feed` calls.

use super::hooks::TermStatus;
use base64::Engine;

/// Longest OSC body kept; longer ones (big OSC 8 links, OSC 52 copies) are skipped.
const MAX_OSC: usize = 4096;

#[derive(Debug, PartialEq)]
pub enum Osc {
    /// OSC 7 `file://host/path`: the shell's working directory.
    Cwd(String),
    /// OSC 133 A/C or an OSC 7501 root record, with the program's message if any.
    Status(TermStatus, Option<String>),
}

#[derive(Default, PartialEq)]
enum St {
    #[default]
    Ground,
    Esc,
    Osc,
    OscEsc,
}

#[derive(Default)]
pub struct Scanner {
    st: St,
    buf: Vec<u8>,
    overflow: bool,
}

impl Scanner {
    pub fn feed(&mut self, bytes: &[u8], out: &mut Vec<Osc>) {
        for &b in bytes {
            match self.st {
                St::Ground => {
                    if b == 0x1b {
                        self.st = St::Esc
                    }
                }
                St::Esc => {
                    if b == b']' {
                        self.st = St::Osc;
                        self.buf.clear();
                        self.overflow = false;
                    } else if b != 0x1b {
                        self.st = St::Ground
                    }
                }
                St::Osc => match b {
                    0x07 => self.finish(out),
                    0x1b => self.st = St::OscEsc,
                    0x18 | 0x1a => self.st = St::Ground, // CAN / SUB abort
                    _ if self.buf.len() < MAX_OSC => self.buf.push(b),
                    _ => self.overflow = true,
                },
                St::OscEsc => {
                    if b == b'\\' {
                        self.finish(out)
                    } else {
                        // Unterminated: the ESC starts a new sequence.
                        self.st = if b == b']' { St::Osc } else { St::Ground };
                        self.buf.clear();
                        self.overflow = false;
                    }
                }
            }
        }
    }

    fn finish(&mut self, out: &mut Vec<Osc>) {
        self.st = St::Ground;
        if !self.overflow {
            if let Some(o) = parse(&String::from_utf8_lossy(&self.buf)) {
                out.push(o);
            }
        }
    }
}

fn parse(body: &str) -> Option<Osc> {
    let (code, rest) = body.split_once(';')?;
    match code {
        "7" => cwd_from_url(rest).map(Osc::Cwd),
        "133" => match rest.as_bytes().first()? {
            b'A' => Some(Osc::Status(TermStatus::Idle, None)),
            b'C' => Some(Osc::Status(TermStatus::Running, None)),
            _ => None,
        },
        "7501" => status_7501(rest),
        _ => None,
    }
}

/// `file://host/some%20dir` → `/some dir`.
fn cwd_from_url(url: &str) -> Option<String> {
    let rest = url.strip_prefix("file://")?;
    let path = &rest[rest.find('/')?..];
    let b = path.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        let hex = |c: u8| (c as char).to_digit(16);
        if b[i] == b'%' && i + 2 < b.len() {
            if let (Some(h), Some(l)) = (hex(b[i + 1]), hex(b[i + 2])) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8(out).ok()
}

/// OSC 7501 (herdr's Program Status Protocol): `key=value` fields joined by `:`.
/// Only root records (no `id`) count. working → Running; blocked/done/error →
/// Waiting (the program stopped and the user should look); idle/clear → Idle.
fn status_7501(fields: &str) -> Option<Osc> {
    let mut state = None;
    let mut msg = None;
    for f in fields.split(':') {
        let (k, v) = f.split_once('=').unwrap_or((f, ""));
        match k {
            "state" => state = Some(v),
            "id" if !v.is_empty() => return None,
            // Encoded as base64 by the protocol; a plain value is taken as is.
            "msg" if !v.is_empty() => {
                msg = Some(
                    base64::engine::general_purpose::STANDARD
                        .decode(v)
                        .ok()
                        .and_then(|b| String::from_utf8(b).ok())
                        .unwrap_or_else(|| v.to_string()),
                )
            }
            _ => {}
        }
    }
    let s = match state? {
        "working" => TermStatus::Running,
        "blocked" | "done" | "error" => TermStatus::Waiting,
        "idle" | "clear" => TermStatus::Idle,
        _ => return None,
    };
    Some(Osc::Status(s, msg.filter(|_| s == TermStatus::Waiting)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scan(chunks: &[&[u8]]) -> Vec<Osc> {
        let mut s = Scanner::default();
        let mut out = vec![];
        for c in chunks {
            s.feed(c, &mut out);
        }
        out
    }

    #[test]
    fn cwd_with_both_terminators_and_percent_escapes() {
        assert_eq!(scan(&[b"\x1b]7;file://mac/Users/me/my%20dir\x07"]), vec![Osc::Cwd("/Users/me/my dir".into())]);
        assert_eq!(scan(&[b"\x1b]7;file:///tmp\x1b\\"]), vec![Osc::Cwd("/tmp".into())]);
        assert_eq!(scan(&[b"\x1b]7;file://h/a%2"]), vec![]); // unterminated
        assert_eq!(scan(&[b"\x1b]7;file://h/a%2\x07"]), vec![Osc::Cwd("/a%2".into())]);
    }

    #[test]
    fn split_across_reads() {
        assert_eq!(
            scan(&[b"out\x1b", b"]13", b"3;C\x1b", b"\\more"]),
            vec![Osc::Status(TermStatus::Running, None)]
        );
    }

    #[test]
    fn prompt_marks() {
        assert_eq!(
            scan(&[b"\x1b]133;D;0\x07\x1b]133;A\x07$ \x1b]133;B\x07"]),
            vec![Osc::Status(TermStatus::Idle, None)]
        );
    }

    #[test]
    fn status_7501_root_records_only() {
        assert_eq!(
            scan(&[b"\x1b]7501;state=blocked:app=my-agent\x1b\\"]),
            vec![Osc::Status(TermStatus::Waiting, None)]
        );
        // msg is base64 ("needs approval").
        assert_eq!(
            scan(&[b"\x1b]7501;state=blocked:kind=permission:msg=bmVlZHMgYXBwcm92YWw=\x07"]),
            vec![Osc::Status(TermStatus::Waiting, Some("needs approval".into()))]
        );
        assert_eq!(scan(&[b"\x1b]7501;state=working\x07"]), vec![Osc::Status(TermStatus::Running, None)]);
        assert_eq!(scan(&[b"\x1b]7501;state=done\x07"]), vec![Osc::Status(TermStatus::Waiting, None)]);
        assert_eq!(scan(&[b"\x1b]7501;state=clear\x07"]), vec![Osc::Status(TermStatus::Idle, None)]);
        assert_eq!(scan(&[b"\x1b]7501;state=working:id=sub\x07"]), vec![]);
        assert_eq!(scan(&[b"\x1b]7501;state=bogus\x07"]), vec![]);
    }

    #[test]
    fn ignores_other_and_oversized_sequences() {
        let big = format!("\x1b]8;;https://x/{}\x07\x1b]133;C\x07", "a".repeat(MAX_OSC * 2));
        assert_eq!(scan(&[b"\x1b]0;title\x07", big.as_bytes()]), vec![Osc::Status(TermStatus::Running, None)]);
        // CAN aborts; an ESC not followed by '\' abandons the OSC.
        assert_eq!(scan(&[b"\x1b]133;C\x18\x1b]133;A\x1b[0m"]), vec![]);
        assert_eq!(scan(&[b"\x1b]133;C\x1b]133;A\x07"]), vec![Osc::Status(TermStatus::Idle, None)]);
    }
}
