//! Streaming scanner for the few OSC sequences the app reads from PTY output:
//! OSC 7 (cwd), OSC 133 (prompt marks) and OSC 7501 (program status). Sequences
//! may be split across reads, so the scanner keeps state between `feed` calls.

use super::hooks::TermStatus;
use base64::Engine;
use serde::Serialize;
use std::time::{Duration, Instant};

/// Longest OSC body kept; longer ones (big OSC 8 links, OSC 52 copies) are skipped.
const MAX_OSC: usize = 4096;

#[derive(Debug, PartialEq)]
pub enum Osc {
    /// OSC 7 `file://host/path`: the shell's working directory.
    Cwd(String),
    /// OSC 133 A (prompt → Idle) or an OSC 7501 root record, with the program's message if any.
    Status(TermStatus, Option<String>),
    /// OSC 133 C: a shell command started.
    CommandStart,
    /// OSC 133 D: the command ended, with its exit code when the shell gave one.
    CommandEnd(Option<i32>),
    /// OSC 0/2 window title (agent detection reads spinners from it).
    Title(String),
    /// OSC 9;4 progress, body after `9;` (e.g. `4;1;-1`).
    Progress(String),
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
            b'C' => Some(Osc::CommandStart),
            b'D' => Some(Osc::CommandEnd(rest.get(2..).and_then(|c| c.parse().ok()))),
            _ => None,
        },
        "7501" => status_7501(rest),
        "0" | "2" => Some(Osc::Title(rest.to_string())),
        "9" if rest.starts_with("4;") => Some(Osc::Progress(rest.to_string())),
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
/// Only root records (no `id`) count. working → Running; blocked/error → Waiting
/// (needs the user); done → Done (finished, ready for review); idle/clear → Idle.
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
        "blocked" | "error" => TermStatus::Waiting,
        "done" => TermStatus::Done,
        "idle" | "clear" => TermStatus::Idle,
        _ => return None,
    };
    Some(Osc::Status(s, msg.filter(|_| s.needs_you())))
}

/// A shell command that ran this long and finished while nobody watched is worth a look.
pub const LONG_COMMAND: Duration = Duration::from_secs(30);

/// How a shell command ended, for the UI ("exit 1 after 2 min").
#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
pub struct CmdEnd {
    pub code: Option<i32>,
    pub ms: u64,
}

/// Times commands between OSC 133 C and D. A long one ends as Done (exit 0) or
/// Waiting (failed), and that status outlives the prompt mark that follows.
#[derive(Default)]
pub struct Commands {
    start: Option<Instant>,
    hold_prompt: bool,
}

impl Commands {
    pub fn start(&mut self, now: Instant) {
        (self.start, self.hold_prompt) = (Some(now), false);
    }

    /// `agent` = an agent ran in this command (it reports its own status).
    pub fn end(&mut self, code: Option<i32>, now: Instant, agent: bool) -> Option<(TermStatus, CmdEnd)> {
        let took = now.duration_since(self.start.take()?);
        if agent || took < LONG_COMMAND {
            return None;
        }
        self.hold_prompt = true;
        let st = if code.unwrap_or(0) == 0 { TermStatus::Done } else { TermStatus::Waiting };
        Some((st, CmdEnd { code, ms: took.as_millis() as u64 }))
    }

    /// False when the prompt's Idle must not replace a long command's result.
    pub fn prompt(&mut self) -> bool {
        !std::mem::take(&mut self.hold_prompt)
    }
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
            vec![Osc::CommandStart]
        );
    }

    #[test]
    fn prompt_marks() {
        assert_eq!(
            scan(&[b"\x1b]133;D;0\x07\x1b]133;A\x07$ \x1b]133;B\x07\x1b]133;D;127\x07\x1b]133;D\x07"]),
            vec![Osc::CommandEnd(Some(0)), Osc::Status(TermStatus::Idle, None), Osc::CommandEnd(Some(127)), Osc::CommandEnd(None)]
        );
    }

    #[test]
    fn long_commands_end_as_done_or_waiting_and_hold_the_prompt() {
        let t0 = Instant::now();
        let mut c = Commands::default();
        assert_eq!(c.end(Some(0), t0, false), None, "end without a start");
        assert!(c.prompt());
        c.start(t0);
        assert_eq!(c.end(Some(0), t0 + Duration::from_secs(5), false), None, "short");
        assert!(c.prompt());
        c.start(t0);
        assert_eq!(
            c.end(Some(0), t0 + LONG_COMMAND, false),
            Some((TermStatus::Done, CmdEnd { code: Some(0), ms: 30_000 }))
        );
        assert!(!c.prompt(), "the prompt right after keeps Done");
        assert!(c.prompt(), "later prompts go idle again");
        c.start(t0);
        assert_eq!(c.end(Some(2), t0 + LONG_COMMAND * 2, false).unwrap().0, TermStatus::Waiting);
        c.start(t0);
        assert_eq!(c.end(Some(0), t0 + LONG_COMMAND * 2, true), None, "agents report themselves");
        assert!(c.prompt());
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
        assert_eq!(scan(&[b"\x1b]7501;state=done\x07"]), vec![Osc::Status(TermStatus::Done, None)]);
        assert_eq!(scan(&[b"\x1b]7501;state=clear\x07"]), vec![Osc::Status(TermStatus::Idle, None)]);
        assert_eq!(scan(&[b"\x1b]7501;state=working:id=sub\x07"]), vec![]);
        assert_eq!(scan(&[b"\x1b]7501;state=bogus\x07"]), vec![]);
    }

    #[test]
    fn ignores_other_and_oversized_sequences() {
        let big = format!("\x1b]8;;https://x/{}\x07\x1b]133;C\x07", "a".repeat(MAX_OSC * 2));
        assert_eq!(
            scan(&[b"\x1b]0;title\x07\x1b]9;4;1;-1\x07\x1b]9;hi\x07", big.as_bytes()]),
            vec![Osc::Title("title".into()), Osc::Progress("4;1;-1".into()), Osc::CommandStart]
        );
        // CAN aborts; an ESC not followed by '\' abandons the OSC.
        assert_eq!(scan(&[b"\x1b]133;C\x18\x1b]133;A\x1b[0m"]), vec![]);
        assert_eq!(scan(&[b"\x1b]133;C\x1b]133;A\x07"]), vec![Osc::Status(TermStatus::Idle, None)]);
    }
}
