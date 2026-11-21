//! Secrets a pane was given in its environment, replaced by `‹NAME›` in its output before
//! anything (live view, scrollback, restore file, screen tail, port scanner) sees it.
//! Stored and derived copies (scrollback, restore, screen tail) are also masked whole with
//! `Patterns::mask_all`, so a secret printed in pieces far apart is still masked there.
//!
//! ponytail: matches raw bytes only. The live view masks a split secret only when its pieces
//! arrive under 30 ms apart; a secret split by an escape sequence (coloured output), wrapped
//! across screen rows, cut at the scrollback cap, or printed encoded (base64, URL-escaped) is
//! not masked. A decoding / screen-aware pass would be the upgrade.

use aho_corasick::{AhoCorasick, MatchKind};
use std::collections::BTreeMap;
use std::sync::Arc;

const MAX_SECRETS: usize = 64;

/// The compiled secrets, shared by a pane's live `Masker` and the masking of its stored copies.
pub struct Patterns {
    ac: AhoCorasick,
    /// `‹NAME›` per pattern id.
    labels: Vec<Vec<u8>>,
    /// Each pattern with its KMP failure table (for a live masker's held-back tail).
    values: Vec<(Vec<u8>, Vec<usize>)>,
}

impl Patterns {
    /// `data` holds a whole secret.
    pub fn contains(&self, data: &[u8]) -> bool {
        self.ac.is_match(data)
    }

    /// Every secret in `data` masked (for a whole buffer, not a stream).
    pub fn mask_all(&self, data: &[u8]) -> Vec<u8> {
        let mut out = Vec::with_capacity(data.len());
        self.emit(data, data.len(), &mut out);
        out
    }

    pub fn mask_str(&self, s: &str) -> String {
        String::from_utf8_lossy(&self.mask_all(s.as_bytes())).into_owned()
    }

    /// Write `data` up to `hold` (or past it, through matches that start before it), masked.
    /// Overlapping matches merge into one run, labelled by its first (longest) match, so no
    /// piece of either secret shows. Returns how far it wrote.
    fn emit(&self, data: &[u8], hold: usize, out: &mut Vec<u8>) -> usize {
        let mut ms: Vec<_> = self.ac.find_overlapping_iter(data).collect();
        ms.sort_by_key(|m| (m.start(), std::cmp::Reverse(m.end())));
        let mut pos = 0;
        let mut i = 0;
        while i < ms.len() && ms[i].start() < hold {
            let (start, label) = (ms[i].start(), &self.labels[ms[i].pattern().as_usize()]);
            let mut end = 0;
            while i < ms.len() && ms[i].start() < end.max(start + 1) {
                end = end.max(ms[i].end());
                i += 1;
            }
            out.extend_from_slice(&data[pos..start]);
            // A match starting at or after `hold` (not found yet) may still extend this run.
            if end > hold {
                return start;
            }
            out.extend_from_slice(label);
            pos = end;
        }
        if pos < hold {
            out.extend_from_slice(&data[pos..hold]);
            pos = hold;
        }
        pos
    }
}

pub struct Masker {
    pats: Arc<Patterns>,
    /// Output tail that may be the start of a secret; waits for more input or `flush`.
    held: Vec<u8>,
}

/// Name `[A-Z0-9_]{1,64}`; value 8..=4096 bytes without NUL (shorter values would mask
/// ordinary output).
pub fn mask_ok(name: &str, value: &str) -> bool {
    (1..=64).contains(&name.len())
        && name.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_')
        && (8..=4096).contains(&value.len())
        && !value.contains('\0')
}

/// `f[i]`: length of the longest proper prefix of `v[..=i]` that is also its suffix.
fn failure(v: &[u8]) -> Vec<usize> {
    let mut f = vec![0; v.len()];
    let mut k = 0;
    for i in 1..v.len() {
        while k > 0 && v[i] != v[k] {
            k = f[k - 1];
        }
        if v[i] == v[k] {
            k += 1;
        }
        f[i] = k;
    }
    f
}

/// Longest `k < v.len()` such that `data` ends with `v[..k]`.
fn overlap(data: &[u8], v: &[u8], f: &[usize]) -> usize {
    let mut k = 0;
    for &b in &data[data.len().saturating_sub(v.len() - 1)..] {
        while k > 0 && b != v[k] {
            k = f[k - 1];
        }
        if b == v[k] {
            k += 1;
        }
        if k == v.len() {
            k = f[k - 1];
        }
    }
    k
}

impl Masker {
    /// `None` when there is nothing to mask. Errors name the offending entry, never its value.
    pub fn new(secrets: &BTreeMap<String, String>) -> Result<Option<Masker>, String> {
        if secrets.is_empty() {
            return Ok(None);
        }
        if secrets.len() > MAX_SECRETS {
            return Err(format!("at most {MAX_SECRETS} secrets can be masked"));
        }
        if let Some((k, _)) = secrets.iter().find(|(k, v)| !mask_ok(k, v)) {
            return Err(format!("secret can't be masked: {k}"));
        }
        let mut pats: Vec<(Vec<u8>, Vec<u8>)> = vec![];
        for (k, v) in secrets {
            let label = format!("‹{k}›").into_bytes();
            // The PTY (ONLCR) prints each `\n` as `\r\n`, so a multi-line value (a PEM key)
            // appears so (its own `\r\n` as `\r\r\n`); a program that normalises line endings
            // prints it without its `\r`s.
            let bare = v.replace('\r', "");
            let mut forms = vec![v.replace('\n', "\r\n"), bare.replace('\n', "\r\n"), bare, v.clone()];
            forms.sort();
            forms.dedup();
            for f in forms.into_iter().filter(|f| f.len() >= 8) {
                pats.push((f.into_bytes(), label.clone()));
            }
        }
        let ac = AhoCorasick::builder()
            .match_kind(MatchKind::Standard)
            .build(pats.iter().map(|(v, _)| v))
            .map_err(|e| e.to_string())?;
        Ok(Some(Masker::from_patterns(Arc::new(Patterns {
            ac,
            values: pats.iter().map(|(v, _)| (v.clone(), failure(v))).collect(),
            labels: pats.into_iter().map(|(_, l)| l).collect(),
        }))))
    }

    /// A masker for the same secrets as another pane's (a helper masks its parent's).
    pub fn from_patterns(pats: Arc<Patterns>) -> Masker {
        Masker { pats, held: vec![] }
    }

    /// For masking this pane's stored copies whole.
    pub fn patterns(&self) -> Arc<Patterns> {
        self.pats.clone()
    }

    /// Bytes are waiting for more input (call `flush` if none comes).
    pub fn holding(&self) -> bool {
        !self.held.is_empty()
    }

    /// Mask `input` into `out`, holding back a tail that could still become a secret.
    pub fn feed(&mut self, input: &[u8], out: &mut Vec<u8>) {
        self.held.extend_from_slice(input);
        let data = std::mem::take(&mut self.held);
        // A match starting before `hold` is final: more input can't make one start earlier or run longer.
        let hold = data.len() - self.pats.values.iter().map(|(v, f)| overlap(&data, v, f)).max().unwrap_or(0);
        let pos = self.pats.emit(&data, hold, out);
        self.held = data[pos..].to_vec();
    }

    /// Emit the held tail; any whole secret in it is still masked.
    pub fn flush(&mut self, out: &mut Vec<u8>) {
        let data = std::mem::take(&mut self.held);
        self.pats.emit(&data, data.len(), out);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn masker(pairs: &[(&str, &str)]) -> Masker {
        let m: BTreeMap<String, String> = pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
        Masker::new(&m).unwrap().unwrap()
    }

    fn run(m: &mut Masker, chunks: &[&[u8]]) -> String {
        let mut out = vec![];
        for c in chunks {
            m.feed(c, &mut out);
        }
        m.flush(&mut out);
        String::from_utf8(out).unwrap()
    }

    #[test]
    fn masks_whole_secret() {
        let mut m = masker(&[("GH", "ghp_abcdefgh")]);
        assert_eq!(run(&mut m, &[b"token=ghp_abcdefgh\n"]), "token=‹GH›\n");
    }

    #[test]
    fn masks_secret_split_across_reads() {
        let input = b"a ghp_abcdefgh b ghp_abcdefgh\n";
        for i in 0..=input.len() {
            for j in i..=input.len() {
                let mut m = masker(&[("GH", "ghp_abcdefgh")]);
                let got = run(&mut m, &[&input[..i], &input[i..j], &input[j..]]);
                assert_eq!(got, "a ‹GH› b ‹GH›\n", "split at {i},{j}");
            }
        }
        // Self-overlapping values: any split gives the same result as one read.
        let input = b"aaaaaaaaaaab aaaaaaaa abababababab";
        let secrets = [("A", "aaaaaaaa"), ("AB", "aaaaaaaab"), ("X", "abababab")];
        let whole = run(&mut masker(&secrets), &[input]);
        assert!(!whole.contains("aaaaaaaa") && !whole.contains("abababab"), "{whole}");
        for i in 0..=input.len() {
            for j in i..=input.len() {
                let got = run(&mut masker(&secrets), &[&input[..i], &input[i..j], &input[j..]]);
                assert_eq!(got, whole, "split at {i},{j}");
            }
        }
    }

    #[test]
    fn two_secrets_longest_wins() {
        let input = b"x abcdefghij y abcdefgh z";
        for i in 0..=input.len() {
            let mut m = masker(&[("SHORT", "abcdefgh"), ("LONG", "abcdefghij")]);
            assert_eq!(run(&mut m, &[&input[..i], &input[i..]]), "x ‹LONG› y ‹SHORT› z", "split at {i}");
        }
    }

    #[test]
    fn multi_line_value_matches_pty_newlines() {
        let input = b"key:\r\nline-one\r\nline-two\r\nend";
        for i in 0..=input.len() {
            let mut m = masker(&[("K", "line-one\nline-two")]);
            assert_eq!(run(&mut m, &[&input[..i], &input[i..]]), "key:\r\n‹K›\r\nend", "split at {i}");
        }
        let mut m = masker(&[("K", "line-one\nline-two")]);
        assert_eq!(run(&mut m, &[b"line-one\nline-two"]), "‹K›", "the value as given still matches");
    }

    #[test]
    fn overlapping_secrets_are_masked_whole() {
        let input = b"x abcdefghijkl y efghijkl z";
        let secrets = [("A", "abcdefgh"), ("B", "efghijkl")];
        for i in 0..=input.len() {
            for j in i..=input.len() {
                let got = run(&mut masker(&secrets), &[&input[..i], &input[i..j], &input[j..]]);
                assert_eq!(got, "x ‹A› y ‹B› z", "split at {i},{j}");
            }
        }
        assert_eq!(masker(&secrets).patterns().mask_str("abcdefghijkl"), "‹A›");
    }

    #[test]
    fn crlf_values_match_as_the_pty_prints_them() {
        // ONLCR turns each `\n` into `\r\n`, so a value's own `\r\n` prints as `\r\r\n`.
        for printed in [&b"one-line\r\r\ntwo-line"[..], b"one-line\r\ntwo-line", b"one-line\ntwo-line"] {
            let mut m = masker(&[("K", "one-line\r\ntwo-line")]);
            assert_eq!(run(&mut m, &[printed]), "‹K›", "{printed:?}");
        }
        let mut m = masker(&[("K", "aaaa\r\nbbbb\ncccc")]);
        assert_eq!(run(&mut m, &[b"aaaa\r\r\nbbbb\r\ncccc"]), "‹K›", "mixed line endings");
    }

    #[test]
    fn patterns_find_secrets_in_text_and_seed_another_masker() {
        let p = masker(&[("GH", "ghp_abcdefgh")]).patterns();
        assert!(p.contains(b"curl -H 'x: ghp_abcdefgh'"));
        assert!(!p.contains(b"ghp_abc"));
        let mut child = Masker::from_patterns(p);
        assert_eq!(run(&mut child, &[b"a ghp_abc", b"defgh b"]), "a ‹GH› b");
    }

    #[test]
    fn held_prefix_is_emitted_on_flush_and_partial_secret_never_leaks() {
        let mut m = masker(&[("GH", "ghp_abcdefgh")]);
        let mut out = vec![];
        m.feed(b"ok ghp_abc", &mut out);
        assert_eq!(out, b"ok ", "a possible secret's start is held");
        m.flush(&mut out);
        assert_eq!(out, b"ok ghp_abc");
        // A secret inside the held tail of a longer one is still masked when flushed.
        let mut m = masker(&[("IN", "abcdefgh"), ("OUT", "xxabcdefghyy")]);
        assert_eq!(run(&mut m, &[b"xxabcdefgh"]), "xx‹IN›");
    }

    #[test]
    fn rejects_bad_names_values_and_counts() {
        assert!(mask_ok("GH_TOKEN_2", "12345678"));
        assert!(!mask_ok("GH", "1234567"), "7 bytes");
        assert!(!mask_ok("GH", &"x".repeat(4097)));
        assert!(!mask_ok("GH", "1234\05678"));
        for bad in ["", "gh", "A-B", "A B", &"A".repeat(65)] {
            assert!(!mask_ok(bad, "12345678"), "{bad:?}");
        }
        let one = |k: &str, v: &str| Masker::new(&BTreeMap::from([(k.to_string(), v.to_string())]));
        assert!(one("GH", "1234567").is_err());
        assert!(Masker::new(&BTreeMap::new()).unwrap().is_none());
        let many: BTreeMap<String, String> = (0..65).map(|i| (format!("K{i}"), format!("secret-{i:04}"))).collect();
        assert!(Masker::new(&many).is_err());
    }
}
