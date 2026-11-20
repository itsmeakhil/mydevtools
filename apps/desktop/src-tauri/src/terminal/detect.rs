//! Agent status read off the rendered screen, for agents that neither report it
//! in-band (OSC 7501) nor hook into us (claude). Rules are herdr's per-agent
//! manifests (agents/*.toml, Apache-2.0, see agents/NOTICE): `contains` /
//! `regex` / `line_regex` gates over a region of the screen, and the
//! highest-priority matching rule wins.

use super::hooks::TermStatus;
use regex::Regex;
use serde::{Deserialize, Deserializer};
use std::sync::LazyLock;

macro_rules! manifests {
    ($($f:literal),* $(,)?) => { &[$(($f, include_str!(concat!("agents/", $f)))),*] };
}
const FILES: &[(&str, &str)] = manifests!(
    "amp.toml", "antigravity.toml", "claude.toml", "cline.toml", "codex.toml", "cursor.toml",
    "devin.toml", "droid.toml", "gemini.toml", "github-copilot.toml", "grok.toml", "hermes.toml",
    "kilo.toml", "kimi.toml", "kiro.toml", "letta.toml", "maki.toml", "muse.toml",
    "opencode.toml", "pi.toml", "qodercli.toml", "qwen.toml",
);

static MANIFESTS: LazyLock<Vec<Manifest>> = LazyLock::new(|| {
    FILES
        .iter()
        .filter_map(|(name, src)| {
            toml::from_str(src).map_err(|e| eprintln!("terminal: agent manifest {name}: {e}")).ok()
        })
        .collect()
});

#[derive(Deserialize)]
pub struct Manifest {
    pub id: String,
    #[serde(default)]
    aliases: Vec<String>,
    #[serde(default)]
    rules: Vec<Rule>,
}

#[derive(Deserialize)]
struct Rule {
    state: Option<State>,
    #[serde(default)]
    priority: i32,
    #[serde(default = "whole_recent")]
    region: String,
    #[serde(default)]
    skip_state_update: bool,
    #[serde(flatten)]
    gate: Gate,
}

fn whole_recent() -> String {
    "whole_recent".into()
}

#[derive(Deserialize, Clone, Copy, PartialEq, Debug)]
#[serde(rename_all = "snake_case")]
pub enum State {
    Idle,
    Working,
    Blocked,
    Unknown,
}

/// Every listed matcher must hold; `any` needs one of its gates, `not` none.
#[derive(Deserialize, Default)]
struct Gate {
    #[serde(default)]
    all: Vec<Gate>,
    #[serde(default)]
    any: Vec<Gate>,
    #[serde(default)]
    not: Vec<Gate>,
    /// Case-insensitive; lowercased at load.
    #[serde(default, deserialize_with = "lowercase")]
    contains: Vec<String>,
    #[serde(default, deserialize_with = "regexes")]
    regex: Vec<Regex>,
    /// Matches when some single line matches.
    #[serde(default, deserialize_with = "regexes")]
    line_regex: Vec<Regex>,
}

fn lowercase<'de, D: Deserializer<'de>>(d: D) -> Result<Vec<String>, D::Error> {
    Ok(Vec::<String>::deserialize(d)?.iter().map(|s| s.to_lowercase()).collect())
}

fn regexes<'de, D: Deserializer<'de>>(d: D) -> Result<Vec<Regex>, D::Error> {
    Vec::<String>::deserialize(d)?
        .iter()
        .map(|p| Regex::new(p).map_err(serde::de::Error::custom))
        .collect()
}

impl Gate {
    fn matches(&self, text: &str, lower: &str) -> bool {
        self.contains.iter().all(|n| lower.contains(n.as_str()))
            && self.regex.iter().all(|r| r.is_match(text))
            && self.line_regex.iter().all(|r| text.lines().any(|l| r.is_match(l)))
            && self.all.iter().all(|g| g.matches(text, lower))
            && (self.any.is_empty() || self.any.iter().any(|g| g.matches(text, lower)))
            && !self.not.iter().any(|g| g.matches(text, lower))
    }
}

pub struct Screen<'a> {
    pub text: &'a str,
    /// Last OSC 0/2 window title.
    pub title: &'a str,
    /// Last OSC 9;4 progress body, e.g. `4;1;-1`.
    pub progress: &'a str,
}

impl Manifest {
    /// `None` when the winning rule says the screen isn't live state (a transcript viewer).
    pub fn detect(&self, s: &Screen) -> Option<State> {
        let mut best: Option<&Rule> = None;
        for r in &self.rules {
            // Ties go to the earlier rule.
            if best.is_some_and(|b| b.priority >= r.priority) {
                continue;
            }
            let text = region(s, &r.region).unwrap_or("");
            if r.gate.matches(text, &text.to_lowercase()) {
                best = Some(r);
            }
        }
        match best {
            // A known agent with nothing on screen to say otherwise sits at its prompt.
            None => Some(State::Idle),
            Some(r) if r.skip_state_update => None,
            Some(r) => Some(r.state.unwrap_or(State::Unknown)),
        }
    }
}

/// The agent a command line runs: its argv0, or the script a runtime or shell
/// was handed (`node /opt/homebrew/bin/gemini`).
pub fn identify(cmdline: &str) -> Option<&'static Manifest> {
    let mut words = cmdline.split_whitespace();
    let mut name = program_name(words.next()?);
    if ["node", "bun", "deno", "sh", "bash", "zsh", "fish"].contains(&name.as_str()) || name.starts_with("python") {
        // ponytail: first non-flag word; `node --require x gemini` and paths with spaces miss.
        let script = words.find(|w| !w.starts_with('-') || ["-c", "-e", "--eval", "-p", "--print"].contains(w))?;
        if script.starts_with('-') {
            return None; // inline code, not a script that names the agent
        }
        name = program_name(script);
    }
    // Muse's launcher execs `muse-bin-<version>`.
    if name.strip_prefix("muse-bin-").is_some_and(|v| v.starts_with(|c: char| c.is_ascii_digit())) {
        name = "muse".into();
    }
    MANIFESTS.iter().find(|m| m.id == name || m.aliases.contains(&name))
}

fn program_name(word: &str) -> String {
    let base = word.trim_matches(|c| c == '"' || c == '\'').rsplit('/').next().unwrap_or(word).to_lowercase();
    [".js", ".mjs", ".cjs"].iter().find_map(|s| base.strip_suffix(s)).map(str::to_string).unwrap_or(base)
}

/// Full command line of a process, via `ps` (run once per new foreground job).
pub fn cmdline(pid: i32) -> Option<String> {
    let out = std::process::Command::new("ps").args(["-o", "args=", "-p", &pid.to_string()]).output().ok()?;
    let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
    (!s.is_empty()).then_some(s)
}

/// Per-pane detection state: fed from the PTY reader, stepped by the poller.
pub struct Pane {
    screen: vt100::Parser,
    title: String,
    progress: String,
    dirty: bool,
    /// Foreground process group `agent` was identified for (`None`: the shell).
    pgid: Option<i32>,
    agent: Option<&'static Manifest>,
    last: Option<State>,
    idle_pending: bool,
}

impl Pane {
    pub fn new(rows: u16, cols: u16) -> Self {
        Self {
            screen: vt100::Parser::new(rows.max(1), cols.max(1), 0),
            title: String::new(),
            progress: String::new(),
            dirty: false,
            pgid: None,
            agent: None,
            last: None,
            idle_pending: false,
        }
    }

    pub fn feed(&mut self, bytes: &[u8]) {
        self.screen.process(bytes);
        self.dirty = true;
    }

    pub fn resize(&mut self, rows: u16, cols: u16) {
        self.screen.screen_mut().set_size(rows.max(1), cols.max(1));
        self.dirty = true;
    }

    pub fn set_title(&mut self, t: String) {
        self.title = t;
        self.dirty = true;
    }

    pub fn set_progress(&mut self, p: String) {
        self.progress = p;
        self.dirty = true;
    }

    pub fn pgid(&self) -> Option<i32> {
        self.pgid
    }

    pub fn set_agent(&mut self, pgid: Option<i32>, agent: Option<&'static Manifest>) {
        (self.pgid, self.agent, self.last, self.idle_pending, self.dirty) = (pgid, agent, None, false, true);
    }

    /// One poll tick: `Some` when the pane's status should change.
    pub fn step(&mut self) -> Option<TermStatus> {
        let agent = self.agent?;
        if !self.dirty && !self.idle_pending {
            return None;
        }
        self.dirty = false;
        let text = self.screen.screen().contents();
        let state = agent.detect(&Screen { text: &text, title: &self.title, progress: &self.progress })?;
        self.transition(state)
    }

    fn transition(&mut self, state: State) -> Option<TermStatus> {
        let was = self.last;
        // Working → idle must hold for two ticks: a redraw can briefly blank the working line.
        if state == State::Idle && was == Some(State::Working) && !self.idle_pending {
            self.idle_pending = true;
            return None;
        }
        self.idle_pending = false;
        if state == State::Unknown || was == Some(state) {
            return None;
        }
        self.last = Some(state);
        Some(match state {
            State::Working => TermStatus::Running,
            State::Blocked => TermStatus::Waiting,
            // Finished a turn: the user should look, like claude's Stop hook.
            _ if was == Some(State::Working) => TermStatus::Waiting,
            _ => TermStatus::Idle,
        })
    }
}

// ---- Regions (adapted from herdr src/detect/manifest.rs, Apache-2.0) ----

/// `None` for a region name this engine doesn't know.
fn region<'a>(s: &Screen<'a>, spec: &str) -> Option<&'a str> {
    let c = s.text;
    Some(match spec.trim() {
        "osc_title" => s.title,
        "osc_progress" => s.progress,
        "whole_recent" => c,
        "after_last_prompt_marker" => after_last_prompt_marker(c),
        "before_current_prompt_marker" => before_current_prompt_marker(c),
        "whole_recent_without_current_prompt_marker" => {
            if current_prompt_index(&c.lines().collect::<Vec<_>>()).is_some() { "" } else { c }
        }
        "prompt_box_body" => prompt_box_body(c).unwrap_or(""),
        "last_non_empty_above_prompt_box" => last_non_empty_line(above_prompt_box(c)),
        "after_last_horizontal_rule" => after_last_horizontal_rule(c),
        spec => {
            let count = |name: &str| -> Option<usize> {
                let n = spec.strip_prefix(name)?.strip_prefix('(')?.strip_suffix(')')?;
                n.parse().ok().filter(|n| *n > 0)
            };
            if let Some(n) = count("bottom_non_empty_lines") {
                bottom_non_empty_lines(c, n)
            } else if let Some(n) = count("bottom_lines") {
                let lines: Vec<&str> = c.lines().collect();
                slice_from_line(c, &lines, lines.len().saturating_sub(n))
            } else {
                top_non_empty_lines(c, count("top_non_empty_lines")?)
            }
        }
    })
}

fn bottom_non_empty_lines(c: &str, n: usize) -> &str {
    let lines: Vec<&str> = c.lines().collect();
    match lines.iter().enumerate().rev().filter(|(_, l)| !l.trim().is_empty()).take(n).last() {
        Some((i, _)) => slice_from_line(c, &lines, i),
        None => "",
    }
}

fn top_non_empty_lines(c: &str, n: usize) -> &str {
    let lines: Vec<&str> = c.lines().collect();
    match lines.iter().enumerate().filter(|(_, l)| !l.trim().is_empty()).take(n).last() {
        Some((i, _)) => &c[..line_start(c, &lines, i + 1)],
        None => "",
    }
}

/// Codex's composer line: `›` alone or `› text`.
fn is_prompt_line(l: &str) -> bool {
    l == "›" || l.starts_with("› ")
}

fn is_block_marker_line(l: &str) -> bool {
    l.starts_with(['•', '■', '✗', '✓'])
}

fn after_last_prompt_marker(c: &str) -> &str {
    let lines: Vec<&str> = c.lines().collect();
    match lines.iter().rposition(|l| is_prompt_line(l)) {
        Some(i) => slice_from_line(c, &lines, i + 1),
        None => c,
    }
}

/// The last prompt line, unless a response block was printed after it.
fn current_prompt_index(lines: &[&str]) -> Option<usize> {
    let i = lines.iter().rposition(|l| is_prompt_line(l))?;
    (!lines[i + 1..].iter().any(|l| is_block_marker_line(l))).then_some(i)
}

fn before_current_prompt_marker(c: &str) -> &str {
    let lines: Vec<&str> = c.lines().collect();
    match current_prompt_index(&lines) {
        Some(i) => &c[..line_start(c, &lines, i)],
        None => c,
    }
}

fn prompt_box_body(c: &str) -> Option<&str> {
    let lines: Vec<&str> = c.lines().collect();
    let top = prompt_box_top(&lines)?;
    let end = lines[top + 1..].iter().position(|l| is_horizontal_rule(l)).map_or(lines.len(), |r| top + 1 + r);
    Some(&c[line_start(c, &lines, top + 1)..line_start(c, &lines, end)])
}

fn above_prompt_box(c: &str) -> &str {
    let lines: Vec<&str> = c.lines().collect();
    match prompt_box_top(&lines) {
        Some(top) => &c[..line_start(c, &lines, top)],
        None => c,
    }
}

fn after_last_horizontal_rule(c: &str) -> &str {
    let (mut last_end, mut offset) = (0, 0);
    for l in c.lines() {
        offset += l.len() + 1;
        if is_horizontal_rule(l) {
            last_end = offset.min(c.len());
        }
    }
    &c[last_end..]
}

fn last_non_empty_line(c: &str) -> &str {
    c.lines().rev().find(|l| !l.trim().is_empty()).unwrap_or("")
}

/// The second-to-last horizontal rule: the prompt box's top border.
fn prompt_box_top(lines: &[&str]) -> Option<usize> {
    lines.iter().enumerate().rev().filter(|(_, l)| is_horizontal_rule(l)).nth(1).map(|(i, _)| i)
}

/// A line of `─`, or 3+ `─` followed by a label.
fn is_horizontal_rule(l: &str) -> bool {
    let t = l.trim();
    let n = t.chars().take_while(|&ch| ch == '─').count();
    n > 0 && (t.trim_start_matches('─').trim_start().is_empty() || n >= 3)
}

fn slice_from_line<'a>(c: &'a str, lines: &[&str], i: usize) -> &'a str {
    &c[line_start(c, lines, i)..]
}

/// Byte offset of line `i` (assumes `\n` endings, as vt100 renders).
fn line_start(c: &str, lines: &[&str], i: usize) -> usize {
    lines[..i.min(lines.len())].iter().map(|l| l.len() + 1).sum::<usize>().min(c.len())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn agent(id: &str) -> &'static Manifest {
        MANIFESTS.iter().find(|m| m.id == id).unwrap()
    }

    fn detect(id: &str, text: &str, title: &str) -> Option<State> {
        agent(id).detect(&Screen { text, title, progress: "" })
    }

    #[test]
    fn every_bundled_manifest_loads_with_known_regions() {
        assert_eq!(MANIFESTS.len(), FILES.len(), "a manifest failed to parse (see stderr)");
        let s = Screen { text: "", title: "", progress: "" };
        for m in MANIFESTS.iter() {
            assert!(!m.rules.is_empty(), "{}", m.id);
            for r in &m.rules {
                assert!(region(&s, &r.region).is_some(), "{}: unknown region {}", m.id, r.region);
            }
        }
    }

    #[test]
    fn gates_priority_and_line_regex() {
        // herdr's rule_semantics test, on a synthetic manifest.
        let m: Manifest = toml::from_str(
            r#"
id = "t"
[[rules]]
state = "idle"
priority = 1
contains = ["MATCH"]
[[rules]]
state = "working"
priority = 10
contains = ["match"]
all = [{ any = [{ regex = ["w[io]n"] }, { contains = ["fallback"] }] }]
not = [{ contains = ["blocked"] }]
[[rules]]
state = "blocked"
priority = 20
line_regex = ["^exact line$"]
"#,
        )
        .unwrap();
        let d = |t: &str| m.detect(&Screen { text: t, title: "", progress: "" });
        assert_eq!(d("match win"), Some(State::Working));
        assert_eq!(d("match fallback"), Some(State::Working));
        assert_eq!(d("match win blocked"), Some(State::Idle));
        assert_eq!(d("before\nexact line\nafter"), Some(State::Blocked));
        assert_eq!(d("nothing"), Some(State::Idle), "known agent defaults to idle");
    }

    #[test]
    fn regions_match_herdr() {
        let s = |text| Screen { text, title: "", progress: "" };
        for (text, spec, want) in [
            ("old\n\nnew\n", "bottom_lines(2)", "\nnew\n"),
            ("a\n\nb\nc\n", "bottom_non_empty_lines(2)", "b\nc\n"),
            ("\na\nb\nc\n", "top_non_empty_lines(2)", "\na\nb\n"),
            ("before\n› input\nafter\n", "after_last_prompt_marker", "after\n"),
            ("before\n› input\nafter\n", "before_current_prompt_marker", "before\n"),
            ("before\n› input\nafter\n", "whole_recent_without_current_prompt_marker", ""),
            ("no marker\n", "whole_recent_without_current_prompt_marker", "no marker\n"),
            ("above\n\n───\nbody\n───\nfooter\n", "last_non_empty_above_prompt_box", "above"),
            ("above\n───\nbody\n───\nfooter\n", "prompt_box_body", "body\n"),
            ("above\n───\nbody\n───\nfooter\n", "after_last_horizontal_rule", "footer\n"),
        ] {
            assert_eq!(region(&s(text), spec), Some(want), "region={spec}");
        }
        assert_eq!(region(&s("x"), "nope(3)"), None);
    }

    #[test]
    fn real_manifests_classify_screens() {
        assert_eq!(detect("gemini", "⠋ Thinking (esc to cancel, 3s)", ""), Some(State::Working));
        assert_eq!(detect("gemini", "│ Apply this change?\n│ ● 1. Yes", ""), Some(State::Blocked));
        assert_eq!(detect("gemini", "> Type your message", ""), Some(State::Idle));
        assert_eq!(detect("codex", "", "⠋ my-repo"), Some(State::Working));
        assert_eq!(detect("codex", "", "Action Required"), Some(State::Blocked));
        assert_eq!(detect("codex", "• Working (12s • esc to interrupt)\n\n› ", ""), Some(State::Working));
    }

    #[test]
    fn identify_from_command_lines() {
        let id = |c| identify(c).map(|m| m.id.as_str());
        assert_eq!(id("codex"), Some("codex"));
        assert_eq!(id("/Users/me/.local/bin/claude --resume"), Some("claude"));
        assert_eq!(id("node /opt/homebrew/bin/gemini"), Some("gemini"));
        assert_eq!(id("node --no-warnings /x/qwen.js"), Some("qwen"));
        assert_eq!(id("cursor-agent"), Some("cursor"));
        assert_eq!(id("ghcs"), Some("copilot"));
        assert_eq!(id("/opt/muse/muse-bin-0.1.0-R708.1"), Some("muse"));
        assert_eq!(id("node -e codex"), None);
        assert_eq!(id("bash -c codex"), None);
        assert_eq!(id("vim notes.md"), None);
        assert_eq!(id("muse-binary"), None);
    }

    #[test]
    fn pane_status_transitions() {
        let mut p = Pane::new(5, 60);
        assert_eq!(p.step(), None, "no agent, no status");
        p.set_agent(Some(42), Some(agent("gemini")));
        assert_eq!(p.step(), Some(TermStatus::Idle), "agent starts at its prompt");
        p.feed(b"\x1b[2J\x1b[H\xe2\xa0\x8b Thinking (esc to cancel, 1s)");
        assert_eq!(p.step(), Some(TermStatus::Running));
        p.feed(b"\x1b[2J\x1b[H> Type your message");
        assert_eq!(p.step(), None, "idle held one tick");
        assert_eq!(p.step(), Some(TermStatus::Waiting), "turn finished: user should look");
        assert_eq!(p.step(), None, "no change, no event");
        p.feed(b"\x1b[2J\x1b[H\xe2\x94\x82 Allow execution? Yes");
        assert_eq!(p.step(), Some(TermStatus::Waiting));
        p.feed(b"\x1b[2J\x1b[H> Type your message");
        assert_eq!(p.step(), Some(TermStatus::Idle), "blocked then dismissed: not a finished turn");
        // A flicker back to working cancels the pending idle.
        p.feed(b"\x1b[2J\x1b[Hesc to cancel");
        assert_eq!(p.step(), Some(TermStatus::Running));
        p.feed(b"\x1b[2J\x1b[H> ");
        assert_eq!(p.step(), None);
        p.feed(b"\x1b[2J\x1b[Hesc to cancel");
        assert_eq!(p.step(), None, "still working, nothing to publish");
    }
}
